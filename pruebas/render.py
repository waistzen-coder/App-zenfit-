# Renderiza calmia-cod.liquid con los mismos ajustes que tiene en la plantilla
# de la tienda, para poder ejecutar su JavaScript de verdad contra el HTML real.
import io, os, re, json, sys
from liquid import Environment
from liquid import DictLoader

SRC = '/home/user/App-zenfit-/shopify-theme/sections/calmia-cod.liquid'
src = io.open(SRC, encoding='utf-8').read()

m = re.search(r'\{%\s*schema\s*%\}(.*?)\{%\s*endschema\s*%\}', src, re.S)
schema = json.loads(m.group(1))
body = src[:m.start()]

def defaults(settings):
    return {s['id']: s.get('default', '') for s in settings if 'id' in s}

sec = defaults(schema['settings'])
# Lo que la plantilla de la tienda fija encima de los valores por defecto
sec.update({
    'product': 'x', 'fee_product': 'x',
    'eyebrow': '', 'heading': 'Elige tu pack y', 'heading_italic': 'cómo quieres pagarlo',
    'subheading': 'Con tarjeta ahora, o en efectivo al repartidor cuando lo tengas en la puerta.',
    'eta_text': 'Lo tienes entre el', 'delivery_min': 1, 'delivery_max': 2, 'bg': '#fdf1f3',
})

pack_d = defaults([b for b in schema['blocks'] if b['type'] == 'pack'][0]['settings'])
point_d = defaults([b for b in schema['blocks'] if b['type'] == 'point'][0]['settings'])

def blk(bid, typ, base, over):
    s = dict(base); s.update(over)
    return {'id': bid, 'type': typ, 'settings': s, 'shopify_attributes': ''}

blocks = [
    blk('pk1', 'pack', pack_d, {'qty':1,'discount_pct':0,'label':'1 unidad','sublabel':'Para ti','badge':'','highlight':False}),
    blk('pk2', 'pack', pack_d, {'qty':2,'discount_pct':20,'label':'2 unidades','sublabel':'Uno para ti y otro para tu pareja de pista','badge':'RECOMENDADO','highlight':True}),
    blk('pk3', 'pack', pack_d, {'qty':3,'discount_pct':30,'label':'3 unidades','sublabel':'Para el grupo del jueves','badge':'MEJOR PRECIO POR UNIDAD','highlight':False}),
    blk('c1', 'point', point_d, {'icon':'truck','title':'Pagas al repartidor','text':'En efectivo o con tarjeta, en la puerta de tu casa.'}),
    blk('c2', 'point', point_d, {'icon':'clock','title':'En 24-48 horas','text':'Sale hoy de nuestro almacén en España.'}),
    blk('c3', 'point', point_d, {'icon':'shield','title':'No adelantas nada','text':'Si el paquete no llega, no has pagado un euro.'}),
]

# ── Filtros de Shopify que python-liquid no trae ────────────────────────
def money(v):
    try: c = int(v)
    except Exception: return v
    return ('%.2f' % (c / 100.0)).replace('.', ',') + ' €'
def at_least(v, n):
    try: return max(int(v), int(n))
    except Exception: return v
def to_json(v):
    if v is True: return 'true'
    if v is False: return 'false'
    return json.dumps(v, ensure_ascii=False)
def strip_html(v): return re.sub(r'<[^>]*>', '', str(v))
def newline_to_br(v): return str(v).replace('\n', '<br />\n')
def where(seq, key, val=None):
    out = []
    for i in seq or []:
        got = i.get(key) if isinstance(i, dict) else getattr(i, key, None)
        if (got == val) if val is not None else bool(got): out.append(i)
    return out

env = Environment(loader=DictLoader({'calmia-base': '', 'calmia-icon': '<svg class="ic"></svg>'}))
for n, f in [('money', money), ('at_least', at_least), ('json', to_json),
             ('strip_html', strip_html), ('newline_to_br', newline_to_br), ('where', where)]:
    env.filters[n] = f

VARIANT, FEE_VARIANT = 59286832939353, 59250983928153
ctx = {
    'product': {'title': 'ReliefPath™ Ventosas Inteligentes con Terapia de Luz Roja',
                'selected_or_first_available_variant': {'id': VARIANT, 'price': 4995,
                                                        'compare_at_price': 9995}},
    'section': {'id': 'contrareembolso', 'settings': sec, 'blocks': blocks},
}
ctx['section']['settings']['product'] = ctx['product']
ctx['section']['settings']['fee_product'] = {
    'selected_or_first_available_variant': {'id': FEE_VARIANT, 'price': 500}}

html = env.from_string(body).render(**ctx)
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cod.html')
io.open(out,'w',encoding='utf-8').write(
    '<!doctype html><html lang="es"><head><meta charset="utf-8"></head><body>' + html + '</body></html>')
print('HTML renderizado:', len(html), 'bytes')
print('precios en el HTML:', re.findall(r'\d+,\d\d €', html)[:12])
