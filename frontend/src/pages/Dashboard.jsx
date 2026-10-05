import { useEffect, useState } from "react";
import RingCluster from "../components/RingCluster";
import BarrasNutricionales from "../components/BarrasNutricionales";

const API_URL = "http://localhost:8000";

function idUsuarioActual() {
  return localStorage.getItem("agentsync_id_usuario") || "demo-pablo";
}

export default function Dashboard({ user, onIrARegistro }) {
  const [ringValues, setRingValues] = useState({ exercise: 0, water: 0, food: 0, sleep: 0 });
  const [stats, setStats] = useState(null);
  const [recomendacion, setRecomendacion] = useState(null);
  const [cargandoRecomendacion, setCargandoRecomendacion] = useState(false);
  const [errorConexion, setErrorConexion] = useState(false);
  const [resumenNutricional, setResumenNutricional] = useState(null);
  const [metasNutricionales, setMetasNutricionales] = useState(null);

  useEffect(() => {
    cargarResumen();
    cargarRecomendacion(false);
    cargarNutricion();
  }, []);

  async function cargarNutricion() {
    try {
      const res = await fetch(`${API_URL}/api/nutricion/resumen-hoy/${idUsuarioActual()}`);
      const data = await res.json();
      setResumenNutricional(data.consumido);
      setMetasNutricionales(data.metas);
    } catch {
      // sin conexión, la barra se queda vacía — no bloquea el resto del dashboard
    }
  }

  async function cargarResumen() {
    const idUsuario = idUsuarioActual();
    try {
      const [resResumen, resPerfil] = await Promise.all([
        fetch(`${API_URL}/api/usuarios/${idUsuario}/resumen`),
        fetch(`${API_URL}/api/usuarios/${idUsuario}/perfil`),
      ]);
      const resumen = await resResumen.json();
      const perfilData = await resPerfil.json();

      const hoy = new Date().toLocaleDateString("en-CA"); // formato YYYY-MM-DD en hora LOCAL, no UTC
      const registroHoy = resumen.registros?.find((r) => r.fecha === hoy) || {};

      const metaAgua = resumen.metas_activas?.find((m) => m.tipo_meta === "agua")?.valor_objetivo ?? 2.5;
      const metaEjercicio = resumen.metas_activas?.find((m) => m.tipo_meta === "ejercicio")?.valor_objetivo ?? 30;
      const metaSueno = perfilData.perfil?.horas_sueno_objetivo ?? 8;
      const metaComidas = 4;

      const agua = registroHoy.agua_litros ?? 0;
      const ejercicio = registroHoy.minutos_ejercicio ?? 0;
      const comidas = registroHoy.comidas_realizadas ?? 0;
      const sueno = registroHoy.horas_sueno ?? 0;

      setRingValues({
        exercise: Math.min(1, ejercicio / metaEjercicio),
        water: Math.min(1, agua / metaAgua),
        food: Math.min(1, comidas / metaComidas),
        sleep: Math.min(1, sueno / metaSueno),
      });

      setStats([
        { key: "exercise", label: "Ejercicio", value: ejercicio, unit: "min", goal: `de ${metaEjercicio} min`, color: "#B4FF3D" },
        { key: "water", label: "Agua", value: agua, unit: "L", goal: `de ${metaAgua} L`, color: "#33C5FF" },
        { key: "food", label: "Comida", value: comidas, unit: `/${metaComidas}`, goal: "comidas hoy", color: "#FF6B4A" },
        { key: "sleep", label: "Sueño", value: sueno, unit: "h", goal: `de ${metaSueno} h`, color: "#9B8CFF" },
      ]);
      setErrorConexion(false);
    } catch {
      setErrorConexion(true);
    }
  }

  async function cargarRecomendacion(forzar) {
    setCargandoRecomendacion(true);
    const idUsuario = idUsuarioActual();
    try {
      const res = await fetch(`${API_URL}/api/recomendaciones/${idUsuario}${forzar ? "?forzar=true" : ""}`);
      const data = await res.json();
      setRecomendacion(data.recomendaciones?.[0] || null);
    } catch {
      setRecomendacion(null);
    } finally {
      setCargandoRecomendacion(false);
    }
  }

  return (
    <div className="px-6 pt-14 pb-28 max-w-md mx-auto">
      <div className="mb-5 animate-rise">
        <BarrasNutricionales resumen={resumenNutricional} metas={metasNutricionales} titulo="Meta diaria" />
      </div>

      <div className="animate-rise">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-ink-secondary text-sm font-medium">Hoy, {formatDate()}</p>
            <h1 className="font-display text-3xl font-semibold mt-1">
              Qué tal, {user?.nombre || "atleta"}
            </h1>
          </div>
          <button
            onClick={onIrARegistro}
            className="bg-ring-exercise text-base-bg text-xs font-semibold rounded-full px-4 py-2.5 shrink-0"
          >
            Registrar día
          </button>
        </div>
      </div>

      {errorConexion && (
        <p className="text-ring-food text-xs mt-3">
          No pude conectarme al backend — ¿está corriendo uvicorn en localhost:8000?
        </p>
      )}

      <div className="flex justify-center my-10 animate-rise" style={{ animationDelay: "100ms" }}>
        <RingCluster values={ringValues} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {(stats || []).map((s, i) => (
          <div
            key={s.key}
            className="bg-base-surface border border-base-border rounded-2xl p-4 animate-rise"
            style={{ animationDelay: `${200 + i * 60}ms` }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
              <span className="text-ink-secondary text-xs font-medium">{s.label}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-display text-3xl font-semibold">{s.value}</span>
              <span className="text-ink-secondary text-sm">{s.unit}</span>
            </div>
            <p className="text-ink-muted text-xs mt-1">{s.goal}</p>
          </div>
        ))}
      </div>

      <div
        className="mt-6 bg-gradient-to-br from-ring-exercise/15 to-transparent border border-ring-exercise/30 rounded-2xl p-5 animate-rise"
        style={{ animationDelay: "460ms" }}
      >
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-ring-exercise text-xs font-semibold">Tu agente sugiere</p>
          <button
            onClick={() => cargarRecomendacion(true)}
            disabled={cargandoRecomendacion}
            className="text-ink-muted text-xs underline disabled:opacity-40"
          >
            {cargandoRecomendacion ? "generando..." : "nueva sugerencia"}
          </button>
        </div>
        <p className="text-ink-primary text-sm leading-relaxed">
          {cargandoRecomendacion
            ? "Pensando en algo útil para ti..."
            : recomendacion?.descripcion || "Todavía no hay recomendaciones — tocá \"nueva sugerencia\"."}
        </p>
      </div>
    </div>
  );
}

function formatDate() {
  return new Date().toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" });
}
