# server.py
import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from google import genai
from google.genai import types
from dotenv import load_dotenv
import shutil
import uuid
import fitz  # PyMuPDF
from pdf_annotator import annotate_pdf

load_dotenv()  # read .env
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY environment variable not set.")

client = genai.Client(api_key=api_key)
model_name = "gemini-2.0-flash-lite"

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:5173"}})

UPLOADS_DIR = "uploads"
os.makedirs(UPLOADS_DIR, exist_ok=True)

def query_gemini(pdf_bytes: bytes, prompt: str) -> str:
    contents = [
        prompt,
        types.Part.from_bytes(data=pdf_bytes, mime_type="application/pdf"),
    ]
    resp = client.models.generate_content(
        model=model_name,
        contents=contents,
    )
    return resp.text

@app.post("/api/generate")
def generate():
    if "annotated_pdf_path" not in request.form or "prompt" not in request.form:
        return jsonify({"error": "annotated_pdf_path and prompt fields required"}), 400

    annotated_pdf_path = request.form["annotated_pdf_path"]
    prompt = request.form["prompt"]

    # Security Check: Validate that the annotated_pdf_path is within UPLOADS_DIR
    abs_annotated_path = os.path.abspath(annotated_pdf_path)
    abs_uploads_dir = os.path.abspath(UPLOADS_DIR)

    if not abs_annotated_path.startswith(abs_uploads_dir):
        # Log the attempt for security auditing if desired
        app.logger.warning(f"Attempted access to path outside UPLOADS_DIR: {annotated_pdf_path}")
        return jsonify({"error": "Invalid path"}), 400
    
    if not os.path.exists(annotated_pdf_path):
        return jsonify({"error": "Annotated PDF not found at specified path"}), 404

    try:
        with open(annotated_pdf_path, "rb") as f:
            pdf_bytes = f.read()
    except IOError as e:
        app.logger.error(f"Could not read annotated PDF '{annotated_pdf_path}': {e}")
        return jsonify({"error": f"Could not read annotated PDF: {e}"}), 500

    try:
        answer = query_gemini(pdf_bytes, prompt)
        return jsonify({"answer": answer})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.post("/api/generate_prompt")
