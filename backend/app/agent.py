"""
agent.py — El ciclo PEAS del agente de AgentSync.

    P (Percibe)  → el mensaje del usuario + el historial de la conversación
    E (Entorno)  → la base de datos de hábitos del usuario
    A (Actúa)    → llama funciones reales (tools.py) para leer/escribir el entorno
    S (Sensores/Actuadores) → tool schemas (sensor de "qué puedo hacer") +
                                execute_tool (actuador real)

Diferencia clave con un chatbot de prompt:
  Un chatbot recibe todo el contexto ya armado en el prompt y solo genera texto.
  Este agente NO recibe el historial en el prompt. Recibe la PREGUNTA y decide
  por sí mismo si necesita consultar_historial, analizar_patron_cumplimiento,
  etc. — y solo actúa cuando encuentra una razón para hacerlo. Eso es agencia,
  no autocompletado.
"""

import os

from anthropic import Anthropic

from tools import TOOLS, execute_tool

MODEL = "claude-sonnet-4-5"  # cambiar según el modelo disponible en tu cuenta
MAX_TOKENS_RESPUESTA = 400  # bajado de 1024: respuestas más cortas = menos costo y mejor para voz

SYSTEM_PROMPT = """Eres el agente de AgentSync, un asistente de hábitos saludables.

Personalidad: cálida, tierna, cercana y con humor liviano — como una amiga
que se preocupa de verdad, no un sistema corporativo. Generás confianza,
no sonás a manual.

Reglas de formato (IMPORTANTE — tus respuestas se leen en voz alta):
- NUNCA uses markdown: sin asteriscos, sin numerales #, sin guiones de lista,
  sin negritas ni cursivas. Solo texto plano, como si hablaras.
- No uses emojis.
- Frases cortas y naturales, como si estuvieras hablando, no escribiendo un informe.

Reglas de contenido:
- Máximo 2-4 oraciones por respuesta, salvo que el usuario pida explícitamente más detalle.
  Esto no es solo estilo: cada respuesta más corta cuesta menos tokens.
- No inventes datos del usuario. Si necesitas saber su historial o sus metas,
  usa las herramientas disponibles en vez de asumir.
- No diagnostiques condiciones médicas. Si preguntan algo médico, sugiere
  consultar a un profesional de salud.
- Si detectas una tendencia negativa relevante durante la conversación,
  mencionala aunque el usuario no haya preguntado directamente por eso.
"""


class AgentSyncAgent:
    def __init__(self, api_key: str | None = None):
        self.client = Anthropic(api_key=api_key or os.environ.get("ANTHROPIC_API_KEY"))

    def responder(self, id_usuario: str, mensaje_usuario: str, historial_conversacion: list[dict] | None = None) -> dict:
        """
        Ejecuta un turno completo del agente: puede llamar 0, 1 o varias
        herramientas antes de dar la respuesta final en texto.

        Devuelve: {"respuesta": str, "herramientas_usadas": [str, ...]}
        para que el frontend pueda, si quiere, mostrar qué hizo el agente
        (transparencia — bueno para la sustentación del examen).
        """
        messages = list(historial_conversacion or [])
        messages.append({"role": "user", "content": mensaje_usuario})

        herramientas_usadas = []

        # Loop de tool-calling: Claude puede pedir varias herramientas
        # en cadena antes de responder en texto final.
        while True:
            response = self.client.messages.create(
                model=MODEL,
                max_tokens=MAX_TOKENS_RESPUESTA,
                system=SYSTEM_PROMPT,
                tools=TOOLS,
                messages=messages,
            )

            if response.stop_reason != "tool_use":
                # Claude decidió que ya tiene lo que necesita para responder
                texto_final = "".join(
                    block.text for block in response.content if block.type == "text"
                )
                return {"respuesta": texto_final, "herramientas_usadas": herramientas_usadas}

            # Claude pidió usar una o más herramientas
            messages.append({"role": "assistant", "content": response.content})

            tool_results = []
            for block in response.content:
                if block.type != "tool_use":
                    continue

                herramientas_usadas.append(block.name)
                resultado = execute_tool(block.name, block.input, id_usuario=id_usuario)

                tool_results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": str(resultado),
                    }
                )

            messages.append({"role": "user", "content": tool_results})
            # Vuelve al inicio del while: Claude ve los resultados y decide
            # si necesita otra herramienta más o si ya puede responder.
