# Genera templates/index.json y templates/product.reliefpatch.json del tema
# «Réplica ShoulderReliever». Mismo esqueleto de la referencia (anuncio, hero,
# confianza, ciclo, método en dos momentos, cómo funciona, qué incluye,
# comparativa, línea de tiempo, historia, opiniones, garantía, FAQ, cierre),
# con el ángulo de opositores y el tono de claims que dejó la auditoría:
# nada de alivio, curación, zonas ni tiempos de sesión.
import json, os, itertools

HERE = os.path.dirname(os.path.abspath(__file__))
PRODUCT = 'juego-de-ventosa-electrica-con-cable'
IMG = lambda f: 'shopify://shop_images/' + f

_ids = itertools.count(1)
def section(type_, settings, blocks=(), disabled=False):
    s = {'type': type_, 'settings': settings}
    if blocks:
        b = {}
        order = []
        for t, st in blocks:
            k = '%s%d' % (t[:2].replace('@', 'a'), next(_ids))
            b[k] = {'type': t, 'settings': st}
            order.append(k)
        s['blocks'] = b
        s['block_order'] = order
    if disabled:
        s['disabled'] = True
    return s

# ───────────────────────── piezas compartidas ─────────────────────────
ANNOUNCE = section('sr-announce', {'bg': '#1b2140', 'color': '#ffffff', 'speed': 3}, [
    ('msg', {'icon': 'spark', 'text': '−10 % en tu primer pedido con RELIEF10', 'link': '#oferta'}),
    ('msg', {'icon': 'truck', 'text': 'Envío estándar gratis en España', 'link': ''}),
    ('msg', {'icon': 'cash', 'text': 'Paga al recibirlo en casa', 'link': ''}),
    ('msg', {'icon': 'refresh', 'text': '30 días para devolverlo', 'link': '/policies/refund-policy'}),
])

MARQUEE = section('sr-marquee', {'bg': '#f5a524', 'color': '#1b2140', 'speed': 34}, [
    ('item', {'icon': 'flame', 'text': 'Calor'}),
    ('item', {'icon': 'wave', 'text': 'Succión regulable'}),
    ('item', {'icon': 'sun', 'text': 'Luz roja'}),
    ('item', {'icon': 'truck', 'text': 'Envío gratis en España'}),
    ('item', {'icon': 'cash', 'text': 'Paga al recibirlo'}),
    ('item', {'icon': 'refresh', 'text': '30 días para devolverlo'}),
    ('item', {'icon': 'book', 'text': 'Pensado para opositores'}),
])

VALUE = section('sr-value', {
    'product': PRODUCT, 'weeks': 52, 'unit': 'a la semana durante un año',
    'eyebrow': 'Haz la cuenta', 'heading': 'Menos de 1 € a la semana', 'heading_accent': 'por tus pausas',
    'text': '<p>ReliefPath™ se paga una sola vez. Repartido entre las semanas de un año de temario, sale a menos de un euro por semana.</p>',
    'cta_text': 'Comprar ahora', 'cta_link': '#comprar',
    'note': 'Cálculo orientativo: precio de una unidad dividido entre 52 semanas.',
}, [
    ('point', {'text': 'Un solo pago, sin cuotas ni sesiones', 'good': True}),
    ('point', {'text': 'En casa, a la hora que tú decidas', 'good': True}),
    ('point', {'text': 'Pedir cita, desplazarte y pagar cada vez', 'good': False}),
])

OFFER = section('sr-offer', {
    'code': 'RELIEF10', 'big': '−10 %', 'title': 'en tu primer pedido',
    'text': 'Pulsa «Aplicar» y se descuenta solo al pagar con tarjeta.',
    'cta_text': 'Aplicar a mi compra',
    'fine': 'Una vez por cliente, en 1 unidad. No se suma a los packs de 2 y 3, que ya llevan −20 % y −30 %. Si pagas al recibirlo, escribe el código en la pantalla de pago.',
    'tab': '−10 % primer pedido', 'delay': 25, 'depth': 45,
    'fallback_url': '/products/' + PRODUCT,
})

