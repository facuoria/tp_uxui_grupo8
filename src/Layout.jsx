// src/Layout.jsx
import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

export default function Layout() {
  const navigate = useNavigate();

  function handleSignOut() {
    // Demo: si guardaste algo de "sesión", podés limpiarlo acá
    // localStorage.removeItem("userEmail");
    navigate("/"); // volver a la pantalla de inicio (Auth)
  }

  return (
    <>
      {/* Enlace de salto para accesibilidad */}
      <a href="#main" className="skip-link">Saltar al contenido</a>

      {/* NAVBAR */}
      <nav className="navbar navbar-expand-lg bg-body border-bottom sticky-top">
        <div className="container">
          <NavLink to="/app" className="navbar-brand d-flex align-items-center gap-2">
            <span role="img" aria-label="app icon">📱</span>
            <span className="fw-semibold">Gastos de Transporte</span>
          </NavLink>

          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#appNav"
            aria-controls="appNav"
            aria-expanded="false"
            aria-label="Mostrar navegación"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className="collapse navbar-collapse" id="appNav">
            {/* LINKS IZQUIERDA */}
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              {/* Se quitó “Registro” porque ya estás autenticado en esta vista */}
              <li className="nav-item">
                {/* Podés mantener “Ayuda” como ancla o como página aparte si lo preferís */}
                <a className="nav-link" href="#help">Ayuda</a>
              </li>
            </ul>

            {/* ACCIONES DERECHA */}
            <div className="d-flex">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={handleSignOut}
                aria-label="Cerrar sesión y volver al inicio"
              >
                <i className="bi bi-box-arrow-right me-1"></i>
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* CONTENIDO */}
      <main id="main" className="container py-4">
        <Outlet />
      </main>
    </>
  );
}
