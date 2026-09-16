const STATE_CONFIG = {
  idle: { scale: 1, glow: 0.25 },
  listening: { scale: 1.08, glow: 0.55 },
  thinking: { scale: 1, glow: 0.4 },
  speaking: { scale: 1.05, glow: 0.65 },
};

export default function VoiceOrb({ state = "idle", size = 180 }) {
  const cfg = STATE_CONFIG[state] ?? STATE_CONFIG.idle;

  return (
    <div
      className="relative flex items-center justify-center transition-transform duration-300"
      style={{ width: size, height: size, transform: `scale(${cfg.scale})` }}
    >
      {/* Halo exterior, pulsa más fuerte según el estado */}
      <div
        className="absolute inset-0 rounded-full blur-2xl transition-opacity duration-500"
        style={{
          background: "radial-gradient(circle, #33C5FF 0%, #9B8CFF 60%, transparent 100%)",
          opacity: cfg.glow,
        }}
      />

      {/* Anillo animado — gira siempre despacio, más rápido si está pensando */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        className={state === "thinking" ? "animate-spin" : "animate-[spin_8s_linear_infinite]"}
        style={{ animationDuration: state === "thinking" ? "1.4s" : "8s" }}
      >
        <defs>
          <linearGradient id="orbGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#33C5FF" />
            <stop offset="100%" stopColor="#9B8CFF" />
          </linearGradient>
        </defs>
        <circle
          cx="100"
          cy="100"
          r="82"
          fill="none"
          stroke="url(#orbGradient)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="120 400"
          opacity="0.8"
        />
      </svg>

      {/* Núcleo central */}
      <div
        className="absolute rounded-full flex items-center justify-center"
        style={{
          width: size * 0.62,
          height: size * 0.62,
          background: "linear-gradient(135deg, #33C5FF 0%, #9B8CFF 100%)",
        }}
      >
        {state === "speaking" ? (
          <SpeakingBars />
        ) : state === "listening" ? (
          <MicPulse />
        ) : state === "thinking" ? (
          <ThinkingDots />
        ) : (
          <div className="w-3 h-3 rounded-full bg-white/90" />
        )}
      </div>
    </div>
  );
}

function SpeakingBars() {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="w-1 rounded-full bg-white/90"
          style={{
            height: 14,
            animation: `voiceBar 0.7s ease-in-out ${i * 0.12}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes voiceBar {
          0%, 100% { height: 8px; }
          50% { height: 24px; }
        }
      `}</style>
    </div>
  );
}

function MicPulse() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 15a3 3 0 003-3V6a3 3 0 10-6 0v6a3 3 0 003 3zM19 11a7 7 0 01-14 0M12 18v3"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-white/90 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}
