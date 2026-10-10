#!/usr/bin/env python3
"""
Script để cập nhật file Nhom1_TLCM.docx từ các file markdown trong chapter_content/
"""
import os
import re
from docx import Document
from docx.shared import Pt, Cm, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

CHAPTER_FILES = [
    ("chapter_content/Chuong1_CoSoLuyThuatBruteForce.md", "CHƯƠNG 1"),
    ("chapter_content/Chuong2_ChinhSachMatKhauVaPhongThu.md", "CHƯƠNG 2"),
    ("chapter_content/Chuong3_TrienKhaiKichBanTanCong.md", "CHƯƠNG 3"),
    ("chapter_content/Chuong4_TrienKhaiPhongThuVaPhanTich.md", "CHƯƠNG 4"),
    ("chapter_content/Chuong5_KetLuanVaHuongPhatTrien.md", "CHƯƠNG 5"),
]

def read_md_file(filepath):
    """Đọc nội dung file markdown"""
    with open(filepath, 'r', encoding='utf-8') as f:
        return f.read()

def add_bullet_paragraph(doc, text, level=0):
    """Thêm paragraph bullet thủ công"""
    p = doc.add_paragraph()
    # Thêm bullet character
    run = p.add_run('• ')
    run.font.size = Pt(12)
    run2 = p.add_run(text)
    run2.font.size = Pt(12)
    if level > 0:
        p.paragraph_format.left_indent = Cm(1.27 * (level + 1))
    return p

def add_numbered_paragraph(doc, text, level=0, number=1):
    """Thêm paragraph numbered thủ công"""
    p = doc.add_paragraph()
    run = p.add_run(f'{number}. ')
    run.font.size = Pt(12)
    run2 = p.add_run(text)
    run2.font.size = Pt(12)
    if level > 0:
        p.paragraph_format.left_indent = Cm(1.27 * (level + 1))
    return p

def markdown_to_docx_elements(doc, md_text):
    """Chuyển đổi markdown thành các element docx"""
    lines = md_text.split('\n')
    in_code_block = False
    code_lines = []
    in_table = False
    table_rows = []
    numbered_counter = {}  # Track numbering for nested lists
    
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Xử lý code block
        if line.startswith('```'):
            if in_code_block:
                # Kết thúc code block - thêm vào doc
                p = doc.add_paragraph()
                run = p.add_run('\n'.join(code_lines))
                run.font.name = 'Consolas'
                run.font.size = Pt(9)
                p.paragraph_format.space_before = Pt(6)
                p.paragraph_format.space_after = Pt(6)
                code_lines = []
                in_code_block = False
            else:
                in_code_block = True
            i += 1
            continue
        
        if in_code_block:
            code_lines.append(line)
            i += 1
            continue
        
        # Xử lý table (Markdown table)
        if '|' in line and line.count('|') >= 2:
            cells = [c.strip() for c in line.split('|')]
            cells = [c for c in cells if c]
            if cells:
                is_separator = all(re.match(r'^[-:|\s]+$', c) for c in cells)
                if not is_separator:
                    table_rows.append(cells)
                    in_table = True
                    i += 1
                    continue
        
        if in_table and table_rows and (not ('|' in line and line.count('|') >= 2)):
            if table_rows:
                max_cols = max(len(row) for row in table_rows)
                table = doc.add_table(rows=len(table_rows), cols=max_cols)
                table.style = 'Table Grid'
                for row_idx, row_data in enumerate(table_rows):
                    for col_idx, cell_text in enumerate(row_data):
                        if col_idx < max_cols:
                            cell = table.rows[row_idx].cells[col_idx]
                            cell.text = cell_text
                            if row_idx == 0:
                                for paragraph in cell.paragraphs:
                                    for run in paragraph.runs:
                                        run.bold = True
            table_rows = []
            in_table = False
            continue
        
        # Xử lý heading
        heading_match = re.match(r'^(#{1,6})\s+(.+)$', line)
        if heading_match:
            level = len(heading_match.group(1))
            text = heading_match.group(2).strip()
            p = doc.add_heading(text, level=min(level, 4))
            if level == 1:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            i += 1
            continue
        
        # Xử lý bullet points (support nested)
        bullet_match = re.match(r'^(\s*)[-*+]\s+(.+)$', line)
        if bullet_match:
            indent = len(bullet_match.group(1))
            text = bullet_match.group(2).strip()
            level = indent // 2
            add_bullet_paragraph(doc, text, level)
            i += 1
            continue
        
        # Xử lý numbered list (support nested)
        num_match = re.match(r'^(\s*)(\d+)\.\s+(.+)$', line)
        if num_match:
            indent = len(num_match.group(1))
            text = num_match.group(3).strip()
            level = indent // 2
            # Simple numbering - just use the number from markdown
            num = int(num_match.group(2))
            add_numbered_paragraph(doc, text, level, num)
            i += 1
            continue
        
        # Xử lý blockquote
        if line.strip().startswith('> '):
            text = line.strip()[2:].strip()
            p = doc.add_paragraph(text)
            p.paragraph_format.left_indent = Cm(1)
            for run in p.runs:
                run.italic = True
            i += 1
            continue
        
        # Xử lý horizontal rule
        if line.strip() in ['---', '***', '___']:
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(6)
            p.paragraph_format.space_after = Pt(6)
            run = p.add_run('─' * 50)
            run.font.color.rgb = RGBColor(128, 128, 128)
            i += 1
            continue
        
        # Xử lý mermaid diagram
        if line.strip().startswith('```mermaid'):
            mermaid_lines = []
            i += 1
            while i < len(lines) and not lines[i].strip().startswith('```'):
                mermaid_lines.append(lines[i])
                i += 1
            if i < len(lines):
                i += 1
            p = doc.add_paragraph()
            run = p.add_run('[Sơ đồ Mermaid]\n' + '\n'.join(mermaid_lines))
            run.font.name = 'Consolas'
            run.font.size = Pt(8)
            run.font.color.rgb = RGBColor(100, 100, 100)
            p.paragraph_format.space_before = Pt(6)
            p.paragraph_format.space_after = Pt(6)
            continue
        
        # Paragraph thường - xử lý inline formatting
        if line.strip():
            p = doc.add_paragraph()
            parts = re.split(r'(\*\*.+?\*\*|\*.+?\*|`.+?`)', line)
            for part in parts:
                if part.startswith('**') and part.endswith('**'):
                    run = p.add_run(part[2:-2])
                    run.bold = True
                elif part.startswith('*') and part.endswith('*') and not part.startswith('**'):
                    run = p.add_run(part[1:-1])
                    run.italic = True
                elif part.startswith('`') and part.endswith('`'):
                    run = p.add_run(part[1:-1])
                    run.font.name = 'Consolas'
                    run.font.size = Pt(10)
                else:
                    run = p.add_run(part)
            i += 1
        else:
            p = doc.add_paragraph()
            p.paragraph_format.space_after = Pt(2)
            i += 1

