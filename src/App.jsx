import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation, Trans } from "react-i18next";
import i18n from "./i18n";

/* ========= Modelo y helpers ========= */
const MEDIOS = ["Colectivo","Taxi","Remis","App (Uber/Cabify)","Subte","Tren","Bici Publica","Monopatín","Caminando"];

const initialData = [
  { id: 1, medio: "Colectivo", anotaciones: "Línea 60 – boleto común", zona: "Centro", tiempoDemora: 25, gasto: 150.0, calificacion: 3, creadoEl: new Date("2024-03-02T10:15:00") },
  { id: 2, medio: "App (Uber/Cabify)", anotaciones: "Tarifa dinámica baja", zona: "Cerro", tiempoDemora: 18, gasto: 2200.5, calificacion: 5, creadoEl: new Date("2024-04-21T08:00:00") },
  { id: 3, medio: "Taxi", anotaciones: "Tramo corto", zona: "Nueva Córdoba", tiempoDemora: 10, gasto: 1100, calificacion: 4, creadoEl: new Date("2024-05-11T19:30:00") },
];

let NEXT_ID = initialData.length + 1;
const LS_KEY = "transport-expenses/v2";

/** Normaliza texto (minúsculas + sin tildes) */
const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Debounce simple */
function useDebounced(value, delay = 250) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return v;
}

