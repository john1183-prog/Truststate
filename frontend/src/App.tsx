import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { AgentDashboard } from './pages/AgentDashboard';
import { PropertyDetailPage } from './pages/PropertyDetailPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        {/* ── Navbar — black + gold ───────────────────────────────────── */}
        <header className="bg-[#0A0A0A] sticky top-0 z-30 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            {/* Wordmark */}
            <Link to="/" className="text-xl font-black tracking-tighter text-white">
              TRUST<span className="text-[#C9A84C]">ESTATE</span>
            </Link>

            {/* Nav links */}
            <nav className="flex items-center gap-3">
              <Link
                to="/"
                className="text-sm font-medium text-white/70 hover:text-white transition-colors hidden sm:block"
              >
                Browse
              </Link>
              <Link
                to="/agent"
                className="text-sm font-bold bg-[#C9A84C] hover:bg-[#b8963e] text-black px-4 py-2 rounded-lg transition-colors"
              >
                List Property
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/agent" element={<AgentDashboard />} />
            <Route path="/property/:id" element={<PropertyDetailPage />} />
          </Routes>
        </main>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <footer className="bg-[#0A0A0A] text-white/40 text-xs text-center py-6 px-4">
          © {new Date().getFullYear()} TrustEstate — Verified property discovery for Nigeria.
          Always verify agent identity before making any payments.
        </footer>
      </div>
    </BrowserRouter>
  );
};

export default App;
