import { useState } from "react";

const API_URL = "http://localhost:8000";

export default function Login({ onSuccess, onIrARegistro }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  async function iniciarSesion() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim().toLowerCase(), password }),
      });
      const data = await res.json();

      if (!data.ok) {
        setError(data.error || "No se pudo iniciar sesión");
        return;
      }

      localStorage.setItem("agentsync_id_usuario", data.id_usuario);
      localStorage.setItem("agentsync_perfil", JSON.stringify(data.perfil));
      onSuccess(data.perfil);
    } catch {
      setError("No pude conectarme al backend. ¿Está corriendo uvicorn en localhost:8000?");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="min-h-screen max-w-md mx-auto px-6 flex flex-col justify-center">
      <div className="text-center mb-10">
        <h1 className="font-display text-3xl font-semibold">Bienvenido de nuevo</h1>
        <p className="text-ink-secondary text-sm mt-2">Iniciá sesión para ver tu progreso</p>
      </div>

      <div className="space-y-4">
        <input
          autoFocus
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && iniciarSesion()}
          placeholder="Nombre de usuario"
          className="w-full bg-base-surface border border-base-border rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-ring-exercise"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && iniciarSesion()}
          placeholder="Contraseña"
          className="w-full bg-base-surface border border-base-border rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-ring-exercise"
        />
      </div>

      {error && <p className="text-ring-food text-sm text-center mt-4">{error}</p>}

      <button
        onClick={iniciarSesion}
        disabled={cargando || !username || !password}
        className="w-full bg-ring-exercise text-base-bg font-display font-semibold text-lg rounded-2xl py-4 mt-6 disabled:opacity-30"
      >
        {cargando ? "Ingresando..." : "Iniciar sesión"}
      </button>

      <button onClick={onIrARegistro} className="text-ink-muted text-sm text-center mt-5">
        No tengo cuenta — crear una
      </button>
    </div>
  );
}
