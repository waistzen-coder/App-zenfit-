# Empaqueta el tema «ReliefPath · Lab»: Dawn 15.4.1 (tema base oficial de
# Shopify) + las secciones lab-*. Deja dist/reliefpath-lab.zip con los
# archivos en la raíz, que es como lo pide themeCreate. No toca ningún tema
# existente: el zip se sube como tema nuevo.
#
#   git clone --depth 1 --branch v15.4.1 https://github.com/Shopify/dawn.git <ruta>
#   python3 plantillas.py && python3 empaquetar_lab.py <ruta-de-dawn>
import json, os, re, shutil, sys, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
PARENT = os.path.dirname(HERE)
DAWN = sys.argv[1]
OUT = os.path.join(HERE, 'dist')
BUILD = os.path.join(OUT, 'tema')
THEME_DIRS = ['assets', 'config', 'layout', 'locales', 'sections', 'snippets', 'templates']

shutil.rmtree(OUT, ignore_errors=True)
for d in THEME_DIRS:
    shutil.copytree(os.path.join(DAWN, d), os.path.join(BUILD, d))

# Lo del tema Lab encima de Dawn (incluye header-group.json, footer-group.json,
# cart-icon-bubble.liquid y las plantillas que sustituyen a las de Dawn).
for d in ['assets', 'sections', 'snippets', 'templates']:
    for f in sorted(os.listdir(os.path.join(HERE, d))):
        shutil.copy(os.path.join(HERE, d, f), os.path.join(BUILD, d, f))


def load(path):
    s = open(path, encoding='utf-8').read()
    return json.loads(re.sub(r'/\*.*?\*/', '', s, count=1, flags=re.S))


