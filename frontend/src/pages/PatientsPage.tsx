import { useRef, useState } from "react";
import {
  FileText,
  Upload as UploadIcon,
  Pencil,
  History,
  ChevronRight,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UserPlus,
  Search,
  Download,
  Trash2,
  Eye,
  X,
  AlertCircle,
} from "lucide-react";
import api from "../api/client";
import { formatRut, normalizeRut, validateRut } from "../utils/rut";

interface Patient {
  id: string;
  fullName: string;
  rut: string;
  birthDate: string;
  phone: string;
  email: string;
  occupation: string;
  consentSigned: boolean;
  telemedConsentSigned: boolean;
  emergencyContactName: string;
  emergencyContactPhone: string;
  treatingPsychiatrist: string;
  treatingDoctor: string;
  address: string;
  notificationsConsent: boolean;
}

interface PatientHistoryEntry {
  id: string;
  changedAt: string;
  reason: string;
  diff: Record<string, { from: unknown; to: unknown }>;
  changedBy: { id: string; name: string; role: string };
}

const emptyForm = {
  fullName: "",
  rut: "",
  birthDate: "",
  occupation: "",
  phone: "",
  email: "",
  address: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  treatingPsychiatrist: "",
  treatingDoctor: "",
  consentSigned: false,
  telemedConsentSigned: false,
};

const FIELD_LABELS: Record<string, string> = {
  fullName: "Nombre completo",
  rut: "RUT",
  birthDate: "Fecha de nacimiento",
  occupation: "Ocupación",
  phone: "Teléfono",
  email: "Email",
  address: "Dirección",
  emergencyContactName: "Contacto emergencia",
  emergencyContactPhone: "Teléfono emergencia",
  treatingPsychiatrist: "Psiquiatra tratante",
  treatingDoctor: "Médico tratante",
  consentSigned: "Consentimiento",
  telemedConsentSigned: "Consentimiento telemedicina",
  notificationsConsent: "Consentimiento notificaciones",
  isActive: "Activo",
};

type ModalTab = "detail" | "edit" | "history";

