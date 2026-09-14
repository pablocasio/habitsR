import RingCluster from "../components/RingCluster";

const stats = [
  { key: "exercise", label: "Ejercicio", value: "24", unit: "min", goal: "de 30 min", color: "#B4FF3D" },
  { key: "water", label: "Agua", value: "1.8", unit: "L", goal: "de 2.5 L", color: "#33C5FF" },
  { key: "food", label: "Comida", value: "3", unit: "/4", goal: "comidas hoy", color: "#FF6B4A" },
  { key: "sleep", label: "Sueño", value: "6.5", unit: "h", goal: "de 8 h", color: "#9B8CFF" },
];

export default function Dashboard({ user }) {
  const ringValues = { exercise: 0.8, water: 0.72, food: 0.75, sleep: 0.81 };

  return (
    <div className="px-6 pt-14 pb-28 max-w-md mx-auto">
      <div className="animate-rise">
        <p className="text-ink-secondary text-sm font-medium">Hoy, {formatDate()}</p>
        <h1 className="font-display text-3xl font-semibold mt-1">
          Qué tal, {user?.nombre || "atleta"}
        </h1>
      </div>

      <div className="flex justify-center my-10 animate-rise" style={{ animationDelay: "100ms" }}>
        <RingCluster values={ringValues} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((s, i) => (
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
        <p className="text-ring-exercise text-xs font-semibold mb-1.5">Tu agente sugiere</p>
        <p className="text-ink-primary text-sm leading-relaxed">
          Te faltan 700ml de agua para tu meta. Un vaso ahora y otro después del almuerzo lo resuelve.
        </p>
      </div>
    </div>
  );
}

function formatDate() {
  return new Date().toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" });
}
