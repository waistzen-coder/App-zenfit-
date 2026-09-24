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
ANNOUNCE = section('sr-announce', {'bg': '#0f2640', 'color': '#ffffff', 'speed': 4}, [
    ('msg', {'icon': 'truck', 'text': 'Envío estándar gratis en España', 'link': ''}),
    ('msg', {'icon': 'cash', 'text': 'Paga al recibirlo: contrareembolso +5 €', 'link': ''}),
    ('msg', {'icon': 'refresh', 'text': '30 días para solicitar la devolución', 'link': '/policies/refund-policy'}),
])

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
    'cta_text': '', 'cta_link': '',
    'note': 'ReliefPath™ es un aparato de bienestar para uso doméstico. Consulta el manual del fabricante antes de usarlo.',
    'bg': '#f1f6fb',
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
    'bg': '#f1f6fb',
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
    'eyebrow': 'Opiniones', 'heading': 'Lo que cuentan', 'heading_accent': 'quienes ya lo usan', 'bg': '#f1f6fb',
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
    ('¿Por qué habláis de opositores?', '<p>Porque pasan muchas horas sentados y organizan el día en bloques. El Método Pausa es una forma de usar esos cortes para dedicarte un rato, en vez de pasarlos con el móvil.</p>'),
    ('¿Cómo se usa y cuánto dura una sesión?', '<p>Sigue el manual del fabricante: duración, frecuencia, intensidad, zonas y contraindicaciones. Esta página no establece un protocolo de uso. Si no tienes el manual, pídelo a <a href="mailto:waistzen@gmail.com">waistzen@gmail.com</a>.</p>'),
    ('¿Cuánto cuesta el envío?', '<p>El envío estándar es gratis para las direcciones de España admitidas en el checkout, sin importe mínimo. Si eliges contrareembolso se suman 5 € por pedido. Para confirmar el plazo de tu dirección, escríbenos antes de comprar.</p>'),
    ('¿Puedo pagar al recibirlo?', '<p>Sí, con contrareembolso (+5 € por pedido), según la cobertura de tu dirección. No está disponible en Canarias, Ceuta y Melilla. En el checkout, elige «Pago contra entrega».</p>'),
    ('¿Puedo devolverlo?', '<p>Tienes 30 días desde la recepción para solicitar la devolución, según la política publicada, además del desistimiento legal de 14 días. Los gastos de devolución corren de tu cuenta salvo defecto o error nuestro. Consulta la <a href="/policies/refund-policy">política de devoluciones</a>.</p>'),
    ('¿Hay descuento si compro más de uno?', '<p>Sí: −20 % a partir de 2 unidades y −30 % a partir de 3, aplicado automáticamente. El código de bienvenida no se acumula con los packs.</p>'),
    ('¿Qué precauciones debo tener?', '<p>Lee todas las advertencias del manual. Ante dolor, una lesión o una reacción inesperada, deja de usarlo y consulta a un profesional sanitario.</p>'),
]
FAQ = section('sr-faq', {
    'eyebrow': 'Dudas', 'heading': 'Preguntas', 'heading_accent': 'frecuentes', 'open_first': True,
    'help': '<p>¿Te queda alguna duda? Escríbenos a <a href="mailto:waistzen@gmail.com">waistzen@gmail.com</a> antes de comprar.</p>',
    'schema': True, 'bg': '#f1f6fb',
}, [('q', {'question': q, 'answer': a}) for q, a in FAQS])

TRUST_LINE = 'Envío estándar gratis en España · Contrareembolso +5 € · 30 días para solicitar la devolución'