/* ========= UI utilitaria ========= */
function Toast({ toast, onClose }) {
  useEffect(() => { if (!toast) return; const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [toast, onClose]);
  if (!toast) return null;
  return (
    <div role="status" aria-live="polite"
      className={`position-fixed top-0 end-0 m-3 alert ${toast.type === "ok" ? "alert-success" : "alert-danger"} shadow`}
      onClick={onClose} style={{ zIndex: 1056, cursor: "pointer" }}>
      {toast.msg}
    </div>
  );
}

function ConfirmDialog({ show, title, message, confirmText = "Confirmar", cancelText = "Cancelar", onConfirm, onCancel }) {
  if (!show) return null;
  return (
    <>
      <div className="modal-backdrop fade show"></div>
      <div className="modal d-block" role="dialog" aria-modal="true" aria-labelledby="confirmTitle" onClick={onCancel}>
        <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 id="confirmTitle" className="modal-title">{title}</h5>
              <button className="btn-close" aria-label="Cerrar" onClick={onCancel} />
            </div>
            <div className="modal-body"><p className="mb-0">{message}</p></div>
            <div className="modal-footer">
              <button className="btn btn-outline-secondary" onClick={onCancel}>{cancelText}</button>
              <button className="btn btn-danger" onClick={onConfirm}>{confirmText}</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ========= Componente principal ========= */
export default function App() {
  const { t } = useTranslation();

  /* Estado y persistencia */
  const [items, setItems] = useState(() => {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) {
      try { const arr = JSON.parse(stored); return arr.map((it) => ({ ...it, creadoEl: new Date(it.creadoEl ?? new Date()) })); }
      catch {}
    }
    return initialData;
  });

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(items.map((it) => ({ ...it, creadoEl: new Date(it.creadoEl).toISOString() }))));
  }, [items]);

  /* Formulario */
  const [form, setForm] = useState({ id: null, medio: MEDIOS[0], anotaciones: "", zona: "", tiempoDemora: 0, gasto: 0, calificacion: 3 });
  const [editingId, setEditingId] = useState(null);

  const errors = {
    gasto: form.gasto <= 0 ? t("toasts.gastoInvalid") : "",
    calificacion: form.calificacion < 1 || form.calificacion > 5 ? t("toasts.califInvalid") : "",
  };

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.medio) return setToast({ type: "err", msg: t("toasts.needTransport") });
    if (errors.gasto) return setToast({ type: "err", msg: errors.gasto });
    if (errors.calificacion) return setToast({ type: "err", msg: errors.calificacion });

    if (editingId == null) {
      const nuevo = { ...form, id: NEXT_ID++, creadoEl: new Date() };
      setItems((prev) => [nuevo, ...prev]);
      setToast({ type: "ok", msg: t("toasts.saved") });
    } else {
      setItems((prev) => prev.map((it) => (it.id === editingId ? { ...it, ...form } : it)));
      setToast({ type: "ok", msg: t("toasts.updated") });
    }
    resetForm(); setShowForm(false);
  }

  function resetForm() { setForm({ id: null, medio: MEDIOS[0], anotaciones: "", zona: "", tiempoDemora: 0, gasto: 0, calificacion: 3 }); setEditingId(null); }

  function handleEdit(id) {
    const it = items.find((x) => x.id === id); if (!it) return;
    setEditingId(id);
    setForm({ id: it.id, medio: it.medio, anotaciones: it.anotaciones, zona: it.zona, tiempoDemora: it.tiempoDemora, gasto: it.gasto, calificacion: it.calificacion });
    setShowForm(true);
  }

  /* Búsqueda, orden, paginación */
  const [qInput, setQInput] = useState("");
  const q = useDebounced(qInput, 250);
  const [orderBy, setOrderBy] = useState("creadoEl");
  const [orderDir, setOrderDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const filtered = useMemo(() => {
    const text = norm(q.trim());
    let out = items.filter((it) => [it.medio, it.anotaciones, it.zona].some((v) => norm(v).includes(text)));
    out.sort((a, b) => { const va = a[orderBy], vb = b[orderBy]; if (va < vb) return orderDir === "asc" ? -1 : 1; if (va > vb) return orderDir === "asc" ? 1 : -1; return 0; });
    return out;
  }, [items, q, orderBy, orderDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const paginated = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, page, rowsPerPage]);

  /* UI: toasts, confirmaciones, ayuda */
  const [toast, setToast] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [confirm, setConfirm] = useState({ open: false, id: null });

  function askDelete(id) { setConfirm({ open: true, id }); }
  function confirmDelete() { if (confirm.id != null) { setItems((prev) => prev.filter((x) => x.id !== confirm.id)); setToast({ type: "ok", msg: t("toasts.deleted") }); } setConfirm({ open: false, id: null }); }

  // Navbar #help → abrir modal ayuda + limpiar hash al cerrar
  useEffect(() => {
    function onHash() { if (window.location.hash === "#help") setShowHelp(true); }
    window.addEventListener("hashchange", onHash); onHash();
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  function closeHelp() { setShowHelp(false); if (window.location.hash === "#help") history.replaceState(null, "", " "); }

  // Atajos de teclado: "/" enfoca búsqueda, "n" abre form (desktop)
  const searchRef = useRef(null);
  useEffect(() => {
    function onKey(e) {
      const tag = document.activeElement?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || document.activeElement?.isContentEditable;
      if (e.key === "/" && !typing) { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key.toLowerCase() === "n" && !typing) { setShowForm(true); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Paginador
  const startIndex = (page - 1) * rowsPerPage + 1;
  const endIndex = Math.min(startIndex + rowsPerPage - 1, filtered.length);
  const sortState = (key) => (orderBy === key ? (orderDir === "asc" ? "ascending" : "descending") : "none");

  // Helpers de formato según idioma activo
  const fmtCurrency = (n) => new Intl.NumberFormat(i18n.language, { style: "currency", currency: "ARS" }).format(Number(n || 0));
  const fmtDate = (d) => new Date(d).toLocaleDateString(i18n.language);

  return (
    <>
      {/* HERO */}
      <section className="hero text-center mb-3">
        <div className="row justify-content-center">
          <div className="col-12 col-lg-8 col-xl-6">
            <h1 className="display-6 fw-semibold mb-1">{t("hero.title")}</h1>
            <p className="lead text-body-secondary mb-3">{t("hero.subtitle")}</p>

            <div className="d-flex justify-content-center">
              <button className="btn btn-primary btn-lg" onClick={() => setShowForm((v) => !v)}>
                <i className="bi bi-plus-lg me-1"></i>
                {showForm ? t("hero.closeForm") : t("hero.new")}
              </button>
            </div>
          </div>
        </div>
      </section>

      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* CONTROLES */}
      <section className="mb-3">
        <div className="row g-2 align-items-end">
          <div className="col-12 col-lg-6">
            <div className="row g-2">
              <div className="col-6">
                <label htmlFor="orderBy" className="form-label mb-1">{t("controls.orderBy")}</label>
                <select id="orderBy" value={orderBy} onChange={(e) => setOrderBy(e.target.value)} className="form-select">
                  <option value="creadoEl">{t("table.fecha")}</option>
                  <option value="gasto">{t("table.gasto")}</option>
                  <option value="tiempoDemora">{t("table.demora")}</option>
                  <option value="calificacion">{t("table.calif")}</option>
                  <option value="medio">{t("table.medio")}</option>
                  <option value="zona">{t("table.zona")}</option>
                </select>
              </div>
              <div className="col-6">
                <label htmlFor="orderDir" className="form-label mb-1">{t("controls.direction")}</label>
                <select id="orderDir" value={orderDir} onChange={(e) => setOrderDir(e.target.value)} className="form-select">
                  <option value="asc">{t("controls.asc")}</option>
                  <option value="desc">{t("controls.desc")}</option>
                </select>
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-6">
            <label htmlFor="search" className="form-label mb-1">{t("controls.searchLabel")}</label>
            <div className="input-group">
              <span className="input-group-text"><i className="bi bi-search"></i></span>
              <input
                id="search"
                ref={searchRef}
                value={qInput}
                onChange={(e) => { setQInput(e.target.value); setPage(1); }}
                placeholder={t("controls.searchPh")}
                className="form-control search-soft"
              />
              {qInput && (
                <button className="btn btn-outline-secondary" onClick={() => setQInput("")} title={t("mobileBar.close")}>
                  <i className="bi bi-x-lg"></i>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FORM */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card shadow-sm mb-3">
          <div className="card-body">
            <fieldset className="row g-3">
              <div className="col-12 col-md-3">
                <label htmlFor="medio" className="form-label">{t("fields.medio")}</label>
                <select id="medio" value={form.medio} onChange={(e) => setForm((f) => ({ ...f, medio: e.target.value }))} className="form-select" required>
                  {MEDIOS.map((m) => (<option key={m} value={m}>{m}</option>))}
                </select>
              </div>
              <div className="col-12 col-md-5">
                <label htmlFor="anotaciones" className="form-label">{t("fields.anotaciones")}</label>
                <input id="anotaciones" value={form.anotaciones} onChange={(e) => setForm((f) => ({ ...f, anotaciones: e.target.value }))} placeholder="Ej.: Tarifa dinámica baja" className="form-control" />
              </div>
              <div className="col-12 col-md-4">
                <label htmlFor="zona" className="form-label">{t("fields.zona")}</label>
                <input id="zona" value={form.zona} onChange={(e) => setForm((f) => ({ ...f, zona: e.target.value }))} placeholder="Ej.: Centro" className="form-control" />
              </div>
              <div className="col-6 col-md-3">
                <label htmlFor="tiempoDemora" className="form-label">{t("fields.demora")}</label>
                <input id="tiempoDemora" type="number" min={0} inputMode="numeric" value={form.tiempoDemora} onChange={(e) => setForm((f) => ({ ...f, tiempoDemora: Number(e.target.value) }))} className="form-control" />
              </div>
              <div className="col-6 col-md-3">
                <label htmlFor="gasto" className="form-label">{t("fields.gasto")}</label>
                <input
                  id="gasto" type="number" step="0.01" min={0} inputMode="decimal"
                  value={form.gasto} onChange={(e) => setForm((f) => ({ ...f, gasto: Number(e.target.value) }))}
                  className={`form-control ${errors.gasto ? "is-invalid" : form.gasto > 0 ? "is-valid" : ""}`}
                  required aria-describedby="gastoHelp"
                />
                <div id="gastoHelp" className={`form-text ${errors.gasto ? "text-danger" : ""}`}>
                  {errors.gasto || t("form.gastoHelp")}
                </div>
              </div>
              <div className="col-12 col-md-3">
                <label htmlFor="calificacion" className="form-label">{t("fields.calif")}</label>
                <input
                  id="calificacion" type="number" min={1} max={5} value={form.calificacion}
                  onChange={(e) => setForm((f) => ({ ...f, calificacion: Number(e.target.value) }))}
                  className={`form-control ${errors.calificacion ? "is-invalid" : form.calificacion ? "is-valid" : ""}`}
                />
                <div className={`form-text ${errors.calificacion ? "text-danger" : ""}`}>
                  {errors.calificacion || "⭐".repeat(Math.max(1, Math.min(5, Number(form.calificacion) || 1)))}
                </div>
              </div>
            </fieldset>

            <div className="mt-3 d-flex gap-2">
              <button type="submit" className="btn btn-success"><i className="bi bi-check2 me-1"></i>{editingId == null ? t("form.save") : t("form.update")}</button>
              <button type="button" className="btn btn-outline-secondary" onClick={resetForm}>{t("form.clear")}</button>
            </div>
            <small className="text-body-secondary d-block mt-2">
              <Trans i18nKey="form.savedNote" components={{ b: <b /> }} />
            </small>
          </div>
        </form>
      )}

      {/* TABLA (sin ID) */}
      <div className="card shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th scope="col" aria-sort={sortState("medio")}>{t("table.medio")}</th>
                  <th scope="col" aria-sort={sortState("anotaciones")}>{t("table.anotaciones")}</th>
                  <th scope="col" aria-sort={sortState("zona")}>{t("table.zona")}</th>
                  <th scope="col" aria-sort={sortState("tiempoDemora")}>{t("table.demora")}</th>
                  <th scope="col" aria-sort={sortState("gasto")}>{t("table.gasto")}</th>
                  <th scope="col" aria-sort={sortState("calificacion")}>{t("table.calif")}</th>
                  <th scope="col" aria-sort={sortState("creadoEl")}>{t("table.fecha")}</th>
                  <th scope="col" className="text-nowrap">{t("table.acciones")}</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((it) => (
                  <tr key={it.id}>
                    <td>{it.medio}</td>
                    <td title={it.anotaciones}>
                      {String(it.anotaciones || "").slice(0, 40)}
                      {String(it.anotaciones || "").length > 40 ? "…" : ""}
                    </td>
                    <td>{it.zona}</td>
                    <td>{it.tiempoDemora} min</td>
                    <td>{fmtCurrency(it.gasto)}</td>
                    <td>{it.calificacion}/5</td>
                    <td>{fmtDate(it.creadoEl)}</td>
                    <td className="text-nowrap">
                      <button className="btn btn-sm btn-outline-primary me-1" onClick={() => handleEdit(it.id)} aria-label={t("actions.edit")}>
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => askDelete(it.id)} aria-label={t("actions.del")}>
                        <i className="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center text-body-secondary py-4">
                      {t("table.empty1", { q: qInput })}{" "}
                      <button className="btn btn-sm btn-primary ms-1" onClick={() => setShowForm(true)}>
                        {t("table.empty2")}
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* PIE */}
      <div className="row align-items-center mt-3 g-2">
        <div className="col-12 col-md-4 d-none d-md-block"></div>
        <div className="col-12 col-md-4">
          <div className="d-flex justify-content-center align-items-center gap-3 flex-wrap">
            <button className="btn btn-outline-secondary" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              {t("actions.prev")}
            </button>
            <div className="text-body-secondary">
              {t("pagination.page", { page, total: totalPages, from: filtered.length === 0 ? 0 : startIndex, to: filtered.length === 0 ? 0 : endIndex, count: filtered.length })}
            </div>
            <button className="btn btn-outline-secondary" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              {t("actions.next")}
            </button>
          </div>
        </div>
        <div className="col-12 col-md-4 d-flex align-items-center justify-content-md-end justify-content-center gap-2">
          <label htmlFor="rpp" className="form-label mb-0">{t("pagination.rows")}</label>
          <select id="rpp" value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(1); }} className="form-select" style={{ maxWidth: 96 }}>
            <option value={3}>3</option><option value={5}>5</option><option value={10}>10</option>
          </select>
        </div>
      </div>

      {/* Barra inferior móvil */}
      <div className="app-bottom-bar d-sm-none">
        <button className="btn btn-primary flex-fill" onClick={() => setShowForm((v) => !v)}>
          <i className="bi bi-plus-lg me-1"></i>{showForm ? t("mobileBar.close") : t("hero.new")}
        </button>
        <button className="btn btn-outline-secondary btn-icon-sm" onClick={() => searchRef.current?.focus()} aria-label={t("mobileBar.search")} title={t("mobileBar.search")}>
          <i className="bi bi-search"></i>
        </button>
      </div>

      {/* Ayuda */}
      {showHelp && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal d-block" role="dialog" aria-modal="true" aria-labelledby="helpTitle" onClick={closeHelp}>
            <div className="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
              <div className="modal-content">
                <div className="modal-header">
                  <h5 id="helpTitle" className="modal-title">{t("help.title")}</h5>
                  <button className="btn-close" aria-label="Cerrar" onClick={closeHelp} />
                </div>
                <div className="modal-body">
                  <ul className="mb-0">
                    <li><b>{t("help.items.cta")}</b></li>
                    <li>{t("help.items.search")}</li>
                    <li>{t("help.items.a11y")}</li>
                    <li>{t("help.items.delete")}</li>
                    <li>{t("help.items.shortcuts")}</li>
                  </ul>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-primary" onClick={closeHelp}>{t("help.cta")}</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        show={confirm.open}
        title={t("actions.del")}
        message={t("actions.del")}
        confirmText={t("actions.del")}
        cancelText={t("form.clear")}
        onConfirm={confirmDelete}
        onCancel={() => setConfirm({ open: false, id: null })}
      />
    </>
  );
}