TRUST = section('sr-trust', {}, [
    ('item', {'icon': 'truck', 'title': 'Envío estándar gratis', 'text': 'Direcciones de España admitidas en el checkout'}),
    ('item', {'icon': 'cash', 'title': 'Contrareembolso', 'text': 'Pagas al repartidor, +5 € por pedido'}),
    ('item', {'icon': 'refresh', 'title': '30 días', 'text': 'Para solicitar la devolución, según la política'}),
    ('item', {'icon': 'chat', 'title': 'Atención en español', 'text': 'waistzen@gmail.com · Motril, Granada'}),
])

CYCLE = section('sr-cycle', {
    'eyebrow': 'Lo que nadie cuenta de opositar',
    'heading': 'El ciclo del', 'heading_accent': 'temario',
    'text': 'Horas de silla, bloques de estudio y pausas que no cuentan como pausa. Si te suena, no eres el único.',
    'break_text': '<p><strong>El Método Pausa rompe el paso 2.</strong> Cuando suena el temporizador, dejas el móvil y los apuntes y te dedicas un rato a ti con ReliefPath: calor, succión regulable y luz roja, sin salir de casa.</p>',
    'bg': '#ffffff',
}, [
    ('step', {'title': 'Horas de silla', 'text': 'Bloques largos frente a los apuntes, los hombros adelantados y la espalda quieta.'}),
    ('step', {'title': 'Pausas que no descansan', 'text': 'Suena el temporizador, abres el móvil y vuelves a la mesa con la misma sensación.'}),
    ('step', {'title': 'La carga se acumula', 'text': 'Al final del día notas el peso de la jornada en cuello, hombros y espalda.'}),
    ('step', {'title': 'Y mañana, otra vez', 'text': 'Nuevo día, nuevo tema. La rutina se repite sin un momento de verdad para ti.'}),
])

METHOD = section('sr-method', {
    'eyebrow': 'El Método Pausa',
    'heading': 'Dos momentos al día.', 'heading_accent': 'Un solo aparato.',
    'text': 'Si estudias muchas horas, la clave no es parar más, sino parar mejor. ReliefPath le da a cada pausa un principio y un final.',
    'cta_text': 'Quiero mi ReliefPath', 'cta_link': '#comprar',
    'note': 'ReliefPath™ es un aparato de bienestar para uso doméstico. Consulta el manual del fabricante antes de usarlo.',
    'bg': '#fbf4ec',
}, [
    ('part', {
        'image': IMG('reliefpath-escritorio-renovado-20260911.png'),
        'tag': 'Entre bloques', 'tag_icon': 'timer',
        'pins': '',
        'title': 'La pausa que sí es pausa',
        'text': 'Suena el temporizador y sueltas el bolígrafo. En vez de abrir el móvil, un rato para ti con ReliefPath, desde tu propia silla.',
        'points': 'Sin desplazamientos ni citas\nSin pantalla: la pausa es para ti\nCalor, succión y luz roja a tu medida, según el manual',
    }),
    ('part', {
        'image': IMG('reliefpath-descanso-renovado-20260911.png'),
        'tag': 'Al cerrar el día', 'tag_icon': 'moon',
        'pins': '',
        'title': 'Tu ritual para cerrar los apuntes',
        'text': 'Apuntes cerrados, sofá y ReliefPath. Una señal clara para tu cabeza de que la jornada de estudio ha terminado.',
        'points': 'Separa el estudio del descanso\nUn hábito fácil de mantener\nTu momento, a la hora que tú decidas',
    }),
])

