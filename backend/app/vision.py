"""
vision.py — Conteo de calorías a través de fotos de comida.

Usa el mismo patrón de salida forzada que recommendations.py: en vez
de pedirle a Claude que describa la comida en un párrafo, lo obligamos
a llenar un "formulario" con campos numéricos validables. Esto es
multimodal real — la imagen entra en el mismo array de `messages`
que el texto, no hay un servicio de visión separado.
"""

import os

from anthropic import Anthropic

from database import guardar_analisis_foto_comida

MODEL = "claude-sonnet-4-5"  # los modelos Sonnet/Opus de Claude son multimodales

TOOL_REPORTAR_ANALISIS = {
    "name": "reportar_analisis_nutricional",
    "description": "Reporta el análisis nutricional estimado de la foto de comida.",
    "input_schema": {
        "type": "object",
        "properties": {
            "nombre_plato": {"type": "string", "description": "Qué es el plato, en pocas palabras."},
            "calorias_estimadas": {"type": "number"},
            "proteinas_g": {"type": "number"},
            "carbohidratos_g": {"type": "number"},
            "grasas_g": {"type": "number"},
            "confianza": {
                "type": "string",
                "enum": ["alta", "media", "baja"],
                "description": "Qué tan seguro estás de la estimación, dado lo que se ve en la foto.",
            },
        },
        "required": ["nombre_plato", "calorias_estimadas", "proteinas_g", "carbohidratos_g", "grasas_g", "confianza"],
    },
}

PROMPT_ANALISIS = """Analizá esta foto de comida. Estimá calorías y macronutrientes
de forma razonable según lo que se ve — porciones típicas si no podés medir
exacto. Si la imagen no muestra comida claramente, decilo en nombre_plato
y poné confianza baja."""


def analizar_foto_comida(id_usuario: str, imagen_base64: str, media_type: str = "image/jpeg") -> dict:
    client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

    response = client.messages.create(
        model=MODEL,
        max_tokens=300,
        tools=[TOOL_REPORTAR_ANALISIS],
        tool_choice={"type": "tool", "name": "reportar_analisis_nutricional"},
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {"type": "base64", "media_type": media_type, "data": imagen_base64},
                    },
                    {"type": "text", "text": PROMPT_ANALISIS},
                ],
            }
        ],
    )

    tool_block = next(b for b in response.content if b.type == "tool_use")
    analisis = tool_block.input

    guardar_analisis_foto_comida(id_usuario, analisis)
    return analisis
