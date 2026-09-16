"""
recommendations.py — RF-01: Recomendación Inteligente de Hábitos.

A diferencia del chat normal (donde Claude responde en texto libre),
acá FORZAMOS que la respuesta sea JSON estructurado y validable —
usando tool_choice para obligar a Claude a "llenar un formulario" en
vez de redactar párrafos. Esto es el equivalente práctico al "JSON
Mode" que pedía la especificación técnica.
"""

import os

from anthropic import Anthropic

from database import guardar_recomendaciones, obtener_perfil_usuario
from tools import consultar_historial, consultar_metas_activas

MODEL = "claude-sonnet-4-5"

TOOL_ENTREGAR_RECOMENDACION = {
    "name": "entregar_recomendaciones",
    "description": "Entrega entre 2 y 3 recomendaciones personalizadas de hábitos saludables.",
    "input_schema": {
        "type": "object",
        "properties": {
            "recomendaciones": {
                "type": "array",
                "minItems": 2,
                "maxItems": 3,
                "items": {
                    "type": "object",
                    "properties": {
                        "tipo_habito": {
                            "type": "string",
                            "enum": ["agua", "comida", "sueno", "ejercicio"],
                        },
                        "descripcion": {
                            "type": "string",
                            "description": "La recomendación en 1-2 oraciones, tono cálido, sin markdown.",
                        },
                    },
                    "required": ["tipo_habito", "descripcion"],
                },
            }
        },
        "required": ["recomendaciones"],
    },
}


def generar_recomendaciones(id_usuario: str) -> list[dict]:
    """
    PERCIBE  → perfil + historial + metas del usuario (el entorno real)
    DECIDE   → Claude analiza y arma 2-3 sugerencias basadas en eso
    ACTÚA    → se guardan estructuradas en la tabla `recomendaciones`

    A diferencia del chat, acá NO hay tool-calling de ida y vuelta —
    le damos el contexto ya armado (porque sabemos que SIEMPRE lo va
    a necesitar para esta tarea puntual) y forzamos el formato de salida.
    """
    client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

    perfil = obtener_perfil_usuario(id_usuario) or {}
    historial = consultar_historial(id_usuario, dias=7)
    metas = consultar_metas_activas(id_usuario)

    prompt = (
        f"Perfil del usuario: {perfil}\n"
        f"Historial últimos 7 días: {historial}\n"
        f"Metas activas: {metas}\n\n"
        "Basándote en esto, generá recomendaciones personalizadas de hábitos saludables."
    )

    response = client.messages.create(
        model=MODEL,
        max_tokens=400,
        tools=[TOOL_ENTREGAR_RECOMENDACION],
        tool_choice={"type": "tool", "name": "entregar_recomendaciones"},
        messages=[{"role": "user", "content": prompt}],
    )

    tool_block = next(b for b in response.content if b.type == "tool_use")
    recomendaciones = tool_block.input["recomendaciones"]

    guardar_recomendaciones(id_usuario, recomendaciones)
    return recomendaciones