def generate_prompt_api():
    data = request.get_json()
    if not data or "label" not in data or "format" not in data:
        return jsonify({"error": "label and format fields required"}), 400

    label = data["label"]
    format_ = data["format"]

    meta_prompt_string = f"""You are an assistant helping lawyers draft questions for document review.
Given the column label '{label}' and desired data format '{format_}', generate a single, concise, and clear question.
This question will be asked about a legal document to extract information for the column.
The question should be phrased naturally, as if a lawyer is asking it. Avoid overly technical jargon unless implied by the label.

Column Label: {label}
Data Format: {format_}

Generated Question:"""

    try:
        resp = client.models.generate_content(
            model=model_name,
            contents=[meta_prompt_string],
        )
        return jsonify({"suggested_prompt": resp.text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(port=5001, debug=True)

@app.route("/api/preprocess_pdf", methods=["POST"])
def preprocess_pdf():
    if 'main_pdf' not in request.files:
        return jsonify({"error": "main_pdf is required"}), 400

    main_pdf_file = request.files.get('main_pdf')
    appendix_pdf_files = request.files.getlist('appendix_pdfs')

    processing_id = str(uuid.uuid4())
    job_dir = os.path.join(UPLOADS_DIR, processing_id)
    os.makedirs(job_dir, exist_ok=True)

    original_files_manifest = []

    try:
        # Save main PDF
        original_main_pdf_name = "original_main.pdf"
        original_main_pdf_path = os.path.join(job_dir, original_main_pdf_name)
        main_pdf_file.save(original_main_pdf_path)
        with fitz.open(original_main_pdf_path) as doc:
            num_pages_main = doc.page_count
        original_files_manifest.append({
            "id": "main_doc",
            "path": original_main_pdf_path,
            "original_filename": main_pdf_file.filename,
            "page_count": num_pages_main
        })

        # Save appendices if any
        appendix_paths = []
        if appendix_pdf_files:
            for idx, appendix_file in enumerate(appendix_pdf_files):
                if appendix_file and appendix_file.filename: # Check if file exists and has a name
                    original_appendix_name = f"original_appendix_{idx+1}.pdf"
                    original_appendix_path = os.path.join(job_dir, original_appendix_name)
                    appendix_file.save(original_appendix_path)
                    appendix_paths.append(original_appendix_path)
                    with fitz.open(original_appendix_path) as doc:
                        num_pages_appendix = doc.page_count
                    original_files_manifest.append({
                        "id": f"appendix_{idx+1}",
                        "path": original_appendix_path,
                        "original_filename": appendix_file.filename,
                        "page_count": num_pages_appendix
                    })

        # File Combination
        path_to_combined_pdf_for_annotation = ""
        combined_pdf_doc = fitz.open()

        # Add main PDF to combined
        main_doc_for_combine = fitz.open(original_main_pdf_path)
        combined_pdf_doc.insert_pdf(main_doc_for_combine)
        main_doc_for_combine.close()

        # Add appendices to combined
        if appendix_paths:
            for appendix_path in appendix_paths:
                appendix_doc_for_combine = fitz.open(appendix_path)
                combined_pdf_doc.insert_pdf(appendix_doc_for_combine)
                appendix_doc_for_combine.close()
        
        combined_for_annotation_filename = "combined_for_annotation.pdf"
        path_to_combined_pdf_for_annotation = os.path.join(job_dir, combined_for_annotation_filename)
        combined_pdf_doc.save(path_to_combined_pdf_for_annotation, garbage=4, deflate=True)
        combined_pdf_doc.close()
        
        # If no appendices, combined_for_annotation.pdf IS the original main PDF content.
        # The above logic correctly handles this: combined_pdf_doc will only contain main_pdf if appendix_paths is empty.

        # Annotation
        annotated_pdf_filename = "annotated_document.pdf"
        output_annotated_path = os.path.join(job_dir, annotated_pdf_filename)
        
        # Assuming annotate_pdf takes input and output paths
        annotate_pdf(path_to_combined_pdf_for_annotation, output_annotated_path)

        with fitz.open(output_annotated_path) as doc:
            total_pages_in_annotated_doc = doc.page_count
        
        return jsonify({
            "processing_id": processing_id,
            "annotated_pdf_path": output_annotated_path,
            "original_files_manifest": original_files_manifest,
            "total_pages_in_annotated_doc": total_pages_in_annotated_doc,
            "sections_per_page": 10 # Assuming fixed for now
        })

    except Exception as e:
        # Basic cleanup of job_dir in case of failure
        if os.path.exists(job_dir):
            shutil.rmtree(job_dir)
        app.logger.error(f"Error in preprocess_pdf: {str(e)}")
        return jsonify({"error": f"An error occurred during processing: {str(e)}"}), 500

@app.route('/uploads/<path:processing_id>/<path:filename>')
def serve_uploaded_file(processing_id, filename):
    # Basic sanitization for processing_id to prevent directory traversal beyond its intended scope
    safe_processing_id = os.path.normpath(os.path.basename(processing_id))
    
    # Construct the full path to the processing directory
    processing_dir_abs = os.path.abspath(os.path.join(UPLOADS_DIR, safe_processing_id))

    # Security check: ensure the constructed path is still within UPLOADS_DIR
    # and that safe_processing_id does not try to escape (e.g. '..')
    if not processing_dir_abs.startswith(os.path.abspath(UPLOADS_DIR)) or \
       safe_processing_id == '..' or safe_processing_id.startswith('../') or safe_processing_id.startswith('/'):
        app.logger.warning(f"Potential path traversal attempt: {processing_id}")
        return "Invalid processing ID or path.", 400

    # Check if the directory for processing_id actually exists
    if not os.path.isdir(processing_dir_abs):
        app.logger.warning(f"Processing directory not found: {processing_dir_abs}")
        return "Processing ID not found.", 404
        
    # Ensure the filename itself is also sanitized if it comes from user input,
    # though send_from_directory handles this fairly well.
    # For added safety, one might also sanitize 'filename'.
    # safe_filename = os.path.normpath(os.path.basename(filename))
    # if safe_filename != filename or safe_filename.startswith("..") or safe_filename.startswith("/"):
    #    return "Invalid filename", 400

    try:
        return send_from_directory(processing_dir_abs, filename)
    except FileNotFoundError:
        app.logger.warning(f"File not found: {filename} in {processing_dir_abs}")
        return "File not found.", 404
    except Exception as e:
        app.logger.error(f"Error serving file {filename} from {processing_dir_abs}: {e}")
        return "Error serving file.", 500
