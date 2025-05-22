import fitz  # PyMuPDF
import os
import sys


def annotate_pdf(input_pdf_path: str, output_pdf_path: str, sections_per_page: int = 10):
    if not os.path.exists(input_pdf_path):
        raise FileNotFoundError(f"Input PDF not found at '{input_pdf_path}'")

    doc = fitz.open(input_pdf_path)

    try:
        font = fitz.Font("helv")
    except RuntimeError:
        font = fitz.Font()

    label_fontsize = 10
    text_color = (0, 0, 0)
    box_fill_color = (1, 1, 0.75)
    box_opacity = 1.0
    box_padding = 3

    for page_num, page in enumerate(doc, start=1):
        page_rect = page.rect
        page_height = page_rect.height
        page_width = page_rect.width

        # page-number block
        page_number_text = f"Page {page_num}"
        pn_text_width = font.text_length(page_number_text, fontsize=label_fontsize)
        pn_box_width = pn_text_width + 2 * box_padding
        pn_box_height = label_fontsize + 2 * box_padding
        pn_box_margin_top = 5
        pn_box_margin_right = 5
        pn_box_x1 = page_width - pn_box_margin_right
        pn_box_x0 = pn_box_x1 - pn_box_width
        pn_box_y0 = pn_box_margin_top
        pn_box_y1 = pn_box_y0 + pn_box_height
        pn_rect = fitz.Rect(pn_box_x0, pn_box_y0, pn_box_x1, pn_box_y1)

        page.draw_rect(pn_rect, fill=box_fill_color, fill_opacity=box_opacity, overlay=True, width=0)

        text_rect = pn_rect + (-box_padding, -box_padding, box_padding, box_padding)
        page.insert_textbox(
            text_rect,
            page_number_text,
            fontsize=label_fontsize,
            fontname=font.name,
            color=text_color,
            align=fitz.TEXT_ALIGN_CENTER,
            overlay=True,
        )

        # section lines and labels
        if sections_per_page > 0:
            for strip_idx in range(sections_per_page):
                section_letter = chr(ord("A") + strip_idx) if strip_idx < 26 else "?"
                strip_y0 = page_height * (strip_idx / sections_per_page)
                strip_y1 = page_height * ((strip_idx + 1) / sections_per_page)

                if strip_idx < sections_per_page - 1:
                    line_y = strip_y1
                    page.draw_line(
                        fitz.Point(0, line_y),
                        fitz.Point(page_width, line_y),
                        color=(0.4, 0.4, 0.4),
                        width=0.5,
                        overlay=True,
                    )

                letter_text_width = font.text_length(section_letter, fontsize=label_fontsize)
                letter_box_width = letter_text_width + 2 * box_padding
                letter_box_height = label_fontsize + 2 * box_padding
                box_margin_left = 10
                box_offset_top = 5

                letter_box_x0 = box_margin_left
                letter_box_y0 = strip_y0 + box_offset_top
                letter_box_x1 = letter_box_x0 + letter_box_width
                letter_box_y1 = letter_box_y0 + letter_box_height

                if letter_box_y1 <= strip_y1:
                    letter_rect = fitz.Rect(letter_box_x0, letter_box_y0, letter_box_x1, letter_box_y1)
                    page.draw_rect(
                        letter_rect,
                        fill=box_fill_color,
                        fill_opacity=box_opacity,
                        overlay=True,
                        width=0,
                    )
                    text_rect = letter_rect + (-box_padding, -box_padding, box_padding, box_padding)
                    page.insert_textbox(
                        text_rect,
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
    sections = 10
    if len(sys.argv) == 4:
        sections = int(sys.argv[3])

    annotate_pdf(input_path, output_path, sections_per_page=sections)
