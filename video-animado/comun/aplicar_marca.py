"""Pone la marca real de Iron Fuel Nutrition (logo, colores y fachada) en una parte del vídeo.

    python3 comun/aplicar_marca.py ironfuel ironfuel-2 …

- Copia el logo a assets/brand/logo.png.
- Cambia el naranja por el azul del logo (y su gama de acero) en build.mjs y motor.js.
- Sustituye la tienda, la fachada y el mostrador por los de comun/tienda.js.
"""
import os
import re
import shutil
import sys

COMUN = os.path.dirname(os.path.abspath(__file__))
TIENDA = open(os.path.join(COMUN, "tienda.js")).read()


def entre(s, ini, fin, nuevo):
    i = s.index(ini)
    j = s.index(fin, i)
    return s[:i] + nuevo + s[j:]


def aplicar(proyecto):
    os.makedirs(os.path.join(proyecto, "assets/brand"), exist_ok=True)
    shutil.copy(os.path.join(COMUN, "logo.png"), os.path.join(proyecto, "assets/brand/logo.png"))
    p = os.path.join(proyecto, "tools/build.mjs")
    s = open(p).read()
    if "// marca: Iron Fuel Nutrition" in s:
        print(proyecto, "ya tenía la marca")
        return
    # colores
    s = s.replace(
        '  naranja: "#FF6A1A", naranjaOsc: "#C24A0A", naranjaTxt: "#C2410C", verde: "#22C55E", verdeTxt: "#15803D", rojo: "#EF4444",',
        '  // marca: Iron Fuel Nutrition (azul eléctrico del logo y gama de acero)\n'
        '  azul: "#1D6BFF", azulOsc: "#0B3FB3", azulTxt: "#1550D8", azulClaro: "#5AB0FF", acero: "#C9CED6",\n'
        '  verde: "#22C55E", verdeTxt: "#15803D", rojo: "#EF4444",',
    )
    assert "// marca: Iron Fuel Nutrition" in s, "no encuentro la paleta"
    s = s.replace("C.naranjaTxt", "C.azulTxt").replace("C.naranjaOsc", "C.azulOsc").replace("C.naranja", "C.azul")
    s = s.replace("#FF6A1A", "#1D6BFF").replace("#FFD2A8", "#A9D0FF")
    # degradados
    s = s.replace(
        '<linearGradient id="pared-tienda" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3B302A"/><stop offset="1" stop-color="#26201C"/></linearGradient>',
        '<linearGradient id="pared-tienda" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#30343B"/><stop offset="1" stop-color="#1F2228"/></linearGradient>\n'
        '<linearGradient id="acero" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4F6F8"/><stop offset="0.45" stop-color="#9AA2AD"/><stop offset="0.55" stop-color="#E3E7EC"/><stop offset="1" stop-color="#6E7681"/></linearGradient>\n'
        '<linearGradient id="acero-claro" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.6" stop-color="#E4E8EE"/><stop offset="1" stop-color="#AEB5BF"/></linearGradient>',
    )
    s = s.replace('<stop offset="0" stop-color="#FFE7B8" stop-opacity="0.55"/><stop offset="1" stop-color="#FFE7B8" stop-opacity="0"/>',
                  '<stop offset="0" stop-color="#EAF2FF" stop-opacity="0.5"/><stop offset="1" stop-color="#EAF2FF" stop-opacity="0"/>')
    # tienda, fachada y mostrador nuevos (y el logo)
    s = entre(s, "// ───────────── la tienda ─────────────", "// bote: origen abajo en el centro", TIENDA + "\n")
    # botes de la marca
    s = s.replace('txt(0, y0 + 32, "IRONFUEL", 22, etiqueta === "#111317" ? C.azul : C.azulTxt, 900, "middle", \'letter-spacing="2" data-layout-ignore\')',
                  'txt(0, y0 + 32, "IRON FUEL", 22, etiqueta === "#111317" || etiqueta === "#0E1013" ? C.azulClaro : C.azulTxt, 900, "middle", \'letter-spacing="2" data-layout-ignore\')')
    # bolsa negra con el logo
    s = re.sub(r'<g id="bolsa" opacity="0">.*?</g>`;',
               '<g id="bolsa" opacity="0"><path d="M-30 0 Q-30 -40 0 -40 Q30 -40 30 0" stroke="#1A1C20" stroke-width="8" fill="none"/><rect x="-70" y="0" width="140" height="150" rx="10" fill="#121418"/><rect x="-70" y="0" width="140" height="14" fill="${C.azul}"/>${logo(0, 80, 54)}</g>`;',
               s, count=1, flags=re.S)
    s = re.sub(r'<g id="bolsa-abu" opacity="0">.*?</g>`;',
               '<g id="bolsa-abu" opacity="0"><path d="M-26 0 Q-26 -34 0 -34 Q26 -34 26 0" stroke="#1A1C20" stroke-width="7" fill="none"/><rect x="-60" y="0" width="120" height="128" rx="10" fill="#121418"/><rect x="-60" y="0" width="120" height="12" fill="${C.azul}"/>${logo(0, 68, 46)}</g>`;',
               s, count=1, flags=re.S)
    # camiseta del dependiente
    s = s.replace('<g id="dep-logo">${icono("fire", -18, 0, 34, C.azul)}${txt(14, 12, "IF", 30, C.azul, 900)}</g>',
                  '<g id="dep-logo">${txt(0, 14, "IF", 38, C.azulClaro, 900, "middle", \'font-style="italic"\')}</g>')
    # números de los botes: azul con número blanco
    s = re.sub(r'(txt\((\d+), (\d+), "([12])", 56, )"#111"', r'\1"#fff"', s)
    # avatar de la tarjeta final (parte 2 en adelante)
    s = s.replace('<circle cx="700" cy="200" r="92" fill="${C.azul}"/>${icono("fire", 700, 200, 116, "#fff")}', '${logo(700, 200, 96)}')
    # subtítulos: palabra clave en azul con letra blanca
    s = s.replace("#root .clave { background: ${C.azul}; color: #111;", "#root .clave { background: ${C.azul}; color: #fff;")
    open(p, "w").write(s)
    m = os.path.join(proyecto, "tools/motor.js")
    t = open(m).read().replace("#FF6A1A", "#1D6BFF")
    open(m, "w").write(t)
    print(proyecto, "con la marca de Iron Fuel")


if __name__ == "__main__":
    for d in sys.argv[1:]:
        aplicar(d)
