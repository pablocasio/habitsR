const week = [
  { day: "L", exercise: 0.9, water: 0.8 },
  { day: "M", exercise: 0.6, water: 0.7 },
  { day: "X", exercise: 0.3, water: 0.5 },
  { day: "J", exercise: 0.4, water: 0.6 },
  { day: "V", exercise: 0.8, water: 0.9 },
  { day: "S", exercise: 1.0, water: 0.85 },
  { day: "D", exercise: 0.7, water: 0.75 },
];

export default function Progress() {
  return (
    <div className="px-6 pt-14 pb-28 max-w-md mx-auto">
      <p className="text-ink-secondary text-sm font-medium">Análisis del agente</p>
      <h1 className="font-display text-3xl font-semibold mt-1">Tu progreso</h1>

      <div className="mt-8 bg-base-surface border border-base-border rounded-2xl p-5 animate-rise">
        <p className="text-ink-secondary text-xs font-medium mb-4">Esta semana — ejercicio vs. agua</p>
        <div className="flex items-end justify-between gap-2 h-32">
          {week.map((d) => (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5">
              <div className="w-full flex gap-1 items-end h-24">
                <div
                  className="flex-1 rounded-full bg-ring-exercise/80"
                  style={{ height: `${d.exercise * 100}%` }}
                />
                <div
                  className="flex-1 rounded-full bg-ring-water/80"
                  style={{ height: `${d.water * 100}%` }}
                />
              </div>
              <span className="text-ink-muted text-[11px]">{d.day}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 bg-gradient-to-br from-ring-food/15 to-transparent border border-ring-food/30 rounded-2xl p-5 animate-rise" style={{ animationDelay: "100ms" }}>
        <p className="text-ring-food text-xs font-semibold mb-1.5">Patrón detectado</p>
        <p className="text-ink-primary text-sm leading-relaxed">
          Bajás tu ejercicio los miércoles y jueves de forma consistente. Si movemos tu sesión a las mañanas esos días, tu cumplimiento debería subir.
        </p>
      </div>

      <div className="mt-4 space-y-3">
        <ProgressRow label="Cumplimiento de agua" value={78} color="#33C5FF" />
        <ProgressRow label="Cumplimiento de ejercicio" value={64} color="#B4FF3D" />
        <ProgressRow label="Regularidad de sueño" value={71} color="#9B8CFF" />
      </div>
    </div>
  );
}

function ProgressRow({ label, value, color }) {
  return (
    <div className="bg-base-surface border border-base-border rounded-2xl p-4 animate-rise">
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-ink-secondary text-xs font-medium">{label}</span>
        <span className="font-display text-lg font-semibold">{value}%</span>
      </div>
      <div className="h-1.5 bg-base-surface2 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}
