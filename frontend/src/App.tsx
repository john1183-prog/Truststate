import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { RoleEnum } from './types';
import { HomePage } from './pages/HomePage';
import { AgentDashboard } from './pages/AgentDashboard';
import { PropertyDetailPage } from './pages/PropertyDetailPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { LegalServicesPage } from './pages/LegalServicesPage';
import { LoginPage } from './pages/LoginPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import { LogIn, LogOut, LayoutDashboard, ShieldCheck } from 'lucide-react';

const AppNavbar: React.FC = () => {
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  const handleSignOut = async () => {
    await logout();
  };

  return (
    <header className="bg-[#0A0A0A] sticky top-0 z-30 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        {/* Wordmark */}
        <Link to="/" className="text-xl font-black tracking-tighter text-white shrink-0">
          TRUST<span className="text-[#C9A84C]">ESTATE</span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link
            to="/"
            className="text-sm font-medium text-white/70 hover:text-white transition-colors hidden sm:block"
          >
            Browse
          </Link>
          <Link
            to="/legal"
            className="text-sm font-medium text-white/70 hover:text-[#C9A84C] transition-colors"
          >
            Legal Services
          </Link>

          {!isLoading && isAuthenticated && user ? (
            <>
              {user.role === RoleEnum.agent && (
                <Link
                  to="/agent"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold bg-[#C9A84C] hover:bg-[#b8963e] text-black px-3 sm:px-4 py-2 rounded-lg transition-colors"
                >
                  <LayoutDashboard size={15} />
                  <span>Agent Dashboard</span>
                </Link>
              )}

              {user.role === RoleEnum.admin && (
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold bg-[#C9A84C] hover:bg-[#b8963e] text-black px-3 sm:px-4 py-2 rounded-lg transition-colors"
                >
                  <ShieldCheck size={15} />
                  <span>Admin Dashboard</span>
                </Link>
              )}

              <div className="hidden md:flex items-center gap-2 pl-2 border-l border-white/10">
                <span className="text-xs font-semibold text-white truncate max-w-[140px]">
                  {user.name}
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/10 text-[#C9A84C] px-2 py-0.5 rounded-full">
                  {user.role}
                </span>
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-white/80 hover:text-white border border-white/15 hover:border-white/30 px-3 py-1.5 rounded-lg transition-colors"
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <>
              <Link
                to="/agent"
                className="text-xs sm:text-sm font-bold bg-[#C9A84C] hover:bg-[#b8963e] text-black px-3 sm:px-4 py-2 rounded-lg transition-colors"
              >
                List Property
              </Link>
              {!isLoading && (
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-white/80 hover:text-[#C9A84C] border border-white/15 hover:border-[#C9A84C]/50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <LogIn size={15} />
                  <span>Sign In</span>
                </Link>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col">
          {/* ── Navbar — black + gold ───────────────────────────────────── */}
          <AppNavbar />

          <main className="flex-1 flex flex-col">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/legal" element={<LegalServicesPage />} />
              <Route path="/property/:id" element={<PropertyDetailPage />} />

              {/* Auth & Error Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />

              {/* Agent Protected Routes */}
              <Route element={<ProtectedRoute allowedRoles={[RoleEnum.agent]} />}>
                <Route path="/agent" element={<AgentDashboard />} />
              </Route>

              {/* Admin Protected Routes */}
              <Route element={<ProtectedRoute allowedRoles={[RoleEnum.admin]} />}>
                <Route path="/admin" element={<AdminDashboard />} />
              </Route>
            </Routes>
          </main>

          {/* ── Footer ─────────────────────────────────────────────────── */}
          <footer className="bg-[#0A0A0A] text-white/40 text-xs text-center py-6 px-4">
            © {new Date().getFullYear()} TrustEstate — Verified property discovery for Nigeria.
            Always verify agent identity before making any payments.
            {' · '}
            <Link to="/legal" className="hover:text-white/70 transition-colors">Legal Services</Link>
            {' · '}
            <Link to="/admin" className="hover:text-white/70 transition-colors">Admin</Link>
          </footer>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
