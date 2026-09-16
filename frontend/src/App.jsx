import { useState, useEffect } from "react";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Chat from "./pages/Chat";
import Progress from "./pages/Progress";
import FotoComida from "./pages/FotoComida";
import RegistrarDia from "./pages/RegistrarDia";
import BottomNav from "./components/BottomNav";

export default function App() {
  const [user, setUser] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [tab, setTab] = useState("home");

  // Al abrir la app, si ya hiciste el onboarding antes, no te lo vuelve
  // a pedir — recupera el perfil guardado en el navegador.
  useEffect(() => {
    const perfilGuardado = localStorage.getItem("agentsync_perfil");
    if (perfilGuardado) {
      try {
        setUser(JSON.parse(perfilGuardado));
      } catch {
        // perfil corrupto, dejamos user en null para que vuelva a onboarding
      }
    }
    setCargando(false);
  }, []);

  function reiniciarPerfil() {
    localStorage.removeItem("agentsync_perfil");
    localStorage.removeItem("agentsync_id_usuario");
    setUser(null);
  }

  if (cargando) return null; // evita el flash del onboarding mientras lee localStorage

  if (!user) {
    return <Onboarding onComplete={setUser} />;
  }

  return (
    <div className="min-h-screen bg-base-bg">
      {tab === "home" && <Dashboard user={user} onIrARegistro={() => setTab("registro")} />}
      {tab === "registro" && <RegistrarDia onVolver={() => setTab("home")} />}
      {tab === "chat" && <Chat />}
      {tab === "foto" && <FotoComida />}
      {tab === "progress" && <Progress />}
      {tab === "profile" && <Profile user={user} onReset={reiniciarPerfil} />}
      {tab !== "registro" && <BottomNav active={tab} onChange={setTab} />}
    </div>
  );
}

function Profile({ user, onReset }) {
  const fields = [
    { label: "Nombre", value: user.nombre },
    { label: "Género", value: user.genero },
    { label: "Edad", value: user.edad },
    { label: "Peso", value: user.peso ? `${user.peso} kg` : "No especificado" },
    { label: "Altura", value: user.altura ? `${user.altura} cm` : "No especificado" },
    { label: "Nivel de actividad", value: user.rutina },
    { label: "Dieta", value: user.dieta },
    { label: "Alergias", value: user.alergias || "Ninguna registrada" },
    { label: "Objetivo", value: user.objetivo },
    { label: "Meta de sueño", value: `${user.horas_sueno_objetivo} h/noche` },
    { label: "Meta de ejercicio", value: `${user.intensidad} min/día` },
  ];
  return (
    <div className="px-6 pt-14 pb-28 max-w-md mx-auto">
      <p className="text-ink-secondary text-sm font-medium">Tu cuenta</p>
      <h1 className="font-display text-3xl font-semibold mt-1 mb-8">{user.nombre}</h1>
      <div className="bg-base-surface border border-base-border rounded-2xl divide-y divide-base-border">
        {fields.map((f) => (
          <div key={f.label} className="flex justify-between px-4 py-3.5 text-sm">
            <span className="text-ink-secondary">{f.label}</span>
            <span className="text-ink-primary font-medium">{f.value}</span>
          </div>
        ))}
      </div>
      <button
        onClick={onReset}
        className="w-full mt-6 border border-base-border text-ink-secondary rounded-2xl py-3.5 text-sm font-medium"
      >
        Reiniciar perfil
      </button>
    </div>
  );
}
