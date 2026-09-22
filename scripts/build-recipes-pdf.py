#!/usr/bin/env python
"""Gera o PDF premium a partir do JSON derivado da fonte canônica do produto."""

from __future__ import annotations

import argparse
import json
import math
import tempfile
from pathlib import Path

from fontTools.ttLib import TTFont as FontToolsFont
from reportlab.lib.colors import Color, HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader


W, H = A4
M = 42
FOREST = HexColor('#173F35')
LEAF = HexColor('#496B56')
GOLD = HexColor('#B69A58')
GOLD_LIGHT = HexColor('#D9BF85')
GOLD_INK = HexColor('#806624')
SAGE = HexColor('#A6B49A')
IVORY = HexColor('#F5F1E8')
PAPER = HexColor('#EDECE2')
INK = HexColor('#102D26')
TERRACOTTA = HexColor('#9F5E3F')


def clean(value: object) -> str:
    return str(value or '').replace('\u2010', '-').replace('\u2011', '-').replace('\u2012', '-').replace('\u2013', '-').replace('\u2014', '-').replace('\u2212', '-')


def convert_woff2(source: Path, destination: Path) -> None:
    font = FontToolsFont(str(source))
    font.flavor = None
    font.save(str(destination))


def register_fonts(editorial: Path, editorial_italic: Path, body: Path, temp: Path) -> None:
    conversions = [
        ('Editorial', editorial, temp / 'editorial.ttf'),
        ('EditorialItalic', editorial_italic, temp / 'editorial-italic.ttf'),
        ('Body', body, temp / 'body.ttf'),
    ]
    for name, source, target in conversions:
        convert_woff2(source, target)
        pdfmetrics.registerFont(TTFont(name, str(target)))


def lines_for(text: str, font: str, size: float, width: float) -> list[str]:
    words = clean(text).split()
    if not words:
        return []
    lines: list[str] = []
    current = words[0]
    for word in words[1:]:
        candidate = f'{current} {word}'
        if pdfmetrics.stringWidth(candidate, font, size) <= width:
            current = candidate
        else:
            lines.append(current)
            current = word
    lines.append(current)
    return lines


def draw_lines(c: canvas.Canvas, text: str, x: float, y: float, width: float, *, font: str = 'Body', size: float = 9, leading: float | None = None, color=INK, max_lines: int | None = None) -> float:
    leading = leading or size * 1.42
    wrapped = lines_for(text, font, size, width)
    if max_lines:
        wrapped = wrapped[:max_lines]
    c.setFillColor(color)
    c.setFont(font, size)
    for line in wrapped:
        c.drawString(x, y, line)
        y -= leading
    return y


def draw_label(c: canvas.Canvas, text: str, x: float, y: float, color=GOLD_INK) -> None:
    c.setFillColor(color)
    c.setFont('Body', 6.7)
    c.drawString(x, y, clean(text).upper())


def draw_rule(c: canvas.Canvas, x1: float, y: float, x2: float, color=Color(0.09, 0.25, 0.21, alpha=.2)) -> None:
    c.setStrokeColor(color)
    c.setLineWidth(.55)
    c.line(x1, y, x2, y)


def image_dimensions(path: Path) -> tuple[int, int]:
    image = ImageReader(str(path))
    return image.getSize()


def draw_cover_image(c: canvas.Canvas, path: Path, x: float, y: float, width: float, height: float, *, anchor_x: float = .5, anchor_y: float = .5) -> None:
    iw, ih = image_dimensions(path)
    scale = max(width / iw, height / ih)
    rendered_w, rendered_h = iw * scale, ih * scale
    offset_x = x - (rendered_w - width) * anchor_x
    offset_y = y - (rendered_h - height) * anchor_y
    c.saveState()
    clip = c.beginPath()
    clip.rect(x, y, width, height)
    c.clipPath(clip, stroke=0, fill=0)
    c.drawImage(str(path), offset_x, offset_y, rendered_w, rendered_h, preserveAspectRatio=True, mask='auto')
    c.restoreState()