STEPS = section('sr-steps', {
    'eyebrow': 'Cómo funciona',
    'heading': 'Tres pasos.', 'heading_accent': 'Cero complicaciones.',
    'text': '',
    'note': 'Respeta siempre la duración, las zonas, la intensidad y las precauciones que indica el manual del fabricante.',
    'bg': '#ffffff',
}, [
    ('step', {'image': IMG('reliefpath-consulta-manual-20260923.png'), 'tag': 'Paso 1', 'pins': '',
              'title': 'Lee el manual', 'text': 'Antes del primer uso, repasa los ajustes, las zonas permitidas y las precauciones de tu modelo.'}),
    ('step', {'image': IMG('waistzen-reliefpath-controls-20260906.png'), 'tag': 'Paso 2', 'pins': '',
              'title': 'Elige tus ajustes', 'text': 'Succión, calor y luz roja en un mismo aparato. Tú decides cómo combinarlos, dentro de lo que indica el fabricante.'}),
    ('step', {'image': IMG('reliefpath-pausa-sofa-20260923.png'), 'tag': 'Paso 3', 'pins': '',
              'title': 'Haz tu pausa', 'text': 'Aparta el temario y el móvil. Ese rato es tuyo; después vuelves a la mesa o cierras el día.'}),
])

BOX = section('sr-box', {
    'image': IMG('reliefpath-producto-renovado-20260911.png'), 'fit': 'cover',
    'tag': 'En tu pedido', 'pins': '',
    'eyebrow': 'Qué incluye',
    'heading': 'Todo lo que llega', 'heading_accent': 'a tu casa',
    'text': 'Tres funciones reunidas en un aparato compacto, pensado para usarlo en casa.',
    'note': '¿Quieres confirmar accesorios, cable o alimentación antes de comprar? Escríbenos a waistzen@gmail.com.',
    'bg': '#ffffff',
}, [
    ('item', {'icon': 'wave', 'title': 'Ventosa eléctrica', 'text': 'La copa utiliza succión regulable.'}),
    ('item', {'icon': 'flame', 'title': 'Función de calor', 'text': 'Incorporada en el mismo aparato, con los límites que marca el fabricante.'}),
    ('item', {'icon': 'sun', 'title': 'Luz roja', 'text': 'Integrada en la copa.'}),
    ('item', {'icon': 'book', 'title': 'Instrucciones del fabricante', 'text': 'Léelas antes del primer uso.'}),
])

COMPARE = section('sr-compare', {
    'eyebrow': 'Compáralo',
    'heading': '¿Cómo te tomas', 'heading_accent': 'tus pausas?',
    'text': 'Lo que ofrece cada opción cuando llevas horas delante del temario.',
    'col_us': 'ReliefPath™', 'col_a': 'Pausa con el móvil', 'col_b': 'Cita de masaje', 'col_c': '',
    'note': 'Comparativa orientativa de opciones de descanso. ReliefPath™ no sustituye la fisioterapia ni un tratamiento profesional.',
    'bg': '#fbf4ec',
}, [
    ('row', {'feature': 'Sin salir de casa', 'us': 'si', 'a': 'si', 'b': 'no', 'c': ''}),
    ('row', {'feature': 'Sin pedir cita', 'us': 'si', 'a': 'si', 'b': 'no', 'c': ''}),
    ('row', {'feature': 'Te aleja de las pantallas', 'us': 'si', 'a': 'no', 'b': 'si', 'c': ''}),
    ('row', {'feature': 'Calor, succión y luz roja', 'us': 'si', 'a': 'no', 'b': 'Depende', 'c': ''}),
    ('row', {'feature': 'Cuando tú quieras', 'us': 'si', 'a': 'si', 'b': 'no', 'c': ''}),
    ('row', {'feature': 'Pago', 'us': 'Una vez', 'a': '—', 'b': 'Por sesión', 'c': ''}),
])

