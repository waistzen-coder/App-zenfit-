# Genera las plantillas JSON del tema Lab (portada, ficha, páginas) y los
# grupos de cabecera y pie. Los textos van aquí para poder revisarlos juntos:
# solo hechos publicados en la tienda (páginas de envíos y devoluciones,
# descripción del producto). Los precios salen del producto con las marcas
# [p1] [p2] [u3]… que resuelve snippets/lab-fill.liquid.
#
#   python3 plantillas.py
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
PRODUCT = 'juego-de-ventosa-electrica-con-cable'


def save(rel, data):
    path = os.path.join(HERE, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')


def section(type_, settings=None, blocks=None, disabled=False):
    s = {'type': type_, 'settings': settings or {}}
    if blocks:
        s['blocks'] = {f'b{i + 1}': b for i, b in enumerate(blocks)}
        s['block_order'] = list(s['blocks'])
    if disabled:
        s['disabled'] = True
    return s


def block(type_, **settings):
    return {'type': type_, 'settings': settings}


def template(*pairs):
    return {'sections': dict(pairs), 'order': [k for k, _ in pairs]}


# Bloques que se repiten en varias plantillas ---------------------------------

FIGURES = [
    block('figure', value='24–48 h', label='Entrega en península', page='envios'),
    block('figure', value='30 días', label='Para devolver, etiqueta pagada', page='devoluciones'),
    block('figure', value='3 años', label='De garantía legal', page='devoluciones'),
]
CHIPS = [
    block('chip', icon='lock', text='Pago 100 % seguro'),
    block('chip', icon='truck', text='Envío 24–48 h'),
    block('chip', icon='refresh', text='30 días para devolver'),
    block('chip', icon='chat', text='Atención en español'),
]
PACKS = [
    block('pack', qty=1, label='RELIEFPATH · 1 UD', media_index=1),
    block('pack', qty=2, label='RELIEFPATH · PACK 2', media_index=2),
    block('pack', qty=3, label='RELIEFPATH · PACK 3', media_index=3),
]


def hero(**over):
    s = {'product': PRODUCT, 'crumbs': True, 'crumb': 'Tienda'}
    s.update(over)
    return section('lab-hero', s, FIGURES + CHIPS + PACKS)


def catalog():
    return section('lab-catalog', {'product': PRODUCT, 'title': 'Catálogo', 'anchor': 'catalogo'}, [
        block('category', name='Packs', slug='packs',
              line='El precio más bajo del catálogo: −[d2] % llevando 2 y −[d3] % llevando 3, aplicado en el carrito.'),
        block('item', qty=2, title='Pack 2 ReliefPath™', benefit='Uno para ti y otro para regalar', media_index=2, badge=''),
        block('item', qty=3, title='Pack 3 ReliefPath™', benefit='El precio más bajo por unidad', media_index=3, badge=''),
        block('category', name='El aparato', slug='aparato',
              line='Ventosa eléctrica de succión regulable, calor y luz roja en un mismo aparato de uso doméstico.'),
        block('item', qty=1, title='ReliefPath™ 1 unidad', benefit='Ventosa, calor y luz roja', media_index=1, badge=''),
    ])


def proof(**over):
    s = {'anchor': 'calidad', 'surface': True}
    s.update(over)
    return section('lab-proof', s, [
        block('step', title='Lo publicamos por escrito',
              text='Plazos de envío, devoluciones y garantía están en páginas públicas. Lo que pone ahí es lo que se aplica a tu pedido.'),
        block('step', title='Te enseñamos el aparato real',
              text='La primera foto de la ficha es del aparato real. Las ilustraciones se indican como tales en su texto alternativo.'),
        block('step', title='Respondemos por escrito',
              text='Dudas sobre el aparato, el pedido o una devolución: <a href="mailto:waistzen@gmail.com">waistzen@gmail.com</a>. Si ya compraste, indica tu número de pedido.'),
        block('doc', kind='Política', title='Envíos y entregas', l1='Zona', v1='España', l2='Península', v2='24–48 h',
              l3='Baleares', v3='2–4 días laborables', status='Publicada', page='envios', button='Ver la política'),
        block('doc', kind='Política', title='Devoluciones y desistimiento', l1='Desistimiento', v1='14 días (legal)',
              l2='Plazo de la tienda', v2='30 días', l3='Etiqueta', v3='La pagamos nosotros', status='Publicada',
              page='devoluciones', button='Ver la política'),
        block('doc', kind='Garantía', title='Garantía legal de conformidad', l1='Plazo', v1='3 años', l2='Devoluciones',
              v2='Motril (Granada)', l3='', v3='', status='Publicada', page='devoluciones', button='Ver la garantía'),
        block('doc', kind='Manual', title='Instrucciones del fabricante', l1='Formato', v1='PDF', l2='', v2='', l3='', v3='',
              status='Publicado', button='Descargar el manual'),
        block('doc', kind='Conformidad', title='Declaración CE del fabricante', l1='Formato', v1='PDF', l2='', v2='', l3='',
              v3='', status='Publicada', button='Ver la declaración'),
    ])


COLS = [
    block('col', icon='truck', title='Envío desde España',
          text='Gratis y con seguimiento. Península en 24–48 h; Baleares en 2–4 días laborables.',
          link_label='Ver envíos', page='envios'),
    block('col', icon='refresh', title='30 días para devolver',
          text='Además de los 14 días legales de desistimiento. La etiqueta de devolución la pagamos nosotros.',
          link_label='Ver devoluciones', page='devoluciones'),
    block('col', icon='chat', title='Te respondemos por escrito',
          text='Escríbenos a waistzen@gmail.com antes o después de comprar. Si ya pediste, indica tu número de pedido.',
          link_label='Escribirnos', page='contact'),
]


def cols(**over):
    s = {'anchor': 'por-que', 'eyebrow': 'Por qué comprar aquí', 'heading': 'Comprar fácil, <em>devolver fácil.</em>'}
    s.update(over)
    return section('lab-cols', s, COLS)


def qa(q, a):
    return block('qa', q=q, a=a)


Q_PRICE = qa('¿Cuánto cuesta cada pack?',
             '<p>1 unidad: <strong>[p1]</strong>. Pack de 2: <strong>[p2]</strong> ([u2]/ud). Pack de 3: <strong>[p3]</strong> ([u3]/ud). '
             'El descuento del pack (−[d2] % y −[d3] %) se aplica solo en el carrito.</p>')
Q_CODE = qa('¿Puedo usar el código RELIEF10 con un pack?',
            '<p>RELIEF10 es un 10 % para tu primer pedido. No se suma al descuento de los packs: si compras 2 o 3, ya llevas el descuento del pack.</p>')
Q_SHIP_TIME = qa('¿Cuánto tarda en llegar?',
                 '<p>Península: 24–48 h. Baleares: 2–4 días laborables. Canarias, Ceuta y Melilla: escríbenos antes de pedir. '
                 'Todos los envíos salen de un almacén en España y llevan seguimiento. <a href="/pages/envios">Ver envíos</a>.</p>')
Q_SHIP_COST = qa('¿Cuánto cuesta el envío?',
                 '<p>El envío estándar es gratis a las direcciones de España que admite el checkout. Revisa el total antes de confirmar.</p>')
Q_COD = qa('¿Puedo pagar al recibirlo?',
           '<p>Sí, con contrareembolso si tu dirección tiene cobertura. Se añade un recargo de gestión de <strong>[fee]</strong> por pedido, '
           'que verás como una línea más antes de pagar.</p>')
Q_PAY = qa('¿Cómo puedo pagar?',
           '<p>Con tarjeta y con los métodos que muestra el checkout (los ves en el pie de esta página), o al recibirlo con contrareembolso.</p>')
Q_RETURN = qa('¿Puedo devolverlo?',
              '<p>Tienes 14 días de desistimiento por ley y lo ampliamos a <strong>30 días</strong> desde que lo recibes. '
              'La etiqueta de devolución la pagamos nosotros. <a href="/pages/devoluciones">Ver devoluciones</a>.</p>')
Q_WARRANTY = qa('¿Qué garantía tiene?',
                '<p>3 años de garantía legal de conformidad. Si el aparato falla, escríbenos con tu número de pedido.</p>')
Q_WHAT = qa('¿Qué es ReliefPath™?',
            '<p>Un aparato de bienestar para uso doméstico que combina ventosa eléctrica de succión regulable, calor y luz roja.</p>')
Q_MED = qa('¿Sustituye a un fisioterapeuta o a un tratamiento?',
           '<p>No. ReliefPath™ no sustituye un diagnóstico, tratamiento médico, fisioterapia ni medicación. '
           'Ante dolor, una lesión o cualquier duda sanitaria, consulta a un profesional sanitario.</p>')
Q_BOX = qa('¿Qué incluye el pedido?',
           '<p>La cantidad de aparatos ReliefPath™ del pack que elijas. Si quieres confirmar accesorios, alimentación o tipo de cable antes de comprar, '
           'escríbenos a <a href="mailto:waistzen@gmail.com">waistzen@gmail.com</a>.</p>')
Q_USE = qa('¿Cómo se usa?',
           '<p>Sigue el manual del fabricante: zonas permitidas, duración, frecuencia, niveles y contraindicaciones. Empieza siempre por el nivel más bajo.</p>')


def faq(blocks, **over):
    s = {'product': PRODUCT, 'anchor': 'preguntas', 'schema': True}
    s.update(over)
    return section('lab-faq', s, blocks)


FAQ_SHORT = [
    block('group', title='Pedidos'), Q_PRICE,
    block('group', title='Envíos'), Q_SHIP_TIME,
    block('group', title='Pagos'), Q_COD,
    block('group', title='Devoluciones'), Q_RETURN,
    block('group', title='Producto'), Q_MED,
]
FAQ_FULL = [
    block('group', title='Pedidos'), Q_PRICE, Q_CODE, Q_BOX,
    block('group', title='Envíos'), Q_SHIP_TIME, Q_SHIP_COST,
    block('group', title='Producto'), Q_WHAT, Q_USE, Q_MED,
    block('group', title='Pagos'), Q_PAY, Q_COD,
    block('group', title='Devoluciones'), Q_RETURN, Q_WARRANTY,
]


def about(**over):
    s = {'anchor': 'sobre', 'surface': False, 'steps_title': 'Cómo llega tu pedido'}
    s.update(over)
    return section('lab-about', s, [
        block('fact', label='Tienda', value='Waistzen'),
        block('fact', label='Producto', value='ReliefPath™ · 1 aparato, 3 packs'),
        block('fact', label='Contacto', value='<a href="mailto:waistzen@gmail.com">waistzen@gmail.com</a>'),
        block('fact', label='Envíos', value='Desde un almacén en España'),
        block('fact', label='Devoluciones', value='Camino de las Ventillas, 18600 Motril (Granada)'),
        block('fact', label='Garantía', value='3 años (legal)'),
        block('milestone', label='Hoy', title='Eliges tu pack',
              text='Pagas con tarjeta en el checkout o eliges pagar al recibirlo.'),
        block('milestone', label='24–48 h', title='Llega a casa',
              text='Envío gratis con seguimiento desde España a la península.'),
        block('milestone', label='30 días', title='Si no te convence',
              text='Tienes 30 días desde que lo recibes para pedir la devolución.'),
    ])


def trust():
    return section('lab-trust', {}, [
        block('card', icon='doc', title='Todo por escrito',
              text='Envíos, devoluciones y garantía, publicados en páginas abiertas.', link_label='Ver las pruebas', link='/#calidad'),
        block('card', icon='lock', title='Pago seguro',
              text='Checkout cifrado de Shopify. Si lo prefieres, paga al recibirlo con contrareembolso.', link_label=''),
        block('card', icon='truck', title='Envío con seguimiento',
              text='Gratis desde España. Península en 24–48 h.', link_label='Ver envíos', page='envios'),
        block('card', icon='chat', title='¿Te ayudamos a elegir?',
              text='Escríbenos y te decimos qué pack encaja contigo.', link_label='Escríbenos', page='contact'),
    ])


def legal():
    return section('lab-legal', {})


# Portada ---------------------------------------------------------------------

save('templates/index.json', template(
    ('hero', hero()),
    ('catalog', catalog()),
    ('proof', proof()),
    ('video', section('lab-video', {})),
    ('why', cols()),
    ('reviews', section('lab-reviews', {})),
    ('faq', faq(FAQ_SHORT)),
    ('about', about()),
    ('trust', trust()),
    ('legal', legal()),
))

# Ficha de producto -------------------------------------------------------------

PDP_TABS = [
    block('description', title='Descripción', open=True),
    block('tab', title='Modo de uso', open=False,
          text='<p>Antes del primer uso, lee el manual del fabricante: zonas permitidas, duración, frecuencia, niveles y contraindicaciones. '
               'Empieza siempre por el nivel más bajo de succión y calor.</p><p>Ante dolor, una lesión o una reacción inesperada, deja de usarlo '
               'y consulta a un profesional sanitario.</p>'),
    block('tab', title='Qué incluye el pedido', open=False,
          text='<p>La cantidad de aparatos ReliefPath™ del pack que elijas. Para confirmar accesorios, alimentación o tipo de cable antes de comprar, '
               'escríbenos a <a href="mailto:waistzen@gmail.com">waistzen@gmail.com</a>.</p>'),
    block('tab', title='Envío, devoluciones y garantía', open=False,
          text='<p><strong>Envío:</strong> gratis desde un almacén en España, con seguimiento. Península en 24–48 h; Baleares en 2–4 días laborables; '
               'Canarias, Ceuta y Melilla, consúltanos antes.</p><p><strong>Devoluciones:</strong> 14 días de desistimiento por ley, ampliados a 30 días '
               'desde la recepción. La etiqueta la pagamos nosotros.</p><p><strong>Garantía:</strong> 3 años de garantía legal de conformidad.</p>'
               '<p><a href="/pages/envios">Envíos</a> · <a href="/pages/devoluciones">Devoluciones</a></p>'),
    block('tab', title='Pago contra reembolso', open=False,
          text='<p>Si tu dirección tiene cobertura, puedes pagar al recibirlo. Se añade un recargo de gestión de <strong>[fee]</strong> por pedido, '
               'que aparece como una línea más antes de confirmar.</p>'),
]
PDP = template(
    ('main', section('lab-product', {'default_pack': 1, 'cod': True}, PDP_TABS)),
    ('reviews', section('lab-reviews', {'surface': True})),
    ('proof', proof(surface=False)),
    ('why', cols(surface=True)),
    ('faq', faq(FAQ_SHORT[:2] + [Q_CODE] + FAQ_SHORT[2:], schema=False)),
    ('trust', trust()),
    ('legal', legal()),
)
save('templates/product.json', PDP)
save('templates/product.reliefpatch.json', PDP)

# Páginas ---------------------------------------------------------------------

save('templates/page.json', template(('main', section('lab-page', {}))))
save('templates/page.contact.json', template(
    ('main', section('lab-page', {'eyebrow': 'Contacto'})),
    ('form', section('contact-form', {'heading': '', 'heading_size': 'h2', 'color_scheme': 'scheme-1',
                                      'padding_top': 0, 'padding_bottom': 56})),
))
save('templates/page.tracking.json', template(
    ('main', section('lab-text', {
        'eyebrow': 'Mi pedido', 'heading': 'Seguir mi <em>pedido</em>', 'as_h1': True,
        'text': '<p>Para consultar tu pedido, usa el enlace del email de confirmación de compra. Cuando el transportista dé el seguimiento, '
                'lo verás también en tu cuenta.</p><p>Si no encuentras la confirmación, revisa el correo no deseado o escríbenos a '
                '<a href="mailto:waistzen@gmail.com">waistzen@gmail.com</a> con tu número de pedido.</p>',
        'b1': 'Consultar mis pedidos', 'b1_link': '/account', 'b2': 'Escribirnos', 'b2_link': '/pages/contact',
    })),
    ('trust', trust()),
))
save('templates/page.calidad.json', template(
    ('proof', proof(as_h1=True, surface=False)),
    ('trust', trust()),
    ('legal', legal()),
))
save('templates/page.faq.json', template(
    ('faq', faq(FAQ_FULL, as_h1=True)),
    ('trust', trust()),
    ('legal', legal()),
))
save('templates/page.sobre.json', template(
    ('about', about(as_h1=True)),
    ('why', cols(surface=True)),
    ('trust', trust()),
))
save('templates/page.guia.json', template(
    ('guide', section('lab-guide', {'product': PRODUCT}, [
        block('chapter', title='Qué es ReliefPath™',
              body='<p>ReliefPath™ es un aparato de bienestar para uso doméstico que combina tres funciones: una <strong>ventosa eléctrica</strong> '
                   'de succión regulable, <strong>calor</strong> y <strong>luz roja</strong>. Se usa en casa, siguiendo el manual del fabricante.</p>'),
        block('chapter', title='Lo que no es',
              body='<p>No es un tratamiento. No sustituye un diagnóstico, tratamiento médico, fisioterapia ni medicación, y no prometemos resultados '
                   'clínicos. Si tienes dolor, una lesión o una condición de salud, consulta antes a un profesional sanitario.</p>'),
        block('packs', title='Qué pack te conviene',
              body='<p>El precio por unidad baja con el pack: −[d2] % llevando 2 y −[d3] % llevando 3. El descuento se aplica solo en el carrito.</p>'),
        block('chapter', title='Antes del primer uso',
              body='<ol><li>Comprueba que el pedido llega completo.</li><li>Busca el marcado CE y guarda el manual.</li>'
                   '<li>Lee zonas permitidas, duración, frecuencia y contraindicaciones.</li><li>Empieza por el nivel más bajo de succión y calor.</li></ol>'),
        block('chapter', title='Envío y entrega',
              body='<p>Gratis desde un almacén en España, con seguimiento. Península: 24–48 h. Baleares: 2–4 días laborables. '
                   'Canarias, Ceuta y Melilla: escríbenos antes de pedir. <a href="/pages/envios">Ver envíos</a>.</p>'),
        block('chapter', title='Pago',
              body='<p>Con tarjeta en el checkout o al recibirlo con contrareembolso, con un recargo de gestión de [fee] por pedido.</p>'),
        block('chapter', title='Devoluciones y garantía',
              body='<p>14 días de desistimiento por ley, ampliados a 30 días desde la recepción. La etiqueta la pagamos nosotros. '
                   'Garantía legal de conformidad de 3 años. <a href="/pages/devoluciones">Ver devoluciones</a>.</p>'),
    ])),
    ('trust', trust()),
    ('legal', legal()),
))
save('templates/page.landing-espana.json', template(
    ('hero', hero(crumb='España', heading='Comprar ventosas eléctricas con <em>calor y luz roja</em> en España: precio y envío',
                  sub='ReliefPath™ con envío gratis desde un almacén en España: península en 24–48 h y Baleares en 2–4 días laborables. '
                      'Desde [desde]/ud llevando 3.',
                  cta1='Elegir mi pack', cta1_link='/products/' + PRODUCT, cta2='Ver plazos de envío', cta2_link='#precios')),
    ('prices', section('lab-prices', {'product': PRODUCT}, [
        block('zone', zone='Península', time='24–48 h', cost='Gratis'),
        block('zone', zone='Baleares', time='2–4 días laborables', cost='Gratis'),
        block('zone', zone='Canarias, Ceuta y Melilla', time='Escríbenos antes de pedir', cost='—'),
    ])),
    ('faq', faq([
        qa('¿Enviáis a toda España?',
           '<p>A la península y a Baleares, gratis. Para Canarias, Ceuta y Melilla escríbenos antes de pedir y te confirmamos si es posible.</p>'),
        qa('¿Desde dónde se envía?', '<p>Desde un almacén en España, con seguimiento.</p>'),
        Q_COD,
        qa('¿Dónde se devuelve?',
           '<p>Tienes 30 días desde la recepción. La etiqueta la pagamos nosotros y la devolución va a Motril (Granada). '
           '<a href="/pages/devoluciones">Ver devoluciones</a>.</p>'),
    ], anchor='preguntas-espana', heading='Preguntas sobre el envío <em>en España</em>')),
    ('trust', trust()),
    ('legal', legal()),
))

# Cabecera y pie -------------------------------------------------------------

save('sections/header-group.json', {
    'type': 'header', 'name': 'Header group',
    'sections': {
        'offer': section('lab-offer', {'tag': 'PACKS', 'cta': 'Lo quiero', 'closable': True}),
        'header': section('lab-header', {'buy_label': 'Comprar'}),
    },
    'order': ['offer', 'header'],
})
save('sections/footer-group.json', {
    'type': 'footer', 'name': 'Footer group',
    'sections': {'footer': section('lab-footer', {})},
    'order': ['footer'],
})
print('plantillas ok')
