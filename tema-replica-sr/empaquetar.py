# Empaqueta un tema nuevo y completo: Dawn (tema base oficial de Shopify) +
# las secciones sr-* + la caja de contrareembolso. Deja dist/reliefpath-sr.zip
# con los archivos en la raíz, que es como lo pide themeCreate.
#
#   git clone --depth 1 --branch v15.4.1 https://github.com/Shopify/dawn.git <ruta>
#   python3 empaquetar.py <ruta-de-dawn>
import json, os, re, shutil, sys, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
DAWN = sys.argv[1]
OUT = os.path.join(HERE, 'dist')
BUILD = os.path.join(OUT, 'tema')
THEME_DIRS = ['assets', 'config', 'layout', 'locales', 'sections', 'snippets', 'templates']

shutil.rmtree(BUILD, ignore_errors=True)
for d in THEME_DIRS:
    shutil.copytree(os.path.join(DAWN, d), os.path.join(BUILD, d))

# Lo nuestro encima de Dawn
for d in ['assets', 'sections', 'snippets', 'templates']:
    for f in os.listdir(os.path.join(HERE, d)):
        shutil.copy(os.path.join(HERE, d, f), os.path.join(BUILD, d, f))

def load(path):
    s = open(path, encoding='utf-8').read()
    return json.loads(re.sub(r'/\*.*?\*/', '', s, count=1, flags=re.S))

def save(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# La barra de anuncios va encima de la cabecera, como en la referencia.
announce = load(os.path.join(HERE, 'anuncio.json'))

hg = os.path.join(BUILD, 'sections', 'header-group.json')
group = load(hg)
header = group['sections']['header']
header['settings'].update({
    'enable_country_selector': False,
    'enable_language_selector': False,
    'logo_position': 'middle-left',
})
group['sections'] = {'anuncio': announce, 'header': header}
group['order'] = ['anuncio', 'header']
save(hg, group)
os.makedirs(os.path.join(OUT, 'sections'), exist_ok=True)
shutil.copy(hg, os.path.join(OUT, 'sections', 'header-group.json'))

# Colores de la marca en los esquemas de Dawn (el cabecero, el pie, el
# carrito y las páginas legales los usan).
sd = os.path.join(BUILD, 'config', 'settings_data.json')
settings = load(sd)
current = json.loads(json.dumps(settings['presets']['Default']))
ink, accent, soft = '#1B2140', '#D92D3F', '#FBF4EC'
schemes = current['color_schemes']
schemes['scheme-1']['settings'].update({'text': ink, 'button': accent, 'button_label': '#FFFFFF',
                                        'secondary_button_label': ink, 'shadow': ink})
schemes['scheme-2']['settings'].update({'background': soft, 'text': ink, 'button': accent,
                                        'button_label': '#FFFFFF', 'secondary_button_label': ink, 'shadow': ink})
schemes['scheme-3']['settings'].update({'background': ink, 'text': '#FFFFFF', 'button': '#FFFFFF',
                                        'button_label': ink, 'secondary_button_label': '#FFFFFF'})
settings['current'] = current
save(sd, settings)
os.makedirs(os.path.join(OUT, 'config'), exist_ok=True)
shutil.copy(sd, os.path.join(OUT, 'config', 'settings_data.json'))

# Pie de página oscuro, a juego con las secciones en tinta.
fg = os.path.join(BUILD, 'sections', 'footer-group.json')
footer = load(fg)
footer['sections']['footer']['settings']['color_scheme'] = 'scheme-3'
save(fg, footer)
shutil.copy(fg, os.path.join(OUT, 'sections', 'footer-group.json'))

# El idioma principal de la tienda es el inglés, así que Shopify pinta los
# textos del tema con en.default.json. Se pone ahí el castellano de Dawn para
# que carrito, buscador y pie salgan en español, y se añaden los textos
# propios que usa la caja de contrareembolso (waistzen_*).
extra = load(os.path.join(HERE, 'locales-extra', 'waistzen.json'))
es = load(os.path.join(BUILD, 'locales', 'es.json'))
es.update(extra)
save(os.path.join(BUILD, 'locales', 'es.json'), es)
save(os.path.join(BUILD, 'locales', 'en.default.json'), es)
# Copia suelta, para poder subir solo los idiomas a un tema que ya existe.
os.makedirs(os.path.join(OUT, 'locales'), exist_ok=True)
for f in ['es.json', 'en.default.json']:
    shutil.copy(os.path.join(BUILD, 'locales', f), os.path.join(OUT, 'locales', f))

os.makedirs(OUT, exist_ok=True)
zpath = os.path.join(OUT, 'reliefpath-sr.zip')
with zipfile.ZipFile(zpath, 'w', zipfile.ZIP_DEFLATED) as z:
    for root, _, files in os.walk(BUILD):
        for f in sorted(files):
            full = os.path.join(root, f)
            z.write(full, os.path.relpath(full, BUILD))
shutil.rmtree(BUILD)
print('ok', zpath, os.path.getsize(zpath), 'bytes')
