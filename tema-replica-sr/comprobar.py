# Comprueba que las plantillas solo usan ajustes, bloques y opciones que existen en los schemas.
import json, re, os, glob, sys
HERE=os.path.dirname(os.path.abspath(__file__))
schemas={}
for f in glob.glob(os.path.join(HERE,'sections','*.liquid'))+glob.glob(os.path.join(HERE,'..','shopify-theme','sections','*.liquid')):
    s=open(f,encoding='utf-8').read(); m=re.search(r'\{%\s*schema\s*%\}(.*?)\{%\s*endschema\s*%\}',s,re.S)
    schemas[os.path.basename(f)[:-7]]=json.loads(m.group(1))
extern={'calmia-sticky-atc','calmia-chat'}  # están en el tema, no en este repo al completo
errs=[]
def chk(where,settings,defs):
    ids={d['id']:d for d in defs if 'id' in d}
    for k,v in settings.items():
        if k not in ids: errs.append('%s: ajuste desconocido %s'%(where,k)); continue
        d=ids[k]
        if d['type']=='select' and v not in [o['value'] for o in d['options']]: errs.append('%s: %s=%r no es opción'%(where,k,v))
        if d['type'] in('text',) and isinstance(v,str) and len(v)>0 and '\n' in v: errs.append('%s: %s con salto de línea en text'%(where,k))
        if d['type']=='range' and not(d['min']<=v<=d['max']): errs.append('%s: %s fuera de rango'%(where,k))
for t in ['index.json','product.reliefpatch.json']:
    data=json.load(open(os.path.join(HERE,'templates',t),encoding='utf-8'))
    for sid,sec in data['sections'].items():
        sc=schemas.get(sec['type'])
        if not sc and sec['type'] in extern: continue
        if not sc: errs.append('%s/%s: sección %s no existe'%(t,sid,sec['type'])); continue
        chk('%s/%s'%(t,sid),sec.get('settings',{}),sc.get('settings',[]))
        btypes={b['type']:b for b in sc.get('blocks',[])}
        for bid,b in sec.get('blocks',{}).items():
            if b['type'] not in btypes: errs.append('%s/%s/%s: bloque %s no existe'%(t,sid,bid,b['type'])); continue
            chk('%s/%s/%s'%(t,sid,bid),b.get('settings',{}),btypes[b['type']].get('settings',[]))
        if 'max_blocks' in sc and len(sec.get('blocks',{}))>sc['max_blocks']: errs.append('%s/%s: demasiados bloques'%(t,sid))
    assert set(data['order'])==set(data['sections']), t
print('\n'.join(errs) if errs else 'plantillas OK'); sys.exit(1 if errs else 0)
