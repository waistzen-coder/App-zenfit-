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
        {'type': 'checkbox', 'id': 'lab_price_es', 'label': 'Precios con el formato de España («49,95 €»)', 'default': True,
         'info': 'Apagado, se usa el formato de moneda de la tienda (Configuración › General).'},
        {'type': 'header', 'content': 'Pago al recibirlo'},
        {'type': 'checkbox', 'id': 'lab_cod_fee', 'label': 'Cobrar un recargo por pagar al recibirlo', 'default': False,
         'info': 'Apagado, el tema dice «sin recargo» en todas partes, como tu página de Envíos. Encendido, añade al pedido el producto de abajo y lo avisa antes de pagar.'},
        {'type': 'product', 'id': 'lab_fee_product', 'label': 'Producto del recargo', 'info': 'Solo se usa si el recargo está encendido.'},
        {'type': 'header', 'content': 'Entrega estimada'},
        {'type': 'checkbox', 'id': 'lab_eta', 'label': 'Enseñar la fecha de entrega («Recíbelo entre el jueves 12 y el viernes 13»)', 'default': True,
         'info': 'Apagado, se enseña «Entrega en 24–48 h laborables». La fecha cuenta días laborables y festivos nacionales, con la hora de Madrid.'},
        {'type': 'range', 'id': 'lab_eta_cutoff', 'label': 'Hora de corte', 'min': 0, 'max': 24, 'step': 1, 'unit': 'h', 'default': 13,
         'info': 'Los pedidos hechos a partir de esta hora cuentan desde el siguiente día laborable.'},
        {'type': 'range', 'id': 'lab_eta_min', 'label': 'Días laborables hasta la entrega (mínimo)', 'min': 0, 'max': 10, 'step': 1, 'unit': 'd', 'default': 1},
        {'type': 'range', 'id': 'lab_eta_max', 'label': 'Días laborables hasta la entrega (máximo)', 'min': 1, 'max': 15, 'step': 1, 'unit': 'd', 'default': 2},
        {'type': 'header', 'content': 'Atención al cliente'},
        {'type': 'text', 'id': 'lab_whatsapp', 'label': 'WhatsApp de atención', 'info': 'Con prefijo, p. ej. 34600111222. Vacío: no se enseña.'},
        {'type': 'header', 'content': 'Aspecto'},
        {'type': 'checkbox', 'id': 'lab_show_compare', 'label': 'Tachar el «precio comparado» del producto', 'default': False,
         'info': 'Solo si ese precio se ha aplicado de verdad: en la UE el precio anterior debe ser el más bajo de los últimos 30 días.'},
        {'type': 'checkbox', 'id': 'lab_dark', 'label': 'Modo oscuro automático', 'default': True,
         'info': 'Sigue el ajuste claro/oscuro del móvil o del ordenador del cliente.'},
        {'type': 'product', 'id': 'lab_main_product', 'label': 'Producto de los packs',
         'info': 'El carrito lateral propone pasar al pack siguiente de este producto.'},
        {'type': 'header', 'content': 'Checkout y primera compra'},
        {'type': 'text', 'id': 'lab_checkout_locale', 'label': 'Idioma del checkout', 'default': 'es',
         'info': 'El idioma principal de la tienda es el inglés: sin esto, al pagar desde el carrito el checkout sale en inglés. Vacío: no se fuerza.'},
        {'type': 'text', 'id': 'lab_first_code', 'label': 'Código de primera compra', 'default': 'RELIEF10',
         'info': 'Tiene que existir en Descuentos. Se enseña en la opción de 1 unidad (no se suma a los packs).'},
        {'type': 'range', 'id': 'lab_first_pct', 'label': 'Descuento del código', 'min': 0, 'max': 50, 'step': 1, 'unit': '%', 'default': 10},
        {'type': 'checkbox', 'id': 'lab_first_auto', 'label': 'Aplicarlo solo al comprar 1 unidad', 'default': True,
         'info': 'La ficha enseña el precio de 1 unidad ya con el código y lo deja puesto en el checkout. Con 2 o 3 unidades manda el descuento del pack.'},
        {'type': 'header', 'content': 'Movimiento y velocidad'},
        {'type': 'checkbox', 'id': 'lab_transitions', 'label': 'Transiciones entre páginas y precarga', 'default': True,
         'info': 'La foto pasa de la tarjeta a la ficha sin cortes y las páginas se precargan al pasar el ratón. Se ignora en navegadores sin soporte.'},
        {'type': 'checkbox', 'id': 'lab_progress', 'label': 'Barra de progreso de lectura', 'default': True},
        {'type': 'checkbox', 'id': 'lab_reveals', 'label': 'Aparición de los bloques al bajar', 'default': False,
         'info': 'Apagado, la página se ve quieta y el movimiento se reserva para la visita 3D.'},
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
    'lab_main_product': 'juego-de-ventosa-electrica-con-cable', 'lab_transitions': True, 'lab_progress': True, 'lab_reveals': False,
    'lab_checkout_locale': 'es', 'lab_first_code': 'RELIEF10', 'lab_first_pct': 10, 'lab_first_auto': True,
    # Venta (10-11): formato de precio, contrareembolso sin recargo (como dice la página de Envíos) y fecha de entrega.
    'lab_price_es': True, 'lab_cod_fee': False, 'lab_eta': True, 'lab_eta_cutoff': 13, 'lab_eta_min': 1, 'lab_eta_max': 2, 'lab_whatsapp': '',
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
# Ajustes que usa assets/lab.js antes de cargar: idioma del checkout, código
# de primera compra (solo si está activado aplicarlo en compras de 1 unidad) y
# la dirección de la política de privacidad (para el aviso de cookies).
CFG = '''    <script>
      window.labCfg = { locale: {{ settings.lab_checkout_locale | strip | json }}, code: {% if settings.lab_first_auto %}{{ settings.lab_first_code | strip | json }}{% else %}""{% endif %}, privacy: {{ shop.privacy_policy.url | default: '' | json }} };
    </script>
'''
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
    # Sin icono subido en Ajustes del tema, la pestaña del navegador lleva el punto rojo del logo.
    ('      <link rel="icon" type="image/png" href="{{ settings.favicon | image_url: width: 32, height: 32 }}">\n    {%- endif -%}',
     '      <link rel="icon" type="image/png" href="{{ settings.favicon | image_url: width: 32, height: 32 }}">\n    {%- else -%}\n'
     "      <link rel=\"icon\" type=\"image/svg+xml\" href=\"{{ 'lab-favicon.svg' | asset_url }}\">\n    {%- endif -%}"),
    ('    <meta name="theme-color" content="">', '    <meta name="theme-color" content="#F6F7F9">\n' + CFG + MODERN.rstrip('\n')),
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
     "    {{ 'lab-inter.woff2' | asset_url | preload_tag: as: 'font', type: 'font/woff2', crossorigin: 'anonymous' }}\n"
     "    {{ 'lab-intertight.woff2' | asset_url | preload_tag: as: 'font', type: 'font/woff2', crossorigin: 'anonymous' }}"),
    ('  <body class="gradient', '  <body class="lab{% if settings.lab_dark %} lab-dark-ok{% endif %}{% if settings.lab_reveals %} lab-rv{% endif %} gradient'),
    ('    <a class="skip-to-content-link button visually-hidden" href="#MainContent">',
     '    {%- if settings.lab_progress -%}<div class="lab-progress" aria-hidden="true"></div>{%- endif -%}\n'
     '    <a class="skip-to-content-link button visually-hidden" href="#MainContent">'),
])

