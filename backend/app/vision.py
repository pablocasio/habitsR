"""
vision.py — RF-04: Reconocimiento Nutricional por Visión Artificial.

Analiza una foto de comida y devuelve, en un solo llamado multimodal:
  1. Qué es el plato y a qué comida del día corresponde
  2. Calorías y macronutrientes estimados
  3. Un comentario personalizado según el objetivo del usuario

Usa el mismo patrón de salida forzada que recommendations.py: en vez
de pedirle a Claude que describa la comida en un párrafo, lo obligamos
a llenar un "formulario" con campos validables. La imagen entra en el
mismo array de `messages` que el texto — es multimodal real, no un
servicio de visión aparte.
"""

import os
from datetime import datetime

from anthropic import Anthropic

from database import obtener_perfil_usuario

MODEL = "claude-sonnet-4-5"  # los modelos Sonnet/Opus de Claude son multimodales

TOOL_REPORTAR_ANALISIS = {
    "name": "reportar_analisis_nutricional",
    "description": "Reporta el análisis nutricional estimado de la foto de comida.",
    "input_schema": {
        "type": "object",
        "properties": {
            "nombre_plato": {"type": "string", "description": "Qué es el plato, en pocas palabras."},
            "tipo_comida": {
                "type": "string",
                "enum": ["desayuno", "almuerzo", "cena", "snack"],
                "description": "A qué comida del día corresponde, según la hora actual y lo que se ve en el plato.",
            },
            "calorias_estimadas": {"type": "number"},
            "proteinas_g": {"type": "number"},
            "carbohidratos_g": {"type": "number"},
            "grasas_g": {"type": "number"},
            "confianza": {
                "type": "string",
                "enum": ["alta", "media", "baja"],
                "description": "Qué tan seguro estás de la estimación, dado lo que se ve en la foto.",
            },
            "comentario_metas": {
                "type": "string",
                "description": (
                    "1-2 oraciones, cálidas, sin markdown: cómo este plato encaja (o no) con el "
                    "objetivo y la dieta del usuario. Ejemplo: si el objetivo es ganar músculo y el "
                    "plato tiene poca proteína, decilo constructivamente."
                ),
            },
        },
        "required": [
            "nombre_plato", "tipo_comida", "calorias_estimadas", "proteinas_g",
            "carbohidratos_g", "grasas_g", "confianza", "comentario_metas",
        ],
    },
}


def analizar_foto_comida(id_usuario: str, imagen_base64: str, media_type: str = "image/jpeg") -> dict:
    """
    OJO: esto YA NO guarda automáticamente. Devuelve el análisis para
    que el usuario confirme (o corrija) el tipo de comida antes de que
    cuente para el día — separado de guardar_analisis_foto_comida, que
    es quien realmente escribe en la base.
    """
    client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

    perfil = obtener_perfil_usuario(id_usuario) or {}
    hora_actual = datetime.now().strftime("%H:%M")

    prompt = (
        f"Son las {hora_actual}. El usuario tiene como objetivo '{perfil.get('objetivo', 'no especificado')}' "
        f"y sigue una dieta '{perfil.get('dieta', 'no especificada')}'"
        + (f", con alergia/restricción a: {perfil['alergias']}" if perfil.get("alergias") else "")
        + ".\n\nAnalizá esta foto de comida. Usá la hora para inferir si es desayuno, almuerzo, cena o "
        "snack (y ajustá con lo que ves en el plato). Estimá calorías y macronutrientes de forma "
        "razonable según porciones típicas si no podés medir exacto. Si la imagen no muestra comida "
        "claramente, decilo en nombre_plato y poné confianza baja. Dado el objetivo del usuario, "
        "agregá un comentario breve sobre cómo este plato encaja con su meta."
    )

    response = client.messages.create(
        model=MODEL,
        max_tokens=350,
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
                    {"type": "text", "text": prompt},
                ],
            }
        ],
    )

    tool_block = next(b for b in response.content if b.type == "tool_use")
    analisis = tool_block.input
    return analisis
