import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Trash2, Shield, User, X, Crown, Users } from 'lucide-react';
import api from '../api/client';

interface UserItem {
  id: string;
  email: string;
  name: string;
  role: string;
  mfaEnabled: boolean;
  createdAt: string;
}

const ROLES = [
  { value: 'THERAPIST', label: 'Terapeuta' },
  { value: 'COORDINATOR', label: 'Coordinador/a' },
  { value: 'DIRECTOR', label: 'Director/a' },
  { value: 'ADMIN', label: 'Administrador' },
];

const roleLabel = (role: string) => ROLES.find(r => r.value === role)?.label ?? role;

const roleBadge = (role: string) => {
  switch (role) {
    case 'ADMIN':     return 'bg-purple-50 text-purple-700';
    case 'DIRECTOR':  return 'bg-indigo-50 text-indigo-700';
    case 'COORDINATOR': return 'bg-blue-50 text-blue-700';
    default:          return 'bg-sage-50 text-sage-700';
  }
};

const roleIcon = (role: string) => {
  switch (role) {
    case 'ADMIN':       return <Shield size={16} className="text-purple-600" />;
    case 'DIRECTOR':    return <Crown size={16} className="text-indigo-600" />;
    case 'COORDINATOR': return <Users size={16} className="text-blue-600" />;
    default:            return <User size={16} className="text-sage-600" />;
  }
};

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    email: '', name: '', password: '', role: 'THERAPIST',
  });
  const [error, setError] = useState('');

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r: any) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowForm(false);
      setError('');
      setForm({ email: '', name: '', password: '', role: 'THERAPIST' });
    },
    onError: (err: any) => {
      setError(err.response?.data?.message ?? 'Error al crear usuario');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
    onError: (err: any) => {
      alert(err.response?.data?.message ?? 'Error al eliminar usuario');
    },
  });

  const handleDelete = (u: UserItem) => {
    if (!confirm(`¿Eliminar al usuario "${u.name}"? Esta acción no se puede deshacer.`)) return;
    deleteMutation.mutate(u.id);
  };

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div>
          <h2 className="font-display text-2xl md:text-3xl text-slate-900">Usuarios</h2>
          <p className="text-slate-500 text-sm mt-1">{users.length} usuarios registrados</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <UserPlus size={16} />
          <span className="hidden sm:inline">Nuevo usuario</span>
          <span className="sm:hidden">Nuevo</span>
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-xl text-slate-900">Nuevo Usuario</h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nombre completo *</label>
              <input className="input-field" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Email *</label>
              <input type="email" className="input-field" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Contraseña *</label>
              <input type="password" className="input-field" value={form.password}
                placeholder="Mínimo 8 caracteres"
                onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Rol</label>
              <select className="input-field" value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value })}>
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
          <div className="flex gap-3 mt-6">
            <button onClick={() => createMutation.mutate(form)} className="btn-primary">
              {createMutation.isPending ? 'Guardando...' : 'Crear usuario'}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
          </div>
        </div>
      )}

      {/* Lista desktop */}
      <div className="hidden md:block card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">Usuario</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">Rol</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">MFA</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">Creado</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-slate-400">
                  No hay usuarios registrados.
                </td>
              </tr>
            ) : (
              users.map((u: UserItem) => (
                <tr key={u.id} className="hover:bg-cream-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-800">{u.name}</p>
                    <p className="text-xs text-slate-400">{u.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${roleBadge(u.role)}`}>
                      {roleLabel(u.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      u.mfaEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {u.mfaEnabled ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs">
                    {new Date(u.createdAt).toLocaleDateString('es-CL')}
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => handleDelete(u)}
                      className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Cards móvil */}
      <div className="md:hidden space-y-3">
        {users.length === 0 ? (
          <div className="card text-center py-8 text-slate-400 text-sm">
            No hay usuarios registrados.
          </div>
        ) : (
          users.map((u: UserItem) => (
            <div key={u.id} className="card p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="bg-slate-100 p-2 rounded-lg">
                    {roleIcon(u.role)}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{u.name}</p>
                    <p className="text-xs text-slate-400">{u.email}</p>
                  </div>
                </div>
                <button onClick={() => handleDelete(u)}
                  className="p-1.5 hover:bg-red-50 rounded-lg text-red-400">
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="flex gap-2 mt-2">
                <span className={`text-xs px-2 py-1 rounded-full ${roleBadge(u.role)}`}>
                  {roleLabel(u.role)}
                </span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  u.mfaEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  MFA {u.mfaEnabled ? 'activo' : 'inactivo'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}