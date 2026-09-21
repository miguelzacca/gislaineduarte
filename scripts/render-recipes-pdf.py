#!/usr/bin/env python
"""Renderiza todas as páginas do PDF para inspeção visual em contato."""

from __future__ import annotations

import argparse
from pathlib import Path

import pypdfium2 as pdfium
from PIL import Image, ImageDraw, ImageFont


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('pdf', type=Path)
    parser.add_argument('--out', type=Path, default=Path('tmp/pdfs/rendered'))
    parser.add_argument('--scale', type=float, default=1.5)
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    document = pdfium.PdfDocument(str(args.pdf))
    previews = []
    for index in range(len(document)):
        page = document[index]
        image = page.render(scale=args.scale).to_pil().convert('RGB')
        destination = args.out / f'page-{index + 1:02d}.png'
        image.save(destination, optimize=True)
        thumb = image.copy()
        thumb.thumbnail((430, 610), Image.Resampling.LANCZOS)
        previews.append((index + 1, thumb))
    columns = 4
    rows = (len(previews) + columns - 1) // columns
    sheet = Image.new('RGB', (columns * 450, rows * 650), (226, 229, 222))
    draw = ImageDraw.Draw(sheet)
    for position, (number, preview) in enumerate(previews):
        x = position % columns * 450 + (450 - preview.width) // 2
        y = position // columns * 650 + 26
        sheet.paste(preview, (x, y))
        draw.text((position % columns * 450 + 20, position // columns * 650 + 622), f'{number:02d}', fill=(23, 63, 53))
    contact = args.out / 'contact-sheet.png'
    sheet.save(contact, optimize=True)
    print(f'{len(previews)} páginas renderizadas em {args.out}; contato: {contact}')


if __name__ == '__main__':
    main()

