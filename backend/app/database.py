"""
database.py — Capa de datos de AgentSync.

Usa SQLite para desarrollo local (cero configuración). El esquema es
intencionalmente idéntico al de PostgreSQL documentado en el informe
de arquitectura, para que migrar sea solo cambiar la conexión:

    SQLite:      sqlite3.connect("agentsync.db")
    PostgreSQL:  psycopg2.connect(DATABASE_URL)  # mismo SQL, casi sin cambios

Tablas: usuarios, registros_diarios, metas, interacciones_ia
"""

import sqlite3
from datetime import date, datetime, timedelta
from pathlib import Path

DB_PATH = Path(__file__).parent / "agentsync.db"


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_connection()
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS usuarios (
            id_usuario TEXT PRIMARY KEY,
            nombre TEXT NOT NULL,
            genero TEXT,
            edad INTEGER,
            rutina TEXT,
            dieta TEXT,
            objetivo TEXT,
            peso REAL,
            altura REAL,
            horas_sueno_objetivo REAL DEFAULT 8,
            alergias TEXT,
            nivel_estres INTEGER,
            fecha_registro TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS registros_diarios (
            id_registro INTEGER PRIMARY KEY AUTOINCREMENT,
            id_usuario TEXT NOT NULL REFERENCES usuarios(id_usuario),
            fecha TEXT NOT NULL,
            agua_litros REAL DEFAULT 0,
            comidas_realizadas INTEGER DEFAULT 0,
            horas_sueno REAL,
            minutos_ejercicio INTEGER DEFAULT 0,
            UNIQUE(id_usuario, fecha)
        );

        CREATE TABLE IF NOT EXISTS metas (
            id_meta INTEGER PRIMARY KEY AUTOINCREMENT,
            id_usuario TEXT NOT NULL REFERENCES usuarios(id_usuario),
            tipo_meta TEXT NOT NULL,
            valor_objetivo REAL NOT NULL,
            estado TEXT DEFAULT 'activa',
            fecha_inicio TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS interacciones_ia (
            id_interaccion INTEGER PRIMARY KEY AUTOINCREMENT,
            id_usuario TEXT NOT NULL REFERENCES usuarios(id_usuario),
            rol TEXT NOT NULL,
            contenido TEXT NOT NULL,
            herramienta_usada TEXT,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS alertas_proactivas (
            id_alerta INTEGER PRIMARY KEY AUTOINCREMENT,
            id_usuario TEXT NOT NULL REFERENCES usuarios(id_usuario),
            tipo_riesgo TEXT NOT NULL,
            mensaje TEXT NOT NULL,
            fecha_generada TEXT DEFAULT CURRENT_TIMESTAMP,
            vista INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS recomendaciones (
            id_recomendacion INTEGER PRIMARY KEY AUTOINCREMENT,
            id_usuario TEXT NOT NULL REFERENCES usuarios(id_usuario),
            descripcion TEXT NOT NULL,
            tipo_habito TEXT NOT NULL,
            fecha_generada TEXT DEFAULT CURRENT_TIMESTAMP,
            estado_aplicacion TEXT DEFAULT 'pendiente'
        );

        CREATE TABLE IF NOT EXISTS comidas_fotos (
            id_foto INTEGER PRIMARY KEY AUTOINCREMENT,
            id_usuario TEXT NOT NULL REFERENCES usuarios(id_usuario),
            nombre_plato TEXT,
            calorias_estimadas REAL,
            proteinas_g REAL,
            carbohidratos_g REAL,
            grasas_g REAL,
            fecha TEXT DEFAULT CURRENT_TIMESTAMP
        );
        """
    )
    conn.commit()
    conn.close()


def seed_demo_user(id_usuario="demo-pablo"):
    """Crea un usuario demo con 7 días de historial realista para probar el agente."""
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT 1 FROM usuarios WHERE id_usuario = ?", (id_usuario,))
    if cur.fetchone():
        conn.close()
        return

    cur.execute(
        """INSERT INTO usuarios (id_usuario, nombre, genero, edad, rutina, dieta, objetivo)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (id_usuario, "Pablo", "Masculino", 22, "Moderado", "Omnívoro", "Ganar músculo"),
    )

    # Historial de 7 días con un patrón deliberado: agua bajando de miércoles a jueves
    patron_agua = [2.4, 2.1, 1.1, 1.0, 2.0, 2.6, 2.3]
    patron_ejercicio = [40, 30, 0, 0, 35, 50, 20]
    hoy = date.today()
    for i in range(7):
        dia = hoy - timedelta(days=6 - i)
        cur.execute(
            """INSERT OR IGNORE INTO registros_diarios
               (id_usuario, fecha, agua_litros, comidas_realizadas, horas_sueno, minutos_ejercicio)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (id_usuario, dia.isoformat(), patron_agua[i], 3, 7.0, patron_ejercicio[i]),
        )

    cur.execute(
        """INSERT INTO metas (id_usuario, tipo_meta, valor_objetivo, estado)
           VALUES (?, 'agua', 2.5, 'activa')""",
        (id_usuario,),
    )
    cur.execute(
        """INSERT INTO metas (id_usuario, tipo_meta, valor_objetivo, estado)
           VALUES (?, 'ejercicio', 30, 'activa')""",
        (id_usuario,),
    )

    conn.commit()
    conn.close()


def seed_demo_user_en_riesgo(id_usuario="demo-riesgo"):
    """
    Segundo usuario demo, pero con una tendencia negativa que NO se recupera
    (a diferencia de demo-pablo, que mejora hacia el final de la semana).
    Sirve para probar que el job de proactividad SÍ dispara una alerta acá,
    y NO la dispara para demo-pablo — así se ve que el agente no manda
    alertas al voleo, solo cuando el patrón real lo justifica.
    """
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT 1 FROM usuarios WHERE id_usuario = ?", (id_usuario,))
    if cur.fetchone():
        conn.close()
        return

    cur.execute(
        """INSERT INTO usuarios (id_usuario, nombre, genero, edad, rutina, dieta, objetivo)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (id_usuario, "Usuario en riesgo", "Femenino", 28, "Sedentario", "Vegetariano", "Salud general"),
    )

    # Cae y NO se recupera: los últimos 3 días son claramente peores que los 4 previos
    patron_agua = [2.6, 2.5, 2.4, 1.8, 0.8, 0.6, 0.5]
    patron_ejercicio = [30, 35, 25, 15, 0, 0, 0]
    hoy = date.today()
    for i in range(7):
        dia = hoy - timedelta(days=6 - i)
        cur.execute(
            """INSERT OR IGNORE INTO registros_diarios
               (id_usuario, fecha, agua_litros, comidas_realizadas, horas_sueno, minutos_ejercicio)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (id_usuario, dia.isoformat(), patron_agua[i], 3, 6.5, patron_ejercicio[i]),
        )

    cur.execute(
        """INSERT INTO metas (id_usuario, tipo_meta, valor_objetivo, estado)
           VALUES (?, 'agua', 2.5, 'activa')""",
        (id_usuario,),
    )
    cur.execute(
        """INSERT INTO metas (id_usuario, tipo_meta, valor_objetivo, estado)
           VALUES (?, 'ejercicio', 30, 'activa')""",
        (id_usuario,),
    )

    conn.commit()
    conn.close()


def obtener_todos_los_usuarios() -> list[str]:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id_usuario FROM usuarios")
    ids = [r["id_usuario"] for r in cur.fetchall()]
    conn.close()
    return ids


def existe_alerta_reciente(id_usuario: str, tipo_riesgo: str, horas: int = 24) -> bool:
    """Evita espamear al usuario: no crea una alerta nueva del mismo tipo
    si ya se generó una en las últimas `horas` horas."""
    conn = get_connection()
    cur = conn.cursor()
    limite = (datetime.now() - timedelta(hours=horas)).isoformat()
    cur.execute(
        """SELECT 1 FROM alertas_proactivas
           WHERE id_usuario = ? AND tipo_riesgo = ? AND fecha_generada >= ?""",
        (id_usuario, tipo_riesgo, limite),
    )
    existe = cur.fetchone() is not None
    conn.close()
    return existe


def guardar_alerta_proactiva(id_usuario: str, tipo_riesgo: str, mensaje: str):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """INSERT INTO alertas_proactivas (id_usuario, tipo_riesgo, mensaje)
           VALUES (?, ?, ?)""",
        (id_usuario, tipo_riesgo, mensaje),
    )
    conn.commit()
    conn.close()


def obtener_alertas_no_vistas(id_usuario: str) -> list[dict]:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """SELECT id_alerta, tipo_riesgo, mensaje, fecha_generada
           FROM alertas_proactivas
           WHERE id_usuario = ? AND vista = 0
           ORDER BY fecha_generada ASC""",
        (id_usuario,),
    )
    alertas = [dict(r) for r in cur.fetchall()]
    conn.close()
    return alertas


def marcar_alerta_vista(id_alerta: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("UPDATE alertas_proactivas SET vista = 1 WHERE id_alerta = ?", (id_alerta,))
    conn.commit()
    conn.close()


def guardar_perfil_usuario(
    id_usuario: str,
    nombre: str,
    genero: str,
    edad: int,
    rutina: str,
    dieta: str,
    objetivo: str,
    peso: float | None = None,
    altura: float | None = None,
    horas_sueno_objetivo: float = 8,
    alergias: str | None = None,
    nivel_estres: int | None = None,
    intensidad_ejercicio_min: int = 30,
):
    """
    Esto es lo que llama el endpoint /api/usuarios/registro cuando el
    onboarding del frontend termina de verdad — a diferencia de los
    seed_demo_user(), que son solo para tener data de prueba.

    Upsert: si el id_usuario ya existía, actualiza sus datos en vez de
    fallar (útil si el usuario repite el onboarding para cambiar algo).
    """
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """INSERT INTO usuarios
               (id_usuario, nombre, genero, edad, rutina, dieta, objetivo,
                peso, altura, horas_sueno_objetivo, alergias, nivel_estres)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id_usuario) DO UPDATE SET
               nombre=excluded.nombre, genero=excluded.genero, edad=excluded.edad,
               rutina=excluded.rutina, dieta=excluded.dieta, objetivo=excluded.objetivo,
               peso=excluded.peso, altura=excluded.altura,
               horas_sueno_objetivo=excluded.horas_sueno_objetivo,
               alergias=excluded.alergias, nivel_estres=excluded.nivel_estres""",
        (id_usuario, nombre, genero, edad, rutina, dieta, objetivo,
         peso, altura, horas_sueno_objetivo, alergias, nivel_estres),
    )

    # Metas iniciales: agua fija en 2.5L por ahora (podría personalizarse
    # después), ejercicio según lo que eligió en el slider del onboarding.
    for tipo_meta, valor in [("agua", 2.5), ("ejercicio", intensidad_ejercicio_min)]:
        cur.execute(
            "UPDATE metas SET estado='reemplazada' WHERE id_usuario=? AND tipo_meta=? AND estado='activa'",
            (id_usuario, tipo_meta),
        )
        cur.execute(
            "INSERT INTO metas (id_usuario, tipo_meta, valor_objetivo, estado) VALUES (?, ?, ?, 'activa')",
            (id_usuario, tipo_meta, valor),
        )

    conn.commit()
    conn.close()


def obtener_registro_hoy(id_usuario: str) -> dict:
    conn = get_connection()
    cur = conn.cursor()
    hoy = date.today().isoformat()
    cur.execute(
        """SELECT agua_litros, comidas_realizadas, horas_sueno, minutos_ejercicio
           FROM registros_diarios WHERE id_usuario = ? AND fecha = ?""",
        (id_usuario, hoy),
    )
    row = cur.fetchone()
    conn.close()
    if row is None:
        return {"agua_litros": 0, "comidas_realizadas": 0, "horas_sueno": 0, "minutos_ejercicio": 0}
    return dict(row)


def guardar_registro_diario(
    id_usuario: str,
    agua_litros: float | None = None,
    minutos_ejercicio: int | None = None,
    horas_sueno: float | None = None,
    comidas_realizadas: int | None = None,
) -> dict:
    """
    Esto es lo que llama el formulario 'Registrar mi día' del frontend.
    Solo actualiza los campos que el usuario efectivamente mandó — si
    ya había un valor de otro campo guardado hoy (ej. por la foto de
    comida sumando +1 a comidas_realizadas), no lo pisa con un None.
    """
    hoy = date.today().isoformat()
    actual = obtener_registro_hoy(id_usuario)

    valores = {
        "agua_litros": agua_litros if agua_litros is not None else actual["agua_litros"],
        "minutos_ejercicio": minutos_ejercicio if minutos_ejercicio is not None else actual["minutos_ejercicio"],
        "horas_sueno": horas_sueno if horas_sueno is not None else actual["horas_sueno"],
        "comidas_realizadas": comidas_realizadas if comidas_realizadas is not None else actual["comidas_realizadas"],
    }

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """INSERT INTO registros_diarios (id_usuario, fecha, agua_litros, minutos_ejercicio, horas_sueno, comidas_realizadas)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(id_usuario, fecha) DO UPDATE SET
               agua_litros=excluded.agua_litros,
               minutos_ejercicio=excluded.minutos_ejercicio,
               horas_sueno=excluded.horas_sueno,
               comidas_realizadas=excluded.comidas_realizadas""",
        (id_usuario, hoy, valores["agua_litros"], valores["minutos_ejercicio"],
         valores["horas_sueno"], valores["comidas_realizadas"]),
    )
    conn.commit()
    conn.close()
    return valores


def obtener_perfil_usuario(id_usuario: str) -> dict | None:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM usuarios WHERE id_usuario = ?", (id_usuario,))
    row = cur.fetchone()
    conn.close()
    return dict(row) if row else None


def guardar_recomendaciones(id_usuario: str, recomendaciones: list[dict]):
    """recomendaciones: [{"tipo_habito": "agua", "descripcion": "..."}, ...]"""
    conn = get_connection()
    cur = conn.cursor()
    for r in recomendaciones:
        cur.execute(
            """INSERT INTO recomendaciones (id_usuario, descripcion, tipo_habito, estado_aplicacion)
               VALUES (?, ?, ?, 'pendiente')""",
            (id_usuario, r["descripcion"], r["tipo_habito"]),
        )
    conn.commit()
    conn.close()


def obtener_recomendaciones_recientes(id_usuario: str, horas: int = 6) -> list[dict]:
    conn = get_connection()
    cur = conn.cursor()
    limite = (datetime.now() - timedelta(hours=horas)).isoformat()
    cur.execute(
        """SELECT id_recomendacion, descripcion, tipo_habito, fecha_generada, estado_aplicacion
           FROM recomendaciones
           WHERE id_usuario = ? AND fecha_generada >= ?
           ORDER BY fecha_generada DESC""",
        (id_usuario, limite),
    )
    recos = [dict(r) for r in cur.fetchall()]
    conn.close()
    return recos


def marcar_recomendacion_aplicada(id_recomendacion: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "UPDATE recomendaciones SET estado_aplicacion = 'aplicada' WHERE id_recomendacion = ?",
        (id_recomendacion,),
    )
    conn.commit()
    conn.close()


def guardar_analisis_foto_comida(id_usuario: str, analisis: dict):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """INSERT INTO comidas_fotos
               (id_usuario, nombre_plato, calorias_estimadas, proteinas_g, carbohidratos_g, grasas_g)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (
            id_usuario,
            analisis.get("nombre_plato"),
            analisis.get("calorias_estimadas"),
            analisis.get("proteinas_g"),
            analisis.get("carbohidratos_g"),
            analisis.get("grasas_g"),
        ),
    )
    # Sumamos una comida más al registro de hoy, si existe
    hoy = date.today().isoformat()
    cur.execute(
        """UPDATE registros_diarios SET comidas_realizadas = comidas_realizadas + 1
           WHERE id_usuario = ? AND fecha = ?""",
        (id_usuario, hoy),
    )
    if cur.rowcount == 0:
        cur.execute(
            """INSERT INTO registros_diarios (id_usuario, fecha, comidas_realizadas)
               VALUES (?, ?, 1)""",
            (id_usuario, hoy),
        )
    conn.commit()
    conn.close()


def obtener_fotos_comida_recientes(id_usuario: str, dias: int = 3) -> list[dict]:
    conn = get_connection()
    cur = conn.cursor()
    desde = (date.today() - timedelta(days=dias)).isoformat()
    cur.execute(
        """SELECT id_foto, nombre_plato, calorias_estimadas, proteinas_g, carbohidratos_g, grasas_g, fecha
           FROM comidas_fotos
           WHERE id_usuario = ? AND fecha >= ?
           ORDER BY fecha DESC""",
        (id_usuario, desde),
    )
    fotos = [dict(r) for r in cur.fetchall()]
    conn.close()
    return fotos