TIMELINE = section('sr-timeline', {
    'eyebrow': 'Tu primer mes',
    'heading': 'De aparato nuevo', 'heading_accent': 'a hábito de estudio',
    'text': 'Así se construye la rutina del Método Pausa semana a semana.',
    'note': 'Describe cómo convertir la pausa en hábito; no es una promesa de resultados. Cada persona es distinta.',
    'bg': '#ffffff',
}, [
    ('week', {'label': 'Semana 1', 'title': 'Lo conoces', 'text': 'Lees el manual, pruebas los ajustes y eliges tus dos momentos del día.'}),
    ('week', {'label': 'Semana 2', 'title': 'Lo encajas', 'text': 'La pausa entra en tu planificación, junto al temporizador y los bloques.'}),
    ('week', {'label': 'Semana 3', 'title': 'Lo repites', 'text': 'Ya no lo piensas: suena el temporizador y sabes qué toca.'}),
    ('week', {'label': 'Semana 4', 'title': 'Es tuyo', 'text': 'La pausa forma parte de tu día de estudio, como el café de media mañana.'}),
])

STORY = section('sr-story', {
    'image': IMG('reliefpath-atencion-20260923.png'),
    'tag': 'Motril, Granada', 'caption': '',
    'eyebrow': 'Quiénes somos',
    'heading': 'Una tienda pequeña,', 'heading_accent': 'una idea concreta',
    'text': '<p>Somos Waistzen, una tienda de Motril (Granada). Elegimos ReliefPath™ pensando en una rutina que se repite en muchas casas: días enteros de silla, temario y temporizador.</p><p>No te prometemos aprobar ni quitarte ningún dolor. Te proponemos algo más sencillo: tomarte las pausas en serio, con un aparato que te espera en la mesa.</p>',
    'quote': 'Estudiar muchas horas es parte de opositar. Descansar bien, también.',
    'name': 'El equipo de Waistzen', 'role': 'Atención en español · waistzen@gmail.com',
    'cta_text': '', 'cta_link': '', 'bg': '#ffffff',
})

REVIEWS = section('sr-reviews', {
    'eyebrow': 'Opiniones', 'heading': 'Lo que cuentan', 'heading_accent': 'quienes ya lo usan', 'bg': '#fbf4ec',
})

GUARANTEE = section('sr-guarantee', {
    'number': '30', 'number_label': 'días para solicitarla',
    'eyebrow': 'Compra tranquila',
    'heading': 'Si no es para ti, puedes devolverlo',
    'text': '<p>Tienes 30 días desde que lo recibes para solicitar la devolución, además de tu derecho legal de desistimiento de 14 días. Consulta las condiciones en la <a href="/policies/refund-policy">política de devoluciones</a>.</p>',
    'cta_text': '', 'cta_link': '', 'bg': '#ffffff',
})

FAQS = [
    ('¿Qué es ReliefPath™?', '<p>Un aparato de bienestar para casa que reúne ventosas eléctricas, calor y luz roja. No es un tratamiento médico ni garantiza alivio, mejor descanso ni rendimiento en el estudio.</p>'),
    ('¿Puedo pagar al recibirlo?', '<p>Sí, con contrareembolso: pagas en efectivo al repartidor, con un recargo de 5 € por pedido, según la cobertura de tu dirección. No está disponible en Canarias, Ceuta y Melilla. En el checkout, elige «Pago contra entrega».</p>'),
    ('¿Cuánto cuesta el envío?', '<p>El envío estándar es gratis para las direcciones de España admitidas en el checkout, sin importe mínimo. Si necesitas saber el plazo para tu dirección antes de comprar, escríbenos.</p>'),
    ('¿Y si no estoy en casa cuando llegue?', '<p>En el formulario de contrareembolso puedes indicar tu franja horaria preferida y una persona que pueda recogerlo por ti (un vecino, la portería…).</p>'),
    ('¿Puedo devolverlo?', '<p>Tienes 30 días desde la recepción para solicitar la devolución, según la política publicada, además del desistimiento legal de 14 días. Los gastos de devolución corren de tu cuenta salvo defecto o error nuestro. Consulta la <a href="/policies/refund-policy">política de devoluciones</a>.</p>'),
    ('¿Hay descuento si compro más de uno?', '<p>Sí: −20 % a partir de 2 unidades y −30 % a partir de 3, aplicado automáticamente en el checkout. El código de bienvenida no se acumula con los packs.</p>'),
    ('¿Es seguro pagar con tarjeta?', '<p>El pago online se hace en el checkout de Shopify, con conexión cifrada. Nosotros no vemos ni guardamos los datos de tu tarjeta.</p>'),
    ('¿Cómo se usa y cuánto dura una sesión?', '<p>Sigue el manual del fabricante: duración, frecuencia, intensidad, zonas y contraindicaciones. Esta página no establece un protocolo de uso. Si no tienes el manual, pídelo a <a href="mailto:waistzen@gmail.com">waistzen@gmail.com</a>.</p>'),
    ('¿Por qué habláis de opositores?', '<p>Porque pasan muchas horas sentados y organizan el día en bloques. El Método Pausa es una forma de usar esos cortes para dedicarte un rato, en vez de pasarlos con el móvil.</p>'),
    ('¿Qué precauciones debo tener?', '<p>Lee todas las advertencias del manual. Ante dolor, una lesión o una reacción inesperada, deja de usarlo y consulta a un profesional sanitario.</p>'),
]
FAQ = section('sr-faq', {
    'eyebrow': 'Dudas', 'heading': 'Preguntas', 'heading_accent': 'frecuentes', 'open_first': True,
    'help': '<p>¿Te queda alguna duda? Escríbenos a <a href="mailto:waistzen@gmail.com">waistzen@gmail.com</a> antes de comprar.</p>',
    'schema': True, 'bg': '#fbf4ec',
}, [('q', {'question': q, 'answer': a}) for q, a in FAQS])