# Carrito lateral de Dawn: propuesta de subir de pack debajo de las líneas.
patch('snippets/cart-drawer.liquid', [
    ('                </table>\n              </div>\n            {%- endif -%}\n            <p id="CartDrawer-LiveRegionText"',
     '                </table>\n              </div>\n              {%- render \'lab-cart-upsell\' -%}\n            {%- endif -%}\n            <p id="CartDrawer-LiveRegionText"'),
    ("            {{ 'sections.cart.checkout' | t }}\n          </button>\n        </div>\n      </div>\n    </div>\n  </div>\n</cart-drawer>",
     "            {{ 'sections.cart.checkout' | t }}\n          </button>\n        </div>\n        {%- render 'lab-cart-trust' -%}\n      </div>\n    </div>\n  </div>\n</cart-drawer>"),
])

# Importes de Dawn con el mismo formato que el resto del tema («49,95 €» en
# vez de «€49,95» o «€49,95 EUR»): cada {{ x | money }} pasa por
# snippets/lab-money. «expected» es cuántos debe haber, para enterarse si una
# versión nueva de Dawn los cambia.
MONEY = re.compile(r'\{\{(-?)\s*([\w.]+)\s*\|\s*money(?:_with_currency)?\s*(-?)\}\}')


def lab_money(rel, expected):
    path = os.path.join(BUILD, rel)
    s = open(path, encoding='utf-8').read()
    s, n = MONEY.subn(lambda m: "{%%%s render 'lab-money', v: %s %s%%}" % (m.group(1), m.group(2), m.group(3)), s)
    assert n == expected, (rel, n)
    open(path, 'w', encoding='utf-8').write(s)
    return s


assert '| money' not in lab_money('snippets/cart-drawer.liquid', 10)

