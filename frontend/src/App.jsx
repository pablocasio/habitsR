import { useState, useEffect } from "react";
import Onboarding from "./pages/Onboarding";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Chat from "./pages/Chat";
import Progress from "./pages/Progress";
import FotoComida from "./pages/FotoComida";
import RegistrarDia from "./pages/RegistrarDia";
import EditarPerfil from "./pages/EditarPerfil";
import BottomNav from "./components/BottomNav";

const API_URL = "http://localhost:8000";

export default function App() {
  const [user, setUser] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [pantallaAuth, setPantallaAuth] = useState("login"); // "login" | "registro" — solo importa si no hay sesión
  const [tab, setTab] = useState("home");

  // Al abrir la app, si ya iniciaste sesión antes en este navegador, no te
  // pide login de nuevo — pero SIEMPRE confirma contra el backend que esa
  // cuenta sigue existiendo (por si se reseteó la base en desarrollo).
  useEffect(() => {
    async function verificarSesion() {
      const idGuardado = localStorage.getItem("agentsync_id_usuario");
      const perfilGuardado = localStorage.getItem("agentsync_perfil");

      if (!idGuardado || !perfilGuardado) {
        setCargando(false);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/api/usuarios/${idGuardado}/perfil`);
        const data = await res.json();
        if (data.existe) {
          setUser(data.perfil);
        } else {
          localStorage.removeItem("agentsync_id_usuario");
          localStorage.removeItem("agentsync_perfil");
        }
      } catch {
        setUser(JSON.parse(perfilGuardado));
      }

      setCargando(false);
    }

    verificarSesion();
  }, []);

  function cerrarSesion() {
    localStorage.removeItem("agentsync_id_usuario");
    localStorage.removeItem("agentsync_perfil");
    setUser(null);
    setPantallaAuth("login");
  }

  function actualizarPerfil(perfilNuevo) {
    setUser(perfilNuevo);
    setTab("profile");
  }

  if (cargando) return null;

  if (!user) {
    if (pantallaAuth === "registro") {
      return <Onboarding onComplete={setUser} onIrALogin={() => setPantallaAuth("login")} />;
    }
    return <Login onSuccess={setUser} onIrARegistro={() => setPantallaAuth("registro")} />;
  }

  return (
    <div className="min-h-screen bg-base-bg">
      {tab === "home" && <Dashboard user={user} onIrARegistro={() => setTab("registro")} />}
      {tab === "registro" && <RegistrarDia onVolver={() => setTab("home")} />}
      {tab === "chat" && <Chat />}
      {tab === "foto" && <FotoComida />}
      {tab === "progress" && <Progress />}
      {tab === "profile" && (
        <Profile user={user} onLogout={cerrarSesion} onEditar={() => setTab("editar-perfil")} />
      )}
      {tab === "editar-perfil" && (
        <EditarPerfil user={user} onGuardado={actualizarPerfil} onCancelar={() => setTab("profile")} />
      )}
      {tab !== "registro" && tab !== "editar-perfil" && <BottomNav active={tab} onChange={setTab} />}
    </div>
  );
}

function Profile({ user, onLogout, onEditar }) {
  const fields = [
    { label: "Usuario", value: user.username },
    { label: "Nombre", value: user.nombre },
    { label: "Género", value: user.genero },
    { label: "Edad", value: user.edad },
    { label: "Peso", value: user.peso ? `${user.peso} kg` : "No especificado" },
    { label: "Altura", value: user.altura ? `${user.altura} cm` : "No especificado" },
    { label: "Nivel de actividad", value: user.rutina },
    { label: "Tipo de ejercicio", value: user.tipo_ejercicio || "No especificado" },
    { label: "Horario preferido", value: user.horario_ejercicio || "No especificado" },
    { label: "Experiencia", value: user.experiencia_ejercicio || "No especificada" },
    { label: "Dieta", value: user.dieta },
    { label: "Alergias", value: user.alergias || "Ninguna registrada" },
    { label: "Comidas por día (meta)", value: user.comidas_por_dia },
    { label: "Objetivo", value: user.objetivo },
    { label: "Meta de sueño", value: `${user.horas_sueno_objetivo} h/noche` },
  ];
  return (
    <div className="px-6 pt-14 pb-28 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-ink-secondary text-sm font-medium">Tu cuenta</p>
          <h1 className="font-display text-3xl font-semibold mt-1">{user.nombre}</h1>
        </div>
        <button
          onClick={onEditar}
          className="bg-ring-exercise text-base-bg text-xs font-semibold rounded-full px-4 py-2.5 shrink-0"
        >
          Editar
        </button>
      </div>
      <div className="bg-base-surface border border-base-border rounded-2xl divide-y divide-base-border">
        {fields.map((f) => (
          <div key={f.label} className="flex justify-between px-4 py-3.5 text-sm">
            <span className="text-ink-secondary">{f.label}</span>
            <span className="text-ink-primary font-medium">{f.value}</span>
          </div>
        ))}
      </div>
      <button
        onClick={onLogout}
        className="w-full mt-6 border border-base-border text-ink-secondary rounded-2xl py-3.5 text-sm font-medium"
      >
        Cerrar sesión
      </button>
    </div>
  );
}
