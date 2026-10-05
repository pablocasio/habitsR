"""
main.py — Servidor FastAPI de AgentSync.

Endpoints:
  POST /api/chat                  → habla con el agente (usa tool-calling internamente)
  GET  /api/usuarios/{id}/resumen → resumen rápido sin pasar por el LLM (para el dashboard)
  GET  /api/alertas/{id}          → alertas proactivas pendientes (el agente escribió sin que le preguntes)
  POST /api/alertas/{id_alerta}/vista → marca una alerta como leída
"""

from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from contextlib import asynccontextmanager

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from agent import AgentSyncAgent
from auth import hashear_password, verificar_password
from database import (
    crear_cuenta,
    guardar_analisis_foto_comida,
    guardar_perfil_usuario,
    guardar_registro_diario,
    incrementar_registro_diario,
    init_db,
    marcar_alerta_vista,
    marcar_recomendacion_aplicada,
    obtener_alertas_no_vistas,
    obtener_fotos_comida_recientes,
    obtener_perfil_usuario,
    obtener_recomendaciones_recientes,
    obtener_registro_hoy,
    obtener_resumen_nutricional_hoy,
    obtener_usuario_por_username,
    seed_demo_user,
    seed_demo_user_en_riesgo,
)
from ml_patrones import analizar_patron_ml
from nutricion import calcular_metas_nutricionales
from proactive import revisar_patrones_y_notificar
from recommendations import generar_recomendaciones
from tools import consultar_historial, consultar_metas_activas
from vision import analizar_foto_comida

scheduler = BackgroundScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    seed_demo_user()  # "demo-pablo": se recupera a mitad de semana, NO debería disparar alerta
    seed_demo_user_en_riesgo()  # "demo-riesgo": cae y no se recupera, SÍ debería disparar alerta

    # En producción esto correría cada 6 horas. Para poder VER el efecto en
    # la demo sin esperar horas, lo dejamos cada 30 segundos durante desarrollo.
    scheduler.add_job(revisar_patrones_y_notificar, "interval", seconds=30, id="revision_patrones")
    scheduler.start()

    yield

    scheduler.shutdown()


app = FastAPI(title="AgentSync API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # en producción: restringir al dominio del frontend
    allow_methods=["*"],
    allow_headers=["*"],
)

agent = AgentSyncAgent()

# Guardamos el historial de conversación en memoria por usuario (demo).
# En producción esto se persiste en la tabla interacciones_ia.
_conversaciones: dict[str, list[dict]] = {}


class ChatRequest(BaseModel):
    id_usuario: str
    mensaje: str


class ChatResponse(BaseModel):
    respuesta: str
    herramientas_usadas: list[str]


@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    historial = _conversaciones.get(req.id_usuario, [])

    resultado = agent.responder(
        id_usuario=req.id_usuario,
        mensaje_usuario=req.mensaje,
        historial_conversacion=historial,
    )

    historial.append({"role": "user", "content": req.mensaje})
    historial.append({"role": "assistant", "content": resultado["respuesta"]})
    _conversaciones[req.id_usuario] = historial

    return resultado


@app.get("/api/usuarios/{id_usuario}/resumen")
def resumen(id_usuario: str):
    """Datos crudos para pintar el dashboard — no pasa por el LLM."""
    historial = consultar_historial(id_usuario, dias=7)
    metas = consultar_metas_activas(id_usuario)
    return {**historial, **metas}


class RegistroUsuarioRequest(BaseModel):
    id_usuario: str
    nombre: str
    genero: str
    edad: int
    rutina: str
    dieta: str
    objetivo: str
    peso: float | None = None
    altura: float | None = None
    horas_sueno_objetivo: float = 8
    alergias: str | None = None
    nivel_estres: int | None = None
    intensidad_ejercicio_min: int = 30


@app.post("/api/usuarios/registro")
def registrar_usuario(req: RegistroUsuarioRequest):
    """Esto es lo que llama el onboarding real del frontend al terminar —
    a diferencia de los usuarios demo, que son solo para pruebas."""
    guardar_perfil_usuario(**req.model_dump())
    return {"ok": True, "id_usuario": req.id_usuario}


@app.get("/api/usuarios/{id_usuario}/perfil")
def perfil_usuario(id_usuario: str):
    perfil = obtener_perfil_usuario(id_usuario)
    if perfil is None:
        return {"existe": False}
    return {"existe": True, "perfil": perfil}


