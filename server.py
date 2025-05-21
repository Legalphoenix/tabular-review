# server.py
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()  # read .env
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY environment variable not set.")

client = genai.Client(api_key=api_key)
model_name = "gemini-2.0-flash-lite"

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:5173"}})

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
    if "file" not in request.files or "prompt" not in request.form:
        return jsonify({"error": "file and prompt fields required"}), 400

    uploaded = request.files["file"]
    prompt = request.form["prompt"]
    pdf_bytes = uploaded.read()

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
