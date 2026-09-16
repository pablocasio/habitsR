const tabs = [
  { key: "home", label: "Hoy", icon: HomeIcon },
  { key: "chat", label: "Agente", icon: ChatIcon },
  { key: "foto", label: "Foto", icon: CameraIcon },
  { key: "progress", label: "Progreso", icon: ProgressIcon },
  { key: "profile", label: "Perfil", icon: ProfileIcon },
];

export default function BottomNav({ active, onChange }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-base-surface/95 backdrop-blur border-t border-base-border">
      <div className="max-w-md mx-auto flex items-stretch">
        {tabs.map((tab) => {
          const isActive = active === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className="flex-1 flex flex-col items-center gap-1 py-3"
            >
              <Icon active={isActive} />
              <span
                className={`text-[11px] font-medium ${
                  isActive ? "text-ink-primary" : "text-ink-muted"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function HomeIcon({ active }) {
  const c = active ? "#B4FF3D" : "#5B6272";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M4 11L12 4L20 11V20H14V14H10V20H4V11Z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function ChatIcon({ active }) {
  const c = active ? "#B4FF3D" : "#5B6272";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M4 5H20V16H9L4 20V5Z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function ProgressIcon({ active }) {
  const c = active ? "#B4FF3D" : "#5B6272";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M5 19V13M12 19V5M19 19V10" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CameraIcon({ active }) {
  const c = active ? "#B4FF3D" : "#5B6272";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 8h3l1.5-2h7L17 8h3v11H4V8z"
        stroke={c}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3" stroke={c} strokeWidth="1.8" />
    </svg>
  );
}

function ProfileIcon({ active }) {
  const c = active ? "#B4FF3D" : "#5B6272";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="3.5" stroke={c} strokeWidth="1.8" />
      <path d="M4.5 20C5.5 16 8.5 14 12 14C15.5 14 18.5 16 19.5 20" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
