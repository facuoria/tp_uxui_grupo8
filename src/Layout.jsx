import React, { useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "./i18n";

function LanguageSwitcher() {
  const { t } = useTranslation();
  const current = i18n.language?.split("-")[0] || "es";

  return (
    <div className="dropdown me-2">
      <button
        className="btn btn-outline-secondary dropdown-toggle"
        data-bs-toggle="dropdown"
        aria-expanded="false"
        aria-label={t("nav.lang")}
      >
        🌐 {t(`nav.${current}`)}
      </button>
      <ul className="dropdown-menu dropdown-menu-end">
        <li>
          <button className="dropdown-item" onClick={() => i18n.changeLanguage("es")}>
            🇪🇸 {t("nav.es")}
          </button>
        </li>
        <li>
          <button className="dropdown-item" onClick={() => i18n.changeLanguage("en")}>
            🇺🇸 {t("nav.en")}
          </button>
        </li>
        <li>
          <button className="dropdown-item" onClick={() => i18n.changeLanguage("pt")}>
            🇧🇷 {t("nav.pt")}
          </button>
        </li>
      </ul>
    </div>
  );
}

export default function Layout() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Mantener <html lang=""> y dir="ltr/rtl" sincronizados
  useEffect(() => {
    const lng = i18n.language || "es";
    document.documentElement.lang = lng;
    document.documentElement.dir = i18n.dir(); // ES/EN/PT son ltr, pero queda listo
  }, []);

  useEffect(() => {
    const unsub = i18n.on("languageChanged", (lng) => {
      document.documentElement.lang = lng;
      document.documentElement.dir = i18n.dir();
    });
    return () => { i18n.off("languageChanged", unsub); };
  }, []);

  function handleSignOut() {
    navigate("/"); // demo: volver al inicio
  }

  return (
    <>
      <a href="#main" className="skip-link">Saltar al contenido</a>

      <nav className="navbar navbar-expand-lg bg-body border-bottom sticky-top">
        <div className="container">
          <NavLink to="/app" className="navbar-brand d-flex align-items-center gap-2">
            <span role="img" aria-label="app icon">📱</span>
            <span className="fw-semibold">{t("nav.brand")}</span>
          </NavLink>

          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#appNav">
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className="collapse navbar-collapse" id="appNav">
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              <li className="nav-item">
                <a className="nav-link" href="#help">{t("nav.help")}</a>
              </li>
            </ul>

            <div className="d-flex align-items-center">
              <LanguageSwitcher />
              <button type="button" className="btn btn-outline-secondary" onClick={handleSignOut}>
                <i className="bi bi-box-arrow-right me-1"></i>
                {t("nav.signOut")}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main id="main" className="container py-4">
        <Outlet />
      </main>
    </>
  );
}