def save(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def patch(rel, pairs):
    path = os.path.join(BUILD, rel)
    s = open(path, encoding='utf-8').read()
    for old, new in pairs:
        assert s.count(old) == 1, (rel, old)
        s = s.replace(old, new)
    open(path, 'w', encoding='utf-8').write(s)


# Ajustes del tema: grupo propio con los descuentos de los packs, el producto
# del recargo de contrareembolso, el modo oscuro y el precio tachado.
ss_path = os.path.join(BUILD, 'config', 'settings_schema.json')
schema = load(ss_path)
schema.insert(1, {
    'name': 'ReliefPath Lab',
    'settings': [
        {'type': 'paragraph', 'content': 'Estos valores alimentan los precios de los packs en todo el tema. Deben coincidir con los descuentos automáticos de la tienda (Descuentos).'},
        {'type': 'range', 'id': 'lab_disc_2', 'label': 'Descuento del pack de 2', 'min': 0, 'max': 50, 'step': 1, 'unit': '%', 'default': 20},
        {'type': 'range', 'id': 'lab_disc_3', 'label': 'Descuento del pack de 3', 'min': 0, 'max': 50, 'step': 1, 'unit': '%', 'default': 30},
        {'type': 'product', 'id': 'lab_fee_product', 'label': 'Producto del recargo de contrareembolso', 'info': 'Vacío: sin recargo y sin botón de contrareembolso en la ficha.'},
        {'type': 'checkbox', 'id': 'lab_show_compare', 'label': 'Tachar el «precio comparado» del producto', 'default': False,
         'info': 'Solo si ese precio se ha aplicado de verdad: en la UE el precio anterior debe ser el más bajo de los últimos 30 días.'},
        {'type': 'checkbox', 'id': 'lab_dark', 'label': 'Modo oscuro automático', 'default': True,
         'info': 'Sigue el ajuste claro/oscuro del móvil o del ordenador del cliente.'},
        {'type': 'product', 'id': 'lab_main_product', 'label': 'Producto de los packs',
         'info': 'El carrito lateral propone pasar al pack siguiente de este producto.'},
        {'type': 'header', 'content': 'Movimiento y velocidad'},
        {'type': 'checkbox', 'id': 'lab_transitions', 'label': 'Transiciones entre páginas y precarga', 'default': True,
         'info': 'La foto pasa de la tarjeta a la ficha sin cortes y las páginas se precargan al pasar el ratón. Se ignora en navegadores sin soporte.'},
        {'type': 'checkbox', 'id': 'lab_progress', 'label': 'Barra de progreso de lectura', 'default': True},
    ],
})
save(ss_path, schema)

sd_path = os.path.join(BUILD, 'config', 'settings_data.json')
settings = load(sd_path)
cur = json.loads(json.dumps(settings['presets']['Default']))
ink, bg, surface, accent = '#0B1220', '#F6F7F9', '#FFFFFF', '#C8102E'
sch = cur['color_schemes']
sch['scheme-1']['settings'].update({'background': bg, 'text': ink, 'button': ink, 'button_label': '#FFFFFF',
                                    'secondary_button_label': ink, 'shadow': ink})
sch['scheme-2']['settings'].update({'background': surface, 'text': ink, 'button': ink, 'button_label': '#FFFFFF',
                                    'secondary_button_label': ink, 'shadow': ink})
sch['scheme-3']['settings'].update({'background': ink, 'text': '#FFFFFF', 'button': '#FFFFFF',
                                    'button_label': ink, 'secondary_button_label': '#FFFFFF'})
sch['scheme-4']['settings'].update({'background': accent, 'text': '#FFFFFF', 'button': '#FFFFFF',
                                    'button_label': accent, 'secondary_button_label': '#FFFFFF'})
cur.update({
    # Las fuentes van en el tema (lab.css): Dawn no descarga ni precarga las suyas.
    'type_header_font': 'sans_serif_n7', 'type_body_font': 'sans_serif_n4',
    'buttons_radius': 40, 'inputs_radius': 12, 'card_corner_radius': 16, 'media_radius': 16,
    'text_boxes_radius': 16, 'popup_corner_radius': 16, 'drawer_border_opacity': 10,
    'sale_badge_color_scheme': 'scheme-4', 'badge_corner_radius': 40,
    'animations_reveal_on_scroll': False,
    # Carrito lateral: añadir no saca al cliente de la página.
    'cart_type': 'drawer',
    'lab_disc_2': 20, 'lab_disc_3': 30, 'lab_fee_product': 'contrareembolso-gastos-de-gestion',
    'lab_show_compare': False, 'lab_dark': True,
    'lab_main_product': 'juego-de-ventosa-electrica-con-cable', 'lab_transitions': True, 'lab_progress': True,
})
settings['current'] = cur
save(sd_path, settings)

# Cabecera de la página: SEO de la portada (la tienda no tiene descripción y
# su título es solo «Waistzen»), hoja de estilos y fuentes del tema, script
# y clase del cuerpo.
SEO = """{%- liquid
  assign lab_title = page_title
  assign lab_description = page_description
  if request.page_type == 'index'
    if page_title == blank or page_title == shop.name
      assign lab_title = 'lab.meta_title' | t
    endif
    if page_description == blank
      assign lab_description = 'lab.meta_description' | t
    endif
  endif
-%}
"""
# Transiciones entre páginas (se cancelan si el cliente toca algo, para no
# frenar la respuesta) y precarga de enlaces al pasar el ratón, sin carrito,
# checkout ni cuenta. Solo navegadores que lo soportan; el resto lo ignora.
MODERN = '''    {%- if settings.lab_transitions -%}
      <style>@media (prefers-reduced-motion: no-preference){@view-transition{navigation:auto}}</style>
      <script>
        window.addEventListener('pagereveal', function (e) {
          var vt = e.viewTransition; if (!vt) return;
          var skip = function () { try { vt.skipTransition(); } catch (_) {} };
          ['pointerdown', 'keydown', 'wheel'].forEach(function (n) { addEventListener(n, skip, { once: true, passive: true }); });
        });
      </script>
      <script type="speculationrules">
        {"prefetch":[{"where":{"and":[{"href_matches":"/*"},{"not":{"href_matches":["/cart*","/checkout*","/checkouts/*","/account*","/*/cart*","/*/checkout*","/*/account*","/discount/*","/password*"]}},{"not":{"selector_matches":"[rel~=nofollow], [target=_blank], [data-no-prefetch]"}}]},"eagerness":"moderate"}]}
      </script>
    {%- endif -%}
'''
patch('layout/theme.liquid', [
    ('    <meta name="theme-color" content="">', '    <meta name="theme-color" content="#F6F7F9">\n' + MODERN.rstrip('\n')),
    ('    <title>\n      {{ page_title }}', SEO + '    <title>\n      {{ lab_title }}'),
    ('{%- unless page_title contains shop.name %}', '{%- unless lab_title contains shop.name %}'),
    ('    {% if page_description %}\n      <meta name="description" content="{{ page_description | escape }}">',
     '    {% if lab_description != blank %}\n      <meta name="description" content="{{ lab_description | escape }}">'),
    ("    <script src=\"{{ 'search-form.js' | asset_url }}\" defer=\"defer\"></script>",
     "    <script src=\"{{ 'search-form.js' | asset_url }}\" defer=\"defer\"></script>\n"
     "    <script src=\"{{ 'lab.js' | asset_url }}\" defer=\"defer\"></script>"),
    ("    {{ 'base.css' | asset_url | stylesheet_tag }}",
     "    {{ 'base.css' | asset_url | stylesheet_tag }}\n"
     "    {{ 'lab.css' | asset_url | stylesheet_tag }}\n"
     "    {{ 'lab-inter.woff2' | asset_url | preload_tag: as: 'font', type: 'font/woff2' }}\n"
     "    {{ 'lab-intertight.woff2' | asset_url | preload_tag: as: 'font', type: 'font/woff2' }}"),
    ('  <body class="gradient', '  <body class="lab{% if settings.lab_dark %} lab-dark-ok{% endif %} gradient'),
    ('    <a class="skip-to-content-link button visually-hidden" href="#MainContent">',
     '    {%- if settings.lab_progress -%}<div class="lab-progress" aria-hidden="true"></div>{%- endif -%}\n'
     '    <a class="skip-to-content-link button visually-hidden" href="#MainContent">'),
])

# Carrito lateral de Dawn: propuesta de subir de pack debajo de las líneas.
patch('snippets/cart-drawer.liquid', [
    ('                </table>\n              </div>\n            {%- endif -%}\n            <p id="CartDrawer-LiveRegionText"',
     '                </table>\n              </div>\n              {%- render \'lab-cart-upsell\' -%}\n            {%- endif -%}\n            <p id="CartDrawer-LiveRegionText"'),
])
patch('snippets/meta-tags.liquid', [
    ('  assign og_title = page_title | default: shop.name',
     SEO.replace('{%- liquid\n', '').replace('\n-%}\n', '\n') + '  assign og_title = lab_title | default: shop.name'),
    ('  assign og_description = page_description | default: shop.description | default: shop.name',
     '  assign og_description = lab_description | default: shop.description | default: shop.name'),
])

# Idiomas: el idioma principal de la tienda es el inglés, así que Shopify
# pinta los textos con en.default.json. Se pone ahí el castellano de Dawn más
# los textos propios (lab.* y waistzen_*), y el resto de idiomas se completa
# con el castellano para que ninguno quede sin texto.
extra = load(os.path.join(HERE, 'locales-extra', 'lab.json'))
extra.update(load(os.path.join(PARENT, 'locales-extra', 'waistzen.json')))
es = load(os.path.join(BUILD, 'locales', 'es.json'))
es.update(extra)
save(os.path.join(BUILD, 'locales', 'es.json'), es)
save(os.path.join(BUILD, 'locales', 'en.default.json'), es)


def fill(dst, src):
    for k, v in src.items():
        if isinstance(v, dict):
            fill(dst.setdefault(k, {}), v)
        else:
            dst.setdefault(k, v)


for f in sorted(os.listdir(os.path.join(BUILD, 'locales'))):
    if not f.endswith('.json') or '.schema.' in f or f in ('es.json', 'en.default.json'):
        continue
    path = os.path.join(BUILD, 'locales', f)
    data = load(path)
    fill(data, es)
    save(path, data)

# Copia suelta de los archivos de Dawn que cambia este script, para poder
# subirlos uno a uno (themeFilesUpsert) a un tema que ya existe.
LOOSE = os.path.join(OUT, 'sueltos')
for rel in ['layout/theme.liquid', 'snippets/meta-tags.liquid', 'snippets/cart-drawer.liquid',
            'config/settings_schema.json', 'config/settings_data.json'] + \
           ['locales/' + f for f in sorted(os.listdir(os.path.join(BUILD, 'locales'))) if f.endswith('.json') and '.schema.' not in f]:
    os.makedirs(os.path.dirname(os.path.join(LOOSE, rel)), exist_ok=True)
    shutil.copy(os.path.join(BUILD, rel), os.path.join(LOOSE, rel))

zpath = os.path.join(OUT, 'reliefpath-lab.zip')
with zipfile.ZipFile(zpath, 'w', zipfile.ZIP_DEFLATED) as z:
    for root, _, files in os.walk(BUILD):
        for f in sorted(files):
            full = os.path.join(root, f)
            z.write(full, os.path.relpath(full, BUILD))
print('ok', zpath, os.path.getsize(zpath), 'bytes')
