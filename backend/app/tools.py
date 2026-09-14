"""
tools.py — Las "manos" del agente (Actuadores en términos PEAS).

Cada herramienta tiene dos partes:
  1. TOOLS: el esquema JSON que le describe a Claude qué existe, qué
     parámetros necesita y cuándo tendría sentido usarla. Claude lee
     esto y DECIDE por sí mismo si la necesita — no se la forzamos.
  2. EJECUTOR (execute_tool): el código Python real que corre cuando
     Claude pide usar una herramienta.

Este es el corazón de la diferencia entre "chatbot con prompt" y
"agente PEAS": el LLM percibe la conversación, decide qué acción
tomar, y el actuador ejecuta esa acción sobre el entorno real
(la base de datos).
"""

import statistics
from datetime import date, timedelta

from database import get_connection

# ──────────────────────────────────────────────────────────────
# 1. ESQUEMAS — lo que Claude "ve" que puede hacer
# ──────────────────────────────────────────────────────────────

TOOLS = [
    {
        "name": "consultar_historial",
        "description": (
            "Consulta el historial de registros diarios del usuario (agua, comidas, "
            "sueño, ejercicio) de los últimos N días. Úsala cuando el usuario pregunte "
            "sobre su progreso, o cuando necesites datos reales para dar una "
            "recomendación en vez de una respuesta genérica."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "dias": {
                    "type": "integer",
                    "description": "Cantidad de días hacia atrás a consultar. Por defecto 7.",
                }
            },
            "required": [],
        },
    },
    {
        "name": "consultar_metas_activas",
        "description": (
            "Consulta las metas activas del usuario (ej. litros de agua al día, "
            "minutos de ejercicio). Úsala antes de recomendar algo para saber contra "
            "qué objetivo comparar el progreso real."
        ),
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "guardar_meta",
        "description": (
            "Crea o actualiza una meta del usuario para un hábito específico. Úsala "
            "solo cuando el usuario pida explícitamente cambiar o fijar un objetivo "
            "(ej. 'quiero tomar 3 litros de agua')."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "tipo_meta": {
                    "type": "string",
                    "enum": ["agua", "ejercicio", "sueno", "comidas"],
                    "description": "Qué hábito se está fijando como meta.",
                },
                "valor_objetivo": {
                    "type": "number",
                    "description": "Valor numérico objetivo (litros, minutos, horas, etc.)",
                },
            },
            "required": ["tipo_meta", "valor_objetivo"],
        },
    },
    {
        "name": "analizar_patron_cumplimiento",
        "description": (
            "Analiza estadísticamente el historial reciente de un hábito para detectar "
            "tendencias, caídas o anomalías (ej. 'el usuario bajó su ejercicio dos días "
            "seguidos'). Úsala cuando el usuario pregunte por su progreso general o "
            "cuando quieras dar una recomendación proactiva basada en tendencias, no "
            "solo en el último dato."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "habito": {
                    "type": "string",
                    "enum": ["agua", "ejercicio", "sueno"],
                    "description": "Qué hábito analizar.",
                }
            },
            "required": ["habito"],
        },
    },
]


# ──────────────────────────────────────────────────────────────
# 2. EJECUTORES — lo que realmente pasa en el backend
# ──────────────────────────────────────────────────────────────

def consultar_historial(id_usuario: str, dias: int = 7) -> dict:
    conn = get_connection()
    cur = conn.cursor()
    desde = (date.today() - timedelta(days=dias)).isoformat()
    cur.execute(
        """SELECT fecha, agua_litros, comidas_realizadas, horas_sueno, minutos_ejercicio
           FROM registros_diarios
           WHERE id_usuario = ? AND fecha >= ?
           ORDER BY fecha ASC""",
        (id_usuario, desde),
    )
    filas = [dict(r) for r in cur.fetchall()]
    conn.close()
    return {"dias_consultados": dias, "registros": filas}


def consultar_metas_activas(id_usuario: str) -> dict:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """SELECT tipo_meta, valor_objetivo FROM metas
           WHERE id_usuario = ? AND estado = 'activa'""",
        (id_usuario,),
    )
    metas = [dict(r) for r in cur.fetchall()]
    conn.close()
    return {"metas_activas": metas}


def guardar_meta(id_usuario: str, tipo_meta: str, valor_objetivo: float) -> dict:
    conn = get_connection()
    cur = conn.cursor()
    # Desactiva meta anterior del mismo tipo, si existe
    cur.execute(
        """UPDATE metas SET estado = 'reemplazada'
           WHERE id_usuario = ? AND tipo_meta = ? AND estado = 'activa'""",
        (id_usuario, tipo_meta),
    )
    cur.execute(
        """INSERT INTO metas (id_usuario, tipo_meta, valor_objetivo, estado)
           VALUES (?, ?, ?, 'activa')""",
        (id_usuario, tipo_meta, valor_objetivo),
    )
    conn.commit()
    conn.close()
    return {"ok": True, "tipo_meta": tipo_meta, "nuevo_valor": valor_objetivo}


def analizar_patron_cumplimiento(id_usuario: str, habito: str) -> dict:
    """
    Análisis simple de tendencia: compara el promedio de los últimos 3 días
    contra los 4 días anteriores. Es deliberadamente simple (no ML todavía)
    para que el flujo de tool-calling sea claro; el paso siguiente natural
    es reemplazar esta función por un modelo de scikit-learn sin tocar
    nada de la orquestación del agente.
    """
    columna = {"agua": "agua_litros", "ejercicio": "minutos_ejercicio", "sueno": "horas_sueno"}[habito]
    historial = consultar_historial(id_usuario, dias=7)["registros"]

    valores = [r[columna] for r in historial if r[columna] is not None]
    if len(valores) < 4:
        return {"suficientes_datos": False}

    recientes = valores[-3:]
    previos = valores[:-3]
    promedio_reciente = statistics.mean(recientes)
    promedio_previo = statistics.mean(previos)
    variacion_pct = (
        ((promedio_reciente - promedio_previo) / promedio_previo) * 100
        if promedio_previo
        else 0
    )

    return {
        "habito": habito,
        "promedio_ultimos_3_dias": round(promedio_reciente, 2),
        "promedio_dias_previos": round(promedio_previo, 2),
        "variacion_porcentual": round(variacion_pct, 1),
        "tendencia": "cayendo" if variacion_pct < -15 else "subiendo" if variacion_pct > 15 else "estable",
    }


EXECUTORS = {
    "consultar_historial": consultar_historial,
    "consultar_metas_activas": consultar_metas_activas,
    "guardar_meta": guardar_meta,
    "analizar_patron_cumplimiento": analizar_patron_cumplimiento,
}


def execute_tool(tool_name: str, tool_input: dict, id_usuario: str) -> dict:
    """Despacha la llamada de Claude hacia la función Python real."""
    fn = EXECUTORS.get(tool_name)
    if fn is None:
        return {"error": f"Herramienta '{tool_name}' no existe"}
    return fn(id_usuario=id_usuario, **tool_input)
