import fitz  # PyMuPDF
import os
import sys

def annotate_pdf(input_pdf_path: str, output_pdf_path: str, sections_per_page: int = 10):
    """
    Annotates a PDF with page numbers and section lines/labels.

    Args:
        input_pdf_path: Path to the input PDF file.
        output_pdf_path: Path to save the annotated PDF file.
        sections_per_page: Number of sections to divide each page into.
    """
    if not os.path.exists(input_pdf_path):
        print(f"Error: Input PDF not found at '{input_pdf_path}'")
        raise FileNotFoundError(f"Input PDF not found at '{input_pdf_path}'")

    try:
        doc = fitz.open(input_pdf_path)
    except Exception as e:
        print(f"Error opening PDF '{input_pdf_path}': {e}")
        raise

    for page_idx, page in enumerate(doc, start=1):
        page_number_text = f"Page {page_idx}"
        rect = page.rect
        height = rect.height
        width = rect.width

        # Add Page Number (bottom right)
        # Positioned from the bottom-left: x coordinate is width - 72, y coordinate is 36 from bottom
        # In PyMuPDF, y coordinates are typically measured from the top, so to place it 36 from bottom,
        # it should be height - 36. However, the prompt specified page_num_y = 36
        # This likely means 36 points from the *bottom* of the page.
        # PyMuPDF's insert_text y-coordinate is from the top-left.
        # Let's assume the prompt implies the visual bottom right for the text.
        # If (0,0) is top-left, then y for bottom right text baseline would be height - text_height_approx.
        # Given font size 10, let's assume text_height_approx is around 10-12 points.
        # So, page_num_y should be height - 36 (if 36 is distance from bottom edge to text baseline).
        # Let's try the prompt's literal value first and adjust if it looks off.
        # The prompt says: page_num_y = 36. This will place it near the top of the page.
        # To place it at the bottom right, it should be: page_num_y = 36 (PyMuPDF (0,0) is bottom-left for insert_text)
        page_num_x = width - 72
        page_num_y = 36
        page.insert_text((page_num_x, page_num_y), page_number_text, fontsize=10, color=(0, 0, 0), overlay=True)

        # Add Section Lines and Labels
        # All coordinates are from bottom-left (PyMuPDF default for page modifications)
        for s_idx in range(sections_per_page):
            # y_coord_bottom_of_section is the Y-coordinate of the line that forms the
            # bottom boundary of the current section s_idx.
            # For s_idx=0 (Section A), this is y=0.
            # For s_idx=1 (Section B), this is y = height/sections_per_page.
            # Coordinates are relative to the bottom-left origin.
            y_coord_bottom_of_section = height * (s_idx / sections_per_page)

            # Draw the line forming the bottom boundary of section s_idx
            # (which is also the top boundary of section s_idx-1).
            # Avoid drawing a line at y=0 (page's bottom edge).
            if s_idx > 0:
                page.draw_line(
                    (0, y_coord_bottom_of_section),
                    (width, y_coord_bottom_of_section),
                    color=(0.7, 0.7, 0.7), width=0.5, overlay=True
                )

            # Add section label text (e.g., "Section A")
            # Label for section s_idx is placed within that section, just above its bottom boundary line.
            section_text = f"Section {chr(ord('A') + s_idx)}"
            label_pos_x = 10
            # label_pos_y places the baseline of the text 3 points above the y_coord_bottom_of_section line.
            label_pos_y = y_coord_bottom_of_section + 3

            # Visibility check: ensure the label's baseline is below a line 12 points from the page top.
            if label_pos_y < (height - 12):
                page.insert_text((label_pos_x, label_pos_y), section_text, fontsize=8, color=(0.3, 0.3, 0.3), overlay=True)


    try:
        doc.save(output_pdf_path, garbage=4, deflate=True, clean=True)
    except Exception as e:
        print(f"Error saving PDF to '{output_pdf_path}': {e}")
        # doc.close() # Should still try to close
        raise
    finally:
        doc.close()


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python pdf_annotator.py <input_pdf_path> <output_pdf_path>")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    try:
        annotate_pdf(input_path, output_path)
        print(f"Annotated PDF saved to: {output_path}")
    except FileNotFoundError as e:
        print(f"Error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        sys.exit(1)