# Página del carrito (/cart). Se llega a ella al volver del checkout («Carrito»)
# o sin JavaScript, así que lleva lo mismo que el carrito lateral: importes en
# formato español, la propuesta de subir de pack, las garantías junto al botón
# y «Seguir comprando» hacia la ficha. Sin botones de pago exprés: saltarían
# el checkout en español y el código de primer pedido que pone assets/lab.js
# (están igualmente en el primer paso del checkout).
SHOP_URL = '{{ settings.lab_main_product.url | default: routes.all_products_collection_url }}'
lab_money('sections/main-cart-items.liquid', 9)
patch('sections/main-cart-items.liquid', [
    ('      <a href="{{ routes.all_products_collection_url }}" class="underlined-link">',
     '      <a href="%s" class="underlined-link">' % SHOP_URL),
    ('      <a href="{{ routes.all_products_collection_url }}" class="button">',
     '      <a href="%s" class="button">' % SHOP_URL),
    ('              </tbody>\n            </table>\n          {%- endif -%}\n        </div>\n      </div>\n\n      <p class="visually-hidden" id="cart-live-region-text"',
     '              </tbody>\n            </table>\n            {%- render \'lab-cart-upsell\' -%}\n          {%- endif -%}\n        </div>\n      </div>\n\n'
     '      <p class="visually-hidden" id="cart-live-region-text"'),
])
lab_money('sections/main-cart-footer.liquid', 2)
patch('sections/main-cart-footer.liquid', [
    ('              {%- if additional_checkout_buttons -%}\n'
     '                <div class="cart__dynamic-checkout-buttons additional-checkout-buttons">\n'
     '                  {{ content_for_additional_checkout_buttons }}\n'
     '                </div>\n'
     '              {%- endif -%}\n',
     "              {%- render 'lab-cart-trust' -%}\n"),
])
patch('sections/main-404.liquid', [
    ('  <a href="{{ routes.all_products_collection_url }}" class="button">', '  <a href="%s" class="button">' % SHOP_URL),
])

# Tarjetas de producto de Dawn (búsqueda y colecciones): mismo criterio que la
# ficha. El precio comparado solo se tacha, y la insignia «Oferta» solo sale,
# si se activa en Ajustes del tema (en la UE el precio anterior debe ser el
# más bajo de los últimos 30 días); y los importes van en formato español.
patch('snippets/price.liquid', [
    ("  if target == product and product.price_varies\n"
     "    assign money_price = 'products.product.price.from_price_html' | t: price: money_price\n"
     "  endif\n-%}\n",
     "  unless settings.lab_show_compare\n"
     "    assign compare_at_price = nil\n"
     "  endunless\n-%}\n"
     "{%- if settings.lab_price_es -%}\n"
     "  {%- capture money_price -%}{% render 'lab-money', v: price %}{%- endcapture -%}\n"
     "  {%- capture money_price_min -%}{% render 'lab-money', v: price_min %}{%- endcapture -%}\n"
     "  {%- capture money_price_max -%}{% render 'lab-money', v: price_max %}{%- endcapture -%}\n"
     "  {%- assign money_price = money_price | strip -%}\n"
     "  {%- assign money_price_min = money_price_min | strip -%}\n"
     "  {%- assign money_price_max = money_price_max | strip -%}\n"
     "{%- endif -%}\n"
     "{%- if target == product and product.price_varies -%}\n"
     "  {%- assign money_price = 'products.product.price.from_price_html' | t: price: money_price -%}\n"
     "{%- endif -%}\n"),
])
lab_money('snippets/price.liquid', 4)
cp_path = os.path.join(BUILD, 'snippets', 'card-product.liquid')
cp = open(cp_path, encoding='utf-8').read()
SALE = 'card_product.compare_at_price > card_product.price and card_product.available'
assert cp.count(SALE) == 2
open(cp_path, 'w', encoding='utf-8').write(cp.replace(SALE, 'settings.lab_show_compare and ' + SALE))

# El producto del recargo de contrareembolso no es un artículo a la venta: no
# sale en los resultados de búsqueda ni en las sugerencias.
FEE_SKIP = ("{%%- if settings.lab_fee_product != blank and %s.id == settings.lab_fee_product.id -%%}{%%- continue -%%}{%%- endif -%%}\n")
patch('sections/main-search.liquid', [
    ('                {%- for item in search.results -%}\n',
     '                {%- for item in search.results -%}\n                  ' + FEE_SKIP % 'item'),
])
patch('sections/predictive-search.liquid', [
    ('              {%- for product in predictive_search.resources.products -%}\n',
     '              {%- for product in predictive_search.resources.products -%}\n                ' + FEE_SKIP % 'product'),
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
# Castellano de Dawn: una errata, y el botón de pagar del carrito, que con
# «Pagar pedido» parecía pedir el pago ya a quien va a pagar al recibirlo.
assert es['sections']['cart']['empty'] == 'Tu carrito esta vacío'
es['sections']['cart']['empty'] = 'Tu carrito está vacío'
assert es['sections']['cart']['checkout'] == 'Pagar pedido'
es['sections']['cart']['checkout'] = 'Tramitar pedido'
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
            'sections/main-cart-items.liquid', 'sections/main-cart-footer.liquid', 'sections/main-404.liquid',
            'sections/main-search.liquid', 'sections/predictive-search.liquid',
            'snippets/price.liquid', 'snippets/card-product.liquid',
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
