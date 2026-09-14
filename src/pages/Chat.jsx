import { useState, useRef, useEffect } from "react";

const initialMessages = [
  {
    role: "agent",
    text: "Hola, soy tu agente de AgentSync. Puedo ayudarte con tu hidratación, comidas, sueño o rutina de ejercicio. ¿Qué necesitas?",
  },
];

const quickPrompts = ["¿Qué como hoy?", "Ideas de ejercicio", "Ajustar mi meta de agua"];

export default function Chat() {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  function send(text) {
    const content = text ?? input;
    if (!content.trim()) return;
    setMessages((m) => [...m, { role: "user", text: content }]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages((m) => [
        ...m,
        { role: "agent", text: "Anotado. En la versión conectada a FastAPI, esto vendrá de Claude con tu contexto real desde PostgreSQL." },
      ]);
    }, 1100);
  }

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto">
      <div className="px-6 pt-14 pb-4">
        <p className="text-ink-secondary text-sm font-medium">Tu agente</p>
        <h1 className="font-display text-2xl font-semibold mt-1">Conversemos</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed animate-rise ${
                m.role === "user"
                  ? "bg-ring-exercise text-base-bg font-medium"
                  : "bg-base-surface border border-base-border text-ink-primary"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex justify-start">
            <div className="bg-base-surface border border-base-border rounded-2xl px-4 py-3 flex gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-ink-muted animate-pulse" />
              <span className="w-1.5 h-1.5 rounded-full bg-ink-muted animate-pulse" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-ink-muted animate-pulse" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="px-6 pb-4 pt-3">
        <div className="flex gap-2 mb-3 overflow-x-auto">
          {quickPrompts.map((p) => (
            <button
              key={p}
              onClick={() => send(p)}
              className="whitespace-nowrap text-xs font-medium text-ink-secondary bg-base-surface border border-base-border rounded-full px-3.5 py-2"
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Escribe tu mensaje..."
            className="flex-1 bg-base-surface border border-base-border rounded-full px-4 py-3 text-sm text-ink-primary placeholder-ink-muted focus:outline-none focus:border-ring-exercise"
          />
          <button
            onClick={() => send()}
            className="bg-ring-exercise text-base-bg rounded-full w-11 h-11 flex items-center justify-center shrink-0"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M4 12H20M20 12L14 6M20 12L14 18" stroke="#12151B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
