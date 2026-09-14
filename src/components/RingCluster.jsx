const habits = [
  { key: "exercise", color: "#B4FF3D", size: 220, stroke: 16 },
  { key: "water", color: "#33C5FF", size: 180, stroke: 16 },
  { key: "food", color: "#FF6B4A", size: 140, stroke: 16 },
  { key: "sleep", color: "#9B8CFF", size: 100, stroke: 16 },
];

export default function RingCluster({ values }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 220, height: 220 }}>
      {habits.map((h, i) => {
        const progress = values?.[h.key] ?? 0.5;
        const radius = (h.size - h.stroke) / 2;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - Math.min(progress, 1) * circumference;
        return (
          <svg
            key={h.key}
            width={h.size}
            height={h.size}
            viewBox={`0 0 ${h.size} ${h.size}`}
            className="absolute"
          >
            <circle
              cx={h.size / 2}
              cy={h.size / 2}
              r={radius}
              fill="none"
              stroke="#242933"
              strokeWidth={h.stroke}
            />
            <circle
              cx={h.size / 2}
              cy={h.size / 2}
              r={radius}
              fill="none"
              stroke={h.color}
              strokeWidth={h.stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              style={{
                "--ring-circumference": circumference,
                "--ring-offset": offset,
                transform: "rotate(-90deg)",
                transformOrigin: "center",
                animationDelay: `${i * 150}ms`,
              }}
              className="animate-ring"
            />
          </svg>
        );
      })}
    </div>
  );
}
