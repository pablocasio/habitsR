"""
demo_proactividad_explicado.py

Prueba SOLO la parte de detección de patrones (no llama a Claude, así que
corre sin necesitar tu API key). Verifica dos cosas clave:

  1. demo-riesgo (cae y no se recupera) SÍ debería disparar alerta
  2. demo-pablo (cae y se recupera) NO debería disparar alerta

Que el agente sepa CUÁNDO NO molestar es tan importante como que sepa
cuándo sí — un agente que manda alertas por cualquier cosa es tan malo
como uno que nunca avisa nada.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "app"))

from database import init_db, seed_demo_user, seed_demo_user_en_riesgo, existe_alerta_reciente
from tools import analizar_patron_cumplimiento

init_db()
seed_demo_user()
seed_demo_user_en_riesgo()

print("=" * 70)
print("VERIFICACIÓN DE DETECCIÓN DE PATRONES (sin llamar a Claude)")
print("=" * 70)

for id_usuario, descripcion in [
    ("demo-pablo", "cae mitad de semana, SE RECUPERA los últimos 3 días"),
    ("demo-riesgo", "cae y NO se recupera, empeora hasta hoy"),
]:
    print(f"\nUsuario: {id_usuario}  ({descripcion})")
    for habito in ["agua", "ejercicio"]:
        analisis = analizar_patron_cumplimiento(habito=habito, id_usuario=id_usuario)
        tendencia = analisis.get("tendencia", "?")
        dispararia = tendencia == "cayendo" and not existe_alerta_reciente(id_usuario, habito)
        marca = "🔴 DISPARARÍA ALERTA" if dispararia else "🟢 no molesta al usuario"
        print(
            f"  {habito:10s} → tendencia: {tendencia:10s} "
            f"(reciente={analisis.get('promedio_ultimos_3_dias')}, "
            f"previo={analisis.get('promedio_dias_previos')})  {marca}"
        )

print(
    """
Notá que demo-pablo, aunque tuvo días malos (miércoles/jueves), NO
dispara ninguna alerta — porque los últimos 3 días muestran recuperación.
Solo demo-riesgo, que sigue empeorando HOY, dispara. Esa es la diferencia
entre un agente que analiza tendencia real y uno que solo mira "¿hoy fue
un mal día?" — que generaría falsas alarmas todo el tiempo.

Para ver el mensaje real que generaría Claude (esto SÍ necesita tu
ANTHROPIC_API_KEY), levantá el servidor y forzá la revisión manualmente
en vez de esperar los 30 segundos del scheduler:

    uvicorn main:app --reload

    # en otra terminal:
    curl -X POST http://localhost:8000/api/debug/forzar-revision

    # y para ver la alerta que le quedó pendiente a demo-riesgo:
    curl http://localhost:8000/api/alertas/demo-riesgo
"""
)
print("=" * 70)
