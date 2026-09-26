"""Create static TTFs for PDFKit from the project's licensed WOFF2 fonts."""
import sys
from pathlib import Path
sys.path.insert(0, 'tmp/product-python')
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

destination = Path('server/nutrition/fonts')
destination.mkdir(parents=True, exist_ok=True)
for name in ('body', 'editorial'):
    font = TTFont(f'public/fonts/{name}.woff2')
    if 'fvar' in font:
        weights = {'body': 400, 'editorial': 500}
        axes = {axis.axisTag: (weights[name] if axis.axisTag == 'wght' else axis.defaultValue) for axis in font['fvar'].axes}
        font = instantiateVariableFont(font, axes, inplace=True)
    font.flavor = None
    font.save(destination / f'{name}.ttf')
print('Static PDF fonts prepared; licenses in public/fonts/*-OFL.txt.')
