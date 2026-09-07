"""El cálculo de la reclamación, factura a factura.

Tres cosas que parecen detalles y son la mitad del producto:

1. **El tipo cambia cada semestre.** Un retraso de ocho meses no se calcula con
   un tipo: se parte en tramos y cada tramo lleva el suyo. Es el error que casi
   todo el mundo comete a mano, y la razón de que solo el 2 % de las pymes
   calcule bien sus intereses.

2. **El vencimiento no es el que ponga la factura.** La Ley 3/2004 anula los
   pactos que superan los 60 días entre empresas, y sin pacto son 30. Frente a
   la Administración, el artículo 198 de la LCSP son 30 días. Si el proveedor
   aceptó 90 días en un contrato, la ley dice 60 y se calcula sobre 60.

3. **Los 40 € son por factura.** Artículo 8.1, automáticos, sin acreditar coste
   alguno. El Tribunal Supremo confirmó en 2025 que se devengan por cada una de
   las facturas pagadas con demora, no una vez por deuda. En una cartera de
   varios cientos de facturas, este concepto solo suele superar a los intereses.

El motor prefiere no dar un número a dar uno malo: si le falta el tipo de algún
semestre, aparta esa factura y dice por qué, en vez de estimar.
"""

from dataclasses import dataclass, field
from datetime import date, timedelta

from .tipos import SemestreSinTipo, tipo_de

# Artículo 8.1 de la Ley 3/2004.
COMPENSACION_FIJA = 40.0

# Plazos legales de pago, en días naturales.
PLAZO_SIN_PACTO = 30          # Ley 3/2004, art. 4.
PLAZO_MAXIMO_PACTABLE = 60    # Ley 3/2004, art. 4: más de 60 días es nulo.
PLAZO_ADMINISTRACION = 30     # LCSP, art. 198.

# Prescripción, para avisar de lo que está a punto de perderse.
PRESCRIPCION_PRIVADO = 5      # Código Civil, art. 1964.
PRESCRIPCION_PUBLICO = 4      # Contratos del sector público.


@dataclass(frozen=True)
class Factura:
    numero: str
    deudor: str
    importe: float                       # lo que se debía, sobre lo que corren los intereses
    fecha_emision: date
    fecha_cobro: date | None = None      # None = todavía sin cobrar
    fecha_vencimiento_pactada: date | None = None
    deudor_publico: bool = False

    def vencimiento_legal(self) -> date:
        """El vencimiento que la ley admite, que no siempre es el pactado."""
        if self.deudor_publico:
            return self.fecha_emision + timedelta(days=PLAZO_ADMINISTRACION)

        tope = self.fecha_emision + timedelta(days=PLAZO_MAXIMO_PACTABLE)
        if self.fecha_vencimiento_pactada is None:
            return self.fecha_emision + timedelta(days=PLAZO_SIN_PACTO)
        # Un pacto de más de 60 días es nulo: se recorta al tope legal.
        return min(self.fecha_vencimiento_pactada, tope)


@dataclass(frozen=True)
class Tramo:
    """Un trozo del retraso que cae entero dentro de un semestre."""

    anio: int
    semestre: int
    dias: int
    porcentaje: float
    intereses: float


@dataclass(frozen=True)
class ResultadoFactura:
    factura: Factura
    vencimiento_legal: date
    dias_de_demora: int
    tramos: list[Tramo]
    intereses: float
    compensacion: float
    prescrita: bool

    @property
    def total(self) -> float:
        return self.intereses + self.compensacion


@dataclass
class Reclamacion:
    resultados: list[ResultadoFactura] = field(default_factory=list)
    apartadas: list[tuple[Factura, str]] = field(default_factory=list)

    @property
    def facturas_con_demora(self) -> int:
        return sum(1 for r in self.resultados if r.dias_de_demora > 0)

    @property
    def intereses(self) -> float:
        return sum(r.intereses for r in self.resultados)

    @property
    def compensaciones(self) -> float:
        return sum(r.compensacion for r in self.resultados)

    @property
    def total(self) -> float:
        return self.intereses + self.compensaciones

    @property
    def prescritas(self) -> list[ResultadoFactura]:
        return [r for r in self.resultados if r.prescrita]


def _semestre_de(dia: date) -> tuple[int, int]:
    return (dia.year, 1 if dia.month <= 6 else 2)


def _dias_del_anio(anio: int) -> int:
    return 366 if (anio % 4 == 0 and (anio % 100 != 0 or anio % 400 == 0)) else 365


def _partir_en_semestres(desde: date, hasta: date) -> list[tuple[int, int, int]]:
    """Parte [desde, hasta) en tramos (año, semestre, días).

    `desde` es el día siguiente al vencimiento y `hasta` el día del cobro: el
    retraso se cuenta como días completos transcurridos entre ambos.
    """
    tramos: list[tuple[int, int, int]] = []
    cursor = desde
    while cursor < hasta:
        anio, semestre = _semestre_de(cursor)
        fin_semestre = date(anio, 7, 1) if semestre == 1 else date(anio + 1, 1, 1)
        corte = min(fin_semestre, hasta)
        tramos.append((anio, semestre, (corte - cursor).days))
        cursor = corte
    return tramos


def calcular_factura(factura: Factura, hoy: date | None = None) -> ResultadoFactura:
    """Calcula una factura. Lanza SemestreSinTipo si le falta algún tipo."""
    hoy = hoy or date.today()
    vencimiento = factura.vencimiento_legal()
    fin = factura.fecha_cobro or hoy

    dias = max((fin - vencimiento).days, 0)
    if dias == 0:
        return ResultadoFactura(factura, vencimiento, 0, [], 0.0, 0.0, False)

    tramos: list[Tramo] = []
    intereses = 0.0
    for anio, semestre, dias_tramo in _partir_en_semestres(vencimiento + timedelta(days=1),
                                                           fin + timedelta(days=1)):
        tipo = tipo_de(anio, semestre)
        importe = factura.importe * (tipo.porcentaje / 100) * dias_tramo / _dias_del_anio(anio)
        intereses += importe
        tramos.append(Tramo(anio, semestre, dias_tramo, tipo.porcentaje, round(importe, 2)))

    anios = PRESCRIPCION_PUBLICO if factura.deudor_publico else PRESCRIPCION_PRIVADO
    prescrita = (hoy - fin).days > anios * 365.25

    return ResultadoFactura(
        factura=factura,
        vencimiento_legal=vencimiento,
        dias_de_demora=dias,
        tramos=tramos,
        intereses=round(intereses, 2),
        compensacion=COMPENSACION_FIJA,
        prescrita=prescrita,
    )


def calcular_reclamacion(facturas: list[Factura], hoy: date | None = None) -> Reclamacion:
    """Calcula todo lo que se puede y aparta lo que no, diciendo por qué.

    Que falte el tipo de un semestre no puede tumbar el informe entero: se
    calculan las demás y se dice exactamente qué falta por verificar.
    """
    reclamacion = Reclamacion()
    for factura in facturas:
        try:
            reclamacion.resultados.append(calcular_factura(factura, hoy))
        except SemestreSinTipo as falta:
            reclamacion.apartadas.append((factura, str(falta)))
    return reclamacion
