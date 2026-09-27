"""Rebuild the curated catalogue from the official TACO PDF (no runtime network).
Usage: python scripts/import-nutrition-foods.py tmp/nutrition/taco.pdf
Requires pymupdf; food composition is factual tabular data, per 100 g edible portion.
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, 'tmp/product-python')
import pymupdf

SOURCE = 'https://nepa.unicamp.br/wp-content/uploads/sites/27/2023/10/taco_4_edicao_ampliada_e_revisada.pdf'
# TACO id, stable app id, display name, food group, household serving grams, unit.
CHOICES = [
    (1, 'brown-rice', 'Arroz integral cozido', 'Cereais e raízes', 25, 'colher de sopa'),
    (3, 'rice', 'Arroz branco cozido', 'Cereais e raízes', 25, 'colher de sopa'),
    (7, 'oats', 'Aveia em flocos', 'Cereais e raízes', 15, 'colher de sopa'),
    (52, 'bread', 'Pão integral', 'Cereais e raízes', 25, 'fatia'),
    (53, 'french-bread', 'Pão francês', 'Cereais e raízes', 50, 'unidade'),
    (62, 'polenta', 'Polenta pré-cozida', 'Cereais e raízes', 100, 'porção'),
    (64, 'pumpkin', 'Abóbora cabotiá cozida', 'Hortaliças', 40, 'colher de servir'),
    (70, 'zucchini', 'Abobrinha cozida', 'Hortaliças', 30, 'colher de sopa'),
    (78, 'lettuce', 'Alface crespa', 'Hortaliças', 10, 'folha'),
    (86, 'arracacha', 'Mandioquinha cozida', 'Cereais e raízes', 80, 'unidade pequena'),
    (88, 'sweet-potato', 'Batata-doce cozida', 'Cereais e raízes', 80, 'porção'),
    (91, 'potato', 'Batata inglesa cozida', 'Cereais e raízes', 100, 'unidade média'),
    (95, 'eggplant', 'Berinjela cozida', 'Hortaliças', 30, 'colher de sopa'),
    (97, 'beet', 'Beterraba cozida', 'Hortaliças', 30, 'colher de sopa'),
    (100, 'broccoli', 'Brócolis cozido', 'Hortaliças', 30, 'ramo'),
    (109, 'carrot', 'Cenoura cozida', 'Hortaliças', 25, 'colher de sopa'),
    (112, 'chayote', 'Chuchu cozido', 'Hortaliças', 30, 'colher de sopa'),
    (115, 'kale', 'Couve-manteiga crua', 'Hortaliças', 20, 'folha'),
    (118, 'cauliflower', 'Couve-flor cozida', 'Hortaliças', 30, 'ramo'),
    (129, 'cassava', 'Mandioca cozida', 'Cereais e raízes', 50, 'pedaço'),
    (142, 'cucumber', 'Pepino cru', 'Hortaliças', 20, 'fatia grossa'),
    (149, 'cabbage', 'Repolho branco cru', 'Hortaliças', 20, 'colher de servir'),
    (152, 'arugula', 'Rúcula', 'Hortaliças', 10, 'porção'),
    (157, 'tomato', 'Tomate cru', 'Hortaliças', 80, 'unidade pequena'),
    (163, 'avocado', 'Abacate', 'Frutas', 45, 'colher de sopa'),
    (164, 'pineapple', 'Abacaxi', 'Frutas', 80, 'fatia'),
    (172, 'plum', 'Ameixa fresca', 'Frutas', 50, 'unidade'),
    (179, 'banana', 'Banana-nanica', 'Frutas', 80, 'unidade'),
    (182, 'silver-banana', 'Banana-prata', 'Frutas', 65, 'unidade'),
    (200, 'guava', 'Goiaba vermelha', 'Frutas', 100, 'unidade'),
    (207, 'kiwi', 'Kiwi', 'Frutas', 75, 'unidade'),
    (214, 'orange', 'Laranja-pera', 'Frutas', 130, 'unidade'),
    (222, 'apple', 'Maçã Fuji com casca', 'Frutas', 130, 'unidade'),
    (225, 'papaya', 'Mamão Formosa', 'Frutas', 150, 'fatia'),
    (229, 'mango', 'Manga Palmer', 'Frutas', 100, 'porção'),
    (235, 'watermelon', 'Melancia', 'Frutas', 150, 'fatia'),
    (236, 'melon', 'Melão', 'Frutas', 100, 'fatia'),
    (239, 'strawberry', 'Morango', 'Frutas', 12, 'unidade'),
    (243, 'pear', 'Pera Williams', 'Frutas', 130, 'unidade'),
    (251, 'tangerine', 'Tangerina poncã', 'Frutas', 100, 'unidade'),
    (256, 'grapes', 'Uva Itália', 'Frutas', 50, 'cacho pequeno'),
    (260, 'olive-oil', 'Azeite de oliva extravirgem', 'Gorduras e sementes', 8, 'colher de sobremesa'),
    (274, 'white-fish', 'Abadejo cozido', 'Proteínas', 100, 'filé pequeno'),
    (317, 'salmon', 'Salmão sem pele grelhado', 'Proteínas', 100, 'filé pequeno'),
    (326, 'ground-beef', 'Acém moído cozido', 'Proteínas', 25, 'colher de sopa'),
    (377, 'beef', 'Patinho sem gordura grelhado', 'Proteínas', 100, 'bife pequeno'),
    (408, 'chicken', 'Peito de frango cozido', 'Proteínas', 100, 'filé pequeno'),
    (410, 'grilled-chicken', 'Peito de frango grelhado', 'Proteínas', 100, 'filé pequeno'),
    (448, 'yogurt', 'Iogurte natural', 'Laticínios', 170, 'pote'),
    (449, 'skim-yogurt', 'Iogurte natural desnatado', 'Laticínios', 170, 'pote'),
    (486, 'egg-white', 'Clara de ovo cozida', 'Proteínas', 30, 'unidade'),
    (488, 'egg', 'Ovo inteiro cozido', 'Proteínas', 50, 'unidade'),
    (533, 'couscous', 'Cuscuz de milho cozido com sal', 'Cereais e raízes', 25, 'colher de sopa'),
    (561, 'beans', 'Feijão carioca cozido', 'Leguminosas', 80, 'concha pequena'),
    (563, 'cowpea', 'Feijão-fradinho cozido', 'Leguminosas', 80, 'concha pequena'),
    (567, 'black-beans', 'Feijão preto cozido', 'Leguminosas', 80, 'concha pequena'),
    (577, 'lentils', 'Lentilha cozida', 'Leguminosas', 80, 'concha pequena'),
    (582, 'soy-milk', 'Bebida de soja natural', 'Leguminosas', 200, 'copo'),
    (589, 'brazil-nut', 'Castanha-do-Brasil', 'Gorduras e sementes', 5, 'unidade'),
    (597, 'walnut', 'Noz', 'Gorduras e sementes', 5, 'unidade'),
]


def number(value):
    if value == 'Tr':
        return 0
    if value in ('NA', ''):
        return None
    return float(value.replace(',', '.'))


def main():
    document = pymupdf.open(sys.argv[1])
    numeric = r'(?:[0-9]+(?:,[0-9]+)?|Tr|NA)'
    pattern = re.compile(r'(?m)^\s*(\d+)\s*\n([^\n]*[A-Za-zÀ-ÿ][^\n]*)\n' + ''.join(r'\s*(' + numeric + r')\s*\n' for _ in range(11)))
    rows = {}
    for page in document:
        if not 28 <= page.number < 68 or page.number % 2:
            continue
        for match in pattern.finditer(page.get_text()):
            key = int(match[1])
            if key in rows:
                continue
            values = [number(match[i]) for i in range(3, 14)]
            rows[key] = {'sourceName': match[2].strip(), 'sourcePage': page.number + 1,
                         'kcal': values[1], 'protein': values[3], 'fat': values[4],
                         'carbs': values[6], 'fiber': values[7], 'calcium': values[9]}
    # TACO leaves the final cells blank for pure oils. NA macronutrients are zero here.
    rows[260] = {'sourceName': 'Azeite, de oliva, extra virgem', 'sourcePage': 45,
                 'kcal': 884, 'protein': 0, 'fat': 100, 'carbs': 0, 'fiber': 0, 'calcium': None}
    output = []
    for taco_id, food_id, name, group, grams, unit in CHOICES:
        row = rows[taco_id]
        # Minerals are read by physical table row from the facing page.
        page = document[row['sourcePage']]
        words = page.get_text('words')
        transformed = [(pymupdf.Rect(w[:4]) * page.rotation_matrix, w[4]) for w in words]
        anchors = [(box, text) for box, text in transformed if text == str(taco_id) and box.x0 < 110]
        if len(anchors) != 1:
            raise ValueError(f'Mineral row ambiguous: {taco_id}')
        box = anchors[0][0]
        cells = sorted([(b.x0, t) for b, t in transformed if abs(b.y0 - box.y0) < 3 and b.x0 > box.x1 + 1])
        try:
            vals = [number(t) for _, t in cells[:7]]
        except ValueError as exc:
            raise ValueError(f'{taco_id} {row} {cells[:7]}') from exc
        if taco_id == 260:
            vals = [None] * 7
        if len(vals) != 7:
            raise ValueError(f'Missing mineral cells: {taco_id}')
        row.update(phosphorus=vals[1], iron=vals[2], sodium=vals[3], potassium=vals[4])
        allergens = []
        if food_id in ('oats', 'bread', 'french-bread'):
            allergens.append('gluten')
        if group == 'Laticínios':
            allergens.extend(['milk', 'lactose'])
        if food_id in ('egg', 'egg-white'):
            allergens.append('egg')
        if food_id in ('salmon', 'white-fish'):
            allergens.append('fish')
        if food_id in ('brazil-nut', 'walnut'):
            allergens.append('nuts')
        if food_id == 'soy-milk':
            allergens.append('soy')
        animal = group in ('Laticínios', 'Proteínas')
        output.append(dict(id=food_id, name=name, group=group, tacoId=taco_id,
                           portionGrams=grams, portionLabel=unit, allergens=allergens,
                           vegan=not animal, vegetarian=not animal or group == 'Laticínios' or food_id in ('egg', 'egg-white'),
                           image=f'/images/foods/{food_id}.jpg', **row))
    destination = Path('src/data/nutrition-foods.json')
    # Nutrient imports must retain the approved photography and its attribution.
    existing_photos = {food['id']: food.get('photo') for food in json.loads(destination.read_text(encoding='utf8')).get('foods', [])} if destination.exists() else {}
    for food in output:
        if existing_photos.get(food['id']):
            food['photo'] = existing_photos[food['id']]
    destination.write_text(json.dumps({'source': SOURCE, 'edition': 'TACO, NEPA/UNICAMP, 4ª edição, 2011',
                                      'notes': 'Valores por 100 g da parte comestível. Traços (Tr) aproximados por zero. Medidas caseiras estimadas; priorize a pesagem. Fotografias reais de referência: não representam a porção prescrita e podem mostrar o ingrediente antes do preparo. Créditos e licenças acompanham cada imagem.', 'foods': output}, ensure_ascii=False, indent=2), encoding='utf8')
    print(f'{len(output)} foods imported with source row and page.')


if __name__ == '__main__':
    main()
