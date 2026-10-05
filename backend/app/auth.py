"""
auth.py - Hash y verificacion de contrasenas.

Usa bcrypt directo (sin passlib, que tiene un bug de compatibilidad
conocido con versiones nuevas de la libreria bcrypt). La contrasena
NUNCA se guarda en texto plano - se guarda el hash, que es
irreversible: ni nosotros mismos podemos ver la contrasena original
a partir de lo que esta en la base de datos.
"""

import bcrypt


def hashear_password(password: str) -> str:
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    return hashed.decode("utf-8")


def verificar_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))

