export default function ActivityRing({
  progress = 0.6,
  size = 160,
  strokeWidth = 14,
  color = "#33C5FF",
  trackColor = "#242933",
  delay = 0,
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - Math.min(progress, 1) * circumference;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={trackColor}
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        style={{
          "--ring-circumference": circumference,
          "--ring-offset": offset,
          transform: "rotate(-90deg)",
          transformOrigin: "center",
          animationDelay: `${delay}ms`,
        }}
        className="animate-ring"
      />
    </svg>
  );
}
