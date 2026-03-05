import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardPlus, Search, X, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../api/client';

interface Consultation {
  id: string;
  patientId: string;
  sessionDate: string;
  consultReason: string;
  intervention: string;
  agreements: string;
  nextSessionDate: string;
  sessionType: string;
  version: number;
  isCorrected: boolean;
  therapist: { name: string; email: string };
}

interface Patient {
  id: string;
  fullName: string;
  rut: string;
}

export default function ConsultationsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [showPatientList, setShowPatientList] = useState(true);
  const [form, setForm] = useState({
    patientId: '', sessionDate: '', consultReason: '',
    intervention: '', agreements: '', nextSessionDate: '',
    sessionType: 'IN_PERSON',
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => api.get('/patients').then(r => r.data),
  });

  const { data: consultations = [] } = useQuery({
    queryKey: ['consultations', selectedPatientId],
    queryFn: () => selectedPatientId
      ? api.get(`/consultations/patient/${selectedPatientId}`).then(r => r.data)
      : Promise.resolve([]),
    enabled: !!selectedPatientId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/consultations', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
      setShowForm(false);
      setForm({
        patientId: '', sessionDate: '', consultReason: '',
        intervention: '', agreements: '', nextSessionDate: '',
        sessionType: 'IN_PERSON',
      });
    },
  });

  const filteredPatients = patients.filter((p: Patient) =>
    p.fullName.toLowerCase().includes(search.toLowerCase()) ||
    p.rut.includes(search)
  );

  const selectedPatient = patients.find((p: Patient) => p.id === selectedPatientId);

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div>
          <h2 className="font-display text-2xl md:text-3xl text-slate-900">Consultas</h2>
          <p className="text-slate-500 text-sm mt-1">Registro clínico de sesiones</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <ClipboardPlus size={16} />
          <span className="hidden sm:inline">Nueva consulta</span>
          <span className="sm:hidden">Nueva</span>
        </button>
      </div>

      {/* Formulario nueva consulta */}
      {showForm && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-xl text-slate-900">Registrar Sesión</h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Paciente *</label>
              <select className="input-field" value={form.patientId}
                onChange={e => setForm({ ...form, patientId: e.target.value })}>
                <option value="">Seleccionar paciente...</option>
                {patients.map((p: Patient) => (
                  <option key={p.id} value={p.id}>{p.fullName} — {p.rut}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fecha de sesión *</label>
              <input type="date" className="input-field" value={form.sessionDate}
                onChange={e => setForm({ ...form, sessionDate: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tipo de sesión</label>
              <select className="input-field" value={form.sessionType}
                onChange={e => setForm({ ...form, sessionType: e.target.value })}>
                <option value="IN_PERSON">Presencial</option>
                <option value="TELEMED">Telemedicina</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Motivo de consulta *</label>
              <textarea rows={2} className="input-field resize-none" value={form.consultReason}
                onChange={e => setForm({ ...form, consultReason: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Intervención realizada *</label>
              <textarea rows={3} className="input-field resize-none" value={form.intervention}
                onChange={e => setForm({ ...form, intervention: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Tareas y acuerdos</label>
              <textarea rows={2} className="input-field resize-none" value={form.agreements}
                onChange={e => setForm({ ...form, agreements: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Próxima sesión</label>
              <input type="date" className="input-field" value={form.nextSessionDate}
                onChange={e => setForm({ ...form, nextSessionDate: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => createMutation.mutate(form)} className="btn-primary">
              {createMutation.isPending ? 'Guardando...' : 'Guardar sesión'}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de pacientes — colapsable en móvil */}
        <div className="card p-0 overflow-hidden">
          <button
            onClick={() => setShowPatientList(!showPatientList)}
            className="w-full p-4 border-b border-slate-100 flex items-center justify-between text-left"
          >
            <p className="font-medium text-slate-700 text-sm">
              {selectedPatient ? selectedPatient.fullName : 'Seleccionar paciente'}
            </p>
            {showPatientList
              ? <ChevronUp size={16} className="text-slate-400" />
              : <ChevronDown size={16} className="text-slate-400" />
            }
          </button>

          {showPatientList && (
            <>
              <div className="p-3 border-b border-slate-100">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input className="input-field pl-8 text-xs" placeholder="Buscar..."
                    value={search} onChange={e => setSearch(e.target.value)} />
                </div>
              </div>
              <div className="divide-y divide-slate-50 max-h-64 lg:max-h-96 overflow-auto">
                {filteredPatients.map((p: Patient) => (
                  <button key={p.id}
                    onClick={() => {
                      setSelectedPatientId(p.id);
                      setShowPatientList(false);
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-cream-50 transition-colors ${
                      selectedPatientId === p.id ? 'bg-sage-50 border-l-2 border-sage-500' : ''
                    }`}>
                    <p className="text-sm font-medium text-slate-800">{p.fullName}</p>
                    <p className="text-xs text-slate-400">{p.rut}</p>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Historial de consultas */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedPatientId ? (
            <div className="card flex items-center justify-center h-48">
              <p className="text-slate-400 text-sm text-center px-4">
                Selecciona un paciente para ver su historial
              </p>
            </div>
          ) : consultations.length === 0 ? (
            <div className="card flex items-center justify-center h-48">
              <p className="text-slate-400 text-sm">Sin consultas registradas</p>
            </div>
          ) : (
            consultations.map((c: Consultation) => (
              <div key={c.id} className={`card ${c.isCorrected ? 'opacity-60 border-dashed' : ''}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium text-slate-800 text-sm md:text-base">
                      {new Date(c.sessionDate).toLocaleDateString('es-CL', {
                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                      })}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        v{c.version}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        c.sessionType === 'TELEMED'
                          ? 'bg-blue-50 text-blue-600'
                          : 'bg-sage-50 text-sage-600'
                      }`}>
                        {c.sessionType === 'TELEMED' ? 'Telemedicina' : 'Presencial'}
                      </span>
                      {c.isCorrected && (
                        <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">
                          Corregida
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-slate-700">
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Motivo</p>
                    <p>{c.consultReason}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Intervención</p>
                    <p>{c.intervention}</p>
                  </div>
                  {c.agreements && (
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Acuerdos</p>
                      <p>{c.agreements}</p>
                    </div>
                  )}
                  {c.nextSessionDate && (
                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-xs text-slate-400">
                        Próxima sesión: <span className="font-medium text-slate-600">
                          {new Date(c.nextSessionDate).toLocaleDateString('es-CL')}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}