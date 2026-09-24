import sys, os
from playwright.sync_api import sync_playwright
HERE=os.path.dirname(os.path.abspath(__file__))
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args=['--no-sandbox'])
    for name in ['portada','producto']:
        for w,h in [(390,844),(1440,900)]:
            pg=b.new_page(viewport={'width':w,'height':h})
            errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
            pg.route('**/fonts.googleapis.com/**',lambda r:r.abort()); pg.route('**/fonts.gstatic.com/**',lambda r:r.abort())
            pg.goto('file://'+os.path.join(HERE,name+'.html')); pg.wait_for_timeout(400)
            sw=pg.evaluate('document.documentElement.scrollWidth')
            pg.screenshot(path=os.path.join(HERE,'%s-%d-full.png'%(name,w)),full_page=True)
            print(name,w,'scrollWidth',sw,'errors',errs)
            pg.close()
    b.close()