class PremiumPDF:
    def __init__(self, output: Path, data: dict):
        self.data = data
        self.c = canvas.Canvas(str(output), pagesize=A4, pageCompression=1)
        self.c.setTitle(clean(data['title']))
        self.c.setAuthor('Gislaine Muller Duarte')
        self.c.setSubject('Coleção digital de receitas com orientações educativas e lista de compras.')
        self.c.setCreator('Gislaine Duarte - Nutricionista')
        self.page = 0

    def begin(self, background=IVORY, *, footer=True, section: str = '') -> None:
        if self.page:
            self.c.showPage()
        self.page += 1
        self.c.setFillColor(background)
        self.c.rect(0, 0, W, H, fill=1, stroke=0)
        if footer:
            self.footer(section)

    def footer(self, section: str) -> None:
        draw_rule(self.c, M, 28, W - M)
        self.c.setFillColor(LEAF)
        self.c.setFont('Body', 6.5)
        self.c.drawString(M, 16, clean(section or self.data['shortTitle']).upper())
        self.c.drawRightString(W - M, 16, f'{self.page:02d}')

    def save(self) -> None:
        self.c.save()


def cover(doc: PremiumPDF, root: Path) -> None:
    doc.begin(FOREST, footer=False)
    c = doc.c
    hero = root / doc.data['heroImage']
    draw_cover_image(c, hero, 0, 0, W, H, anchor_x=.62, anchor_y=.5)
    c.saveState()
    c.setFillColor(Color(0.035, .13, .105, alpha=.76))
    c.rect(0, 0, W * .67, H, fill=1, stroke=0)
    c.setFillColor(Color(.965, .945, .90, alpha=.18))
    c.rect(W * .67, 0, W * .33, H, fill=1, stroke=0)
    c.restoreState()
    c.setStrokeColor(Color(.85, .75, .52, alpha=.65))
    c.setLineWidth(.65)
    c.line(M, H - 62, W * .61, H - 62)
    draw_label(c, 'Coleção digital de receitas', M, H - 88, GOLD_LIGHT)
    y = H - 142
    for line in ['7 receitas para', 'ajudar você a', 'desinflamar!']:
        c.setFont('EditorialItalic' if line == 'desinflamar!' else 'Editorial', 48 if line != 'desinflamar!' else 53)
        c.setFillColor(SAGE if line == 'desinflamar!' else IVORY)
        c.drawString(M, y, line)
        y -= 48
    y = draw_lines(c, doc.data['subtitle'], M, y - 12, W * .47, size=9.5, leading=15, color=IVORY)
    c.setFillColor(GOLD_LIGHT)
    c.circle(M + 4, y - 24, 3, fill=1, stroke=0)
    c.setFillColor(IVORY)
    c.setFont('Body', 7)
    c.drawString(M + 15, y - 27, 'EXPERIÊNCIA INTERATIVA  /  OFFLINE  /  PDF')
    c.setFillColor(IVORY)
    c.setFont('Editorial', 19)
    c.drawString(M, 56, 'Gislaine Duarte')
    c.setFont('Body', 6.5)
    c.drawString(M, 42, 'NUTRICIONISTA  ·  CRN-2 Nº 22562')


def introduction(doc: PremiumPDF, root: Path) -> None:
    doc.begin(IVORY, section='Apresentação')
    c = doc.c
    draw_label(c, 'Uma coleção para usar de verdade', M, H - 67)
    c.setFont('Editorial', 42)
    c.setFillColor(INK)
    c.drawString(M, H - 122, 'Menos receitas salvas.')
    c.setFont('EditorialItalic', 44)
    c.setFillColor(GOLD_INK)
    c.drawString(M, H - 166, 'Mais receitas preparadas.')
    draw_cover_image(c, root / doc.data['heroImage'], M, 285, W - M * 2, 285, anchor_x=.5, anchor_y=.48)
    c.setFillColor(FOREST)
    c.rect(M, 250, 160, 35, fill=1, stroke=0)
    c.setFillColor(IVORY)
    c.setFont('Body', 7)
    c.drawString(M + 14, 264, '7 PREPARAÇÕES · DOCES E SALGADAS')
    text = 'Esta jornada reúne receitas possíveis para trazer variedade, sabor e intenção à rotina. A organização foi pensada para acompanhar você da escolha dos ingredientes ao momento de servir, com alertas claros e sem promessas de resultado.'
    draw_lines(c, text, M, 216, W - M * 2, size=10, leading=16, color=LEAF)


