import React, { useEffect, useMemo, useRef, useState } from "react";

/* ========= Modelo y helpers ========= */
const MEDIOS = [
  "Colectivo","Taxi","Remis","App (Uber/Cabify)","Subte","Tren","Bici Publica","Monopatín","Caminando",
];

const initialData = [
  { id: 1, medio: "Colectivo", anotaciones: "Línea 60 – boleto común", zona: "Centro", tiempoDemora: 25, gasto: 150.0, calificacion: 3, creadoEl: new Date("2024-03-02T10:15:00") },
  { id: 2, medio: "App (Uber/Cabify)", anotaciones: "Tarifa dinámica baja", zona: "Cerro", tiempoDemora: 18, gasto: 2200.5, calificacion: 5, creadoEl: new Date("2024-04-21T08:00:00") },
  { id: 3, medio: "Taxi", anotaciones: "Tramo corto", zona: "Nueva Córdoba", tiempoDemora: 10, gasto: 1100, calificacion: 4, creadoEl: new Date("2024-05-11T19:30:00") },
];

let NEXT_ID = initialData.length + 1;
const LS_KEY = "transport-expenses/v2";

/** Normaliza texto (minúsculas + sin tildes) */
const norm = (s) =>
  String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Debounce simple para inputs */
function useDebounced(value, delay = 250) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/* ========= UI utilitaria ========= */
function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className={`position-fixed top-0 end-0 m-3 alert ${
        toast.type === "ok" ? "alert-success" : "alert-danger"
      } shadow`}
      onClick={onClose}
      style={{ zIndex: 1056, cursor: "pointer" }}
    >
      {toast.msg}
    </div>
  );
}

