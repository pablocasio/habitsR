import { useState, useRef, useEffect } from "react";
import VoiceOrb from "../components/VoiceOrb";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";
import { limpiarTextoParaVoz } from "../utils/limpiarTextoParaVoz";

const API_URL = "http://localhost:8000";
const ID_USUARIO = "demo-pablo"; // más adelante: viene del perfil real del usuario logueado

const initialMessages = [
  {
    role: "agent",
    text: "Hola, soy tu agente de AgentSync. Puedo ayudarte con tu hidratación, comidas, sueño o rutina de ejercicio. ¿Qué necesitas?",
  },
];

const quickPrompts = ["¿Cómo voy con el agua esta semana?", "Ideas de ejercicio", "Ajustar mi meta de agua"];

export default function Chat() {
  const [modo, setModo] = useState("texto"); // "texto" | "voz"
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [vozActivada, setVozActivada] = useState(true); // en modo voz, si el agente responde hablando
  const endRef = useRef(null);

  const { hablar, detener, hablando, soportado: ttsOk } = useSpeechSynthesis();
  const { listening, transcript, soportado: sttOk, start, stop } = useSpeechRecognition();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  // Comportamiento proactivo: revisa cada 10s si el agente generó una
  // alerta por su cuenta, sin que el usuario haya preguntado nada.
  useEffect(() => {
    const intervalo = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/api/alertas/${ID_USUARIO}`);
        const data = await res.json();
        if (data.alertas?.length > 0) {
          setMessages((m) => [
            ...m,
            ...data.alertas.map((a) => ({ role: "agent", text: a.mensaje, proactivo: true })),
          ]);
          if (modo === "voz" && vozActivada) {
            hablar(limpiarTextoParaVoz(data.alertas[0].mensaje));
          }
          data.alertas.forEach((a) => {
            fetch(`${API_URL}/api/alertas/${a.id_alerta}/vista`, { method: "POST" });
          });
        }
      } catch {
        // silencioso: si el backend no está levantado, no rompemos el chat
      }
    }, 10000);
    return () => clearInterval(intervalo);
  }, [modo, vozActivada, hablar]);

  async function send(text) {
    const content = text ?? input;
    if (!content.trim()) return;
    setMessages((m) => [...m, { role: "user", text: content }]);
    setInput("");
    setTyping(true);

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_usuario: ID_USUARIO, mensaje: content }),
      });

      if (!res.ok) throw new Error(`Backend respondió ${res.status}`);

      const data = await res.json();
      setTyping(false);
      setMessages((m) => [
        ...m,
        { role: "agent", text: data.respuesta, herramientas: data.herramientas_usadas },
      ]);

      if (modo === "voz" && vozActivada) {
        hablar(limpiarTextoParaVoz(data.respuesta));
      }
    } catch (err) {
      setTyping(false);
      const textoError = "No pude conectarme al backend. ¿Está corriendo uvicorn en localhost:8000?";
      setMessages((m) => [...m, { role: "agent", text: textoError, error: true }]);
    }
  }

  function toggleEscuchar() {
    if (listening) {
      stop();
      return;
    }
    detener(); // si el agente estaba hablando, lo cortamos antes de escuchar
    start((textoFinal) => {
      if (textoFinal.trim()) send(textoFinal);
    });
  }

  const estadoOrbe = listening ? "listening" : typing ? "thinking" : hablando ? "speaking" : "idle";

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto">
      {/* Header con el toggle Texto/Voz, estilo panel moderno */}
      <div className="px-6 pt-14 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-ink-secondary text-sm font-medium">Tu agente</p>
            <h1 className="font-display text-2xl font-semibold mt-0.5">Conversemos</h1>
          </div>
          {modo === "voz" && (
            <button
              onClick={() => setVozActivada((v) => !v)}
              className={`w-9 h-9 rounded-full flex items-center justify-center border ${
                vozActivada ? "border-ring-water text-ring-water" : "border-base-border text-ink-muted"
              }`}
              title={vozActivada ? "Silenciar respuestas habladas" : "Activar respuestas habladas"}
            >
              {vozActivada ? "🔊" : "🔇"}
            </button>
          )}
        </div>

        {/* Tabs Texto / Voz */}
        <div className="flex gap-1 bg-base-surface border border-base-border rounded-full p-1">
          <button
            onClick={() => { detener(); setModo("texto"); }}
            className={`flex-1 py-2 rounded-full text-sm font-medium transition-colors ${
              modo === "texto" ? "bg-ring-exercise text-base-bg" : "text-ink-secondary"
            }`}
          >
            Texto
          </button>
          <button
            onClick={() => setModo("voz")}
            className={`flex-1 py-2 rounded-full text-sm font-medium transition-colors ${
              modo === "voz" ? "bg-ring-exercise text-base-bg" : "text-ink-secondary"
            }`}
          >
            Voz
          </button>
        </div>
      </div>

      {/* Panel de voz: el "personaje" interactivo */}
      {modo === "voz" && (
        <div className="flex flex-col items-center px-6 pb-4 animate-rise">
          <button onClick={toggleEscuchar} className="focus:outline-none">
            <VoiceOrb state={estadoOrbe} size={160} />
          </button>
          <p className="text-ink-secondary text-sm mt-4 text-center min-h-[20px]">
            {listening
              ? transcript || "Escuchando..."
              : hablando
              ? "Hablando..."
              : typing
              ? "Pensando..."
              : sttOk
              ? "Tocá el círculo para hablar"
              : "Tu navegador no soporta reconocimiento de voz — probá con Chrome"}
          </p>
        </div>
      )}

      {/* Historial de mensajes — visible en AMBOS modos, todo queda como texto */}
      <div className="flex-1 overflow-y-auto px-6 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed animate-rise ${
                m.role === "user"
                  ? "bg-ring-exercise text-base-bg font-medium"
                  : m.error
                  ? "bg-ring-food/10 border border-ring-food/40 text-ink-primary"
                  : m.proactivo
                  ? "bg-ring-water/10 border border-ring-water/40 text-ink-primary"
                  : "bg-base-surface border border-base-border text-ink-primary"
              }`}
            >
              {m.proactivo && (
                <p className="text-ring-water text-[10px] font-semibold mb-1 uppercase tracking-wide">
                  El agente notó algo
                </p>
              )}
              {m.text}
              {m.herramientas?.length > 0 && (
                <p className="text-ink-muted text-[10px] mt-2">🔧 usó: {m.herramientas.join(", ")}</p>
              )}
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

      {/* Input de texto — visible siempre, incluso en modo voz, para no perder el "también responde por texto" */}
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