# ───────────────────────────── portada ─────────────────────────────
index = {'sections': {
    'anuncio': ANNOUNCE,
    'hero': section('sr-hero', {
        'product': PRODUCT,
        'eyebrow': 'Método Pausa · para opositores',
        'heading': 'Tu temario puede esperar.', 'heading_accent': 'Tu pausa, no.',
        'text': '<p>ReliefPath™ reúne ventosas eléctricas, calor y luz roja en un aparato para casa. Pensado para que las pausas entre bloques de estudio sean un momento de verdad para ti.</p>',
        'cta_text': 'Descubre ReliefPath', 'cta_link': '/products/' + PRODUCT,
        'cta2_text': 'Cómo funciona', 'cta2_link': '#shopify-section-metodo',
        'under': TRUST_LINE,
        'image': IMG('reliefpath-pausa-estudio-landing-20260911.png'), 'ratio': 'tall',
        'tag': 'Para opositores', 'pins': '', 'caption': '',
    }, [
        ('check', {'text': '<strong>Tres funciones</strong> en un solo aparato'}),
        ('check', {'text': '<strong>En tu silla o en el sofá</strong>, sin citas ni desplazamientos'}),
        ('check', {'text': '<strong>Paga al recibirlo</strong> si lo prefieres'}),
    ]),
    'confianza': TRUST,
    'ciclo': CYCLE,
    'metodo': METHOD,
    'producto': section('sr-featured', {
        'product': PRODUCT, 'eyebrow': 'El aparato', 'heading': 'Conoce', 'heading_accent': 'ReliefPath™',
        'image': IMG('waistzen-reliefpath-hero-20260906.png'), 'fit': 'cover',
        'tag': '3 en 1', 'pins': '', 'title': '',
        'points': 'Ventosas eléctricas con succión regulable\nFunción de calor y luz roja en la copa\n−20 % desde 2 unidades · −30 % desde 3',
        'cta_text': 'Ver ReliefPath', 'trust': TRUST_LINE, 'bg': '#f1f6fb',
    }),
    'pasos': STEPS,
    'comparativa': COMPARE,
    'tiempo': TIMELINE,
    'historia': STORY,
    'opiniones': REVIEWS,
    'garantia': GUARANTEE,
    'faq': FAQ,
    'cierre': section('sr-cta', {
        'product': PRODUCT, 'image': IMG('reliefpath-cierre-20260923.png'),
        'tag': 'Fin de la jornada', 'pins': '', 'eyebrow': 'Empieza hoy',
        'heading': 'Tu próxima pausa', 'heading_accent': 'empieza aquí',
        'text': 'Elige tu pack, paga como prefieras y recíbelo en casa.',
        'show_price': True, 'cta_text': 'Quiero mi ReliefPath', 'cta_link': '/products/' + PRODUCT,
        'trust': TRUST_LINE,
    }),
}, 'order': ['anuncio', 'hero', 'confianza', 'ciclo', 'metodo', 'producto', 'pasos', 'comparativa',
             'tiempo', 'historia', 'opiniones', 'garantia', 'faq', 'cierre']}

# ────────────────────────── ficha de producto ──────────────────────────
COD = json.load(open(os.path.join(HERE, 'contrareembolso.json'), encoding='utf-8'))

