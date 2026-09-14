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
