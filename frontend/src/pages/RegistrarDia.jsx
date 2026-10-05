import { useEffect, useState } from "react";

const API_URL = "http://localhost:8000";

function idUsuarioActual() {
  return localStorage.getItem("agentsync_id_usuario") || "demo-pablo";
}

export default function RegistrarDia({ onVolver }) {
  const [registro, setRegistro] = useState({
    agua_litros: 0,
    minutos_ejercicio: 0,
    horas_sueno: 0,
    comidas_realizadas: 0,
  });
  const [cargando, setCargando] = useState(true);
  const [guardandoSueno, setGuardandoSueno] = useState(false);
  const [sueñoGuardado, setSueñoGuardado] = useState(false);
  const [pulso, setPulso] = useState(null); // qué campo acaba de actualizarse, para el feedback visual

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    try {
      const res = await fetch(`${API_URL}/api/registros/hoy/${idUsuarioActual()}`);
      const data = await res.json();
      setRegistro(data);
    } catch {
      // sin conexión — se queda con los valores en 0, el usuario puede reintentar
    } finally {
      setCargando(false);
    }
  }

  async function sumar(campo, delta) {
    // Actualización optimista: se ve el cambio al instante, sin esperar al backend
    setRegistro((r) => ({ ...r, [campo]: Math.max(0, r[campo] + delta) }));
    setPulso(campo);
    setTimeout(() => setPulso(null), 400);

    try {
      const res = await fetch(`${API_URL}/api/registros/incrementar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_usuario: idUsuarioActual(), campo, delta }),
      });
      const data = await res.json();
      if (data.registro) setRegistro(data.registro); // sincroniza con el valor real del servidor
    } catch {
      // si falla, el valor optimista queda como estaba — no es grave, se puede reintentar
    }
  }

  async function guardarSueno() {
    setGuardandoSueno(true);
    try {
      await fetch(`${API_URL}/api/registros/hoy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_usuario: idUsuarioActual(), horas_sueno: registro.horas_sueno }),
      });
      setSueñoGuardado(true);
      setTimeout(() => setSueñoGuardado(false), 1500);
    } finally {
      setGuardandoSueno(false);
    }
  }

  if (cargando) {
    return (
      <div className="px-6 pt-14 max-w-md mx-auto">
        <p className="text-ink-secondary text-sm">Cargando tu día...</p>
      </div>
    );
  }

  return (
    <div className="px-6 pt-14 pb-28 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={onVolver} className="text-ink-secondary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div>
          <p className="text-ink-secondary text-sm font-medium">Registrar</p>
          <h1 className="font-display text-2xl font-semibold">Tu día de hoy</h1>
        </div>
      </div>

      <p className="text-ink-muted text-xs mb-6">
        Registrá a cualquier hora — cada toque suma a lo que ya llevás hoy, no lo reemplaza.
      </p>

      <div className="space-y-4">
        <CampoProgresivo
          label="Agua"
          valor={registro.agua_litros}
          unidad="L"
          color="#33C5FF"
          pulsando={pulso === "agua_litros"}
          opciones={[
            { texto: "+250ml", delta: 0.25 },
            { texto: "+500ml", delta: 0.5 },
            { texto: "+1L", delta: 1 },
          ]}
          onSumar={(d) => sumar("agua_litros", d)}
        />

        <CampoProgresivo
          label="Ejercicio"
          valor={registro.minutos_ejercicio}
          unidad="min"
          color="#B4FF3D"
          pulsando={pulso === "minutos_ejercicio"}
          opciones={[
            { texto: "+10 min", delta: 10 },
            { texto: "+30 min", delta: 30 },
            { texto: "+60 min", delta: 60 },
          ]}
          onSumar={(d) => sumar("minutos_ejercicio", d)}
        />

        <CampoProgresivo
          label="Comidas"
          valor={registro.comidas_realizadas}
          unidad="hoy"
          color="#FF6B4A"
          pulsando={pulso === "comidas_realizadas"}
          opciones={[
            { texto: "Desayuno", delta: 1 },
            { texto: "Almuerzo", delta: 1 },
            { texto: "Cena", delta: 1 },
            { texto: "Snack", delta: 1 },
          ]}
          onSumar={(d) => sumar("comidas_realizadas", d)}
        />
        <p className="text-ink-muted text-[11px] -mt-2 px-1">
          Esto solo cuenta la comida. Para que sume calorías y proteína a tu meta diaria, usá la pestaña Foto.
        </p>

        {/* El sueño es distinto: se registra UNA vez por día (lo que dormiste
            anoche), no se va sumando durante el día — por eso es un slider
            con guardado explícito, no botones de "+". */}
        <div className="bg-base-surface border border-base-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-ring-sleep" />
              <span className="text-ink-secondary text-sm font-medium">Sueño (anoche)</span>
            </div>
            <span className="font-display text-xl font-semibold">
              {registro.horas_sueno} <span className="text-ink-secondary text-sm">h</span>
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={12}
            step={0.5}
            value={registro.horas_sueno}
            onChange={(e) => setRegistro((r) => ({ ...r, horas_sueno: Number(e.target.value) }))}
            className="w-full accent-ring-sleep"
          />
          <button
            onClick={guardarSueno}
            disabled={guardandoSueno}
            className="w-full mt-3 border border-ring-sleep text-ring-sleep rounded-xl py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {guardandoSueno ? "Guardando..." : sueñoGuardado ? "Guardado ✓" : "Guardar horas de sueño"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CampoProgresivo({ label, valor, unidad, color, opciones, onSumar, pulsando }) {
  return (
    <div className="bg-base-surface border border-base-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
          <span className="text-ink-secondary text-sm font-medium">{label}</span>
        </div>
        <span
          className="font-display text-xl font-semibold transition-transform"
          style={{ transform: pulsando ? "scale(1.15)" : "scale(1)", color: pulsando ? color : undefined }}
        >
          {valor} <span className="text-ink-secondary text-sm">{unidad}</span>
        </span>
      </div>
      <div className="flex gap-2">
        {opciones.map((o) => (
          <button
            key={o.texto}
            onClick={() => onSumar(o.delta)}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold"
            style={{ background: `${color}22`, color, border: `1px solid ${color}55` }}
          >
            {o.texto}
          </button>
        ))}
      </div>
    </div>
  );
}
