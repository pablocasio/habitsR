import { useState } from "react";

const steps = ["nombre", "genero", "rutina", "dieta", "objetivo", "intensidad"];

const rutinaOpts = [
  { v: "Sedentario", d: "Poco o nada de ejercicio" },
  { v: "Moderado", d: "2-3 veces por semana" },
  { v: "Activo", d: "4-5 veces por semana" },
  { v: "Muy activo", d: "Entrenamiento diario" },
];

const dietaOpts = ["Omnívoro", "Vegetariano", "Vegano", "Sin gluten"];

const objetivoOpts = [
  { v: "Bajar de peso", i: "↓" },
  { v: "Ganar músculo", i: "↑" },
  { v: "Mantener peso", i: "=" },
  { v: "Salud general", i: "♥" },
];

export default function Onboarding({ onComplete }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [data, setData] = useState({
    nombre: "",
    genero: "",
    rutina: "",
    dieta: "",
    objetivo: "",
    intensidad: 30,
  });

  const step = steps[stepIndex];
  const progress = (stepIndex + 1) / steps.length;

  function next() {
    if (stepIndex === steps.length - 1) {
      onComplete(data);
    } else {
      setStepIndex((i) => i + 1);
    }
  }

  function back() {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  }

  function set(key, value) {
    setData((d) => ({ ...d, [key]: value }));
  }

  const canContinue =
    (step === "nombre" && data.nombre.trim().length > 0) ||
    (step === "genero" && data.genero) ||
    (step === "rutina" && data.rutina) ||
    (step === "dieta" && data.dieta) ||
    (step === "objetivo" && data.objetivo) ||
    step === "intensidad";

  return (
    <div className="min-h-screen max-w-md mx-auto px-6 pt-8 pb-8 flex flex-col">
      <div className="flex items-center gap-3 mb-10">
        {stepIndex > 0 && (
          <button onClick={back} className="text-ink-secondary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        <div className="flex-1 h-1 bg-base-surface2 rounded-full overflow-hidden">
          <div
            className="h-full bg-ring-exercise rounded-full transition-all duration-500"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      <div className="flex-1 animate-rise" key={step}>
        {step === "nombre" && (
          <StepShell title="¿Cómo te llamás?" subtitle="Así te va a llamar tu agente">
            <input
              autoFocus
              value={data.nombre}
              onChange={(e) => set("nombre", e.target.value)}
              placeholder="Tu nombre"
              className="w-full bg-transparent border-b-2 border-base-border focus:border-ring-exercise text-3xl font-display font-medium py-3 focus:outline-none transition-colors"
            />
          </StepShell>
        )}

        {step === "genero" && (
          <StepShell title="¿Con qué género te identificás?" subtitle="Ajusta tus metas nutricionales">
            <div className="grid grid-cols-2 gap-3">
              {["Masculino", "Femenino"].map((g) => (
                <OptionCard key={g} selected={data.genero === g} onClick={() => set("genero", g)}>
                  {g}
                </OptionCard>
              ))}
            </div>
          </StepShell>
        )}

        {step === "rutina" && (
          <StepShell title="¿Cuál es tu nivel de actividad?" subtitle="Para calibrar tus anillos diarios">
            <div className="space-y-3">
              {rutinaOpts.map((r) => (
                <OptionCard key={r.v} selected={data.rutina === r.v} onClick={() => set("rutina", r.v)} align="left">
                  <span className="font-medium">{r.v}</span>
                  <span className="block text-ink-muted text-xs mt-0.5">{r.d}</span>
                </OptionCard>
              ))}
            </div>
          </StepShell>
        )}

        {step === "dieta" && (
          <StepShell title="¿Qué tipo de dieta llevás?" subtitle="Personaliza tus recomendaciones de comida">
            <div className="grid grid-cols-2 gap-3">
              {dietaOpts.map((d) => (
                <OptionCard key={d} selected={data.dieta === d} onClick={() => set("dieta", d)}>
                  {d}
                </OptionCard>
              ))}
            </div>
          </StepShell>
        )}

        {step === "objetivo" && (
          <StepShell title="¿Cuál es tu objetivo principal?" subtitle="El agente prioriza sus sugerencias según esto">
            <div className="space-y-3">
              {objetivoOpts.map((o) => (
                <OptionCard key={o.v} selected={data.objetivo === o.v} onClick={() => set("objetivo", o.v)} align="left">
                  <span className="inline-flex items-center gap-3">
                    <span className="font-display text-ring-exercise text-lg">{o.i}</span>
                    {o.v}
                  </span>
                </OptionCard>
              ))}
            </div>
          </StepShell>
        )}

        {step === "intensidad" && (
          <StepShell title="¿Cuántos minutos de ejercicio por día?" subtitle="Define la meta de tu anillo de ejercicio">
            <div className="text-center py-6">
              <span className="font-display text-6xl font-semibold text-ring-exercise">
                {data.intensidad}
              </span>
              <span className="text-ink-secondary text-lg ml-1">min</span>
            </div>
            <input
              type="range"
              min="0"
              max="120"
              step="5"
              value={data.intensidad}
              onChange={(e) => set("intensidad", Number(e.target.value))}
              className="w-full accent-ring-exercise"
            />
          </StepShell>
        )}
      </div>

      <button
        onClick={next}
        disabled={!canContinue}
        className="w-full bg-ring-exercise text-base-bg font-display font-semibold text-lg rounded-2xl py-4 mt-8 disabled:opacity-30 transition-opacity"
      >
        {stepIndex === steps.length - 1 ? "Crear mi perfil" : "Continuar"}
      </button>
    </div>
  );
}

function StepShell({ title, subtitle, children }) {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold leading-snug">{title}</h1>
      <p className="text-ink-secondary text-sm mt-2 mb-8">{subtitle}</p>
      {children}
    </div>
  );
}

function OptionCard({ children, selected, onClick, align = "center" }) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-2xl border-2 px-4 py-4 transition-colors ${
        align === "left" ? "text-left" : "text-center"
      } ${
        selected
          ? "border-ring-exercise bg-ring-exercise/10 text-ink-primary"
          : "border-base-border bg-base-surface text-ink-secondary"
      }`}
    >
      {children}
    </button>
  );
}
