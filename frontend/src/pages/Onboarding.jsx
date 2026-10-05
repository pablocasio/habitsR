import { useState } from "react";

const API_URL = "http://localhost:8000";

export default function Onboarding({ onComplete, onIrALogin }) {
  const [nombre, setNombre] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  const puedeContinuar = nombre.trim().length > 0 && username.trim().length >= 3 && password.length >= 4;

  async function crearCuenta() {
    setGuardando(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/auth/registro`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim().toLowerCase(),
          password,
          nombre: nombre.trim(),
        }),
      });
      const resultado = await res.json();

      if (!resultado.ok) {
        setError(resultado.error || "No se pudo crear la cuenta");
        return;
      }

      localStorage.setItem("agentsync_id_usuario", resultado.id_usuario);
      localStorage.setItem("agentsync_perfil", JSON.stringify(resultado.perfil));
      onComplete(resultado.perfil);
    } catch {
      setError("No pude conectarme al backend. ¿Está corriendo uvicorn en localhost:8000?");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="min-h-screen max-w-md mx-auto px-6 flex flex-col justify-center">
      <div className="text-center mb-10">
        <h1 className="font-display text-3xl font-semibold">Creá tu cuenta</h1>
        <p className="text-ink-secondary text-sm mt-2">
          Después completás tu perfil (peso, dieta, objetivo) desde la pestaña Perfil
        </p>
      </div>

      <div className="space-y-4">
        <input
          autoFocus
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Tu nombre"
          className="w-full bg-base-surface border border-base-border rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-ring-exercise"
        />
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Nombre de usuario"
          className="w-full bg-base-surface border border-base-border rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-ring-exercise"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && puedeContinuar && crearCuenta()}
          placeholder="Contraseña (mínimo 4 caracteres)"
          className="w-full bg-base-surface border border-base-border rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-ring-exercise"
        />
      </div>

      {error && <p className="text-ring-food text-sm text-center mt-4">{error}</p>}

      <button
        onClick={crearCuenta}
        disabled={!puedeContinuar || guardando}
        className="w-full bg-ring-exercise text-base-bg font-display font-semibold text-lg rounded-2xl py-4 mt-6 disabled:opacity-30"
      >
        {guardando ? "Creando cuenta..." : "Crear mi cuenta"}
      </button>

      {onIrALogin && (
        <button onClick={onIrALogin} className="text-ink-muted text-sm text-center mt-5">
          Ya tengo cuenta — iniciar sesión
        </button>
      )}
    </div>
  );
}