class EditarPerfilRequest(BaseModel):
    nombre: str
    genero: str
    edad: int
    rutina: str
    dieta: str
    objetivo: str
    peso: float | None = None
    altura: float | None = None
    horas_sueno_objetivo: float = 8
    alergias: str | None = None
    nivel_estres: int | None = None
    horario_ejercicio: str | None = None
    tipo_ejercicio: str | None = None
    experiencia_ejercicio: str | None = None
    comidas_por_dia: int = 3
    intensidad_ejercicio_min: int = 30


@app.put("/api/usuarios/{id_usuario}/perfil")
def editar_perfil(id_usuario: str, req: EditarPerfilRequest):
    """Edita el perfil de un usuario que ya existe — usado desde la
    pantalla de Perfil. Nunca toca username ni password."""
    if obtener_perfil_usuario(id_usuario) is None:
        return {"ok": False, "error": "Usuario no encontrado"}

    guardar_perfil_usuario(id_usuario=id_usuario, **req.model_dump())
    perfil_actualizado = obtener_perfil_usuario(id_usuario)
    return {"ok": True, "perfil": perfil_actualizado}


# ───────────── Autenticación: registro + login ─────────────

class RegistroCuentaRequest(BaseModel):
    username: str
    password: str
    nombre: str
    genero: str | None = None
    edad: int | None = None
    rutina: str | None = None
    dieta: str | None = None
    objetivo: str | None = None
    peso: float | None = None
    altura: float | None = None
    horas_sueno_objetivo: float = 8
    alergias: str | None = None
    nivel_estres: int | None = None
    horario_ejercicio: str | None = None
    tipo_ejercicio: str | None = None
    experiencia_ejercicio: str | None = None
    comidas_por_dia: int = 3
    intensidad_ejercicio_min: int = 30


@app.post("/api/auth/registro")
def registro(req: RegistroCuentaRequest):
    if len(req.password) < 4:
        return {"ok": False, "error": "La contraseña debe tener al menos 4 caracteres"}

    datos = req.model_dump(exclude={"password"})
    datos["password_hash"] = hashear_password(req.password)

    try:
        crear_cuenta(**datos)
    except ValueError as e:
        return {"ok": False, "error": str(e)}

    perfil = obtener_perfil_usuario(req.username)
    return {"ok": True, "id_usuario": req.username, "perfil": perfil}


class LoginRequest(BaseModel):
    username: str
    password: str


@app.post("/api/auth/login")
def login(req: LoginRequest):
    usuario = obtener_usuario_por_username(req.username)
    if usuario is None or not usuario.get("password_hash"):
        return {"ok": False, "error": "Usuario o contraseña incorrectos"}

    if not verificar_password(req.password, usuario["password_hash"]):
        return {"ok": False, "error": "Usuario o contraseña incorrectos"}

    perfil = obtener_perfil_usuario(req.username)
    return {"ok": True, "id_usuario": req.username, "perfil": perfil}


# ───────────── Registro diario manual (agua, ejercicio, sueño, comidas) ─────────────

class RegistroDiarioRequest(BaseModel):
    id_usuario: str
    agua_litros: float | None = None
    minutos_ejercicio: int | None = None
    horas_sueno: float | None = None
    comidas_realizadas: int | None = None


@app.post("/api/registros/hoy")
def registrar_hoy(req: RegistroDiarioRequest):
    """Solo actualiza los campos enviados — no pisa lo que ya había."""
    payload = req.model_dump(exclude={"id_usuario"})
    resultado = guardar_registro_diario(id_usuario=req.id_usuario, **payload)
    return {"ok": True, "registro": resultado}


@app.get("/api/registros/hoy/{id_usuario}")
def registro_de_hoy(id_usuario: str):
    return obtener_registro_hoy(id_usuario)


class IncrementoRequest(BaseModel):
    id_usuario: str
    campo: str  # "agua_litros" | "minutos_ejercicio" | "comidas_realizadas"
    delta: float


@app.post("/api/registros/incrementar")
def incrementar(req: IncrementoRequest):
    """Suma (o resta, con delta negativo) al valor de hoy — pensado
    para agua/ejercicio/comidas, que se acumulan durante el día."""
    try:
        resultado = incrementar_registro_diario(req.id_usuario, req.campo, req.delta)
    except ValueError as e:
        return {"error": str(e)}
    return {"ok": True, "registro": resultado}


# ───────────── RF-01: Recomendaciones (salida JSON estructurada) ─────────────

