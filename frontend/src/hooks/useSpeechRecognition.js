import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Envuelve la Web Speech API nativa del navegador (SpeechRecognition).
 * Chrome la soporta bien; no necesita backend, key ni instalar nada.
 *
 * Devuelve el transcript en vivo (mientras hablás) y el final (cuando
 * terminaste), más funciones para empezar/parar de escuchar.
 */
export function useSpeechRecognition({ lang = "es-PE" } = {}) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [soportado, setSoportado] = useState(true);
  const recognitionRef = useRef(null);
  const onResultCallback = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSoportado(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let texto = "";
      for (let i = 0; i < event.results.length; i++) {
        texto += event.results[i][0].transcript;
      }
      setTranscript(texto);
      if (event.results[event.results.length - 1].isFinal) {
        onResultCallback.current?.(texto);
      }
    };

    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;
  }, [lang]);

  const start = useCallback((onFinalResult) => {
    if (!recognitionRef.current) return;
    onResultCallback.current = onFinalResult;
    setTranscript("");
    setListening(true);
    recognitionRef.current.start();
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  return { listening, transcript, soportado, start, stop };
}
