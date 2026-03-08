import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { Calendar, Search, ArrowLeft, UserCircle, User } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

interface SessionResult {
  found: boolean;
  patientName?: string;
  therapistName?: string;
  nextSession?: string | null;
  message: string;
}

function formatRut(value: string): string {
  const clean = value.replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length < 2) return clean;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formatted}-${dv}`;
}

function formatFecha(isoDate: string): string {
  return new Date(isoDate).toLocaleString('es-CL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function PublicSessionQuery() {
  const [open, setOpen] = useState(false);
  const [rut, setRut] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    const rutClean = rut.replace(/\./g, '').trim();
    if (rutClean.length < 5) { setError('Ingresa un RUT válido'); return; }
    setError('');
    setLoading(true);
    setResult(null);
    try {
      const res = await api.get('/patients/public/next-session', {
        params: { rut: rutClean },
      });
      setResult(res.data);
    } catch {
      setError('Error al consultar. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => { setRut(''); setResult(null); setError(''); };
  const handleBack = () => { setOpen(false); handleClear(); };

  if (!open) {
    return (
      <div className="mt-6 text-center">
        <div className="border-t border-slate-200 pt-5">
          <p className="text-sm text-slate-500 mb-3">¿Eres paciente?</p>
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors"
          >
            <Calendar className="w-4 h-4" />
            Consulta aquí tu próxima sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 bg-white border border-indigo-100 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-500" />
          Consultar próxima sesión
        </h3>
      </div>

      <p className="text-sm text-slate-500 mb-4">
        Ingresa tu RUT para ver la fecha de tu próxima consulta
      </p>

      <input
        type="text"
        placeholder="Ej: 12.345.678-9"
        value={rut}
        onChange={e => setRut(formatRut(e.target.value))}
        onKeyDown={e => e.key === 'Enter' && handleSearch()}
        maxLength={12}
        className="input-field text-center tracking-wider mb-2"
      />

      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

      <div className="flex gap-2 mt-3">
        <button
          onClick={handleClear}
          className="flex-1 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition-colors"
        >
          Limpiar
        </button>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
        >
          {loading ? 'Buscando...' : <><Search className="w-4 h-4" /> Buscar agenda</>}
        </button>
        <button
          onClick={handleBack}
          className="flex-1 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>
      </div>

      {result && (
        <div className={`mt-5 rounded-xl p-4 ${
          result.found && result.nextSession
            ? 'bg-green-50 border border-green-100'
            : result.found
            ? 'bg-amber-50 border border-amber-100'
            : 'bg-red-50 border border-red-100'
        }`}>
          {result.found ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <UserCircle className="w-5 h-5 text-slate-500" />
                <span className="font-medium text-slate-700">{result.patientName}</span>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-600">
                  Terapeuta: <strong>{result.therapistName}</strong>
                </span>
              </div>
              {result.nextSession ? (
                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-indigo-500 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">Próxima sesión</p>
                    <p className="text-sm font-semibold text-indigo-700 capitalize">
                      {formatFecha(result.nextSession)}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-amber-700">{result.message}</p>
              )}
            </>
          ) : (
            <p className="text-sm text-red-700 text-center">{result.message}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [userId, setUserId] = useState('');
  const [mfaToken, setMfaToken] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login', data);
      if (res.data.requiresMfa) {
        setMfaRequired(true);
        setUserId(res.data.userId);
      } else if (res.data.accessToken) {
        login(res.data.accessToken, res.data.user);
        navigate('/dashboard');
      }
    } catch {
      setError('Credenciales inválidas. Verifica tu email y contraseña.');
    } finally {
      setLoading(false);
    }
  };

  const onMfaSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/mfa/verify', { userId, token: mfaToken });
      login(res.data.accessToken, res.data.user);
      navigate('/dashboard');
    } catch {
      setError('Código MFA inválido. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (mfaRequired) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8">
        <div className="bg-cream-50 rounded-2xl p-8 w-full max-w-md">
          <h2 className="font-display text-3xl text-slate-900 mb-2">Verificación MFA</h2>
          <p className="text-slate-500 text-sm mb-6">
            Ingresa el código de 6 dígitos de tu app autenticadora
          </p>
          <input
            type="text"
            maxLength={6}
            placeholder="000000"
            value={mfaToken}
            onChange={e => setMfaToken(e.target.value)}
            className="input-field text-center text-2xl tracking-widest mb-4"
          />
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
          <button
            onClick={onMfaSubmit}
            disabled={loading || mfaToken.length !== 6}
            className="btn-primary w-full py-3 text-base disabled:opacity-50"
          >
            {loading ? 'Verificando...' : 'Verificar'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex">
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1a2e1a 50%, #0f2318 100%)' }}>
        <div>
          <h1 className="font-display text-4xl text-white">Umbral</h1>
          <p className="text-sage-300 text-sm mt-1">SpA — Gestión Clínica</p>
        </div>
        <div>
          <blockquote className="font-display text-2xl text-white leading-relaxed italic">
            "El cuidado del paciente comienza con el cuidado del registro."
          </blockquote>
          <p className="text-slate-400 text-sm mt-4">
            Sistema de gestión clínica conforme a Ley 20.584
          </p>
        </div>
        <div className="text-slate-500 text-xs">
          © 2026 Umbral SpA — Datos protegidos bajo Ley 19.628
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-cream-50">
        <div className="w-full max-w-md">
          <div className="mb-10">
            <h2 className="font-display text-3xl text-slate-900">Bienvenida</h2>
            <p className="text-slate-500 text-sm mt-2">
              Ingresa tus credenciales para acceder al sistema
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                {...register('email')}
                type="email"
                placeholder="tu@email.com"
                className="input-field"
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
              <input
                {...register('password')}
                type="password"
                placeholder="••••••••"
                className="input-field"
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base disabled:opacity-50"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <PublicSessionQuery />
        </div>
      </div>
    </div>
  );
}