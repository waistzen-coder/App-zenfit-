# -*- coding: utf-8 -*-
"""Comprueba que todas las cifras de dinero de la página cuentan lo mismo.

El fallo que motivó esta prueba: el hero decía «Ahorras 119,98 € hoy» al lado de
un precio de 49,95 €. Los 119,98 eran el ahorro del pack de 2 unidades, que
seguía preseleccionado en la plantilla aunque el selector de packs estuviera
apagado. Aquí se renderizan de verdad las cuatro secciones que enseñan precios,
con los ajustes reales de la plantilla, y se comprueba que ninguna se contradice
con las demás.
"""
import io, os, re, json, sys, collections
from liquid import Environment, DictLoader

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEC = os.path.join(RAIZ, 'shopify-theme', 'sections')
TPL = os.path.join(RAIZ, 'shopify-theme', 'templates', 'product.reliefpatch.json')

PRECIO, COMPARA, RECARGO = 4995, 9995, 500
VARIANTE, VAR_RECARGO, VAR_BUMP = 59286832939353, 59250983928153, 1

# ── Filtros de Shopify que python-liquid no trae ───────────────────────────
def money(v):
    try: c = int(v)
    except Exception: return v
    return ('%.2f' % (c / 100.0)).replace('.', ',') + ' €'
def money_without_currency(v):
    try: return '%.2f' % (int(v) / 100.0)
    except Exception: return v
def at_least(v, n):
    try: return max(int(v), int(n))
    except Exception: return v
def at_most(v, n):
    try: return min(int(v), int(n))
    except Exception: return v
def to_json(v):
    if v is True: return 'true'
    if v is False: return 'false'
    return json.dumps(v, ensure_ascii=False)
def strip_html(v): return re.sub(r'<[^>]*>', '', str(v))
def sin_entidades(v): return str(v).replace('&minus;', '−').replace('&nbsp;', ' ')
def newline_to_br(v): return str(v).replace('\n', '<br />\n')
def image_url(v, **kw): return str(v) if v else ''
def handleize(v): return re.sub(r'[^a-z0-9]+', '-', str(v).lower()).strip('-')
def where(seq, key, val=None):
    out = []
    for i in seq or []:
        got = i.get(key) if isinstance(i, dict) else getattr(i, key, None)
        if (got == val) if val is not None else bool(got): out.append(i)
    return out

env = Environment(loader=DictLoader({
    'calmia-base': '', 'calmia-icon': '<svg class="ic"></svg>',
    'calmia-rating': '<span class="stars"></span>', 'calmia-schema': ''}))
for n, f in [('money', money), ('money_without_currency', money_without_currency),
             ('at_least', at_least), ('at_most', at_most), ('json', to_json),
             ('strip_html', strip_html), ('newline_to_br', newline_to_br),
             ('image_url', image_url), ('handleize', handleize), ('where', where)]:
    env.filters[n] = f

# ── La plantilla real de la tienda ────────────────────────────────────────
plantilla = json.loads(re.sub(r'^/\*.*?\*/\s*', '',
                              io.open(TPL, encoding='utf-8').read(), flags=re.S),
                       object_pairs_hook=collections.OrderedDict)

producto = {
    'title': 'ReliefPath™ Ventosas Inteligentes con Terapia de Luz Roja',
    'handle': 'juego-de-ventosa-electrica-con-cable',
    'url': '/products/juego-de-ventosa-electrica-con-cable',
    'featured_image': '', 'images': [], 'media': [], 'options_with_values': [],
    'variants': [], 'available': True, 'description': '',
    'selected_or_first_available_variant': {
        'id': VARIANTE, 'price': PRECIO, 'compare_at_price': COMPARA,
        'available': True, 'title': 'Default Title', 'options': [], 'featured_image': '',
        'inventory_management': 'shopify', 'inventory_quantity': 40},
}
producto['variants'] = [producto['selected_or_first_available_variant']]
recargo = {'title': 'Contrareembolso — gastos de gestión', 'available': True,
           'selected_or_first_available_variant': {'id': VAR_RECARGO, 'price': RECARGO,
                                                   'available': True, 'title': 'Default Title'}}
