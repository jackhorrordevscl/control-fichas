import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, ClipboardList, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-cream-100">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 flex flex-col">

        {/* Logo */}
        <div className="px-6 py-8 border-b border-slate-800">
          <h1 className="font-display text-2xl text-white">Umbral</h1>
          <p className="text-slate-400 text-xs mt-1">Gestión Clínica</p>
        </div>

        {/* Navegación */}
        <nav className="flex-1 px-3 py-6 space-y-1">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <LayoutDashboard size={18} />
            Dashboard
          </NavLink>

          <NavLink
            to="/patients"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <Users size={18} />
            Pacientes
          </NavLink>

          <NavLink
            to="/consultations"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <ClipboardList size={18} />
            Consultas
          </NavLink>
        </nav>

        {/* Usuario y logout */}
        <div className="px-3 py-4 border-t border-slate-800">
          <div className="px-4 py-2 mb-2">
            <p className="text-white text-sm font-medium truncate">{user?.email}</p>
            <p className="text-slate-400 text-xs">{user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="sidebar-link w-full text-left text-red-400 hover:text-red-300 hover:bg-red-950"
          >
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}