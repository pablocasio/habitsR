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
from database import (
    init_db,
    marcar_alerta_vista,
    obtener_alertas_no_vistas,
    seed_demo_user,
    seed_demo_user_en_riesgo,
)
from proactive import revisar_patrones_y_notificar
from tools import consultar_historial, consultar_metas_activas

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