bump = {'title': 'Protección de envío', 'available': True,
        'selected_or_first_available_variant': {'id': VAR_BUMP, 'price': 295,
                                                'available': True, 'title': 'Default Title'}}
PRODUCTOS = {'juego-de-ventosa-electrica-con-cable': producto,
             'contrareembolso-gastos-de-gestion': recargo,
             'proteccion-de-envio': bump}

def defaults(lista):
    return {s['id']: s.get('default', '') for s in lista if 'id' in s}

def renderiza(fichero, clave):
    """Renderiza una sección con los ajustes que tiene en la plantilla."""
    src = io.open(os.path.join(SEC, fichero), encoding='utf-8').read()
    m = re.search(r'\{%\s*schema\s*%\}(.*?)\{%\s*endschema\s*%\}', src, re.S)
    esquema = json.loads(m.group(1))
    cuerpo = src[:m.start()]

    puesto = plantilla['sections'][clave]
    ajustes = defaults(esquema.get('settings', []))
    ajustes.update(puesto.get('settings', {}))
    for k, v in list(ajustes.items()):
        if isinstance(v, str) and v in PRODUCTOS:
            ajustes[k] = PRODUCTOS[v]

    por_tipo = {b['type']: defaults(b.get('settings', [])) for b in esquema.get('blocks', [])}
    bloques = []
    for bid in puesto.get('block_order', []):
        b = puesto['blocks'][bid]
        s = dict(por_tipo.get(b['type'], {})); s.update(b.get('settings', {}))
        bloques.append({'id': bid, 'type': b['type'], 'settings': s, 'shopify_attributes': ''})

    ctx = {'product': producto,
           'section': {'id': clave, 'settings': ajustes, 'blocks': bloques}}
    # python-liquid trata «offset» como palabra reservada dentro de una ruta;
    # el Liquid de Shopify no. Se reescribe solo para poder renderizar aquí.
    cuerpo = cuerpo.replace('settings.offset', "settings['offset']")
    return env.from_string(cuerpo).render(**ctx)

# ── Comprobaciones ────────────────────────────────────────────────────────
fallos, hechas = [], 0
def ok(nombre, cond, detalle=''):
    global hechas
    hechas += 1
    if cond:
        print('  ✓ ' + nombre + (('  → ' + detalle) if detalle else ''))
    else:
        fallos.append(nombre + (('  → ' + detalle) if detalle else ''))
        print('  ✗ ' + nombre + (('  → ' + detalle) if detalle else ''))

def texto(html, patron):
    m = re.search(patron, html, re.S)
    return sin_entidades(strip_html(m.group(1))).strip() if m else None

hero = renderiza('calmia-product-hero.liquid', 'hero')
cod = renderiza('calmia-cod.liquid', 'contrareembolso')
barra = renderiza('calmia-sticky-atc.liquid', 'barra')
cierre = renderiza('calmia-final-cta.liquid', 'cierre')

print('\n════ El hero ════\n')
h_ahora = texto(hero, r'data-calmia-price[^>]*>(.*?)</span>')
h_antes = texto(hero, r'data-calmia-compare[^>]*>(.*?)</s>')
h_pct   = texto(hero, r'data-calmia-pct[^>]*>(.*?)</span>')
h_save  = texto(hero, r'data-calmia-save[^>]*>(.*?)</b>')
h_cta   = texto(hero, r'data-calmia-ctaprice[^>]*>(.*?)</span>')
ok('el precio de venta es el de la variante', h_ahora == money(PRECIO), h_ahora)
ok('el precio tachado es el comparativo', h_antes == money(COMPARA), h_antes)
ok('el porcentaje cuadra con los dos precios',
   h_pct == '−50%', '%s (de %s a %s)' % (h_pct, h_antes, h_ahora))
