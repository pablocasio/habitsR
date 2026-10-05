export default function BarrasNutricionales({ resumen, metas, titulo = "Tu día" }) {
  if (!metas) {
    return (
      <div className="bg-base-surface border border-base-border rounded-2xl p-4">
        <p className="text-ink-muted text-xs">
          Completá tu peso, altura y edad en el perfil para calcular tus metas de calorías y proteína.
        </p>
      </div>
    );
  }

  const consumido = resumen || { calorias: 0, proteinas_g: 0, carbohidratos_g: 0, grasas_g: 0 };

  const barras = [
    { label: "Calorías", valor: consumido.calorias, meta: metas.calorias_objetivo, unidad: "kcal", color: "#B4FF3D" },
    { label: "Proteína", valor: consumido.proteinas_g, meta: metas.proteinas_objetivo_g, unidad: "g", color: "#33C5FF" },
    { label: "Carbohidratos", valor: consumido.carbohidratos_g, meta: metas.carbohidratos_objetivo_g, unidad: "g", color: "#FF6B4A" },
    { label: "Grasas", valor: consumido.grasas_g, meta: metas.grasas_objetivo_g, unidad: "g", color: "#9B8CFF" },
  ];

  return (
    <div className="bg-base-surface border border-base-border rounded-2xl p-4 space-y-3">
      {titulo && <p className="text-ink-secondary text-xs font-semibold uppercase tracking-wide">{titulo}</p>}
      {barras.map((b) => {
        const pct = Math.min(100, Math.round((b.valor / b.meta) * 100));
        return (
          <div key={b.label}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-ink-secondary">{b.label}</span>
              <span className="text-ink-primary font-medium">
                {Math.round(b.valor)} / {b.meta} {b.unidad}
              </span>
            </div>
            <div className="h-2 bg-base-surface2 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: b.color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
