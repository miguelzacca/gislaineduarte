"""Checks structural parity and print integrity of the generated recipe edition."""

import json
import re
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
editions = json.loads((ROOT / "artifacts/recipes/editions.json").read_text(encoding="utf-8"))
for edition in editions:
    name = edition["name"]
    if not edition["available"]:
        assert edition["recipeCount"] == 0
        assert not (ROOT / f"artifacts/recipes/{name}-offline.html").exists()
        assert not (ROOT / f"artifacts/recipes/{name}.pdf").exists()
        print(f"{name}: em preparação, sem arquivos de receitas não revisadas.")
        continue
    html = (ROOT / f"artifacts/recipes/{name}-offline.html").read_text(encoding="utf-8")
    data = json.loads(re.search(r'<script id="product-data" type="application/json">(.*?)</script>', html, re.S).group(1))
    reader = PdfReader(str(ROOT / f"artifacts/recipes/{name}.pdf"))
    assert data["title"] in str(reader.metadata.get('/Title').get_object())
    assert "Gislaine" in str(reader.metadata.get('/Author').get_object())
    assert reader.metadata.get('/Subject').get_object()
    texts = []
    images = 0
    for number, page in enumerate(reader.pages, start=1):
        assert abs(float(page.mediabox.width) - 595.28) < 1
        assert abs(float(page.mediabox.height) - 841.89) < 1
        text = " ".join(page.extract_text().split())
        assert text, f"Página {number} sem texto extraível"
        texts.append(text)
        images += sum(obj.get_object().get("/Subtype") == "/Image" for obj in page.get("/Resources", {}).get("/XObject", {}).values())
    combined = " ".join(texts)
    for recipe in data["recipes"]:
        assert recipe["name"] in combined
        for step in recipe["preparation"]:
            assert " ".join(step.split()) in combined, f"Preparo ausente: {recipe['name']}"
    assert images >= len(data["recipes"]), "Fotografias ausentes"
    assert any(page.get("/Annots") for page in reader.pages), "PDF sem links clicáveis"
    assert "Lista de compras" in combined
    assert "CRN-2" in combined
    print(f"{name}: {len(reader.pages)} páginas A4; {len(data['recipes'])} receitas, fotografias, texto, metadados e links validados.")
