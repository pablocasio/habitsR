# AgentSync — Backend con Tool-Calling

Microservicio FastAPI que implementa el agente de AgentSync con
**tool-calling real** de Claude: en vez de mandarle todo el contexto
del usuario pegado en un prompt, el agente decide por sí mismo cuándo
necesita consultar la base de datos, guardar una meta, o analizar
patrones de cumplimiento.

## Por qué esto es un agente PEAS y no un chatbot

| PEAS | En AgentSync |
|---|---|
| **P**ercibe | El mensaje del usuario + resultados de herramientas anteriores |
| **E**ntorno | La base de datos de hábitos (`registros_diarios`, `metas`) |
| **A**cciones | `consultar_historial`, `guardar_meta`, `analizar_patron_cumplimiento`, etc. |
| **S**ensores/Actuadores | Los tool schemas (lo que Claude "ve" que puede hacer) + `execute_tool` (lo que ejecuta de verdad) |

## Cómo correrlo

### 1. Entender el mecanismo primero (sin gastar API, sin API key)

```bash
python demo_tool_calling_explicado.py
```

Esto simula paso a paso cómo Claude pediría 3 herramientas en cadena
antes de responder, usando datos reales de una base SQLite de prueba.

### 2. Correrlo de verdad con Claude

```bash
cp .env.example .env
# editá .env y poné tu ANTHROPIC_API_KEY

cd app
../venv/bin/uvicorn main:app --reload
```

Servidor en `http://localhost:8000`. Al arrancar, se crea automáticamente
un usuario demo (`demo-pablo`) con 7 días de historial realista (incluye
un bajón de agua/ejercicio miércoles-jueves para que el agente tenga
algo interesante que detectar).

### 3. Probar el chat

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"id_usuario": "demo-pablo", "mensaje": "¿Cómo voy con el agua esta semana?"}'
```

Respuesta incluye `herramientas_usadas`, así podés mostrar en la
sustentación exactamente qué tools decidió llamar el agente para
cada pregunta — eso es lo que demuestra que hay razonamiento real,
no un guion fijo.

## Estructura

```
app/
├── database.py   → esquema SQLite (mismo esquema que PostgreSQL documentado)
├── tools.py      → definición de herramientas + funciones que las ejecutan
├── agent.py      → el loop de tool-calling (el corazón del agente)
└── main.py       → servidor FastAPI

demo_tool_calling_explicado.py  → simulación pedagógica sin gastar API
```

## Migrar de SQLite a PostgreSQL

`database.py` usa `sqlite3` con SQL estándar a propósito. Para migrar:

1. `pip install psycopg2-binary`
2. Reemplazar `get_connection()` para que devuelva una conexión de psycopg2
3. El SQL de `tools.py` no necesita cambios (es SQL ANSI estándar)

## Próximo paso sugerido

`analizar_patron_cumplimiento` hoy es una comparación de promedios simple
a propósito, para que el flujo de tool-calling se entienda claro. El
siguiente nivel (para la sustentación final) es reemplazar esa función
por un modelo de scikit-learn (`IsolationForest` para detectar anomalías,
por ejemplo) sin tocar nada de `agent.py` — la orquestación del agente
no le importa CÓMO se calcula el resultado, solo QUÉ herramienta se llama.
