import fitz # PyMuPDF
import os
import sys

def annotate_pdf(input_pdf_path: str, output_pdf_path: str, sections_per_page: int = 10):
    if not os.path.exists(input_pdf_path):
        raise FileNotFoundError(f"Input PDF not found at '{input_pdf_path}'")

    doc = fitz.open(input_pdf_path)

    try:
        font = fitz.Font("helv")
    except RuntimeError:
        # Fallback if "helv" is not available (e.g., in some minimal environments)
        font = fitz.Font() # Use a default built-in font

    label_fontsize = 10
    text_color = (0, 0, 0)  # Black
    box_fill_color = (1, 1, 0.75)  # Light yellow (R, G, B) - (255, 255, 191)
    box_opacity = 1.0  # Fully opaque. Set to < 1.0 for transparency
    box_padding = 3  # Padding around text within the box

    for page_num, page in enumerate(doc, start=1):
        page_rect = page.rect
        page_height = page_rect.height
        page_width = page_rect.width

        # --- Page Number Annotation (Top Right) ---
        page_number_text = f"Page {page_num}"
        pn_text_width = font.text_length(page_number_text, fontsize=label_fontsize)
        
        # Box dimensions
        pn_box_width = pn_text_width + 2 * box_padding
        pn_box_height = label_fontsize + 2 * box_padding # Approximate height for one line of text
        
        # Box position (top-right corner)
        pn_box_margin_top = 5
        pn_box_margin_right = 5
        pn_box_x1 = page_width - pn_box_margin_right 
        pn_box_x0 = pn_box_x1 - pn_box_width
        pn_box_y0 = pn_box_margin_top
        pn_box_y1 = pn_box_y0 + pn_box_height
        pn_rect = fitz.Rect(pn_box_x0, pn_box_y0, pn_box_x1, pn_box_y1)

        # Draw the rectangle for page number
        page.draw_rect(
            pn_rect,
            fill=box_fill_color,
            fill_opacity=box_opacity,
            overlay=True, # Draw on top of existing content
            width=0 # No border for the box itself
        )

        # Text position (vertically centered, horizontally centered in its box)
        # Adjust text_rect for padding
        text_rect = pn_rect + (box_padding, box_padding, -box_padding, -box_padding) # x0+pad, y0+pad, x1-pad, y1-pad
                                                                                # (for insert_textbox, this means we define the textbox area)
                                                                                # However, insert_textbox has its own alignment.
                                                                                # Let's ensure the box is drawn, then place text carefully.
                                                                                # For insert_textbox, the rect is where text is placed.
                                                                                # We want text centered in pn_rect.

        page.insert_textbox(
            pn_rect, # Use the original pn_rect for positioning the text box
            page_number_text,
            fontsize=label_fontsize,
            fontname=font.name, # Use the name of the loaded font
            color=text_color,
            align=fitz.TEXT_ALIGN_CENTER, # Horizontal center
            # For vertical centering, insert_textbox is tricky.
            # We ensure pn_box_height is snug, and text should fill it.
            # Alternatively, calculate y position more precisely if needed.
            overlay=True,
        )

        # --- Section Lines and Labels (Left Side) ---
        if sections_per_page > 0:
            for strip_idx in range(sections_per_page):
                section_letter = chr(ord("A") + strip_idx) if strip_idx < 26 else "?" # Fallback for >26 sections
                
                # Calculate y-coordinates for the horizontal strip
                strip_y0 = page_height * (strip_idx / sections_per_page)
                strip_y1 = page_height * ((strip_idx + 1) / sections_per_page)

                # Draw dividing line (optional, but helps visually separate sections)
                # Draw line at the *bottom* of each section strip, except for the last one
                if strip_idx < sections_per_page -1: # No line needed under the last section
                    line_y = strip_y1 
                    page.draw_line(
                        fitz.Point(0, line_y),
                        fitz.Point(page_width, line_y),
                        color=(0.4, 0.4, 0.4),  # Gray color for the line
                        width=0.5,
                        overlay=True
                    )

                # Section Letter Annotation
                letter_text_width = font.text_length(section_letter, fontsize=label_fontsize)
                letter_box_width = letter_text_width + 2 * box_padding
                letter_box_height = label_fontsize + 2 * box_padding

                box_margin_left = 10  # Margin from the left edge of the page
                box_offset_top = 5    # Offset from the top of the current strip

                letter_box_x0 = box_margin_left
                letter_box_y0 = strip_y0 + box_offset_top # Place box within the current strip
                
                letter_box_x1 = letter_box_x0 + letter_box_width
                letter_box_y1 = letter_box_y0 + letter_box_height

                # Ensure the annotation box does not go outside the current strip's vertical bounds
                if letter_box_y1 <= strip_y1: # Check if the box fits within the strip
                    letter_rect = fitz.Rect(letter_box_x0, letter_box_y0, letter_box_x1, letter_box_y1)
                    
                    page.draw_rect(
                        letter_rect,
                        fill=box_fill_color,
                        fill_opacity=box_opacity,
                        overlay=True,
                        width=0 
                    )
                    
                    # For insert_textbox, the rect defines the area where text is placed and aligned.
                    # Define a padded rect for the text itself
                    # section_text_rect = letter_rect + (box_padding, box_padding, -box_padding, -box_padding) # Reverted
                    page.insert_textbox(
                        letter_rect, # Textbox area
                        section_letter,
                        fontsize=label_fontsize,
                        fontname=font.name,
                        color=text_color,
                        align=fitz.TEXT_ALIGN_CENTER,
                        overlay=True,
                    )

    doc.save(output_pdf_path, garbage=4, deflate=True, clean=True)
    doc.close()

if __name__ == "__main__":
    if len(sys.argv) < 3 or len(sys.argv) > 4:
        print("Usage: python pdf_annotator.py <input_pdf_path> <output_pdf_path> [sections_per_page]")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]
    sections = 10 # Default value
    if len(sys.argv) == 4:
        try:
            sections = int(sys.argv[3])
            if sections < 0: # Also check for non-sensical negative numbers
                print("Error: sections_per_page must be a non-negative integer.")
                sys.exit(1)
        except ValueError:
            print("Error: sections_per_page must be an integer.")
            sys.exit(1)

    try:
        annotate_pdf(input_path, output_path, sections_per_page=sections)
        print(f"Annotated PDF saved to: {output_path}")
    except FileNotFoundError as e:
        print(f"Error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        sys.exit(1)
