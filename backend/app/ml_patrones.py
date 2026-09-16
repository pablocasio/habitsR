"""
ml_patrones.py — RF-02: Predicción de Patrones de Cumplimiento (con scikit-learn real).

La versión anterior (en tools.py, analizar_patron_cumplimiento) compara
dos promedios a mano — sirve para explicar el mecanismo, pero no es
"machine learning" en sentido estricto. Esta versión entrena un modelo
de regresión lineal real sobre los últimos días: la PENDIENTE de esa
recta es la predicción de hacia dónde va el hábito, no solo una foto
de "antes vs. ahora".

Por qué LinearRegression y no algo más complejo: con 7-14 puntos de
datos por usuario, un modelo pesado (random forest, redes neuronales)
haría overfitting sin sentido. La regresión lineal es la herramienta
correcta para "¿hay una tendencia y qué tan fuerte es?" con pocos datos
— eso es una decisión de diseño defendible, no una limitación oculta.
"""

import numpy as np
from sklearn.linear_model import LinearRegression

from database import get_connection
from datetime import date, timedelta

COLUMNA_POR_HABITO = {
    "agua": "agua_litros",
    "ejercicio": "minutos_ejercicio",
    "sueno": "horas_sueno",
}


def analizar_patron_ml(id_usuario: str, habito: str, dias: int = 10) -> dict:
    """
    Entrena una regresión lineal: X = día (0, 1, 2...), y = valor del hábito
    ese día. La pendiente (coef_) dice si la tendencia sube o baja, y el
    R² dice cuán consistente es esa tendencia (no es ruido aleatorio).
    """
    columna = COLUMNA_POR_HABITO[habito]

    conn = get_connection()
    cur = conn.cursor()
    desde = (date.today() - timedelta(days=dias)).isoformat()
    cur.execute(
        f"""SELECT fecha, {columna} as valor FROM registros_diarios
            WHERE id_usuario = ? AND fecha >= ? AND {columna} IS NOT NULL
            ORDER BY fecha ASC""",
        (id_usuario, desde),
    )
    filas = cur.fetchall()
    conn.close()

    if len(filas) < 4:
        return {"suficientes_datos": False}

    y = np.array([r["valor"] for r in filas], dtype=float)
    X = np.arange(len(y)).reshape(-1, 1)

    modelo = LinearRegression()
    modelo.fit(X, y)

    pendiente = float(modelo.coef_[0])
    r2 = float(modelo.score(X, y))
    promedio = float(np.mean(y))

    # Pendiente relativa al promedio: una caída de 0.1L/día en un hábito
    # de 2.5L/día es mucho más grave que la misma caída en uno de 20L/día.
    pendiente_relativa = pendiente / (promedio + 1e-6)

    if pendiente_relativa < -0.04 and r2 > 0.25:
        tendencia = "cayendo"
    elif pendiente_relativa > 0.04 and r2 > 0.25:
        tendencia = "subiendo"
    else:
        tendencia = "estable"

    # Predicción del modelo para "mañana" (el próximo punto de la recta).
    # Clip a 0: la regresión lineal extrapola sin saber que hábitos como
    # litros de agua o minutos de ejercicio no pueden ser negativos.
    prediccion_siguiente_dia = max(0.0, float(modelo.predict([[len(y)]])[0]))

    return {
        "suficientes_datos": True,
        "habito": habito,
        "tendencia": tendencia,
        "pendiente_por_dia": round(pendiente, 3),
        "r2": round(r2, 3),  # qué tan bien explica la recta los datos reales (0 a 1)
        "promedio_periodo": round(promedio, 2),
        "prediccion_proximo_dia": round(prediccion_siguiente_dia, 2),
        "dias_analizados": len(y),
    }
