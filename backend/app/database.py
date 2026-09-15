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
