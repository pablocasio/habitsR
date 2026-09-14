"""
demo_tool_calling_explicado.py

Este script NO llama a la API de Claude — simula, paso a paso, exactamente
lo que pasaría, para que puedas ENTENDER el mecanismo de tool-calling antes
de gastar tokens reales o de necesitar tu API key.

Corré esto con: python demo_tool_calling_explicado.py

Para la versión real con Claude, poné tu ANTHROPIC_API_KEY en el .env
y corré el servidor con: uvicorn main:app --reload
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "app"))

from database import init_db, seed_demo_user
from tools import execute_tool

init_db()
seed_demo_user()

print("=" * 70)
print("SIMULACIÓN DEL FLUJO DE TOOL-CALLING — AgentSync")
print("=" * 70)

print(
    """
Usuario le escribe al agente:
  "¿Cómo voy con el agua esta semana?"

PASO 1 — Claude PERCIBE el mensaje.
  No tiene el historial en el prompt. No puede responder con datos reales
  todavía. Internamente decide: "necesito la herramienta consultar_historial
  antes de poder contestar esto con precisión."

PASO 2 — Claude devuelve stop_reason = "tool_use" pidiendo:
  { "name": "consultar_historial", "input": { "dias": 7 } }

PASO 3 — El backend EJECUTA la función real (esto es el actuador PEAS):
"""
)

resultado_historial = execute_tool("consultar_historial", {"dias": 7}, id_usuario="demo-pablo")
print("  → Resultado real de la base de datos:")
for r in resultado_historial["registros"]:
    print(f"     {r['fecha']}  agua={r['agua_litros']}L  ejercicio={r['minutos_ejercicio']}min")

print(
    """
PASO 4 — Ese resultado se le devuelve a Claude como tool_result.
  Claude ahora decide: "tengo los datos, pero para responder bien sobre
  'cómo voy' necesito comparar contra la meta, no solo mostrar números."
  Pide una SEGUNDA herramienta: consultar_metas_activas
"""
)

resultado_metas = execute_tool("consultar_metas_activas", {}, id_usuario="demo-pablo")
print("  → Metas activas reales:", resultado_metas["metas_activas"])

print(
    """
PASO 5 — Con historial + metas, Claude decide que además hay una CAÍDA
  visible (miércoles y jueves en cero). Pide una TERCERA herramienta:
  analizar_patron_cumplimiento("agua")
"""
)

resultado_patron = execute_tool(
    "analizar_patron_cumplimiento", {"habito": "agua"}, id_usuario="demo-pablo"
)
print("  → Análisis de tendencia real:", resultado_patron)

print(
    f"""
PASO 6 — Recién ahora, con 3 llamadas a herramientas resueltas, Claude
  genera la respuesta final en texto (stop_reason = "end_turn"):

  ┌─────────────────────────────────────────────────────────────────┐
  │  "Vas en {resultado_historial['registros'][-1]['agua_litros']}L hoy, cerca de tu meta de              │
  │  {resultado_metas['metas_activas'][0]['valor_objetivo']}L. Tuviste un bajón fuerte el                  │
  │  miércoles y jueves (casi sin registrar agua), pero los últimos    │
  │  3 días viene {resultado_patron['tendencia']} de nuevo ({resultado_patron['variacion_porcentual']}% vs. el bajón).  │
  │  Si sostenés este ritmo, cerrás la semana bien."                  │
  └─────────────────────────────────────────────────────────────────┘

Esto es la diferencia con un chatbot de prompt: NINGUNO de estos números
estaba en el prompt inicial. Claude los pidió, uno por uno, porque los
necesitaba — no porque se los dimos preparados.
"""
)

print("=" * 70)
print("Para correr esto con Claude de verdad:")
print("  1. cp .env.example .env")
print("  2. Poné tu ANTHROPIC_API_KEY en .env")
print("  3. cd app && uvicorn main:app --reload")
print("  4. POST http://localhost:8000/api/chat")
print('     { "id_usuario": "demo-pablo", "mensaje": "¿Cómo voy con el agua esta semana?" }')
print("=" * 70)