TRUST_LINE = 'Envío estándar gratis en España · Contrareembolso +5 € · 30 días para solicitar la devolución'
FEE = 'contrareembolso-gastos-de-gestion'

def buy_box(product_handle, h1):
    """La ficha con la caja de compra. En la portada va con el producto
    fijado y sin H1 (el H1 de la portada es el del hero)."""
    return section('sr-product', {
        'product': product_handle, 'fee_product': FEE, 'is_page_title': h1,
        'badges': 'Método Pausa|Para opositores',
        'heading': 'ReliefPath™ · Ventosas eléctricas con calor y luz roja',
        'sub': '',
        'save_label': 'Ahorras', 'price_note': '',
        'mini_trust': 'Envío gratis|Paga al recibirlo|30 días para devolverlo',
        'sale_badge': True, 'first_chip': 'Envío gratis a España',
        'packs_title': 'Elige tu pack',
        'card_text': 'Comprar ahora', 'cod_text': 'Pagar al recibirlo en casa', 'soldout_text': 'Agotado',
        'under': 'Envío estándar gratis a España · Pago seguro · 30 días para devolverlo',
        'show_payment': True, 'show_schema': h1,
    }, [
        ('image', {'image': IMG('waistzen-reliefpath-hero-20260906.png'), 'fit': 'cover', 'tag': 'ReliefPath™', 'tag_icon': 'spark', 'pins': ''}),
        ('image', {'image': IMG('reliefpath-video-producto-real-20260923.jpg'), 'fit': 'cover', 'tag': 'Foto real', 'tag_icon': 'check-circle', 'pins': ''}),
        ('image', {'image': IMG('reliefpath-pausa-estudio-landing-20260911.png'), 'fit': 'cover', 'tag': 'Al cerrar los apuntes', 'tag_icon': 'book', 'pins': ''}),
        ('image', {'image': IMG('reliefpath-funciones-landing-20260911.png'), 'fit': 'cover', 'tag': 'Funciones', 'tag_icon': 'sun', 'pins': ''}),
        ('image', {'image': IMG('waistzen-reliefpath-controls-20260906.png'), 'fit': 'cover', 'tag': 'Ajustes', 'tag_icon': 'flame', 'pins': ''}),
        ('image', {'image': IMG('reliefpath-escritorio-renovado-20260911.png'), 'fit': 'cover', 'tag': 'Entre bloques', 'tag_icon': 'timer', 'pins': ''}),
        ('image', {'image': IMG('reliefpath-descanso-renovado-20260911.png'), 'fit': 'cover', 'tag': 'Al cerrar el día', 'tag_icon': 'moon', 'pins': ''}),
        ('bullet', {'text': '<strong>3 funciones en 1:</strong> succión regulable, calor y luz roja'}),
        ('bullet', {'text': '<strong>Tu pausa entre bloques</strong>, en la silla o en el sofá'}),
        ('bullet', {'text': '<strong>Envío gratis a España</strong> y pago al recibirlo si lo prefieres'}),
        ('pack', {'qty': 1, 'discount': 0, 'label': '1 unidad', 'sublabel': 'Para ti', 'tag': '', 'highlight': False, 'default': True}),
        ('pack', {'qty': 2, 'discount': 20, 'label': '2 unidades', 'sublabel': 'Para ti y tu compañero de academia', 'tag': 'Ahorra 20 %', 'highlight': True, 'default': False}),
        ('pack', {'qty': 3, 'discount': 30, 'label': '3 unidades', 'sublabel': 'Para tu grupo de estudio', 'tag': 'Ahorra 30 %', 'highlight': False, 'default': False}),
        ('seal', {'icon': 'truck', 'text': 'Envío estándar gratis'}),
        ('seal', {'icon': 'cash', 'text': 'Pago al recibirlo'}),
        ('seal', {'icon': 'refresh', 'text': '30 días para devolverlo'}),
        ('accordion', {'icon': 'box', 'title': 'Qué incluye', 'content': '<p>El pack contiene la cantidad de aparatos ReliefPath™ que elijas. Para confirmar accesorios y tipo de cable antes de comprar, escribe a <a href="mailto:waistzen@gmail.com">waistzen@gmail.com</a>.</p>'}),
        ('accordion', {'icon': 'truck', 'title': 'Envío y entrega', 'content': '<p>Envío estándar gratis para las direcciones de España admitidas en el checkout, sin importe mínimo. El contrareembolso suma 5 € por pedido. Para confirmar el plazo de tu dirección, escríbenos antes de comprar.</p>'}),
        ('accordion', {'icon': 'refresh', 'title': 'Devoluciones', 'content': '<p>Tienes 30 días desde la recepción para solicitar la devolución, además del desistimiento legal de 14 días, según la <a href="/policies/refund-policy">política de devoluciones</a>. No es un periodo de uso libre de prueba.</p>'}),
        ('accordion', {'icon': 'book', 'title': 'Uso y precauciones', 'content': '<p>Antes del primer uso, lee las instrucciones del fabricante: zonas permitidas, duración, frecuencia, intensidad y contraindicaciones. ReliefPath™ es un aparato de bienestar y no sustituye un diagnóstico ni un tratamiento médico.</p>'}),
    ])