def how_to_use(doc: PremiumPDF) -> None:
    doc.begin(PAPER, section='Como utilizar')
    c = doc.c
    draw_label(c, 'Como utilizar este material', M, H - 66)
    c.setFillColor(INK)
    c.setFont('Editorial', 43)
    c.drawString(M, H - 120, 'Escolha. Organize.')
    c.setFont('EditorialItalic', 45)
    c.setFillColor(GOLD_INK)
    c.drawString(M, H - 164, 'Prepare no seu ritmo.')
    tips = [
        ('01', 'Comece pela receita que conversa com o seu momento e confira os alergênicos.'),
        ('02', 'Separe os ingredientes e observe quais medidas podem ser multiplicadas.'),
        ('03', 'Respeite o ponto da massa e ajuste o tempo ao seu forno ou aparelho.'),
        ('04', 'Use a lista consolidada para organizar as compras das receitas escolhidas.'),
    ]
    y = H - 215
    for number, text in tips:
        draw_rule(c, M, y + 10, W - M)
        c.setFillColor(GOLD_INK)
        c.setFont('Body', 7)
        c.drawString(M, y - 8, number)
        y = draw_lines(c, text, M + 40, y - 8, W - M * 2 - 40, size=9.2, leading=14, color=INK) - 14
    draw_label(c, 'Sumário', M, y - 8)
    y -= 34
    for index, recipe in enumerate(doc.data['recipes']):
        c.setFillColor(INK)
        c.setFont('Editorial', 16)
        c.drawString(M, y, f'{index + 1}. {clean(recipe["name"])}')
        c.setFont('Body', 7)
        c.setFillColor(LEAF)
        c.drawRightString(W - M, y + 2, f'{index + 4:02d}')
        y -= 25


def draw_recipe(doc: PremiumPDF, root: Path, recipe: dict, index: int) -> None:
    doc.begin(IVORY, section=f'Receita {index + 1} de 7')
    c = doc.c
    image_path = root / recipe['pdfImage']
    image_height = 214
    draw_cover_image(c, image_path, M, H - M - image_height, W - M * 2, image_height, anchor_x=.5, anchor_y=.52)
    c.setFillColor(FOREST)
    c.rect(M, H - M - 27, 54, 27, fill=1, stroke=0)
    c.setFillColor(IVORY)
    c.setFont('Body', 7)
    c.drawCentredString(M + 27, H - M - 17, f'0{index + 1} / 07')
    title_top = H - M - image_height - 33
    draw_label(c, recipe['category'], M, title_top + 12)
    title_size = 27 if len(recipe['name']) > 43 else 29
    title_lines = lines_for(recipe['name'], 'Editorial', title_size, W - M * 2)
    c.setFillColor(INK)
    c.setFont('Editorial', title_size)
    y = title_top - 14
    for line in title_lines[:2]:
        c.drawString(M, y, line)
        y -= 28
    y = draw_lines(c, recipe['introduction'], M, y - 1, W - M * 2, size=8.8, leading=13, color=LEAF, max_lines=2) - 11
    column_top = y
    gap = 24
    left_width = 215
    right_x = M + left_width + gap
    right_width = W - M - right_x

    draw_label(c, 'Ingredientes', M, column_top)
    iy = column_top - 17
    for ingredient in recipe['ingredients']:
        c.setFillColor(GOLD_INK)
        c.circle(M + 2.5, iy + 2.2, 1.6, fill=1, stroke=0)
        label = ingredient['formatted'] + (' (opcional)' if ingredient.get('optional') else '')
        iy = draw_lines(c, label, M + 10, iy + 5, left_width - 10, size=9.3, leading=13.3, color=INK) - 5
    if recipe.get('substitutions'):
        iy -= 3
        draw_label(c, 'Substituição', M, iy, TERRACOTTA)
        iy = draw_lines(c, recipe['substitutions'][0], M, iy - 14, left_width, size=8.5, leading=12, color=LEAF) - 6
    draw_label(c, 'Alergênicos e cuidados', M, iy - 3)
    iy -= 19
    for allergen in recipe['allergens']:
        c.setFillColor(INK)
        c.setFont('Body', 8.5)
        c.drawString(M, iy, f'• {clean(allergen["label"])}')
        iy -= 13
    if recipe.get('notes'):
        iy -= 4
        draw_label(c, 'Observações', M, iy)
        iy -= 15
        for note in recipe['notes'][:2]:
            iy = draw_lines(c, f'• {note}', M, iy, left_width, size=8.2, leading=11.5, color=LEAF) - 4

    draw_label(c, 'Modo de preparo', right_x, column_top)
    py = column_top - 17
    for step_index, step in enumerate(recipe['preparation']):
        c.setFillColor(GOLD_INK)
        c.setFont('Body', 6.5)
        c.drawString(right_x, py + 4, f'{step_index + 1:02d}')
        py = draw_lines(c, step, right_x + 24, py + 4, right_width - 24, size=9.3, leading=13, color=INK) - 7
    draw_rule(c, right_x, max(54, py - 1), W - M)
    draw_label(c, 'Tempo', right_x, max(42, py - 14))
    draw_lines(c, recipe['time']['label'], right_x + 45, max(42, py - 14), right_width - 45, size=8.4, leading=11, color=LEAF, max_lines=2)
    if min(iy, py) < 58:
        raise ValueError(f'Receita {recipe["name"]}: conteúdo ultrapassa a margem inferior (y={min(iy, py):.1f}).')


