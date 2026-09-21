"""Checks structural parity and print integrity of the generated recipe edition."""

import json
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "tmp/pdfs/recipes-product.json").read_text(encoding="utf-8"))
PDF = ROOT / "artifacts/recipes/7-receitas-para-ajudar-voce-a-desinflamar.pdf"
reader = PdfReader(str(PDF))

assert len(DATA["recipes"]) == 7
assert len(reader.pages) == 14, f"Esperadas 14 páginas, obtidas {len(reader.pages)}"
assert DATA["title"] in (reader.metadata.title or "")
assert "Gislaine" in (reader.metadata.author or "")
assert reader.metadata.subject

for number, page in enumerate(reader.pages, start=1):
    box = page.mediabox
    assert abs(float(box.width) - 595.28) < 1
    assert abs(float(box.height) - 841.89) < 1
    assert page.extract_text().strip(), f"Página {number} sem texto extraível"

for index, recipe in enumerate(DATA["recipes"], start=4):
    text = " ".join(reader.pages[index - 1].extract_text().split())
    assert recipe["name"] in text, f"Nome ausente da página {index}: {recipe['name']}"
    for ingredient in recipe["ingredients"]:
        assert ingredient["formatted"] in text, f"Ingrediente ausente da página {index}: {ingredient['formatted']}"
    for step in recipe["preparation"]:
        assert step in text, f"Preparo ausente da página {index}: {step}"
    xobjects = reader.pages[index - 1].get("/Resources", {}).get("/XObject", {})
    assert any(obj.get_object().get("/Subtype") == "/Image" for obj in xobjects.values()), f"Foto ausente da página {index}"

assert any(page.get("/Annots") for page in reader.pages), "PDF sem links clicáveis"
assert "Lista de compras" in reader.pages[10].extract_text()
assert "CRN-10" in reader.pages[12].extract_text()

print("PDF: 14 páginas A4, sete receitas completas, fotos, texto extraível, metadados e links validados.")
