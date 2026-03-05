import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Search, Download, Trash2, Eye, X } from 'lucide-react';
import api from '../api/client';

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
}

export default function PatientsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Patient | null>(null);
  const [form, setForm] = useState({
    fullName: '', rut: '', birthDate: '', occupation: '',
    phone: '', email: '', address: '',
    emergencyContactName: '', emergencyContactPhone: '',
    treatingPsychiatrist: '', treatingDoctor: '',
    consentSigned: false, telemedConsentSigned: false,
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => api.get('/patients').then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/patients', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setShowForm(false);
      setForm({
        fullName: '', rut: '', birthDate: '', occupation: '',
        phone: '', email: '', address: '',
        emergencyContactName: '', emergencyContactPhone: '',
        treatingPsychiatrist: '', treatingDoctor: '',
        consentSigned: false, telemedConsentSigned: false,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/patients/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['patients'] }),
  });

  const filtered = patients.filter((p: Patient) =>
    p.fullName.toLowerCase().includes(search.toLowerCase()) ||
    p.rut.includes(search)
  );

  const handleDownload = async (id: string) => {
    const res = await api.get(`/reports/patient/${id}`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = `ficha-${id}.pdf`;
    a.click();
  };

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div>
          <h2 className="font-display text-2xl md:text-3xl text-slate-900">Pacientes</h2>
          <p className="text-slate-500 text-sm mt-1">{patients.length} pacientes registrados</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <UserPlus size={16} />
          <span className="hidden sm:inline">Nuevo paciente</span>
          <span className="sm:hidden">Nuevo</span>
        </button>
      </div>

      {/* Formulario nuevo paciente */}
      {showForm && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-xl text-slate-900">Nueva Ficha</h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nombre completo *</label>
              <input className="input-field" value={form.fullName}
                onChange={e => setForm({ ...form, fullName: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">RUT *</label>
              <input className="input-field" placeholder="12.345.678-9" value={form.rut}
                onChange={e => setForm({ ...form, rut: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fecha de nacimiento *</label>
              <input type="date" className="input-field" value={form.birthDate}
                onChange={e => setForm({ ...form, birthDate: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Ocupación</label>
              <input className="input-field" value={form.occupation}
                onChange={e => setForm({ ...form, occupation: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Teléfono</label>
              <input className="input-field" value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
              <input type="email" className="input-field" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Dirección</label>
              <input className="input-field" value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Contacto emergencia</label>
              <input className="input-field" value={form.emergencyContactName}
                onChange={e => setForm({ ...form, emergencyContactName: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Teléfono emergencia</label>
              <input className="input-field" value={form.emergencyContactPhone}
                onChange={e => setForm({ ...form, emergencyContactPhone: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Psiquiatra tratante</label>
              <input className="input-field" value={form.treatingPsychiatrist}
                onChange={e => setForm({ ...form, treatingPsychiatrist: e.target.value })} />
            </div>
            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={form.consentSigned}
                  onChange={e => setForm({ ...form, consentSigned: e.target.checked })}
                  className="rounded" />
                Consentimiento
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={form.telemedConsentSigned}
                  onChange={e => setForm({ ...form, telemedConsentSigned: e.target.checked })}
                  className="rounded" />
                Telemedicina
              </label>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => createMutation.mutate(form)} className="btn-primary">
              {createMutation.isPending ? 'Guardando...' : 'Guardar ficha'}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
          </div>
        </div>
      )}

      {/* Buscador */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input className="input-field pl-9" placeholder="Buscar por nombre o RUT..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Lista — tabla en desktop, cards en móvil */}
      <div className="hidden md:block card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">Paciente</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">RUT</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">Contacto</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">Estado</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">Acciones</th>
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
                  <td className="px-6 py-4 text-slate-600">{p.rut}</td>
                  <td className="px-6 py-4 text-slate-600">{p.phone}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      p.consentSigned ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {p.consentSigned ? 'Consentimiento ✓' : 'Sin consentimiento'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setSelected(p)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                        <Eye size={15} />
                      </button>
                      <button onClick={() => handleDownload(p.id)}
                        className="p-1.5 hover:bg-sage-50 rounded-lg text-sage-600 transition-colors">
                        <Download size={15} />
                      </button>
                      <button onClick={() => deleteMutation.mutate(p.id)}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 transition-colors">
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
                  <p className="text-xs text-slate-400">{p.rut}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${
                  p.consentSigned ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                }`}>
                  {p.consentSigned ? '✓' : 'Pendiente'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-3">{p.phone} · {p.email}</p>
              <div className="flex gap-2">
                <button onClick={() => setSelected(p)} className="btn-secondary text-xs py-1 flex items-center gap-1">
                  <Eye size={13} /> Ver
                </button>
                <button onClick={() => handleDownload(p.id)} className="btn-primary text-xs py-1 flex items-center gap-1">
                  <Download size={13} /> PDF
                </button>
                <button onClick={() => deleteMutation.mutate(p.id)}
                  className="text-xs py-1 px-2 rounded-lg border border-red-200 text-red-400 hover:bg-red-50 flex items-center gap-1">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal detalle */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-display text-2xl text-slate-900">{selected.fullName}</h3>
                <p className="text-slate-400 text-sm">{selected.rut}</p>
              </div>
              <button onClick={() => setSelected(null)}
                className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-2 text-sm text-slate-700">
              <p><span className="font-medium">Nacimiento:</span> {new Date(selected.birthDate).toLocaleDateString('es-CL')}</p>
              <p><span className="font-medium">Ocupación:</span> {selected.occupation || '—'}</p>
              <p><span className="font-medium">Teléfono:</span> {selected.phone || '—'}</p>
              <p><span className="font-medium">Email:</span> {selected.email || '—'}</p>
              <p><span className="font-medium">Dirección:</span> {selected.address || '—'}</p>
              <hr className="my-3 border-slate-100" />
              <p><span className="font-medium">Emergencia:</span> {selected.emergencyContactName} — {selected.emergencyContactPhone}</p>
              <p><span className="font-medium">Psiquiatra:</span> {selected.treatingPsychiatrist || '—'}</p>
              <p><span className="font-medium">Médico:</span> {selected.treatingDoctor || '—'}</p>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => handleDownload(selected.id)} className="btn-primary flex items-center gap-2">
                <Download size={14} /> Descargar PDF
              </button>
              <button onClick={() => setSelected(null)} className="btn-secondary">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}