import { useRef, useState } from "react";

const API_URL = "http://localhost:8000";

function idUsuarioActual() {
  return localStorage.getItem("agentsync_id_usuario") || "demo-pablo";
}

function archivoABase64(archivo) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]); // sin el prefijo data:image/...;base64,
    reader.onerror = reject;
    reader.readAsDataURL(archivo);
  });
}

export default function FotoComida() {
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [analizando, setAnalizando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);

  async function manejarArchivo(e) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setError(null);
    setResultado(null);
    setPreviewUrl(URL.createObjectURL(archivo));
    setAnalizando(true);

    try {
      const base64 = await archivoABase64(archivo);
      const res = await fetch(`${API_URL}/api/comida/foto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_usuario: idUsuarioActual(),
          imagen_base64: base64,
          media_type: archivo.type || "image/jpeg",
        }),
      });
      if (!res.ok) throw new Error("Backend respondió error");
      const data = await res.json();
      setResultado(data.analisis);
    } catch {
      setError("No pude analizar la foto. ¿Está corriendo el backend?");
    } finally {
      setAnalizando(false);
    }
  }

  return (
    <div className="px-6 pt-14 pb-28 max-w-md mx-auto">
      <p className="text-ink-secondary text-sm font-medium">Visión IA</p>
      <h1 className="font-display text-3xl font-semibold mt-1 mb-2">Foto de tu comida</h1>
      <p className="text-ink-muted text-xs mb-6">
        Sacale una foto a tu plato y el agente estima calorías y macros automáticamente.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={manejarArchivo}
        className="hidden"
      />

      {!previewUrl && (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full aspect-square bg-base-surface border-2 border-dashed border-base-border rounded-3xl flex flex-col items-center justify-center gap-3 text-ink-secondary"
        >
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 8h3l1.5-2h7L17 8h3v11H4V8z M12 18a4 4 0 100-8 4 4 0 000 8z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-sm font-medium">Tocá para sacar o elegir una foto</span>
        </button>
      )}

      {previewUrl && (
        <div className="space-y-4">
          <img src={previewUrl} alt="Foto de comida" className="w-full rounded-3xl object-cover aspect-square" />

          {analizando && (
            <div className="flex items-center gap-2 text-ink-secondary text-sm">
              <span className="w-2 h-2 rounded-full bg-ring-food animate-pulse" />
              Analizando la foto...
            </div>
          )}

          {error && <p className="text-ring-food text-sm">{error}</p>}

          {resultado && (
            <div className="bg-base-surface border border-base-border rounded-2xl p-5 animate-rise">
              <p className="font-display text-lg font-semibold mb-1">{resultado.nombre_plato}</p>
              <p className="text-ink-muted text-xs mb-4">
                Confianza de la estimación: {resultado.confianza}
              </p>
              <div className="grid grid-cols-4 gap-2 text-center">
                <MacroBox label="kcal" valor={resultado.calorias_estimadas} color="#B4FF3D" />
                <MacroBox label="proteína g" valor={resultado.proteinas_g} color="#33C5FF" />
                <MacroBox label="carbs g" valor={resultado.carbohidratos_g} color="#FF6B4A" />
                <MacroBox label="grasas g" valor={resultado.grasas_g} color="#9B8CFF" />
              </div>
            </div>
          )}

          <button
            onClick={() => {
              setPreviewUrl(null);
              setResultado(null);
              setError(null);
              inputRef.current.value = "";
            }}
            className="w-full border border-base-border text-ink-secondary rounded-2xl py-3 text-sm font-medium"
          >
            Sacar otra foto
          </button>
        </div>
      )}
    </div>
  );
}

function MacroBox({ label, valor, color }) {
  return (
    <div>
      <p className="font-display text-xl font-semibold" style={{ color }}>
        {valor}
      </p>
      <p className="text-ink-muted text-[10px] mt-0.5">{label}</p>
    </div>
  );
}
