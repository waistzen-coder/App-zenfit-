# Prueba la caja de compra en un navegador de verdad: precios por pack, enlace
# de pago online, sincronización con la caja de contrareembolso y barra fija.
import os, sys, urllib.parse
from playwright.sync_api import sync_playwright
HERE=os.path.dirname(os.path.abspath(__file__))
ok=0; bad=0
def check(name, cond, extra=''):
    global ok,bad
    if cond: ok+=1; print('  OK ', name)
    else: bad+=1; print('  MAL', name, extra)

with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args=['--no-sandbox'])
    pg=b.new_page(viewport={'width':390,'height':844})
    errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.route('**/fonts.googleapis.com/**',lambda r:r.abort()); pg.route('**/fonts.gstatic.com/**',lambda r:r.abort())
    nav=[]
    pg.route('**/cart/**',lambda r:(nav.append(r.request.url), r.fulfill(status=200,body='checkout')))
    pg.goto('file://'+os.path.join(HERE,'producto.html')); pg.wait_for_timeout(300)
    print('Ficha de producto')
    check('sin errores de JS', not errs, errs)
    box=pg.locator('#comprar')
    check('pack 1 elegido al entrar', box.locator('input[value="1"]').is_checked())
    check('botón tarjeta 49,95 €', box.locator('[data-sr-card-price]').inner_text()=='49,95 €')
    check('botón contrareembolso 54,95 €', box.locator('[data-sr-cod-price]').inner_text()=='54,95 €')
    # Packs: mismos importes que la caja de contrareembolso
    box.locator('.sr-pack').nth(1).click(); pg.wait_for_timeout(50)
    check('pack 2 → 79,92 €', box.locator('[data-sr-card-price]').inner_text()=='79,92 €', box.locator('[data-sr-card-price]').inner_text())
    check('pack 2 → COD 84,92 €', box.locator('[data-sr-cod-price]').inner_text()=='84,92 €')
    cod=pg.locator('[data-calmia-cod]')
    check('la caja COD pasa al pack 2', cod.locator('input[name^="calmia-pack-"][value="1"]').is_checked())
    check('la caja COD enseña 79,92 € en tarjeta', '79,92' in cod.locator('[data-calmia-cod-cardprice]').inner_text())
    box.locator('.sr-pack').nth(2).click(); pg.wait_for_timeout(50)
    check('pack 3 → 104,91 € (igual que la caja COD)', box.locator('[data-sr-card-price]').inner_text()=='104,91 €', box.locator('[data-sr-card-price]').inner_text())
    check('caja COD en pack 3', cod.locator('input[name^="calmia-pack-"][value="2"]').is_checked())
    # Sentido contrario: cambiar en la caja COD mueve la de arriba
    cod.locator('[data-calmia-pack="0"]').click(); pg.wait_for_timeout(50)
    check('cambiar en la caja COD vuelve arriba al pack 1', box.locator('input[value="1"]').is_checked())
    # Barra fija
    sticky=pg.locator('.sr-sticky')
    box.locator('.sr-pack').nth(1).click(); pg.wait_for_timeout(50)
    check('barra fija dice 2 unidades · 79,92 €', sticky.locator('[data-sr-sticky-label]').inner_text()=='2 unidades' and sticky.locator('[data-sr-sticky-price]').inner_text()=='79,92 €')
    pg.evaluate('window.scrollTo(0, 2600)'); pg.wait_for_timeout(400)
    check('barra fija aparece al bajar', 'is-on' in (sticky.get_attribute('class') or ''))
    pg.evaluate('document.querySelector("[data-calmia-cod]").scrollIntoView()'); pg.wait_for_timeout(800)
    check('barra fija se esconde sobre el formulario', 'is-on' not in (sticky.get_attribute('class') or ''))
    pg.evaluate('window.scrollTo(0,0)'); pg.wait_for_timeout(300)
    # Contrareembolso desde arriba
    box.locator('[data-sr-cod]').click(); pg.wait_for_timeout(2000)
    check('abre la opción contrareembolso', cod.locator('input[name^="calmia-way-"][value="cod"]').is_checked())
    check('muestra el formulario de entrega', cod.locator('[data-calmia-cod-form]').is_visible())
    check('el formulario queda en pantalla', pg.evaluate('(function(){var r=document.querySelector("[data-calmia-cod-form]").getBoundingClientRect();return r.top<844 && r.bottom>0})()'))
    # Pago online
    box.locator('[data-sr-card]').click(); pg.wait_for_timeout(300)
    u=nav[-1] if nav else ''
    check('va al enlace de carrito', '/cart/59286832939353:2?' in u, u)
    q=urllib.parse.parse_qs(urllib.parse.urlparse(u).query)
    check('checkout en español', q.get('locale')==['es'])
    check('el pedido lleva el pack', q.get('attributes[Pack]')==['2 unidades'])
    check('sin recargo de contrareembolso', '59250983928153' not in u)

    print('Portada')
    pg2=b.new_page(viewport={'width':390,'height':844}); errs2=[]; pg2.on('pageerror',lambda e: errs2.append(str(e)))
    pg2.route('**/fonts.g*/**',lambda r:r.abort())
    navs=[]; pg2.on('request',lambda r: navs.append(r.url))
    pg2.goto('file://'+os.path.join(HERE,'portada.html')); pg2.wait_for_timeout(300)
    check('sin errores de JS', not errs2, errs2)
    check('un solo H1', pg2.locator('h1').count()==1, pg2.locator('h1').count())
    pg2.locator('#comprar .sr-pack').nth(2).click()
    pg2.locator('#comprar [data-sr-cod]').click(); pg2.wait_for_timeout(400)
    check('sin caja COD en portada: lleva a la ficha con pack 3 y contrareembolso', any('/products/juego-de-ventosa-electrica-con-cable?pack=3&pago=cod' in n for n in navs), navs[-1:] )
    print('Ficha con ?pack=2&pago=cod')
    pg3=b.new_page(viewport={'width':390,'height':844}); pg3.route('**/fonts.g*/**',lambda r:r.abort())
    pg3.goto('file://'+os.path.join(HERE,'producto.html')+'?pack=2&pago=cod'); pg3.wait_for_timeout(500)
    check('llega con el pack 2 arriba', pg3.locator('#comprar input[value="2"]').is_checked())
    check('y con contrareembolso abierto abajo', pg3.locator('[data-calmia-cod] input[name^="calmia-way-"][value="cod"]').is_checked() and pg3.locator('[data-calmia-cod-form]').is_visible())
    check('caja COD en pack 2', pg3.locator('[data-calmia-cod] input[name^="calmia-pack-"][value="1"]').is_checked())
    b.close()
print('\n%d bien, %d mal'%(ok,bad)); sys.exit(1 if bad else 0)
