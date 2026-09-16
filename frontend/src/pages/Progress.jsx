import { useEffect, useState } from "react";

const API_URL = "http://localhost:8000";

function idUsuarioActual() {
  return localStorage.getItem("agentsync_id_usuario") || "demo-pablo";
}

const LABELS = { agua: "Agua", ejercicio: "Ejercicio", sueno: "Sueño" };
const COLORES = { agua: "#33C5FF", ejercicio: "#B4FF3D", sueno: "#9B8CFF" };
const TENDENCIA_LABEL = { cayendo: "Cayendo", subiendo: "Subiendo", estable: "Estable" };

export default function Progress() {
  const [predicciones, setPredicciones] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/predicciones/${idUsuarioActual()}`)
      .then((r) => r.json())
      .then(setPredicciones)
      .catch(() => setPredicciones(null))
      .finally(() => setCargando(false));
  }, []);

  return (
    <div className="px-6 pt-14 pb-28 max-w-md mx-auto">
      <p className="text-ink-secondary text-sm font-medium">Análisis del agente</p>
      <h1 className="font-display text-3xl font-semibold mt-1">Tu progreso</h1>
      <p className="text-ink-muted text-xs mt-2">
        Estas tendencias vienen de un modelo de regresión lineal (scikit-learn)
        entrenado con tu historial reciente, no son estimaciones a ojo.
      </p>

      {cargando && <p className="text-ink-secondary text-sm mt-6">Analizando tus patrones...</p>}

      {!cargando && !predicciones && (
        <p className="text-ring-food text-sm mt-6">No pude conectarme al backend.</p>
      )}

      <div className="mt-6 space-y-3">
        {predicciones &&
          Object.entries(predicciones).map(([habito, analisis]) => (
            <PrediccionCard key={habito} habito={habito} analisis={analisis} />
          ))}
      </div>
    </div>
  );
}

function PrediccionCard({ habito, analisis }) {
  const color = COLORES[habito];

  if (!analisis.suficientes_datos) {
    return (
      <div className="bg-base-surface border border-base-border rounded-2xl p-4">
        <p className="text-ink-secondary text-sm">{LABELS[habito]}: todavía no hay suficientes días registrados.</p>
      </div>
    );
  }

  const tendenciaColor =
    analisis.tendencia === "cayendo" ? "#FF6B4A" : analisis.tendencia === "subiendo" ? "#B4FF3D" : "#8A93A3";

  return (
    <div className="bg-base-surface border border-base-border rounded-2xl p-4 animate-rise">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
          <span className="text-ink-primary text-sm font-medium">{LABELS[habito]}</span>
        </div>
        <span className="text-xs font-semibold" style={{ color: tendenciaColor }}>
          {TENDENCIA_LABEL[analisis.tendencia]}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3 text-center">
        <div>
          <p className="font-display text-lg font-semibold">{analisis.promedio_periodo}</p>
          <p className="text-ink-muted text-[10px]">promedio</p>
        </div>
        <div>
          <p className="font-display text-lg font-semibold">{analisis.prediccion_proximo_dia}</p>
          <p className="text-ink-muted text-[10px]">predicción mañana</p>
        </div>
        <div>
          <p className="font-display text-lg font-semibold">{Math.round(analisis.r2 * 100)}%</p>
          <p className="text-ink-muted text-[10px]">certeza del modelo (R²)</p>
        </div>
      </div>
    </div>
  );
}
