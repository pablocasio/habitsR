import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Envuelve la Web Speech Synthesis API nativa (TTS). Busca automáticamente
 * la mejor voz femenina en español disponible en el navegador del usuario
 * — la lista de voces varía según sistema operativo, por eso el orden de
 * preferencia va de nombres conocidos a un fallback genérico.
 */
const NOMBRES_VOZ_FEMENINA_PREFERIDOS = [
  "mónica", "monica", "paulina", "helena", "lucia", "lucía",
  "elena", "sabina", "google español", "female", "mujer",
];

function elegirVozFemenina(voces) {
  const esVoices = voces.filter((v) => v.lang?.toLowerCase().startsWith("es"));
  const pool = esVoices.length > 0 ? esVoices : voces;

  for (const nombre of NOMBRES_VOZ_FEMENINA_PREFERIDOS) {
    const encontrada = pool.find((v) => v.name.toLowerCase().includes(nombre));
    if (encontrada) return encontrada;
  }
  return pool[0] ?? null;
}

export function useSpeechSynthesis() {
  const [hablando, setHablando] = useState(false);
  const [soportado, setSoportado] = useState(true);
  const vozRef = useRef(null);

  useEffect(() => {
    if (!window.speechSynthesis) {
      setSoportado(false);
      return;
    }

    function cargarVoz() {
      const voces = window.speechSynthesis.getVoices();
      if (voces.length > 0) vozRef.current = elegirVozFemenina(voces);
    }

    cargarVoz();
    // En Chrome, las voces cargan de forma asíncrona la primera vez
    window.speechSynthesis.onvoiceschanged = cargarVoz;
  }, []);

  const hablar = useCallback((texto, { onEnd } = {}) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // corta cualquier locución anterior

    const utterance = new SpeechSynthesisUtterance(texto);
    if (vozRef.current) utterance.voice = vozRef.current;
    utterance.lang = vozRef.current?.lang || "es-PE";
    utterance.rate = 0.96; // un poco más lento: suena más cálido, menos apurado
    utterance.pitch = 1.22; // agudo suave, tono tierno — no chillón
    utterance.volume = 1;
    utterance.onstart = () => setHablando(true);
    utterance.onend = () => {
      setHablando(false);
      onEnd?.();
    };
    utterance.onerror = () => setHablando(false);

    window.speechSynthesis.speak(utterance);
  }, []);

  const detener = useCallback(() => {
    window.speechSynthesis?.cancel();
    setHablando(false);
  }, []);

  return { hablar, detener, hablando, soportado };
}
