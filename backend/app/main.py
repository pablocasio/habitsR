"""
main.py — Servidor FastAPI de AgentSync.

Endpoints:
  POST /api/chat        → habla con el agente (usa tool-calling internamente)
  GET  /api/usuarios/{id}/resumen → resumen rápido sin pasar por el LLM (para el dashboard)
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from agent import AgentSyncAgent
from database import get_connection, init_db, seed_demo_user
from tools import consultar_historial, consultar_metas_activas


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    seed_demo_user()  # usuario "demo-pablo" con 7 días de historial para probar ya mismo
    yield


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

    # Actualiza el historial en memoria para la próxima vuelta
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


@app.get("/")
def health():
    return {"status": "ok", "servicio": "AgentSync AI microservice"}