def shopping_page(doc: PremiumPDF) -> None:
    doc.begin(PAPER, section='Lista de compras')
    c = doc.c
    draw_label(c, 'Organização', M, H - 66)
    c.setFillColor(INK)
    c.setFont('Editorial', 46)
    c.drawString(M, H - 122, 'Lista de compras')
    c.setFillColor(LEAF)
    draw_lines(c, 'As quantidades iguais foram somadas somente quando usam a mesma unidade. Ingredientes “a gosto” permanecem sem quantidade.', M, H - 151, W - M * 2, size=8.5, leading=12)
    groups: dict[str, list[dict]] = {}
    for item in doc.data['shoppingList']:
        groups.setdefault(item['section'], []).append(item)
    columns = [[], [], []]
    heights = [0, 0, 0]
    for section, items in groups.items():
        target = heights.index(min(heights))
        columns[target].append((section, items))
        heights[target] += 32 + len(items) * 20
    gap = 20
    width = (W - M * 2 - gap * 2) / 3
    for col_index, sections in enumerate(columns):
        x = M + col_index * (width + gap)
        y = H - 196
        for section, items in sections:
            c.setFillColor(FOREST)
            c.setFont('Body', 7.2)
            c.drawString(x, y, clean(section).upper())
            draw_rule(c, x, y - 6, x + width, GOLD)
            y -= 22
            for item in items:
                c.setStrokeColor(Color(.09, .25, .21, alpha=.28))
                c.rect(x, y - 1, 8, 8, fill=0, stroke=1)
                y = draw_lines(c, item['formatted'], x + 14, y + 6, width - 14, size=7, leading=9.5, color=INK) - 8
            y -= 9


def planning_page(doc: PremiumPDF) -> None:
    doc.begin(IVORY, section='Planejamento')
    c = doc.c
    draw_label(c, 'Seu plano', M, H - 66)
    c.setFont('Editorial', 43)
    c.setFillColor(INK)
    c.drawString(M, H - 120, 'Receitas que quero preparar')
    c.setFont('EditorialItalic', 43)
    c.setFillColor(GOLD_INK)
    c.drawString(M, H - 162, 'nesta semana.')
    y = H - 215
    for index in range(1, 8):
        c.setStrokeColor(Color(.09, .25, .21, alpha=.35))
        c.rect(M, y - 3, 11, 11, fill=0, stroke=1)
        c.setFillColor(LEAF)
        c.setFont('Body', 7)
        c.drawString(M + 20, y, f'0{index}')
        draw_rule(c, M + 45, y - 2, W - M)
        y -= 38
    draw_label(c, 'Anotações', M, y + 3)
    y -= 16
    for _ in range(8):
        draw_rule(c, M, y, W - M, Color(.09, .25, .21, alpha=.18))
        y -= 29


