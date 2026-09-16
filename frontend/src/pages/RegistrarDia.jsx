import { useEffect, useState } from "react";

const API_URL = "http://localhost:8000";

function idUsuarioActual() {
  return localStorage.getItem("agentsync_id_usuario") || "demo-pablo";
}

export default function RegistrarDia({ onVolver }) {
  const [valores, setValores] = useState({
    agua_litros: 0,
    minutos_ejercicio: 0,
    horas_sueno: 0,
    comidas_realizadas: 0,
  });
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/registros/hoy/${idUsuarioActual()}`)
      .then((r) => r.json())
      .then(setValores)
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  function set(campo, valor) {
    setValores((v) => ({ ...v, [campo]: valor }));
    setGuardado(false);
  }

  async function guardar() {
    setGuardando(true);
    try {
      await fetch(`${API_URL}/api/registros/hoy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_usuario: idUsuarioActual(), ...valores }),
      });
      setGuardado(true);
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <div className="px-6 pt-14 max-w-md mx-auto">
        <p className="text-ink-secondary text-sm">Cargando tu día...</p>
      </div>
    );
  }

  return (
    <div className="px-6 pt-14 pb-28 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={onVolver} className="text-ink-secondary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div>
          <p className="text-ink-secondary text-sm font-medium">Registrar</p>
          <h1 className="font-display text-2xl font-semibold">Tu día de hoy</h1>
        </div>
      </div>

      <div className="space-y-6">
        <Campo
          label="Agua"
          valor={valores.agua_litros}
          unidad="L"
          min={0}
          max={5}
          step={0.1}
          color="#33C5FF"
          onChange={(v) => set("agua_litros", v)}
        />
        <Campo
          label="Ejercicio"
          valor={valores.minutos_ejercicio}
          unidad="min"
          min={0}
          max={180}
          step={5}
          color="#B4FF3D"
          onChange={(v) => set("minutos_ejercicio", v)}
        />
        <Campo
          label="Sueño"
          valor={valores.horas_sueno}
          unidad="h"
          min={0}
          max={12}
          step={0.5}
          color="#9B8CFF"
          onChange={(v) => set("horas_sueno", v)}
        />
        <Campo
          label="Comidas realizadas"
          valor={valores.comidas_realizadas}
          unidad=""
          min={0}
          max={8}
          step={1}
          color="#FF6B4A"
          onChange={(v) => set("comidas_realizadas", v)}
        />
      </div>

      <button
        onClick={guardar}
        disabled={guardando}
        className="w-full bg-ring-exercise text-base-bg font-display font-semibold text-lg rounded-2xl py-4 mt-10 disabled:opacity-40"
      >
        {guardando ? "Guardando..." : guardado ? "Guardado ✓" : "Guardar"}
      </button>
    </div>
  );
}

function Campo({ label, valor, unidad, min, max, step, color, onChange }) {
  return (
    <div className="bg-base-surface border border-base-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
          <span className="text-ink-secondary text-sm font-medium">{label}</span>
        </div>
        <span className="font-display text-xl font-semibold">
          {valor} <span className="text-ink-secondary text-sm">{unidad}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={valor}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        style={{ accentColor: color }}
      />
    </div>
  );
}