@app.get("/api/recomendaciones/{id_usuario}")
def recomendaciones(id_usuario: str, forzar: bool = False):
    """
    Devuelve recomendaciones recientes (últimas 6h) si existen; si no,
    o si forzar=true, genera nuevas. Evita gastar tokens regenerando
    cada vez que el usuario abre el dashboard.
    """
    if not forzar:
        recientes = obtener_recomendaciones_recientes(id_usuario)
        if recientes:
            return {"recomendaciones": recientes, "generadas_ahora": False}

    nuevas = generar_recomendaciones(id_usuario)
    return {"recomendaciones": nuevas, "generadas_ahora": True}


@app.post("/api/recomendaciones/{id_recomendacion}/aplicar")
def aplicar_recomendacion(id_recomendacion: int):
    marcar_recomendacion_aplicada(id_recomendacion)
    return {"ok": True}


# ───────────── RF-02: Predicción de patrones (scikit-learn real) ─────────────

@app.get("/api/predicciones/{id_usuario}")
def predicciones(id_usuario: str):
    return {
        "agua": analizar_patron_ml(id_usuario, "agua"),
        "ejercicio": analizar_patron_ml(id_usuario, "ejercicio"),
        "sueno": analizar_patron_ml(id_usuario, "sueno"),
    }


# ───────────── Visión: foto de comida → calorías/macros (flujo en 2 pasos) ─────────────

class AnalizarFotoRequest(BaseModel):
    id_usuario: str
    imagen_base64: str
    media_type: str = "image/jpeg"


@app.post("/api/comida/foto/analizar")
def analizar_foto(req: AnalizarFotoRequest):
    """Paso 1: analiza la foto pero NO la guarda todavía — el usuario
    puede corregir el tipo de comida antes de que cuente para el día."""
    analisis = analizar_foto_comida(req.id_usuario, req.imagen_base64, req.media_type)
    return {"analisis": analisis}


class GuardarFotoRequest(BaseModel):
    id_usuario: str
    nombre_plato: str
    tipo_comida: str
    calorias_estimadas: float
    proteinas_g: float
    carbohidratos_g: float
    grasas_g: float
    comentario_metas: str | None = None


@app.post("/api/comida/foto/guardar")
def guardar_foto(req: GuardarFotoRequest):
    """Paso 2: recién ahora se guarda y se suma al resumen del día."""
    analisis = req.model_dump(exclude={"id_usuario"})
    guardar_analisis_foto_comida(req.id_usuario, analisis)
    resumen = obtener_resumen_nutricional_hoy(req.id_usuario)
    metas = calcular_metas_nutricionales(obtener_perfil_usuario(req.id_usuario) or {})
    return {"ok": True, "resumen_hoy": resumen, "metas": metas}


@app.get("/api/comida/fotos/{id_usuario}")
def fotos_comida(id_usuario: str):
    return {"fotos": obtener_fotos_comida_recientes(id_usuario)}


# ───────────── Nutrición: metas calculadas + resumen diario ─────────────

@app.get("/api/nutricion/metas/{id_usuario}")
def metas_nutricionales(id_usuario: str):
    perfil = obtener_perfil_usuario(id_usuario)
    if perfil is None:
        return {"metas": None, "error": "Usuario no encontrado"}
    metas = calcular_metas_nutricionales(perfil)
    if metas is None:
        return {"metas": None, "error": "Faltan peso, altura o edad en tu perfil"}
    return {"metas": metas}


@app.get("/api/nutricion/resumen-hoy/{id_usuario}")
def resumen_nutricional_hoy(id_usuario: str):
    resumen = obtener_resumen_nutricional_hoy(id_usuario)
    perfil = obtener_perfil_usuario(id_usuario) or {}
    metas = calcular_metas_nutricionales(perfil)
    return {"consumido": resumen, "metas": metas}



@app.get("/api/alertas/{id_usuario}")
def alertas_pendientes(id_usuario: str):
    """
    El frontend llama esto (por ejemplo, cada vez que se abre la app,
    o con un polling cada cierto tiempo) para ver si el agente generó
    algo por su cuenta mientras el usuario no estaba mirando.
    """
    return {"alertas": obtener_alertas_no_vistas(id_usuario)}


@app.post("/api/alertas/{id_alerta}/vista")
def marcar_vista(id_alerta: int):
    marcar_alerta_vista(id_alerta)
    return {"ok": True}


@app.post("/api/debug/forzar-revision")
def forzar_revision():
    """SOLO PARA DESARROLLO: dispara la revisión de patrones manualmente,
    en vez de esperar los 30 segundos del scheduler. Borrar en producción."""
    return {"alertas_generadas": revisar_patrones_y_notificar()}


@app.get("/")
def health():
    return {"status": "ok", "servicio": "AgentSync AI microservice"}
