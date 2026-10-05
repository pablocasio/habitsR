import { useState } from "react";

const API_URL = "http://localhost:8000";

const rutinaOpts = ["Sedentario", "Moderado", "Activo", "Muy activo"];
const dietaOpts = ["Omnívoro", "Vegetariano", "Vegano", "Sin gluten"];
const tipoEjercicioOpts = ["Cardio", "Fuerza", "Yoga / flexibilidad", "Mixto"];
const horarioOpts = ["Mañana", "Tarde", "Noche", "Variable"];
const experienciaOpts = ["Principiante", "Intermedio", "Avanzado"];
const objetivoOpts = ["Bajar de peso", "Ganar músculo", "Mantener peso", "Salud general"];

export default function EditarPerfil({ user, onGuardado, onCancelar }) {
  const [data, setData] = useState({
    nombre: user.nombre || "",
    genero: user.genero || "",
    edad: user.edad || "",
    peso: user.peso || "",
    altura: user.altura || "",
    rutina: user.rutina || "",
    tipo_ejercicio: user.tipo_ejercicio || "",
    horario_ejercicio: user.horario_ejercicio || "",
    experiencia_ejercicio: user.experiencia_ejercicio || "",
    dieta: user.dieta || "",
    alergias: user.alergias || "",
    comidas_por_dia: user.comidas_por_dia || 3,
    objetivo: user.objetivo || "",
    horas_sueno_objetivo: user.horas_sueno_objetivo || 8,
    intensidad_ejercicio_min: user.intensidad_ejercicio_min || 30,
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  function set(key, value) {
    setData((d) => ({ ...d, [key]: value }));
  }

  async function guardar() {
    setGuardando(true);
    setError(null);

    const idUsuario = localStorage.getItem("agentsync_id_usuario");
    const payload = {
      ...data,
      edad: Number(data.edad),
      peso: data.peso ? Number(data.peso) : null,
      altura: data.altura ? Number(data.altura) : null,
      horas_sueno_objetivo: Number(data.horas_sueno_objetivo),
      comidas_por_dia: Number(data.comidas_por_dia),
      intensidad_ejercicio_min: Number(data.intensidad_ejercicio_min),
    };

    try {
      const res = await fetch(`${API_URL}/api/usuarios/${idUsuario}/perfil`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const resultado = await res.json();

      if (!resultado.ok) {
        setError(resultado.error || "No se pudo guardar");
        return;
      }

      localStorage.setItem("agentsync_perfil", JSON.stringify(resultado.perfil));
      onGuardado(resultado.perfil);
    } catch {
      setError("No pude conectarme al backend.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="px-6 pt-14 pb-28 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={onCancelar} className="text-ink-secondary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="font-display text-2xl font-semibold">Editar perfil</h1>
      </div>

      <div className="space-y-5">
        <Campo label="Nombre">
          <input value={data.nombre} onChange={(e) => set("nombre", e.target.value)} className={inputClass} />
        </Campo>

        <div className="grid grid-cols-2 gap-3">
          <Campo label="Edad">
            <input type="number" value={data.edad} onChange={(e) => set("edad", e.target.value)} className={inputClass} />
          </Campo>
          <Campo label="Género">
            <select value={data.genero} onChange={(e) => set("genero", e.target.value)} className={inputClass}>
              <option value="Masculino">Masculino</option>
              <option value="Femenino">Femenino</option>
            </select>
          </Campo>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Campo label="Peso (kg)">
            <input type="number" value={data.peso} onChange={(e) => set("peso", e.target.value)} className={inputClass} />
          </Campo>
          <Campo label="Altura (cm)">
            <input type="number" value={data.altura} onChange={(e) => set("altura", e.target.value)} className={inputClass} />
          </Campo>
        </div>

        <Campo label="Nivel de actividad">
          <select value={data.rutina} onChange={(e) => set("rutina", e.target.value)} className={inputClass}>
            {rutinaOpts.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Campo>

        <Campo label="Tipo de ejercicio preferido">
          <select value={data.tipo_ejercicio} onChange={(e) => set("tipo_ejercicio", e.target.value)} className={inputClass}>
            {tipoEjercicioOpts.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Campo>

        <div className="grid grid-cols-2 gap-3">
          <Campo label="Horario preferido">
            <select value={data.horario_ejercicio} onChange={(e) => set("horario_ejercicio", e.target.value)} className={inputClass}>
              {horarioOpts.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </Campo>
          <Campo label="Experiencia">
            <select value={data.experiencia_ejercicio} onChange={(e) => set("experiencia_ejercicio", e.target.value)} className={inputClass}>
              {experienciaOpts.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </Campo>
        </div>

        <Campo label="Dieta">
          <select value={data.dieta} onChange={(e) => set("dieta", e.target.value)} className={inputClass}>
            {dietaOpts.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Campo>

        <Campo label="Alergias / restricciones">
          <input value={data.alergias} onChange={(e) => set("alergias", e.target.value)} placeholder="Ninguna" className={inputClass} />
        </Campo>

        <Campo label="Objetivo principal">
          <select value={data.objetivo} onChange={(e) => set("objetivo", e.target.value)} className={inputClass}>
            {objetivoOpts.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Campo>

        <div className="grid grid-cols-3 gap-3">
          <Campo label="Comidas/día">
            <input type="number" min="2" max="6" value={data.comidas_por_dia} onChange={(e) => set("comidas_por_dia", e.target.value)} className={inputClass} />
          </Campo>
          <Campo label="Sueño meta (h)">
            <input type="number" min="5" max="10" step="0.5" value={data.horas_sueno_objetivo} onChange={(e) => set("horas_sueno_objetivo", e.target.value)} className={inputClass} />
          </Campo>
          <Campo label="Ejercicio meta (min)">
            <input type="number" min="0" max="180" value={data.intensidad_ejercicio_min} onChange={(e) => set("intensidad_ejercicio_min", e.target.value)} className={inputClass} />
          </Campo>
        </div>
      </div>

      {error && <p className="text-ring-food text-sm text-center mt-4">{error}</p>}

      <button
        onClick={guardar}
        disabled={guardando}
        className="w-full bg-ring-exercise text-base-bg font-display font-semibold text-lg rounded-2xl py-4 mt-8 disabled:opacity-40"
      >
        {guardando ? "Guardando..." : "Guardar cambios"}
      </button>
    </div>
  );
}

const inputClass =
  "w-full bg-base-surface border border-base-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-ring-exercise";

function Campo({ label, children }) {
  return (
    <label className="block">
      <span className="text-ink-muted text-xs mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