def closing(link, text):
    return section('sr-cta', {
        'product': PRODUCT, 'image': IMG('reliefpath-cierre-20260923.png'),
        'tag': 'Fin de la jornada', 'pins': '', 'eyebrow': 'Empieza hoy',
        'heading': 'Tu próxima pausa', 'heading_accent': 'empieza aquí',
        'text': text, 'show_price': True, 'cta_text': 'Comprar ahora', 'cta_link': link,
        'trust': TRUST_LINE,
    })

# En la ficha la barra se ve desde el primer momento en el móvil (la caja de
# compra queda bajo la galería); en la portada, cuando ya se ha pasado el hero.
STICKY = section('sr-sticky', {'product': PRODUCT, 'title': 'ReliefPath™', 'cta_text': 'Comprar ahora', 'show_after': 0})
STICKY_HOME = section('sr-sticky', {'product': PRODUCT, 'title': 'ReliefPath™', 'cta_text': 'Comprar ahora', 'show_after': 500})
CHAT = section('calmia-chat', {
    'whatsapp': '', 'email': 'waistzen@gmail.com', 'label': 'Escríbenos',
    'prefill': 'Hola, tengo una duda sobre el ReliefPath', 'offset_mobile': 96,
    'offset_desktop': 24, 'compact_mobile': True,
})