export default function PatientsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Patient | null>(null);
  const [modalTab, setModalTab] = useState<ModalTab>("detail");
  const [form, setForm] = useState(emptyForm);
  const [rutError, setRutError] = useState("");
  const [formError, setFormError] = useState("");
  const [documents, setDocuments] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState("INFORMED_CONSENT");

  // Edit form state
  const [editForm, setEditForm] = useState<Partial<Patient>>({});
  const [editReason, setEditReason] = useState("");
  const [editError, setEditError] = useState("");

  // History state
  const [history, setHistory] = useState<PatientHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: () => api.get("/patients").then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post("/patients", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      setShowForm(false);
      setForm(emptyForm);
      setRutError("");
      setFormError("");
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.message ?? "Error al guardar paciente");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.patch(`/patients/${id}`, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      setSelected(res.data);
      setModalTab("detail");
      setEditForm({});
      setEditReason("");
      setEditError("");
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message;
      setEditError(
        Array.isArray(msg)
          ? msg.join(", ")
          : (msg ?? "Error al actualizar paciente"),
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/patients/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["patients"] }),
  });

  const handleRutChange = (value: string) => {
    const formatted = formatRut(value);
    setForm({ ...form, rut: formatted });
    if (formatted.length > 3) {
      setRutError(validateRut(formatted) ? "" : "RUT inválido");
    } else {
      setRutError("");
    }
  };

  const handleSubmit = () => {
    if (!form.fullName.trim()) {
      setFormError("El nombre es obligatorio");
      return;
    }
    if (!form.rut.trim()) {
      setFormError("El RUT es obligatorio");
      return;
    }
    if (!validateRut(form.rut)) {
      setFormError("RUT inválido");
      return;
    }
    if (!form.birthDate) {
      setFormError("La fecha de nacimiento es obligatoria");
      return;
    }
    setFormError("");
    createMutation.mutate({ ...form, rut: normalizeRut(form.rut) });
  };

  const handleDelete = (p: Patient) => {
    if (
      !confirm(`¿Eliminar a "${p.fullName}"? Esta acción no se puede deshacer.`)
    )
      return;
    deleteMutation.mutate(p.id);
  };

  const handleOpenEdit = (p: Patient) => {
    setEditForm({
      fullName: p.fullName,
      phone: p.phone,
      email: p.email,
      occupation: p.occupation,
      address: p.address,
      emergencyContactName: p.emergencyContactName,
      emergencyContactPhone: p.emergencyContactPhone,
      treatingPsychiatrist: p.treatingPsychiatrist,
      treatingDoctor: p.treatingDoctor,
      consentSigned: p.consentSigned,
      telemedConsentSigned: p.telemedConsentSigned,
    });
    setEditReason("");
    setEditError("");
    setModalTab("edit");
  };

  const handleSubmitEdit = () => {
    if (!editReason.trim()) {
      setEditError("El motivo de la modificación es obligatorio");
      return;
    }
    if (editReason.trim().length < 10) {
      setEditError("El motivo debe tener al menos 10 caracteres");
      return;
    }
    if (!selected) return;
    setEditError("");
    updateMutation.mutate({
      id: selected.id,
      data: { ...editForm, reason: editReason },
    });
  };

  const handleOpenHistory = async (patientId: string) => {
    setModalTab("history");
    setLoadingHistory(true);
    try {
      const res = await api.get(`/patients/${patientId}/history`);
      setHistory(res.data);
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const filtered = patients.filter(
    (p: Patient) =>
      p.fullName.toLowerCase().includes(search.toLowerCase()) ||
      p.rut.toLowerCase().includes(search.toLowerCase().replace(/\./g, "")),
  );

  const handleDownload = async (id: string) => {
    const res = await api.get(`/reports/patient/${id}`, {
      responseType: "blob",
    });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement("a");
    a.href = url;
    a.download = `ficha-${id}.pdf`;
    a.click();
  };

  const loadDocuments = async (patientId: string) => {
    setLoadingDocs(true);
    try {
      const res = await api.get(`/documents/patient/${patientId}`);
      setDocuments(res.data);
    } catch {
      setDocuments([]);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleUpload = async (file: File, patientId: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("patientId", patientId);
    formData.append("type", docType);
    await api.post("/documents/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    loadDocuments(patientId);
  };

  const handleDownloadDoc = async (docId: string, fileName: string) => {
    const res = await api.get(`/documents/${docId}/download`, {
      responseType: "blob",
    });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
  };

  const displayRut = (rut: string) => formatRut(rut.replace(/\./g, ""));

  const formatFieldValue = (key: string, val: unknown): string => {
    if (val === null || val === undefined || val === "") return "—";
    if (typeof val === "boolean") return val ? "Sí" : "No";
    if (key === "birthDate" || key.toLowerCase().includes("date")) {
      try {
        return new Date(val as string).toLocaleDateString("es-CL");
      } catch {
        return String(val);
      }
    }
    return String(val);
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div>
          <h2 className="font-display text-2xl md:text-3xl text-slate-900">
            Pacientes
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            {patients.length} pacientes registrados
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary flex items-center gap-2"
        >
          <UserPlus size={16} />
          <span className="hidden sm:inline">Nuevo paciente</span>
          <span className="sm:hidden">Nuevo</span>
        </button>
      </div>

      {showForm && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-xl text-slate-900">Nueva Ficha</h3>
            <button
              onClick={() => setShowForm(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Nombre completo *
              </label>
              <input
                className="input-field"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                RUT *
              </label>
              <input
                className={`input-field ${rutError ? "border-red-300 focus:ring-red-200" : ""}`}
                placeholder="12.345.678-9"
                value={form.rut}
                onChange={(e) => handleRutChange(e.target.value)}
                maxLength={12}
              />
              {rutError && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle size={11} /> {rutError}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Fecha de nacimiento *
              </label>
              <input
                type="date"
                className="input-field"
                value={form.birthDate}
                onChange={(e) =>
                  setForm({ ...form, birthDate: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Ocupación
              </label>
              <input
                className="input-field"
                value={form.occupation}
                onChange={(e) =>
                  setForm({ ...form, occupation: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Teléfono
              </label>
              <input
                className="input-field"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Email
              </label>
              <input
                type="email"
                className="input-field"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Dirección
              </label>
              <input
                className="input-field"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Contacto emergencia
              </label>
              <input
                className="input-field"
                value={form.emergencyContactName}
                onChange={(e) =>
                  setForm({ ...form, emergencyContactName: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Teléfono emergencia
              </label>
              <input
                className="input-field"
                value={form.emergencyContactPhone}
                onChange={(e) =>
                  setForm({ ...form, emergencyContactPhone: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Psiquiatra tratante
              </label>
              <input
                className="input-field"
                value={form.treatingPsychiatrist}
                onChange={(e) =>
                  setForm({ ...form, treatingPsychiatrist: e.target.value })
                }
              />
            </div>
            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.consentSigned}
                  onChange={(e) =>
                    setForm({ ...form, consentSigned: e.target.checked })
                  }
                  className="rounded"
                />
                Consentimiento
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.telemedConsentSigned}
                  onChange={(e) =>
                    setForm({ ...form, telemedConsentSigned: e.target.checked })
                  }
                  className="rounded"
                />
                Telemedicina
              </label>
            </div>
          </div>
          {formError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4 flex items-center gap-2">
              <AlertCircle size={14} className="text-red-500 shrink-0" />
              <p className="text-red-600 text-sm">{formError}</p>
            </div>
          )}
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSubmit}
              className="btn-primary"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Guardando..." : "Guardar ficha"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="btn-secondary"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="relative mb-4">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          className="input-field pl-9"
          placeholder="Buscar por nombre o RUT..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Tabla desktop */}
      <div className="hidden md:block card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">
                Paciente
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">
                RUT
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">
                Contacto
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">
                Estado
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-slate-400">
                  No se encontraron pacientes.
                </td>
              </tr>
            ) : (
              filtered.map((p: Patient) => (
                <tr key={p.id} className="hover:bg-cream-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-800">{p.fullName}</p>
                    <p className="text-xs text-slate-400">{p.email}</p>
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                    {displayRut(p.rut)}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{p.phone}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        p.consentSigned
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {p.consentSigned
                        ? "Consentimiento ✓"
                        : "Sin consentimiento"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelected(p);
                          setModalTab("detail");
                          loadDocuments(p.id);
                        }}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                        title="Ver detalle"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        onClick={() => {
                          setSelected(p);
                          handleOpenEdit(p);
                        }}
                        className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-400 transition-colors"
                        title="Editar"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDownload(p.id)}
                        className="p-1.5 hover:bg-sage-50 rounded-lg text-sage-600 transition-colors"
                        title="Descargar PDF"
                      >
                        <Download size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Cards móvil */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="card text-center py-8 text-slate-400 text-sm">
            No se encontraron pacientes.
          </div>
        ) : (
          filtered.map((p: Patient) => (
            <div key={p.id} className="card p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium text-slate-800">{p.fullName}</p>
                  <p className="text-xs text-slate-400 font-mono">
                    {displayRut(p.rut)}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full shrink-0 ${
                    p.consentSigned
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {p.consentSigned ? "✓" : "Pendiente"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                {p.phone} · {p.email}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelected(p);
                    setModalTab("detail");
                    loadDocuments(p.id);
                  }}
                  className="btn-secondary text-xs py-1 flex items-center gap-1"
                >
                  <Eye size={13} /> Ver
                </button>
                <button
                  onClick={() => {
                    setSelected(p);
                    handleOpenEdit(p);
                  }}
                  className="btn-secondary text-xs py-1 flex items-center gap-1 text-blue-500"
                >
                  <Pencil size={13} /> Editar
                </button>
                <button
                  onClick={() => handleDownload(p.id)}
                  className="btn-primary text-xs py-1 flex items-center gap-1"
                >
                  <Download size={13} /> PDF
                </button>
                <button
                  onClick={() => handleDelete(p)}
                  className="text-xs py-1 px-2 rounded-lg border border-red-200 text-red-400 hover:bg-red-50 flex items-center gap-1"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between p-6 pb-0">
              <div>
                <h3 className="font-display text-2xl text-slate-900">
                  {selected.fullName}
                </h3>
                <p className="text-slate-400 text-sm font-mono">
                  {displayRut(selected.rut)}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-slate-400 hover:text-slate-600 ml-4"
              >
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-6 pt-4 border-b border-slate-100">
              <button
                onClick={() => setModalTab("detail")}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  modalTab === "detail"
                    ? "text-slate-900 border-b-2 border-slate-900 -mb-px"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <Eye size={14} /> Detalle
              </button>
              <button
                onClick={() => handleOpenEdit(selected)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  modalTab === "edit"
                    ? "text-blue-600 border-b-2 border-blue-600 -mb-px"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <Pencil size={14} /> Editar
              </button>
              <button
                onClick={() => handleOpenHistory(selected.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  modalTab === "history"
                    ? "text-amber-600 border-b-2 border-amber-600 -mb-px"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <History size={14} /> Historial
              </button>
            </div>

            {/* Tab content */}
            <div className="overflow-auto flex-1 p-6">
              {/* ── DETALLE ── */}
              {modalTab === "detail" && (
                <>
                  <div className="space-y-2 text-sm text-slate-700">
                    <p>
                      <span className="font-medium">Nacimiento:</span>{" "}
                      {new Date(selected.birthDate).toLocaleDateString("es-CL")}
                    </p>
                    <p>
                      <span className="font-medium">Ocupación:</span>{" "}
                      {selected.occupation || "—"}
                    </p>
                    <p>
                      <span className="font-medium">Teléfono:</span>{" "}
                      {selected.phone || "—"}
                    </p>
                    <p>
                      <span className="font-medium">Email:</span>{" "}
                      {selected.email || "—"}
                    </p>
                    <p>
                      <span className="font-medium">Dirección:</span>{" "}
                      {selected.address || "—"}
                    </p>
                    <hr className="my-3 border-slate-100" />
                    <p>
                      <span className="font-medium">Emergencia:</span>{" "}
                      {selected.emergencyContactName} —{" "}
                      {selected.emergencyContactPhone}
                    </p>
                    <p>
                      <span className="font-medium">Psiquiatra:</span>{" "}
                      {selected.treatingPsychiatrist || "—"}
                    </p>
                    <p>
                      <span className="font-medium">Médico:</span>{" "}
                      {selected.treatingDoctor || "—"}
                    </p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="font-medium text-slate-700 text-sm mb-3">
                      Documentos legales
                    </p>
                    {loadingDocs ? (
                      <p className="text-xs text-slate-400">Cargando...</p>
                    ) : documents.length === 0 ? (
                      <p className="text-xs text-slate-400 mb-3">
                        Sin documentos subidos.
                      </p>
                    ) : (
                      <div className="space-y-2 mb-3">
                        {documents.map((doc: any) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText
                                size={14}
                                className="text-slate-400 shrink-0"
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-slate-700 truncate">
                                  {doc.fileName}
                                </p>
                                <p className="text-xs text-slate-400">
                                  {doc.type}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() =>
                                handleDownloadDoc(doc.id, doc.fileName)
                              }
                              className="p-1.5 hover:bg-sage-50 rounded-lg text-sage-600 shrink-0"
                            >
                              <Download size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <select
                        value={docType}
                        onChange={(e) => setDocType(e.target.value)}
                        className="input-field text-xs py-1.5 flex-1"
                      >
                        <option value="INFORMED_CONSENT">
                          Consentimiento informado
                        </option>
                        <option value="TELEMED_AGREEMENT">
                          Acuerdo telemedicina
                        </option>
                        <option value="OTHER">Otro</option>
                      </select>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0] && selected)
                            handleUpload(e.target.files[0], selected.id);
                        }}
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="btn-secondary text-xs py-1.5 flex items-center gap-1 shrink-0"
                      >
                        <UploadIcon size={13} /> Subir
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => handleDownload(selected.id)}
                      className="btn-primary flex items-center gap-2"
                    >
                      <Download size={14} /> Descargar PDF
                    </button>
                    <button
                      onClick={() => setSelected(null)}
                      className="btn-secondary"
                    >
                      Cerrar
                    </button>
                  </div>
                </>
              )}

              {/* ── EDITAR ── */}
              {modalTab === "edit" && (
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-2">
                    <AlertCircle
                      size={14}
                      className="text-amber-500 shrink-0 mt-0.5"
                    />
                    <p className="text-amber-700 text-xs">
                      Toda modificación queda registrada con motivo y autor
                      según normativa MINSAL.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Nombre completo
                      </label>
                      <input
                        className="input-field"
                        value={editForm.fullName ?? ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, fullName: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Teléfono
                      </label>
                      <input
                        className="input-field"
                        value={editForm.phone ?? ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, phone: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        className="input-field"
                        value={editForm.email ?? ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, email: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Ocupación
                      </label>
                      <input
                        className="input-field"
                        value={editForm.occupation ?? ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            occupation: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Dirección
                      </label>
                      <input
                        className="input-field"
                        value={editForm.address ?? ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, address: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Contacto emergencia
                      </label>
                      <input
                        className="input-field"
                        value={editForm.emergencyContactName ?? ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            emergencyContactName: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Teléfono emergencia
                      </label>
                      <input
                        className="input-field"
                        value={editForm.emergencyContactPhone ?? ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            emergencyContactPhone: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Psiquiatra tratante
                      </label>
                      <input
                        className="input-field"
                        value={editForm.treatingPsychiatrist ?? ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            treatingPsychiatrist: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Médico tratante
                      </label>
                      <input
                        className="input-field"
                        value={editForm.treatingDoctor ?? ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            treatingDoctor: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center gap-6 pt-2 md:col-span-2">
                      <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editForm.consentSigned ?? false}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              consentSigned: e.target.checked,
                            })
                          }
                          className="rounded"
                        />
                        Consentimiento
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editForm.telemedConsentSigned ?? false}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              telemedConsentSigned: e.target.checked,
                            })
                          }
                          className="rounded"
                        />
                        Telemedicina
                      </label>
                    </div>
                  </div>

                  {/* Motivo obligatorio */}
                  <div className="pt-2 border-t border-slate-100">
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Motivo de la modificación{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      className="input-field resize-none"
                      rows={3}
                      placeholder="Ej: Corrección de número telefónico a solicitud del paciente en consulta del 09/03/2026"
                      value={editReason}
                      onChange={(e) => setEditReason(e.target.value)}
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      {editReason.length} caracteres (mínimo 10)
                    </p>
                  </div>

                  {editError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                      <AlertCircle
                        size={14}
                        className="text-red-500 shrink-0"
                      />
                      <p className="text-red-600 text-sm">{editError}</p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleSubmitEdit}
                      className="btn-primary flex items-center gap-2"
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending
                        ? "Guardando..."
                        : "Guardar cambios"}
                    </button>
                    <button
                      onClick={() => setModalTab("detail")}
                      className="btn-secondary"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* ── HISTORIAL ── */}
              {modalTab === "history" && (
                <div>
                  {loadingHistory ? (
                    <p className="text-sm text-slate-400 py-4">
                      Cargando historial...
                    </p>
                  ) : history.length === 0 ? (
                    <div className="text-center py-8">
                      <History
                        size={32}
                        className="text-slate-200 mx-auto mb-2"
                      />
                      <p className="text-sm text-slate-400">
                        Sin modificaciones registradas.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {history.map((entry) => (
                        <div
                          key={entry.id}
                          className="border border-slate-100 rounded-xl p-4"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="text-xs font-medium text-slate-700">
                                {entry.changedBy.name}
                              </p>
                              <p className="text-xs text-slate-400">
                                {entry.changedBy.role}
                              </p>
                            </div>
                            <p className="text-xs text-slate-400">
                              {new Date(entry.changedAt).toLocaleString(
                                "es-CL",
                              )}
                            </p>
                          </div>
                          <div className="bg-amber-50 rounded-lg px-3 py-2 mb-3">
                            <p className="text-xs text-amber-700 italic">
                              "{entry.reason}"
                            </p>
                          </div>
                          <div className="space-y-1">
                            {Object.entries(entry.diff).map(
                              ([key, { from, to }]) => (
                                <div
                                  key={key}
                                  className="flex items-center gap-2 text-xs text-slate-600"
                                >
                                  <span className="font-medium text-slate-500 w-32 shrink-0">
                                    {FIELD_LABELS[key] ?? key}
                                  </span>
                                  <span className="text-red-400 line-through">
                                    {formatFieldValue(key, from)}
                                  </span>
                                  <ChevronRight
                                    size={12}
                                    className="text-slate-300 shrink-0"
                                  />
                                  <span className="text-emerald-600 font-medium">
                                    {formatFieldValue(key, to)}
                                  </span>
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
