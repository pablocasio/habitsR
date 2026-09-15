"""
proactive.py — Lo que convierte a AgentSync de chatbot en agente.

Un chatbot solo actúa cuando alguien le escribe. Este módulo corre
SOLO, sin que nadie lo dispare, revisa el entorno (la base de datos)
y decide por sí mismo si hay que iniciar una conversación.

Esto es la diferencia entre "IA que responde" e "IA que percibe su
entorno y actúa sobre él" — que es, literalmente, la definición de
agente en términos PEAS que probablemente ya viste en el curso.
"""

import os

from anthropic import Anthropic

from database import (
    existe_alerta_reciente,
    guardar_alerta_proactiva,
    obtener_todos_los_usuarios,
)
from tools import analizar_patron_cumplimiento

MODEL = "claude-sonnet-4-5"

# Un prompt distinto al del chat normal: acá el agente no está
# respondiendo una pregunta, está iniciando él la conversación.
# Por eso el tono y el objetivo son distintos — tiene que sonar a
# que se dio cuenta de algo, no a que está contestando.
SYSTEM_PROMPT_PROACTIVO = """Eres el agente de AgentSync. Vas a iniciar tú la conversación con
el usuario porque detectaste un patrón preocupante en su historial de hábitos.

Reglas:
- No suenes a alarma ni a regaño. Sonás a alguien que se dio cuenta y se preocupa, no a un sistema de monitoreo.
- Sé breve (2-3 líneas). Mencioná el dato concreto que detectaste.
- Terminá con una pregunta abierta o una sugerencia concreta, no con un signo de exclamación genérico.
- No diagnostiques nada médico.
"""

HABITOS_A_VIGILAR = ["agua", "ejercicio"]


def _generar_mensaje_proactivo(client: Anthropic, id_usuario: str, habito: str, analisis: dict) -> str:
    prompt_usuario = (
        f"Detecté esto en el historial del usuario (id: {id_usuario}) para el hábito '{habito}': "
        f"{analisis}. Escribí el mensaje con el que le vas a escribir vos, iniciando la conversación."
    )
    response = client.messages.create(
        model=MODEL,
        max_tokens=200,
        system=SYSTEM_PROMPT_PROACTIVO,
        messages=[{"role": "user", "content": prompt_usuario}],
    )
    return "".join(block.text for block in response.content if block.type == "text")


def revisar_patrones_y_notificar():
    """
    Esta es la función que el scheduler llama solo, sin que nadie la invoque
    manualmente. Por cada usuario, por cada hábito vigilado:

      1. PERCIBE  → analizar_patron_cumplimiento (lee el entorno real)
      2. DECIDE   → ¿la tendencia es "cayendo"? ¿ya avisé de esto hace poco?
      3. ACTÚA    → si corresponde, genera el mensaje y lo guarda para
                     que el usuario lo vea la próxima vez que abra la app
    """
    client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
    alertas_generadas = []

    for id_usuario in obtener_todos_los_usuarios():
        for habito in HABITOS_A_VIGILAR:
            analisis = analizar_patron_cumplimiento(habito=habito, id_usuario=id_usuario)

            if not analisis.get("suficientes_datos", True):
                continue
            if analisis.get("tendencia") != "cayendo":
                continue  # el patrón no justifica molestar al usuario
            if existe_alerta_reciente(id_usuario, tipo_riesgo=habito):
                continue  # ya le avisamos de esto hace poco, no repetir

            mensaje = _generar_mensaje_proactivo(client, id_usuario, habito, analisis)
            guardar_alerta_proactiva(id_usuario, tipo_riesgo=habito, mensaje=mensaje)
            alertas_generadas.append({"id_usuario": id_usuario, "habito": habito, "mensaje": mensaje})

    return alertas_generadas
