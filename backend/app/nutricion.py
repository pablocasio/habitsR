"""
nutricion.py — Calcula metas diarias de calorías y macronutrientes.

No usa IA para esto — es una fórmula estándar de nutrición deportiva
(Mifflin-St Jeor para el metabolismo basal), aplicada con los datos
que ya tenemos del perfil. No tiene sentido gastar una llamada a Claude
para hacer una cuenta determinística; el LLM entra recién después,
para interpretar y comentar sobre estos números (ver vision.py).
"""

FACTOR_ACTIVIDAD = {
    "Sedentario": 1.2,
    "Moderado": 1.375,
    "Activo": 1.55,
    "Muy activo": 1.725,
}

AJUSTE_CALORICO_POR_OBJETIVO = {
    "Bajar de peso": -500,
    "Ganar músculo": 300,
    "Mantener peso": 0,
    "Salud general": 0,
}

PROTEINA_G_POR_KG_SEGUN_OBJETIVO = {
    "Bajar de peso": 1.8,
    "Ganar músculo": 2.0,
    "Mantener peso": 1.4,
    "Salud general": 1.4,
}


def calcular_metas_nutricionales(perfil: dict) -> dict | None:
    """
    Devuelve None si falta peso, altura o edad — sin esos tres datos
    la fórmula no tiene con qué trabajar, y es mejor decir "completá tu
    perfil" que inventar un número.
    """
    peso = perfil.get("peso")
    altura = perfil.get("altura")
    edad = perfil.get("edad")

    if not peso or not altura or not edad:
        return None

    # Mifflin-St Jeor: la fórmula más usada hoy para estimar metabolismo
    # basal (BMR) — reemplazó a la vieja Harris-Benedict por ser más precisa.
    if perfil.get("genero") == "Femenino":
        bmr = 10 * peso + 6.25 * altura - 5 * edad - 161
    else:
        bmr = 10 * peso + 6.25 * altura - 5 * edad + 5

    factor = FACTOR_ACTIVIDAD.get(perfil.get("rutina"), 1.375)
    tdee = bmr * factor  # gasto calórico total diario estimado

    objetivo = perfil.get("objetivo", "Mantener peso")
    calorias_objetivo = tdee + AJUSTE_CALORICO_POR_OBJETIVO.get(objetivo, 0)

    proteina_g = peso * PROTEINA_G_POR_KG_SEGUN_OBJETIVO.get(objetivo, 1.4)
    calorias_de_proteina = proteina_g * 4  # 4 kcal por gramo de proteína

    calorias_restantes = max(0, calorias_objetivo - calorias_de_proteina)
    # De lo que queda: 55% carbohidratos, 45% grasas — un split razonable
    # y estándar cuando la proteína ya está fijada por objetivo.
    carbohidratos_g = (calorias_restantes * 0.55) / 4  # 4 kcal por gramo
    grasas_g = (calorias_restantes * 0.45) / 9  # 9 kcal por gramo

    return {
        "calorias_objetivo": round(calorias_objetivo),
        "proteinas_objetivo_g": round(proteina_g),
        "carbohidratos_objetivo_g": round(carbohidratos_g),
        "grasas_objetivo_g": round(grasas_g),
        "bmr_estimado": round(bmr),
    }
