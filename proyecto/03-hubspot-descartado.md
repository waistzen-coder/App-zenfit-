# HubSpot Sunset Arbitrage: investigado y descartado

7-8 de septiembre de 2026. Tres fases de investigación, veredicto **NO CONSTRUIR**
con 25/100. Queda escrito para no volver a recorrer el mismo camino dentro de
seis meses.

## La tesis

HubSpot retira las Legacy CRM Cards. Las apps que dependan de ellas dejarán de
funcionar, sus clientes quedarán tirados, y nosotros llegamos con la alternativa
moderna aprovechando la distribución del App Marketplace.

## Lo que se verificó

**La fecha es correcta.** Las Legacy CRM Cards construidas con la antigua CRM
Extensions API dejan de soportarse el **31 de octubre de 2026** y dejan de
renderizarse en los registros del CRM. Afecta solo a `/crm/v3/extensions/cards`
y endpoints relacionados; no afecta a las UI Extensions con Projects. Anunciado
con efecto 16 de junio de 2025: quince meses de aviso.

## Los tres hechos que la tumbaron

**1. HubSpot entregó las dos mitades de la migración.** El *Legacy Card
Converter* reconstruye la tarjeta replicando su comportamiento, y el *View
Swapping Tool* (21 de abril de 2026) la sustituye en producción actualizando las
vistas de todos los clientes existentes, **sin ninguna acción del cliente**. No
es esfuerzo cero —hay que probar aparte, es irreversible, y las tarjetas de
tickets necesitan duplicarse para `helpdesk.sidebar`— pero es un camino
asfaltado. Y sobre todo: **el cliente nunca ve una tarjeta rota**. Sin ruptura
visible no hay búsqueda de alternativa, y sin búsqueda de alternativa no hay a
quién vender.

**2. La selección deja el conjunto vacío.** Las legacy cards están prohibidas
para nuevos listings, certificaciones y recertificaciones, y toda app listada o
certificada debe migrar antes del 31/10/2026. Así que las apps que no migren son
las abandonadas, y las abandonadas no tienen clientes de pago que heredar. Las
que sí los tienen tienen el máximo incentivo para migrar y las herramientas para
hacerlo. «Tiene clientes pagando» ∩ «no va a migrar» está vacío por
construcción.

**3. La ventana estaba cerrada antes de empezar.** Para **listar** hacen falta
tres instalaciones activas y únicas en **cuentas de producción ajenas a tu
organización**, con actividad en los últimos 30 días; las cuentas de
desarrollador y de prueba no cuentan. Para **certificar**, seis meses listada y
sesenta instalaciones activas. El 8 de septiembre de 2026 quedaban 53 días. La
distribución del Marketplace —única razón por la que esta estrategia tenía
sentido sin presupuesto— no estaba disponible a tiempo. Esto había que
empezarlo a finales de 2025.

## Puntuación

| Dimensión | Nota |
| --------- | ---- |
| Demostración de demanda | 1/10 |
| Urgencia | 3/10 · real, pero en nuestra contra |
| Distribución | 0/10 |
| Margen | 6/10 |
| Facilidad técnica | 5/10 |
| Competencia | 3/10 · no verificable |
| Migration advantage | 1/10 · neutralizado en origen |
| Riesgo HubSpot (bajo = mejor) | 3/10 |
| Solo founder fit | 3/10 |
| Time to revenue | 0/10 |
| **Total** | **25/100** |

## Lo que habría cambiado la decisión

Las dos cosas a la vez, no una: tres empresas reales con HubSpot dispuestas a
instalar, **y** una app concreta con clientes pagando cuyo desarrollador haya
declarado que no migra.

## Lo que no se pudo investigar

Todos los dominios de HubSpot —`developers`, `ecosystem`, `community`,
`knowledge`— devuelven 403 en el proxy de egress de la sesión. Las Fases B a F
(mapa de App Cards, treinta candidatas, forense de reviews, precios) se quedaron
sin hacer. No se rellenaron con estimaciones: inventar instalaciones y precios
para aparentar el encargo cumplido habría sido peor que no hacerlo.

Aun así, los tres hechos de arriba son independientes de esa investigación.
Ninguna ficha de candidata arregla una herramienta de migración automática ni un
requisito de seis meses contra un plazo de 53 días.

## La lección, que sí vale para la próxima

El arbitraje de sunset de plataforma funciona. Lo que falló aquí fue el reloj.
Aplicado bien: buscar retiradas con **12 a 18 meses de margen**, y comprobar en
el primer minuto si la plataforma ha publicado herramienta oficial de migración.
Si la hay, no hay negocio, y se descubre en una búsqueda en vez de en tres fases.

## Fuentes

- Deprecación de las Classic/Legacy CRM Cards: https://developers.hubspot.com/changelog/deprecating-support-for-classic-crm-cards
- Guía de legacy CRM cards: https://developers.hubspot.com/docs/api-reference/latest/crm/extensions/crm-cards/guide
- View Swapping Tool, abril de 2026: https://developers.hubspot.com/changelog/april-2026-rollup
- Migrar vistas de CRM card: https://developers.hubspot.de/docs/api-reference/legacy/crm/extensions/crm-cards/migrate-crm-card
- Requisitos de listing y certificación, mayo de 2026: https://developers.hubspot.com/changelog/app-listing-and-app-certification-requirement-updates-for-may-2026
- Requisitos de listing: https://developers.hubspot.com/docs/apps/developer-platform/list-apps/listing-your-app/app-marketplace-listing-requirements
- Requisitos de certificación: https://developers.hubspot.com/docs/apps/developer-platform/list-apps/apply-for-certification/certification-requirements
- Qué cuenta como instalación activa: https://community.hubspot.com/t5/APIs-Integrations/Understanding-the-active-installation-requirement-for-listing-an/td-p/1232591
