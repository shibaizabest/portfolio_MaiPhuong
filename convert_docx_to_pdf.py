from __future__ import annotations

from io import BytesIO
from pathlib import Path

from docx import Document
from docx.oxml.table import CT_Tbl
from docx.oxml.text.paragraph import CT_P
from docx.table import Table as DocxTable
from docx.text.paragraph import Paragraph as DocxParagraph
from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.enums import TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Image,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parent
DOCS_DIR = ROOT / "assets" / "documents"
FONT_REGULAR = Path("C:/Windows/Fonts/arial.ttf")
FONT_BOLD = Path("C:/Windows/Fonts/arialbd.ttf")


def register_fonts() -> tuple[str, str]:
    if FONT_REGULAR.exists() and FONT_BOLD.exists():
        pdfmetrics.registerFont(TTFont("ArialVN", str(FONT_REGULAR)))
        pdfmetrics.registerFont(TTFont("ArialVNBold", str(FONT_BOLD)))
        return "ArialVN", "ArialVNBold"
    return "Helvetica", "Helvetica-Bold"


FONT_NAME, FONT_BOLD_NAME = register_fonts()


def clean_text(text: str) -> str:
    return " ".join(text.replace("\xa0", " ").split())


def xml_to_text(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


styles = getSampleStyleSheet()
styles.add(
    ParagraphStyle(
        name="VNTitle",
        fontName=FONT_BOLD_NAME,
        fontSize=20,
        leading=26,
        textColor=colors.HexColor("#172033"),
        spaceAfter=14,
    )
)
styles.add(
    ParagraphStyle(
        name="VNHeading",
        fontName=FONT_BOLD_NAME,
        fontSize=14,
        leading=19,
        textColor=colors.HexColor("#1d4ed8"),
        spaceBefore=10,
        spaceAfter=7,
    )
)
styles.add(
    ParagraphStyle(
        name="VNBody",
        fontName=FONT_NAME,
        fontSize=10.5,
        leading=15,
        alignment=TA_JUSTIFY,
        spaceAfter=6,
    )
)
styles.add(
    ParagraphStyle(
        name="VNMeta",
        fontName=FONT_NAME,
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#475569"),
        spaceAfter=4,
    )
)


def iter_block_items(doc: Document):
    for child in doc.element.body.iterchildren():
        if isinstance(child, CT_P):
            yield DocxParagraph(child, doc)
        elif isinstance(child, CT_Tbl):
            yield DocxTable(child, doc)


def paragraph_style(text: str, index: int) -> str:
    upper = text.upper()
    if index <= 2 or upper.startswith("BÀI TẬP"):
        return "VNTitle"
    if (
        upper.startswith(("I.", "II.", "III.", "IV.", "V.", "VI."))
        or upper.startswith(("PHÂN TÍCH", "THỰC HIỆN", "BỘ NGUYÊN TẮC", "TỔNG HỢP"))
        or text.startswith(("Tác vụ", "Giai đoạn", "Thách thức"))
    ):
        return "VNHeading"
    if any(text.startswith(prefix) for prefix in ("Họ và tên", "Mã sinh viên", "Lớp", "Mã học phần", "Trường")):
        return "VNMeta"
    return "VNBody"


def build_table(table: DocxTable):
    data: list[list[Paragraph]] = []
    for row in table.rows:
        cells = []
        for cell in row.cells:
            text = clean_text(cell.text)
            cells.append(Paragraph(xml_to_text(text), styles["VNBody"]))
        if any(cell.getPlainText() for cell in cells):
            data.append(cells)
    if not data:
        return None

    col_count = max(len(row) for row in data)
    for row in data:
        while len(row) < col_count:
            row.append(Paragraph("", styles["VNBody"]))

    available_width = A4[0] - 3.2 * cm
    pdf_table = Table(data, colWidths=[available_width / col_count] * col_count, repeatRows=1)
    pdf_table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, -1), FONT_NAME),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eff6ff")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#172033")),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#dbe3ee")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return pdf_table


def extract_images(doc: Document) -> list[tuple[str, bytes]]:
    images: list[tuple[str, bytes]] = []
    for rel in doc.part.rels.values():
        if getattr(rel, "is_external", False):
            continue
        part = rel.target_part
        if not getattr(part, "content_type", "").startswith("image/"):
            continue
        name = Path(part.partname).name
        blob = part.blob
        if len(blob) < 200:
            continue
        images.append((name, blob))
    return images


def image_flowable(name: str, blob: bytes):
    try:
        pil = PILImage.open(BytesIO(blob))
        width, height = pil.size
    except Exception:
        return None

    max_w = A4[0] - 3.2 * cm
    max_h = 18 * cm
    ratio = min(max_w / width, max_h / height, 1)
    img = Image(BytesIO(blob), width=width * ratio, height=height * ratio)
    caption = Paragraph(f"Minh chứng: {xml_to_text(name)}", styles["VNMeta"])
    return KeepTogether([img, Spacer(1, 0.15 * cm), caption, Spacer(1, 0.35 * cm)])


def convert_docx(docx_path: Path) -> Path:
    doc = Document(docx_path)
    pdf_path = docx_path.with_suffix(".pdf")
    story = []

    story.append(Paragraph("Bản PDF minh chứng báo cáo thực hành", styles["VNHeading"]))
    story.append(Paragraph(f"Nguồn: {xml_to_text(docx_path.name)}", styles["VNMeta"]))
    story.append(Spacer(1, 0.25 * cm))

    paragraph_index = 0
    for block in iter_block_items(doc):
        if isinstance(block, DocxParagraph):
            text = clean_text(block.text)
            if not text:
                continue
            style_name = paragraph_style(text, paragraph_index)
            story.append(Paragraph(xml_to_text(text), styles[style_name]))
            paragraph_index += 1
        elif isinstance(block, DocxTable):
            table = build_table(block)
            if table is not None:
                story.append(Spacer(1, 0.2 * cm))
                story.append(table)
                story.append(Spacer(1, 0.3 * cm))

    images = extract_images(doc)
    if images:
        story.append(PageBreak())
        story.append(Paragraph("Phụ lục hình ảnh minh chứng", styles["VNHeading"]))
        for name, blob in images:
            flowable = image_flowable(name, blob)
            if flowable is not None:
                story.append(flowable)

    pdf = SimpleDocTemplate(
        str(pdf_path),
        pagesize=A4,
        rightMargin=1.6 * cm,
        leftMargin=1.6 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
        title=docx_path.stem,
        author="Lưu Quang Thịnh",
    )
    pdf.build(story)
    return pdf_path


def main() -> int:
    docx_files = sorted(DOCS_DIR.glob("task-*.docx"))
    if not docx_files:
        print("No DOCX files found in assets/documents.")
        return 1

    for docx_path in docx_files:
        pdf_path = convert_docx(docx_path)
        print(f"Converted: {docx_path.name} -> {pdf_path.name} ({pdf_path.stat().st_size} bytes)")
    print(f"Done. Converted {len(docx_files)} file(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