def about_page(doc: PremiumPDF, root: Path) -> None:
    doc.begin(SAGE, section='Sobre a nutricionista')
    c = doc.c
    portrait = root / doc.data['portraitImage']
    draw_cover_image(c, portrait, M, 122, 215, H - 190, anchor_x=.92, anchor_y=.4)
    c.setStrokeColor(GOLD_INK)
    c.rect(M + 9, 131, 197, H - 208, fill=0, stroke=1)
    x = 292
    draw_label(c, 'Por Gislaine Duarte', x, H - 78, FOREST)
    c.setFillColor(INK)
    c.setFont('Editorial', 40)
    c.drawString(x, H - 133, 'Ciência, escuta')
    c.setFont('EditorialItalic', 41)
    c.setFillColor(FOREST)
    c.drawString(x, H - 174, 'e vida real.')
    y = draw_lines(c, doc.data['authorBio'], x, H - 213, W - M - x, size=8.4, leading=13, color=FOREST)
    y -= 20
    draw_label(c, 'Identificação profissional', x, y, FOREST)
    c.setFillColor(INK)
    c.setFont('Body', 8.3)
    c.drawString(x, y - 20, 'Gislaine Muller Duarte')
    c.drawString(x, y - 36, 'Nutricionista · CRN-2 nº 22562')
    y -= 74
    draw_label(c, 'Quando a receita é só o começo', x, y, FOREST)
    y = draw_lines(c, 'A coleção ajuda a organizar possibilidades. O acompanhamento individualizado considera sua história, rotina, necessidades e objetivos.', x, y - 20, W - M - x, size=8.2, leading=12.5, color=FOREST)
    y -= 20
    label = 'CONHECER O ACOMPANHAMENTO'
    c.setFillColor(FOREST)
    c.rect(x, y - 28, W - M - x, 40, fill=1, stroke=0)
    c.setFillColor(IVORY)
    c.setFont('Body', 7)
    c.drawCentredString(x + (W - M - x) / 2, y - 13, label)
    c.linkURL(doc.data['contactUrl'], (x, y - 28, W - M, y + 12), relative=0)


def closing_page(doc: PremiumPDF) -> None:
    doc.begin(FOREST, footer=False)
    c = doc.c
    c.setStrokeColor(Color(.85, .75, .52, alpha=.45))
    c.circle(W / 2, H / 2 + 50, 190, fill=0, stroke=1)
    c.circle(W / 2, H / 2 + 50, 155, fill=0, stroke=1)
    draw_label(c, 'Um cuidado que continua', M, H - 105, GOLD_LIGHT)
    c.setFillColor(IVORY)
    c.setFont('Editorial', 48)
    c.drawCentredString(W / 2, H / 2 + 110, 'Sete receitas.')
    c.setFont('EditorialItalic', 48)
    c.setFillColor(SAGE)
    c.drawCentredString(W / 2, H / 2 + 62, 'Um jeito mais leve')
    c.drawCentredString(W / 2, H / 2 + 16, 'de começar.')
    draw_lines(c, doc.data['educationalNotice'], M + 70, H / 2 - 58, W - (M + 70) * 2, size=8.2, leading=13, color=IVORY)
    c.setFillColor(GOLD_LIGHT)
    c.setFont('Body', 7)
    c.drawCentredString(W / 2, 95, 'GISLAINEDUARTE.COM.BR')
    c.linkURL(doc.data['siteUrl'], (W / 2 - 90, 82, W / 2 + 90, 108), relative=0)
    c.setFillColor(Color(.80, .85, .78, alpha=1))
    c.setFont('Body', 6.3)
    c.drawCentredString(W / 2, 65, 'Gislaine Muller Duarte · Nutricionista · CRN-2 nº 22562')


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--data', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--root', required=True, type=Path)
    parser.add_argument('--editorial-font', required=True, type=Path)
    parser.add_argument('--editorial-italic-font', required=True, type=Path)
    parser.add_argument('--body-font', required=True, type=Path)
    args = parser.parse_args()
    data = json.loads(args.data.read_text(encoding='utf-8'))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='gislaine-recipes-fonts-') as directory:
        register_fonts(args.editorial_font, args.editorial_italic_font, args.body_font, Path(directory))
        doc = PremiumPDF(args.output, data)
        cover(doc, args.root)
        introduction(doc, args.root)
        how_to_use(doc)
        for index, recipe in enumerate(data['recipes']):
            draw_recipe(doc, args.root, recipe, index)
        shopping_page(doc)
        planning_page(doc)
        about_page(doc, args.root)
        closing_page(doc)
        doc.save()
    print(f'PDF gerado: {args.output} ({doc.page} páginas)')


if __name__ == '__main__':
    main()
