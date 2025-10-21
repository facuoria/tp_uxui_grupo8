import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function Auth() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [mode, setMode] = useState("login"); // 'login' | 'register'
  const [showPwd, setShowPwd] = useState(false);

  const [form, setForm] = useState({
    email: "",
    password: "",
    password2: "",
    name: "",
  });

  const onSubmit = (e) => {
    e.preventDefault();
    // Demo: no valida credenciales. Redirige a /app
    navigate("/app");
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-md-7 col-lg-6 col-xl-5">
          <div className="text-center mb-3">
            <h1 className="display-6 fw-semibold">{t("auth.title")}</h1>
            <p className="lead text-body-secondary mb-0">{t("auth.subtitle")}</p>
          </div>

          {/* Pestañas */}
          <div className="d-flex justify-content-center gap-2 mb-3">
            <button
              type="button"
              className={`btn ${mode === "login" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setMode("login")}
            >
              {t("auth.login")}
            </button>
            <button
              type="button"
              className={`btn ${mode === "register" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setMode("register")}
            >
              {t("auth.register")}
            </button>
          </div>

          {/* Card */}
          <div className="card shadow-sm">
            <div className="card-body">
              <form onSubmit={onSubmit}>
                <div className="mb-3">
                  <label htmlFor="email" className="form-label">{t("auth.email")}</label>
                  <input
                    id="email"
                    type="email"
                    className="form-control"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="Correo electrónico"  
                    required
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="password" className="form-label">{t("auth.password")}</label>
                  <div className="input-group">
                    <input
                      id="password"
                      type={showPwd ? "text" : "password"}
                      className="form-control"
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      placeholder="Contraseña"
                      minLength={3}
                      required
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowPwd((v) => !v)}
                      aria-label={showPwd ? t("auth.hide") : t("auth.show")}
                      title={showPwd ? t("auth.hide") : t("auth.show")}
                    >
                      <i className={`bi ${showPwd ? "bi-eye-slash" : "bi-eye"}`}></i>
                    </button>
                  </div>
                  <div className="form-text">{t("auth.hint")}</div>
                </div>

                {mode === "register" && (
                  <>
                    <div className="mb-3">
                      <label htmlFor="password2" className="form-label">{t("auth.repeatPwd")}</label>
                      <input
                        id="password2"
                        type={showPwd ? "text" : "password"}
                        className="form-control"
                        value={form.password2}
                        onChange={(e) => setForm((f) => ({ ...f, password2: e.target.value }))}
                        placeholder="Contraseña"
                        minLength={3}
                        required
                      />
                    </div>

                    <div className="mb-3">
                      <label htmlFor="name" className="form-label">{t("auth.nameOpt")}</label>
                      <input
                        id="name"
                        className="form-control"
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder={t("auth.namePh")}
                      />
                    </div>
                  </>
                )}

                <div className="d-grid">
                  <button type="submit" className="btn btn-primary btn-lg">
                    {mode === "login" ? t("auth.login") : t("auth.create")}
                  </button>
                </div>

                <p className="text-center text-body-secondary mt-3 mb-0">
                  {t("auth.demoNote")}
                </p>
              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
