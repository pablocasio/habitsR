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
    obtener_perfil_usuario,
    obtener_todos_los_usuarios,
)
from ml_patrones import analizar_patron_ml

MODEL = "claude-sonnet-4-5"
MAX_TOKENS_PROACTIVO = 100  # bajado de 200: el mensaje proactivo debe ser corto por definición

# Un prompt distinto al del chat normal: acá el agente no está
# respondiendo una pregunta, está iniciando él la conversación.
# Por eso el tono y el objetivo son distintos — tiene que sonar a
# que se dio cuenta de algo, no a que está contestando.
SYSTEM_PROMPT_PROACTIVO = """Eres el agente de AgentSync. Vas a iniciar tú la conversación con
el usuario porque detectaste un patrón preocupante en su historial de hábitos.

Personalidad: cálida, tierna y con humor liviano — sonás a una amiga que se
dio cuenta y te escribe con cariño, no a un sistema de monitoreo.

Reglas de formato (se lee en voz alta):
- Sin markdown, sin asteriscos, sin emojis. Solo texto plano y natural.

Reglas de contenido:
- 1-2 oraciones, nada más. Mencioná el dato concreto que detectaste.
- Terminá con una pregunta abierta o una sugerencia concreta, no con un signo de exclamación genérico.
- No diagnostiques nada médico.
"""

HABITOS_A_VIGILAR = ["agua", "ejercicio"]


def _generar_mensaje_proactivo(client: Anthropic, id_usuario: str, habito: str, analisis: dict) -> str:
    perfil = obtener_perfil_usuario(id_usuario) or {}
    nombre = perfil.get("nombre", "el usuario")

    prompt_usuario = (
        f"El usuario se llama {nombre}. Detecté esto en su historial para el hábito '{habito}': "
        f"{analisis}. Escribí el mensaje con el que le vas a escribir vos, iniciando la conversación, "
        f"llamándolo por su nombre de forma natural."
    )
    response = client.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS_PROACTIVO,
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
            analisis = analizar_patron_ml(id_usuario=id_usuario, habito=habito)

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