# ───────────────────────────── portada ─────────────────────────────
index = {'sections': {
    'hero': section('sr-hero', {
        'product': PRODUCT,
        'eyebrow': 'Método Pausa · para opositores',
        'heading': 'Tu temario puede esperar.', 'heading_accent': 'Tu pausa, no.',
        'text': '<p>ReliefPath™ reúne ventosas eléctricas, calor y luz roja en un aparato para casa. Pensado para que las pausas entre bloques de estudio sean un momento de verdad para ti.</p>',
        'mobile_overlay': True, 'show_price': True, 'price_note': '',
        'cta_text': 'Comprar ahora', 'cta_link': '#comprar',
        'cta2_text': 'Cómo funciona', 'cta2_link': '#shopify-section-metodo',
        'under': 'Envío gratis · Paga al recibirlo · 30 días para devolverlo',
        'image': IMG('reliefpath-pausa-estudio-landing-20260911.png'), 'ratio': 'tall', 'focus': 'center',
        'tag': '', 'pins': '', 'caption': '',
    }, [
        ('check', {'text': '<strong>Tres funciones</strong> en un solo aparato'}),
        ('check', {'text': '<strong>En tu silla o en el sofá</strong>, sin citas ni desplazamientos'}),
        ('check', {'text': '<strong>Paga al recibirlo</strong> si lo prefieres'}),
    ]),
    'cinta': MARQUEE,
    'ciclo': CYCLE,
    'metodo': METHOD,
    'comprar': buy_box(PRODUCT, False),
    'valor': VALUE,
    'pasos': STEPS,
    'comparativa': COMPARE,
    'tiempo': TIMELINE,
    'historia': STORY,
    'opiniones': REVIEWS,
    'garantia': GUARANTEE,
    'faq': FAQ,
    'cierre': closing('#comprar', 'Elige tu pack, paga como prefieras y recíbelo en casa.'),
    'barra': STICKY_HOME,
    'chat': CHAT,
    'oferta': OFFER,
}, 'order': ['hero', 'cinta', 'ciclo', 'metodo', 'comprar', 'valor', 'pasos', 'comparativa',
             'tiempo', 'historia', 'opiniones', 'garantia', 'faq', 'cierre', 'barra', 'chat', 'oferta']}

# ────────────────────────── ficha de producto ──────────────────────────
COD = json.load(open(os.path.join(HERE, 'contrareembolso.json'), encoding='utf-8'))

product = {'sections': {
    'ficha': buy_box('', True),
    'cinta': MARQUEE,
    'ciclo': CYCLE,
    'metodo': METHOD,
    'pasos': STEPS,
    'comparativa': COMPARE,
    'valor': VALUE,
    'incluye': BOX,
    'contrareembolso': COD,
    'tiempo': TIMELINE,
    'historia': STORY,
    'opiniones': REVIEWS,
    'garantia': GUARANTEE,
    'faq': FAQ,
    'cierre': closing('#comprar', 'Elige tu pack y cómo pagarlo. Revisas el total antes de confirmar.'),
    'barra': STICKY,
    'chat': CHAT,
    'oferta': OFFER,
}, 'order': ['ficha', 'cinta', 'ciclo', 'metodo', 'pasos', 'comparativa', 'valor', 'incluye', 'contrareembolso',
             'tiempo', 'historia', 'opiniones', 'garantia', 'faq', 'cierre', 'barra', 'chat', 'oferta']}

for name, data in [('index.json', index), ('product.reliefpatch.json', product)]:
    with open(os.path.join(HERE, 'templates', name), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print('ok', name)

# La barra de anuncios va en el grupo de cabecera (encima del menú).
with open(os.path.join(HERE, 'anuncio.json'), 'w', encoding='utf-8') as f:
    json.dump(ANNOUNCE, f, ensure_ascii=False, indent=2)