function ConfirmDialog({
  show,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  onConfirm,
  onCancel,
}) {
  if (!show) return null;
  return (
    <>
      <div className="modal-backdrop fade show"></div>
      <div
        className="modal d-block"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmTitle"
        onClick={onCancel}
      >
        <div
          className="modal-dialog modal-dialog-centered"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-content">
            <div className="modal-header">
              <h5 id="confirmTitle" className="modal-title">
                {title}
              </h5>
              <button className="btn-close" aria-label="Cerrar" onClick={onCancel} />
            </div>
            <div className="modal-body">
              <p className="mb-0">{message}</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline-secondary" onClick={onCancel}>
                {cancelText}
              </button>
              <button className="btn btn-danger" onClick={onConfirm}>
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ========= Componente principal ========= */
export default function App() {
  /* Estado y persistencia */
  const [items, setItems] = useState(() => {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) {
      try {
        const arr = JSON.parse(stored);
        return arr.map((it) => ({
          ...it,
          creadoEl: new Date(it.creadoEl ?? new Date()),
        }));
      } catch {}
    }
    return initialData;
  });

  useEffect(() => {
    localStorage.setItem(
      LS_KEY,
      JSON.stringify(
        items.map((it) => ({
          ...it,
          creadoEl: new Date(it.creadoEl).toISOString(),
        }))
      )
    );
  }, [items]);

  /* Formulario */
  const [form, setForm] = useState({
    id: null,
    medio: MEDIOS[0],
    anotaciones: "",
    zona: "",
    tiempoDemora: 0,
    gasto: 0,
    calificacion: 3,
  });
  const [editingId, setEditingId] = useState(null);

  const errors = {
    gasto: form.gasto <= 0 ? "El gasto debe ser mayor a 0." : "",
    calificacion:
      form.calificacion < 1 || form.calificacion > 5
        ? "Debe estar entre 1 y 5."
        : "",
  };

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.medio) return setToast({ type: "err", msg: "Elegí un medio de transporte." });
    if (errors.gasto) return setToast({ type: "err", msg: errors.gasto });
    if (errors.calificacion) return setToast({ type: "err", msg: errors.calificacion });

    if (editingId == null) {
      const nuevo = { ...form, id: NEXT_ID++, creadoEl: new Date() };
      setItems((prev) => [nuevo, ...prev]);
      setToast({ type: "ok", msg: "Gasto guardado." });
    } else {
      setItems((prev) =>
        prev.map((it) => (it.id === editingId ? { ...it, ...form } : it))
      );
      setToast({ type: "ok", msg: "Gasto actualizado." });
    }
    resetForm();
    setShowForm(false);
  }

  function resetForm() {
    setForm({
      id: null,
      medio: MEDIOS[0],
      anotaciones: "",
      zona: "",
      tiempoDemora: 0,
      gasto: 0,
      calificacion: 3,
    });
    setEditingId(null);
  }

  function handleEdit(id) {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    setEditingId(id);
    setForm({
      id: it.id,
      medio: it.medio,
      anotaciones: it.anotaciones,
      zona: it.zona,
      tiempoDemora: it.tiempoDemora,
      gasto: it.gasto,
      calificacion: it.calificacion,
    });
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
    let out = items.filter((it) =>
      [it.medio, it.anotaciones, it.zona].some((v) => norm(v).includes(text))
    );
    out.sort((a, b) => {
      const va = a[orderBy],
        vb = b[orderBy];
      if (va < vb) return orderDir === "asc" ? -1 : 1;
      if (va > vb) return orderDir === "asc" ? 1 : -1;
      return 0;
    });
    return out;
  }, [items, q, orderBy, orderDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginated = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, page, rowsPerPage]);

  /* UI: toasts, confirmaciones, etc. */
  const [toast, setToast] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [confirm, setConfirm] = useState({ open: false, kind: null, id: null });

  function askDelete(id) {
    setConfirm({ open: true, kind: "one", id });
  }
  function askDeleteAll() {
    setConfirm({ open: true, kind: "all", id: null });
  }
  function confirmDelete() {
    if (confirm.kind === "one" && confirm.id != null) {
      setItems((prev) => prev.filter((x) => x.id !== confirm.id));
      setToast({ type: "ok", msg: "Registro eliminado." });
    }
    if (confirm.kind === "all") {
      setItems([]);
      setToast({ type: "ok", msg: "Todos los registros borrados." });
    }
    setConfirm({ open: false, kind: null, id: null });
  }
  function handleRestart() {
    localStorage.removeItem(LS_KEY);
    NEXT_ID = initialData.length + 1;
    setItems(initialData);
    setToast({ type: "ok", msg: "Datos reiniciados." });
  }

  /* Refs */
  const searchRef = useRef(null);
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  /* Cálculos de paginador */
  const startIndex = (page - 1) * rowsPerPage + 1;
  const endIndex = Math.min(startIndex + rowsPerPage - 1, filtered.length);

  /* ======== RENDER ======== */
  return (
    <>
      {/* HERO — centrado */}
      <section className="hero text-center mb-3">
        <div className="row justify-content-center">
          <div className="col-12 col-lg-8 col-xl-6">
            <h1 className="display-6 fw-semibold mb-1">Gastos de Transporte</h1>
            <p className="lead text-body-secondary mb-3">
              Registra viajes y gastos de forma simple.
            </p>
          </div>
        </div>

        {/* Buscador centrado */}
        <div className="row justify-content-center">
          <div className="col-12 col-lg-8 col-xl-6">
            <label htmlFor="search" className="visually-hidden">
              Buscar
            </label>
            <div className="input-group input-group-lg">
              <span className="input-group-text">
                <i className="bi bi-search"></i>
              </span>
              <input
                id="search"
                ref={searchRef}
                value={qInput}
                onChange={(e) => {
                  setQInput(e.target.value);
                  setPage(1);
                }}
                placeholder="Buscar… (medio, anotaciones, zona)"
                className="form-control"
              />
              {qInput && (
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => setQInput("")}
                  title="Limpiar búsqueda"
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Barra de controles */}
        <div className="row align-items-end control-bar mt-3 g-2">
          <div className="col-12 col-lg-6 d-flex flex-wrap justify-content-center justify-content-lg-start gap-2">
            <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
              <i className="bi bi-plus-lg me-1"></i>
              {showForm ? "Cerrar" : "Nuevo gasto"}
            </button>
            <button className="btn btn-outline-danger" onClick={askDeleteAll}>
              <i className="bi bi-trash me-1"></i> Borrar todo
            </button>
            <button className="btn btn-outline-secondary" onClick={() => setShowHelp(true)}>
              <i className="bi bi-question-circle me-1"></i> Ayuda
            </button>
          </div>

          <div className="col-12 col-lg-6">
            <div className="row g-2">
              <div className="col-6">
                <label htmlFor="orderBy" className="form-label mb-1">
                  Ordenar por
                </label>
                <select
                  id="orderBy"
                  value={orderBy}
                  onChange={(e) => setOrderBy(e.target.value)}
                  className="form-select"
                >
                  <option value="creadoEl">Fecha</option>
                  <option value="gasto">Gasto</option>
                  <option value="tiempoDemora">Demora</option>
                  <option value="calificacion">Calificación</option>
                  <option value="medio">Medio</option>
                  <option value="zona">Zona</option>
                </select>
              </div>
              <div className="col-6">
                <label htmlFor="orderDir" className="form-label mb-1">
                  Dirección
                </label>
                <select
                  id="orderDir"
                  value={orderDir}
                  onChange={(e) => setOrderDir(e.target.value)}
                  className="form-select"
                >
                  <option value="asc">Ascendente</option>
                  <option value="desc">Descendente</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* FORM en tarjeta */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card shadow-sm mb-3">
          <div className="card-body">
            <fieldset className="row g-3">
              <div className="col-12 col-md-3">
                <label htmlFor="medio" className="form-label">
                  Medio
                </label>
                <select
                  id="medio"
                  value={form.medio}
                  onChange={(e) => setForm((f) => ({ ...f, medio: e.target.value }))}
                  className="form-select"
                  required
                >
                  {MEDIOS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-5">
                <label htmlFor="anotaciones" className="form-label">
                  Anotaciones
                </label>
                <input
                  id="anotaciones"
                  value={form.anotaciones}
                  onChange={(e) => setForm((f) => ({ ...f, anotaciones: e.target.value }))}
                  placeholder="Ej.: Tarifa dinámica baja"
                  className="form-control"
                />
              </div>
              <div className="col-12 col-md-4">
                <label htmlFor="zona" className="form-label">
                  Zona
                </label>
                <input
                  id="zona"
                  value={form.zona}
                  onChange={(e) => setForm((f) => ({ ...f, zona: e.target.value }))}
                  placeholder="Ej.: Centro"
                  className="form-control"
                />
              </div>
              <div className="col-6 col-md-3">
                <label htmlFor="tiempoDemora" className="form-label">
                  Demora (min)
                </label>
                <input
                  id="tiempoDemora"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={form.tiempoDemora}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, tiempoDemora: Number(e.target.value) }))
                  }
                  className="form-control"
                />
              </div>
              <div className="col-6 col-md-3">
                <label htmlFor="gasto" className="form-label">
                  Gasto ($)
                </label>
                <input
                  id="gasto"
                  type="number"
                  step="0.01"
                  min={0}
                  inputMode="decimal"
                  value={form.gasto}
                  onChange={(e) => setForm((f) => ({ ...f, gasto: Number(e.target.value) }))}
                  className={`form-control ${
                    errors.gasto ? "is-invalid" : form.gasto > 0 ? "is-valid" : ""
                  }`}
                  required
                  aria-describedby="gastoHelp"
                />
                <div
                  id="gastoHelp"
                  className={`form-text ${errors.gasto ? "text-danger" : ""}`}
                >
                  {errors.gasto || "Ingresá el monto del viaje."}
                </div>
              </div>
              <div className="col-12 col-md-3">
                <label htmlFor="calificacion" className="form-label">
                  Calificación (1–5)
                </label>
                <input
                  id="calificacion"
                  type="number"
                  min={1}
                  max={5}
                  value={form.calificacion}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, calificacion: Number(e.target.value) }))
                  }
                  className={`form-control ${
                    errors.calificacion ? "is-invalid" : form.calificacion ? "is-valid" : ""
                  }`}
                />
                <div className={`form-text ${errors.calificacion ? "text-danger" : ""}`}>
                  {errors.calificacion ||
                    "⭐".repeat(Math.max(1, Math.min(5, Number(form.calificacion) || 1)))}
                </div>
              </div>
            </fieldset>

            <div className="mt-3 d-flex gap-2">
              <button type="submit" className="btn btn-success">
                <i className="bi bi-check2 me-1"></i>
                {editingId == null ? "Guardar" : "Actualizar"}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={resetForm}
              >
                Limpiar
              </button>
            </div>
            <small className="text-body-secondary d-block mt-2">
              Los cambios se guardan al presionar <b>Guardar</b>.
            </small>
          </div>
        </form>
      )}

      {/* TABLA en tarjeta */}
      <div className="card shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Medio</th>
                  <th scope="col">Anotaciones</th>
                  <th scope="col">Zona</th>
                  <th scope="col">Demora</th>
                  <th scope="col">Gasto</th>
                  <th scope="col">Calif.</th>
                  <th scope="col">Fecha</th>
                  <th scope="col" className="text-nowrap">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((it) => (
                  <tr key={it.id}>
                    <th scope="row">{it.id}</th>
                    <td>{it.medio}</td>
                    <td title={it.anotaciones}>
                      {String(it.anotaciones || "").slice(0, 40)}
                      {String(it.anotaciones || "").length > 40 ? "…" : ""}
                    </td>
                    <td>{it.zona}</td>
                    <td>{it.tiempoDemora} min</td>
                    <td>
                      {Intl.NumberFormat("es-AR", {
                        style: "currency",
                        currency: "ARS",
                      }).format(Number(it.gasto || 0))}
                    </td>
                    <td>{it.calificacion}/5</td>
                    <td>{new Date(it.creadoEl).toLocaleDateString()}</td>
                    <td className="text-nowrap">
                      <button
                        className="btn btn-sm btn-outline-primary me-1"
                        onClick={() => handleEdit(it.id)}
                        aria-label={`Editar registro ${it.id}`}
                      >
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => askDelete(it.id)}
                        aria-label={`Eliminar registro ${it.id}`}
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center text-body-secondary py-4">
                      No encontramos resultados para “{qInput}”.{" "}
                      <button
                        className="btn btn-sm btn-primary ms-1"
                        onClick={() => setShowForm(true)}
                      >
                        Cargar primer gasto
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* PIE — grupo centrado con Prev · “Página …” · Next  |  y “Filas” a la derecha */}
      <div className="row align-items-center mt-3 g-2">
        {/* Columna vacía para balance (izquierda) */}
        <div className="col-12 col-md-4 order-2 order-md-1 d-none d-md-block"></div>

        {/* Centro: navegación + texto de página (centrado) */}
        <div className="col-12 col-md-4 order-1 order-md-2">
          <div className="d-flex justify-content-center align-items-center gap-3 flex-wrap">
            <button
              className="btn btn-outline-secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              « Prev
            </button>

            <div className="text-body-secondary">
              Página {page} de {totalPages} · Mostrando {filtered.length === 0 ? 0 : `${startIndex}-${endIndex}`} de {filtered.length}
            </div>

            <button
              className="btn btn-outline-secondary"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next »
            </button>
          </div>
        </div>

        {/* Derecha: solo “Filas” (quitamos “Reiniciar datos”) */}
        <div className="col-12 col-md-4 order-3 order-md-3 d-flex align-items-center justify-content-md-end justify-content-center gap-2">
          <label htmlFor="rpp" className="form-label mb-0">Filas</label>
          <select
            id="rpp"
            value={rowsPerPage}
            onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
            className="form-select"
            style={{ maxWidth: 96 }}
          >
            <option value={3}>3</option>
            <option value={5}>5</option>
            <option value={10}>10</option>
          </select>
        </div>
      </div>


      {/* Ayuda */}
      {showHelp && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div
            className="modal d-block"
            role="dialog"
            aria-modal="true"
            aria-labelledby="helpTitle"
            onClick={() => setShowHelp(false)}
          >
            <div
              className="modal-dialog modal-lg modal-dialog-centered"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-content">
                <div className="modal-header">
                  <h5 id="helpTitle" className="modal-title">
                    Ayuda
                  </h5>
                  <button
                    className="btn-close"
                    aria-label="Cerrar"
                    onClick={() => setShowHelp(false)}
                  />
                </div>
                <div className="modal-body">
                  <p className="mb-2">
                    Búsqueda centrada, orden por menú, validación y feedback
                    accesible. Se respeta rejilla de 12 columnas y jerarquía visual.
                  </p>
                  <ul className="mb-0">
                    <li>
                      <b>Buscar:</b> medio, anotaciones o zona (ignora mayúsculas y
                      tildes).
                    </li>
                    <li>
                      <b>Ordenar:</b> elegí criterio y dirección en los selectores.
                    </li>
                    <li>
                      <b>Borrar:</b> pide confirmación.
                    </li>
                  </ul>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-primary" onClick={() => setShowHelp(false)}>
                    Entendido
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        show={confirm.open}
        title={confirm.kind === "all" ? "Borrar todos los registros" : "Eliminar registro"}
        message={
          confirm.kind === "all"
            ? "¿Seguro que querés borrar TODOS los registros? Esta acción no se puede deshacer."
            : "¿Seguro que querés eliminar este registro?"
        }
        confirmText="Sí, borrar"
        cancelText="Cancelar"
        onConfirm={confirmDelete}
        onCancel={() => setConfirm({ open: false, kind: null, id: null })}
      />
    </>
  );
}
