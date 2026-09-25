# Vista previa local de las plantillas: renderiza las secciones sr-* con python-liquid
# y filtros de Shopify simulados. Las fotos se sustituyen por un marcador con el nombre
# del archivo (desde aquí no se llega al CDN de Shopify).
import json, re, os, glob, html
from liquid import Environment, CachingFileSystemLoader
from liquid.filter import string_filter
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
PRODUCT_URL='/products/juego-de-ventosa-electrica-con-cable'

class Img(dict):
    def __init__(s,fn): super().__init__(src=fn,alt=fn,width=1254,height=1254); s.fn=fn
    def __str__(s): return s.fn
def ph(fn):
    lab=html.escape(os.path.basename(fn))
    svg="<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='1200'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#c9d7e6'/><stop offset='1' stop-color='#8fa6bf'/></linearGradient></defs><rect width='100%' height='100%' fill='url(#g)'/><text x='50%' y='50%' font-family='sans-serif' font-size='34' text-anchor='middle' fill='#0f2640'>"+lab+"</text></svg>"
    import base64; return 'data:image/svg+xml;base64,'+base64.b64encode(svg.encode()).decode()
env=Environment(loader=CachingFileSystemLoader(os.path.join(ROOT,'snippets'),ext='.liquid'))
F=env.filters
F['image_url']=lambda v,**k: ph(str(v)) if v else ''
F['image_tag']=lambda v,**k: '<img src="%s" alt="%s" loading="%s" width="1200" height="1200">'%(v,html.escape(str(k.get('alt',''))),'eager')
F['money']=lambda v:('%.2f'%(int(v)/100)).replace('.',',')+' €'
F['asset_url']=lambda v:'../assets/'+v
F['stylesheet_tag']=lambda v:'<link rel="stylesheet" href="%s">'%v
F['placeholder_svg_tag']=lambda v,c='':'<svg class="%s" viewBox="0 0 10 10"><rect width="10" height="10" fill="#ccd"/></svg>'%c
F['payment_type_svg_tag']=lambda v:'<svg viewBox="0 0 38 24" width="38" height="24"><rect width="38" height="24" rx="3" fill="#eef2f6" stroke="#ccd"/><text x="19" y="15" font-size="7" text-anchor="middle">%s</text></svg>'%v
F['json']=lambda v: json.dumps(v,ensure_ascii=False)
F['newline_to_br']=lambda v:str(v).replace('\n','<br />\n')
F['strip_html']=lambda v:re.sub(r'<[^>]*>','',str(v))
def where(seq,key,val=None): return [i for i in (seq or []) if (i.get(key)==val if val is not None else i.get(key))]
F['where']=where
F['truncatewords']=lambda v,n=15:' '.join(str(v).split()[:n])
TR=json.load(open(os.path.join(ROOT,'locales-extra','waistzen.json'),encoding='utf-8'))
def t(key,**k):
    d=TR
    for part in str(key).split('.'): d=d.get(part,{}) if isinstance(d,dict) else {}
    return d if isinstance(d,str) else 'translation missing: '+key
F['t']=t
F['at_least']=lambda v,n: max(int(v or 0),int(n))
F['url_encode']=lambda v: __import__('urllib.parse').parse.quote_plus(str(v))

variant={'id':59286832939353,'price':4995,'compare_at_price':9995,'available':True,'sku':'dropipro-386','inventory_management':'','inventory_policy':'continue','inventory_quantity':17}
fee_product={'title':'Contrareembolso','selected_or_first_available_variant':{'id':59250983928153,'price':500,'available':True}}
product={'title':'ReliefPath™ Ventosas Eléctricas con Calor y Luz Roja','url':PRODUCT_URL,'vendor':'Waistzen','description':'ReliefPath','featured_image':Img('producto.png'),
         'selected_or_first_available_variant':variant,'media':[],'metafields':{}}
def load_schema(src):
    m=re.search(r'\{%\s*schema\s*%\}(.*?)\{%\s*endschema\s*%\}',src,re.S); return src[:m.start()],json.loads(m.group(1))
def conv(v,d):
    if d and d['type']=='image_picker' and isinstance(v,str) and v: return Img(v.replace('shopify://shop_images/',''))
    if d and d['type']=='product':
        if not v: return None
        return fee_product if 'contrareembolso' in str(v) else product
    return v
def page(tpl,outname):
    data=json.load(open(os.path.join(ROOT,'templates',tpl),encoding='utf-8'))
    parts=[]
    for sid in data['order']:
        sec=data['sections'][sid]; f=os.path.join(ROOT,'sections',sec['type']+'.liquid')
        if not os.path.exists(f) or sec['type']=='calmia-chat':
            parts.append('<div style="padding:18px;text-align:center;background:#fdf1f3;font:14px sans-serif;border:2px dashed #d4687f" id="shopify-section-template--1__%s">[%s · sección del tema existente]</div>'%(sid,sec['type'])); continue
        body,sc=load_schema(open(f,encoding='utf-8').read())
        defs={d['id']:d for d in sc.get('settings',[]) if 'id' in d}
        st={k:d.get('default') for k,d in defs.items()}; st.update(sec.get('settings',{}))
        st={k:conv(v,defs.get(k)) for k,v in st.items()}
        bdefs={b['type']:b for b in sc.get('blocks',[])}
        blocks=[]
        for bid in sec.get('block_order',[]):
            b=sec['blocks'][bid]; bd={d['id']:d for d in bdefs[b['type']].get('settings',[]) if 'id' in d}
            bs={k:d.get('default') for k,d in bd.items()}; bs.update(b.get('settings',{}))
            blocks.append({'id':bid,'type':b['type'],'settings':{k:conv(v,bd.get(k)) for k,v in bs.items()},'shopify_attributes':''})
        ctx={'section':{'id':'template--1__'+sid,'settings':st,'blocks':blocks},'product':product if 'product' in tpl else None,
             'shop':{'enabled_payment_types':['visa','master','paypal','apple_pay','google_pay']},'request':{'origin':'https://waistzen.com','design_mode':False},'cart':{'currency':{'iso_code':'EUR'}}}
        out=env.from_string(body).render(**ctx)
        parts.append('<div id="shopify-section-template--1__%s" class="shopify-section">%s</div>'%(sid,out))
    doc='<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>%s</title><style>body{margin:0}</style></head><body>%s</body></html>'%(outname,'\n'.join(parts))
    open(os.path.join(HERE,outname),'w',encoding='utf-8').write(doc); print('ok',outname,len(doc))
page('index.json','portada.html'); page('product.reliefpatch.json','producto.html')
