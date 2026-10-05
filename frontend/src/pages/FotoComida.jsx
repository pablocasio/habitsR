import { useEffect, useRef, useState } from "react";
import BarrasNutricionales from "../components/BarrasNutricionales";

const API_URL = "http://localhost:8000";

const TIPOS_COMIDA = ["desayuno", "almuerzo", "cena", "snack"];

function idUsuarioActual() {
  return localStorage.getItem("agentsync_id_usuario") || "demo-pablo";
}

function archivoABase64(archivo) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(archivo);
  });
}

export default function FotoComida() {
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [analizando, setAnalizando] = useState(false);
  const [analisis, setAnalisis] = useState(null); // resultado de Claude, editable antes de guardar
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [resumenHoy, setResumenHoy] = useState(null);
  const [metas, setMetas] = useState(null);

  useEffect(() => {
    cargarResumen();
  }, []);

  async function cargarResumen() {
    try {
      const res = await fetch(`${API_URL}/api/nutricion/resumen-hoy/${idUsuarioActual()}`);
      const data = await res.json();
      setResumenHoy(data.consumido);
      setMetas(data.metas);
    } catch {
      // sin conexión, las barras se quedan vacías — no es grave
    }
  }

  async function manejarArchivo(e) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setError(null);
    setAnalisis(null);
    setPreviewUrl(URL.createObjectURL(archivo));
    setAnalizando(true);

    try {
      const base64 = await archivoABase64(archivo);
      const res = await fetch(`${API_URL}/api/comida/foto/analizar`, {
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
      setAnalisis(data.analisis);
    } catch {
      setError("No pude analizar la foto. ¿Está corriendo el backend?");
    } finally {
      setAnalizando(false);
    }
  }

  async function agregarAMiDia() {
    setGuardando(true);
    try {
      const res = await fetch(`${API_URL}/api/comida/foto/guardar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_usuario: idUsuarioActual(), ...analisis }),
      });
      const data = await res.json();
      setResumenHoy(data.resumen_hoy);
      setMetas(data.metas);
      reiniciar();
    } catch {
      setError("No pude guardar. Probá de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  function reiniciar() {
    setPreviewUrl(null);
    setAnalisis(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="px-6 pt-14 pb-28 max-w-md mx-auto">
      <p className="text-ink-secondary text-sm font-medium">Visión IA</p>
      <h1 className="font-display text-3xl font-semibold mt-1 mb-4">Foto de tu comida</h1>

      <BarrasNutricionales resumen={resumenHoy} metas={metas} />

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
          className="w-full aspect-square bg-base-surface border-2 border-dashed border-base-border rounded-3xl flex flex-col items-center justify-center gap-3 text-ink-secondary mt-6"
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
        <div className="space-y-4 mt-6">
          <img src={previewUrl} alt="Foto de comida" className="w-full rounded-3xl object-cover aspect-square" />

          {analizando && (
            <div className="flex items-center gap-2 text-ink-secondary text-sm">
              <span className="w-2 h-2 rounded-full bg-ring-food animate-pulse" />
              Analizando la foto...
            </div>
          )}

          {error && <p className="text-ring-food text-sm">{error}</p>}

          {analisis && (
            <div className="bg-base-surface border border-base-border rounded-2xl p-5 animate-rise">
              <p className="font-display text-lg font-semibold mb-1">{analisis.nombre_plato}</p>
              <p className="text-ink-muted text-xs mb-3">Confianza: {analisis.confianza}</p>

              <p className="text-ink-muted text-[11px] font-medium mb-2">¿Qué comida es? (corregí si Claude se equivocó)</p>
              <div className="flex gap-2 mb-4">
                {TIPOS_COMIDA.map((t) => (
                  <button
                    key={t}
                    onClick={() => setAnalisis((a) => ({ ...a, tipo_comida: t }))}
                    className={`flex-1 rounded-xl py-2 text-xs font-semibold capitalize ${
                      analisis.tipo_comida === t
                        ? "bg-ring-exercise text-base-bg"
                        : "bg-base-surface2 text-ink-secondary border border-base-border"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-4 gap-2 text-center">
                <MacroBox label="kcal" valor={analisis.calorias_estimadas} color="#B4FF3D" />
                <MacroBox label="proteína g" valor={analisis.proteinas_g} color="#33C5FF" />
                <MacroBox label="carbs g" valor={analisis.carbohidratos_g} color="#FF6B4A" />
                <MacroBox label="grasas g" valor={analisis.grasas_g} color="#9B8CFF" />
              </div>

              {analisis.comentario_metas && (
                <div className="mt-4 pt-4 border-t border-base-border">
                  <p className="text-ring-water text-[10px] font-semibold uppercase tracking-wide mb-1.5">
                    ¿Me conviene comer esto?
                  </p>
                  <p className="text-ink-primary text-sm leading-relaxed">{analisis.comentario_metas}</p>
                </div>
              )}

              <button
                onClick={agregarAMiDia}
                disabled={guardando}
                className="w-full bg-ring-exercise text-base-bg font-semibold rounded-xl py-3 mt-4 text-sm disabled:opacity-50"
              >
                {guardando ? "Agregando..." : "Agregar a mi día"}
              </button>
            </div>
          )}

          {!analizando && (
            <button
              onClick={reiniciar}
              className="w-full border border-base-border text-ink-secondary rounded-2xl py-3 text-sm font-medium"
            >
              {analisis ? "Descartar y sacar otra" : "Sacar otra foto"}
            </button>
          )}
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
