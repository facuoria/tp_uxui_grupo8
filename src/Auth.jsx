import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Auth() {
  const [tab, setTab] = useState("login"); // 'login' | 'register'
  const [email, setEmail] = useState(localStorage.getItem("lastEmail") || "");
  const [password, setPassword] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [toast, setToast] = useState(null);

  const emailRef = useRef(null);
  const navigate = useNavigate();

  // Habilitación del botón según tab (sin verificar coincidencia)
  const canSubmit =
    tab === "login"
      ? password.length >= 3
      : password.length >= 3 && confirmPwd.length >= 3;

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  function onSubmit(e) {
    e.preventDefault();

    // Guardas de UX (por si alguien forcea el submit):
    if (tab === "register" && (password.length < 3 || confirmPwd.length < 3)) {
      return setToast({ type: "err", msg: "Completá ambas contraseñas (3+ caracteres)." });
    }
    if (tab === "login" && password.length < 3) {
      return setToast({ type: "err", msg: "Usá 3+ caracteres por ahora (demo)." });
    }

    // Validación mínima del email (demo)
    if (!email.includes("@")) {
      return setToast({ type: "err", msg: "Ingresá un email válido." });
    }

    // Demo: no verificamos coincidencia de contraseñas
    localStorage.setItem("lastEmail", email);
    setToast({ type: "ok", msg: tab === "login" ? "Sesión iniciada" : "Cuenta creada" });
    setTimeout(() => navigate("/app"), 400);
  }

  return (
    <main className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-lg-8 col-xl-6">
          <header className="text-center mb-4">
            <h1 className="display-6 fw-semibold">Gastos de Transporte</h1>
            <p className="text-body-secondary m-0">Iniciá sesión o creá tu cuenta</p>
          </header>

          {/* Tabs */}
          <div className="d-flex justify-content-center mb-3 gap-2">
            <button
              className={`btn ${tab === "login" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setTab("login")}
            >
              Iniciar sesión
            </button>
            <button
              className={`btn ${tab === "register" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setTab("register")}
            >
              Crear cuenta
            </button>
          </div>

          {/* Card */}
          <section className="card shadow-sm">
            <div className="card-body p-4">
              <form onSubmit={onSubmit} noValidate>
                <div className="mb-3">
                  <label htmlFor="email" className="form-label">Email</label>
                  <input
                    ref={emailRef}
                    id="email"
                    type="email"
                    className="form-control form-control-lg"
                    placeholder="tu@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="password" className="form-label">Contraseña</label>
                  <div className="input-group input-group-lg">
                    <input
                      id="password"
                      type={showPwd ? "text" : "password"}
                      className="form-control"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={tab === "login" ? "current-password" : "new-password"}
                      required
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      aria-pressed={showPwd}
                      onClick={() => setShowPwd((v) => !v)}
                      title={showPwd ? "Ocultar" : "Mostrar"}
                    >
                      <i className={`bi ${showPwd ? "bi-eye-slash" : "bi-eye"}`}></i>
                    </button>
                  </div>
                  <div className="form-text">
                    {tab === "register"
                      ? "Usá 3+ caracteres por ahora (demo)."
                      : "Luego agregaremos recuperación."}
                  </div>
                </div>

                {/* Repetir contraseña (solo interfaz, sin verificación real) */}
                {tab === "register" && (
                  <div className="mb-4">
                    <label htmlFor="confirmPwd" className="form-label">Repetir contraseña</label>
                    <div className="input-group input-group-lg">
                      <input
                        id="confirmPwd"
                        type={showConfirmPwd ? "text" : "password"}
                        className="form-control"
                        value={confirmPwd}
                        onChange={(e) => setConfirmPwd(e.target.value)}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        aria-pressed={showConfirmPwd}
                        onClick={() => setShowConfirmPwd((v) => !v)}
                        title={showConfirmPwd ? "Ocultar" : "Mostrar"}
                      >
                        <i className={`bi ${showConfirmPwd ? "bi-eye-slash" : "bi-eye"}`}></i>
                      </button>
                    </div>
                    <div className="form-text">
                      Demo: no verificamos que coincida; podés escribir cualquier cosa.
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary btn-lg w-100"
                  disabled={!canSubmit}
                  aria-disabled={!canSubmit}
                  title={!canSubmit ? "Completá la contraseña (y repetir) con 3+ caracteres" : undefined}
                >
                  {tab === "login" ? "Iniciar sesión" : "Crear cuenta"}
                </button>

                <p className="text-center text-body-secondary mt-3 mb-0" style={{ fontSize: ".9rem" }}>
                  Demo: esta pantalla solo simula autenticación y te redirige a la app.
                </p>
              </form>
            </div>
          </section>
        </div>
      </div>

      {/* Toast accesible */}
      {toast && (
        <div
          className={`alert ${toast.type === "ok" ? "alert-success" : "alert-danger"} position-fixed top-0 end-0 m-3 shadow`}
          role="status"
          aria-live="polite"
          onClick={() => setToast(null)}
          style={{ zIndex: 1056, cursor: "pointer" }}
        >
          {toast.msg}
        </div>
      )}
    </main>
  );
}