product = {'sections': {
    'anuncio': ANNOUNCE,
    'ficha': section('sr-product', {
        'product': '', 'badges': 'Método Pausa|Para opositores', 'heading': '',
        'sub': 'El aparato del Método Pausa: convierte los descansos entre bloques de temario en un momento para ti.',
        'save_label': 'Ahorras', 'price_note': 'Precio por unidad. −20 % desde 2 unidades y −30 % desde 3.',
        'cta_mode': 'anchor', 'cta_text': 'Elegir pack y forma de pago',
        'cta_anchor': '#shopify-section-contrareembolso', 'soldout_text': 'Agotado',
        'under': 'Tarjeta o contrareembolso · Envío estándar gratis en España',
        'alt_text': '', 'alt_link': '#shopify-section-contrareembolso',
        'show_payment': True, 'show_schema': True,
    }, [
        ('image', {'image': IMG('waistzen-reliefpath-hero-20260906.png'), 'fit': 'cover', 'tag': 'ReliefPath™', 'tag_icon': 'spark', 'pins': ''}),
        ('image', {'image': IMG('reliefpath-producto-renovado-20260911.png'), 'fit': 'cover', 'tag': '3 en 1', 'tag_icon': 'spark', 'pins': ''}),
        ('image', {'image': IMG('reliefpath-pausa-estudio-landing-20260911.png'), 'fit': 'cover', 'tag': 'Al cerrar los apuntes', 'tag_icon': 'book', 'pins': ''}),
        ('image', {'image': IMG('reliefpath-funciones-landing-20260911.png'), 'fit': 'cover', 'tag': 'Funciones', 'tag_icon': 'sun', 'pins': ''}),
        ('image', {'image': IMG('waistzen-reliefpath-controls-20260906.png'), 'fit': 'cover', 'tag': 'Ajustes', 'tag_icon': 'flame', 'pins': ''}),
        ('image', {'image': IMG('reliefpath-escritorio-renovado-20260911.png'), 'fit': 'cover', 'tag': 'Entre bloques', 'tag_icon': 'timer', 'pins': ''}),
        ('image', {'image': IMG('reliefpath-descanso-renovado-20260911.png'), 'fit': 'cover', 'tag': 'Al cerrar el día', 'tag_icon': 'moon', 'pins': ''}),
        ('bullet', {'text': '<strong>Ventosas eléctricas, calor y luz roja</strong> en un solo aparato'}),
        ('bullet', {'text': '<strong>Pensado para tus pausas de estudio</strong>, en la silla o en el sofá'}),
        ('bullet', {'text': '<strong>Paga con tarjeta o al recibirlo</strong> (contrareembolso +5 €)'}),
        ('bullet', {'text': '<strong>30 días</strong> para solicitar la devolución'}),
        ('seal', {'icon': 'truck', 'text': 'Envío estándar gratis'}),
        ('seal', {'icon': 'cash', 'text': 'Pago al recibirlo'}),
        ('seal', {'icon': 'refresh', 'text': '30 días para devolverlo'}),
        ('accordion', {'icon': 'box', 'title': 'Qué incluye', 'content': '<p>El pack contiene la cantidad de aparatos ReliefPath™ que elijas. Para confirmar accesorios y tipo de cable antes de comprar, escribe a <a href="mailto:waistzen@gmail.com">waistzen@gmail.com</a>.</p>'}),
        ('accordion', {'icon': 'truck', 'title': 'Envío y entrega', 'content': '<p>Envío estándar gratis para las direcciones de España admitidas en el checkout, sin importe mínimo. El contrareembolso suma 5 € por pedido. Para confirmar el plazo de tu dirección, escríbenos antes de comprar.</p>'}),
        ('accordion', {'icon': 'refresh', 'title': 'Devoluciones', 'content': '<p>Tienes 30 días desde la recepción para solicitar la devolución, además del desistimiento legal de 14 días, según la <a href="/policies/refund-policy">política de devoluciones</a>. No es un periodo de uso libre de prueba.</p>'}),
        ('accordion', {'icon': 'book', 'title': 'Uso y precauciones', 'content': '<p>Antes del primer uso, lee las instrucciones del fabricante: zonas permitidas, duración, frecuencia, intensidad y contraindicaciones. ReliefPath™ es un aparato de bienestar y no sustituye un diagnóstico ni un tratamiento médico.</p>'}),
    ]),
    'contrareembolso': COD,
    'confianza': TRUST,
    'ciclo': CYCLE,
    'metodo': METHOD,
    'pasos': STEPS,
    'incluye': BOX,
    'comparativa': COMPARE,
    'tiempo': TIMELINE,
    'historia': STORY,
    'opiniones': REVIEWS,
    'garantia': GUARANTEE,
    'faq': FAQ,
    'cierre': section('sr-cta', {
        'product': '', 'image': IMG('reliefpath-cierre-20260923.png'),
        'tag': 'Fin de la jornada', 'pins': '', 'eyebrow': 'Empieza hoy',
        'heading': 'Tu próxima pausa', 'heading_accent': 'empieza aquí',
        'text': 'Elige tu pack y cómo pagarlo. Revisas el total antes de confirmar.',
        'show_price': True, 'cta_text': 'Elegir mi pack', 'cta_link': '#shopify-section-contrareembolso',
        'trust': TRUST_LINE,
    }),
    'barra': section('calmia-sticky-atc', {
        'product': PRODUCT, 'short_title': 'ReliefPath™ · Método Pausa', 'cta_text': 'Elegir mi pack',
        'cta_target': 'anchor', 'cta_anchor': '#shopify-section-contrareembolso', 'offset': 250,
        'show_eta': False, 'eta_text': 'Pídelo hoy y lo tienes entre el', 'delivery_min': 1, 'delivery_max': 2,
    }),
    'chat': section('calmia-chat', {
        'whatsapp': '', 'email': 'waistzen@gmail.com', 'label': 'Escríbenos',
        'prefill': 'Hola, tengo una duda sobre el ReliefPath', 'offset_mobile': 116,
        'offset_desktop': 24, 'compact_mobile': True,
    }),
}, 'order': ['anuncio', 'ficha', 'contrareembolso', 'confianza', 'ciclo', 'metodo', 'pasos', 'incluye',
             'comparativa', 'tiempo', 'historia', 'opiniones', 'garantia', 'faq', 'cierre', 'barra', 'chat']}

for name, data in [('index.json', index), ('product.reliefpatch.json', product)]:
    with open(os.path.join(HERE, 'templates', name), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print('ok', name)