def update_document():
    docx_path = "Nhom1_TLCM.docx"
    doc = Document(docx_path)
    
    # Tìm vị trí CHƯƠNG 1
    chuong1_pos = -1
    for i, para in enumerate(doc.paragraphs):
        if "CHƯƠNG 1" in para.text and para.style.name.startswith('Heading'):
            chuong1_pos = i
            break
    
    if chuong1_pos == -1:
        print("Không tìm thấy CHƯƠNG 1")
        return
    
    print(f"Tìm thấy CHƯƠNG 1 tại vị trí: {chuong1_pos}")
    
    # Xóa tất cả từ sau CHƯƠNG 1 heading đến hết
    for i in range(len(doc.paragraphs) - 1, chuong1_pos, -1):
        p = doc.paragraphs[i]
        p._element.getparent().remove(p._element)
    
    print(f"Đã xóa nội dung cũ, còn {len(doc.paragraphs)} paragraphs")
    
    # Thêm nội dung 5 chapter
    for idx, (md_file, chapter_title) in enumerate(CHAPTER_FILES):
        if not os.path.exists(md_file):
            print(f"File không tồn tại: {md_file}")
            continue
        
        md_content = read_md_file(md_file)
        
        if chapter_title != "CHƯƠNG 1":
            heading = doc.add_heading(chapter_title, level=1)
            heading.alignment = WD_ALIGN_PARAGRAPH.CENTER
            heading.paragraph_format.space_after = Pt(12)
        
        markdown_to_docx_elements(doc, md_content)
        print(f"Đã thêm {chapter_title} từ {md_file}")
    
    # Cập nhật MỞ ĐẦU nếu cần
    mo_dau_pos = -1
    for i, para in enumerate(doc.paragraphs):
        if para.text.strip() == "MỞ ĐẦU" and para.style.name.startswith('Heading'):
            mo_dau_pos = i
            break
    
    if mo_dau_pos != -1 and mo_dau_pos < chuong1_pos:
        for i in range(chuong1_pos - 1, mo_dau_pos, -1):
            p = doc.paragraphs[i]
            p._element.getparent().remove(p._element)
    
    # Lưu file
    doc.save(docx_path)
    print(f"Đã cập nhật và lưu {docx_path}")

if __name__ == "__main__":
    update_document()