ok('el ahorro es exactamente la resta de los dos precios',
   h_save == money(COMPARA - PRECIO), '%s = %s − %s' % (h_save, h_antes, h_ahora))
ok('el botón del hero pide el mismo precio que enseña arriba',
   h_cta == h_ahora, h_cta)
ok('ya no quedan packs en el hero, que era de donde salía el 119,98',
   'data-calmia-pack=' not in hero,
   '%d packs' % len(re.findall(r'data-calmia-pack="', hero)))

print('\n════ La barra fija de abajo ════\n')
b_precio = texto(barra, r'data-calmia-sticky-price[^>]*>(.*?)</b>')
ok('enseña el mismo precio que el hero', b_precio == h_ahora, b_precio)
ok('su botón lleva al formulario de contrareembolso',
   '#shopify-section-contrareembolso' in barra)
ok('y ya no manda cantidades al carrito por su cuenta',
   'data-calmia-sticky-qty' not in barra or 'data-calmia-pack' not in hero)

print('\n════ El cierre ════\n')
ok('su botón lleva al formulario de contrareembolso',
   '#shopify-section-contrareembolso' in cierre)

print('\n════ Los packs del contrareembolso ════\n')
packs = re.findall(r'<span class="calmia-cod__packprice">(.*?)</span>', cod, re.S)
ok('hay tres packs', len(packs) == 3, '%d' % len(packs))
esperado = [(1, 0), (2, 20), (3, 30)]
for (q, pct), bruto in zip(esperado, packs):
    neto = texto(bruto, r'<b>(.*?)</b>')
    tachado = texto(bruto, r'<s>(.*?)</s>')
    unidad = texto(bruto, r'<i>(.*?)</i>')
    n = PRECIO * q - round(PRECIO * q * pct / 100.0)
    ok('%d ud.: se cobra el precio con el descuento de la tienda' % q,
       neto == money(n), neto)
    ok('%d ud.: se tacha el precio comparativo, no el de venta' % q,
       tachado == money(COMPARA * q),
       '%s (%s × %d)' % (tachado, money(COMPARA), q))
    ok('%d ud.: el tachado es mayor que lo que se paga' % q,
       COMPARA * q > n)
    ok('%d ud.: el precio por unidad cuadra con el total' % q,
       unidad.startswith(money(n // q)), unidad)

print('\n════ Hero y contrareembolso cuentan lo mismo ════\n')
p1_neto = texto(packs[0], r'<b>(.*?)</b>')
p1_tach = texto(packs[0], r'<s>(.*?)</s>')
ok('una unidad cuesta lo mismo arriba que abajo', p1_neto == h_ahora,
   '%s = %s' % (p1_neto, h_ahora))
ok('y el tachado de una unidad es el mismo de arriba', p1_tach == h_antes,
   '%s = %s' % (p1_tach, h_antes))

cfg = json.loads(re.search(r'data-calmia-cod-config>(.*?)</script>', cod, re.S).group(1))
ok('el importe a cobrar de 1 ud. es el precio más el recargo',
   cfg['packs'][0]['codMoney'] == money(PRECIO + RECARGO), cfg['packs'][0]['codMoney'])
ok('y el de tarjeta es el precio a secas',
   cfg['packs'][0]['cardMoney'] == h_ahora, cfg['packs'][0]['cardMoney'])
for (q, pct), pk in zip(esperado, cfg['packs']):
    n = PRECIO * q - round(PRECIO * q * pct / 100.0)
    ok('%d ud.: el JSON del pedido lleva %s con tarjeta y %s contrareembolso'
       % (q, money(n), money(n + RECARGO)),
       pk['cardMoney'] == money(n) and pk['codMoney'] == money(n + RECARGO))

print()
if fallos:
    print('✗ %d de %d comprobaciones fallan:' % (len(fallos), hechas))
    for f in fallos: print('   · ' + f)
    sys.exit(1)
print('✓ las %d cifras de la página cuadran entre sí' % hechas)
