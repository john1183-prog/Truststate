import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { AgentDashboard } from './pages/AgentDashboard';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        {/* Simple Global Navbar for Navigation */}
        <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link to="/" className="text-xl font-black text-blue-900 tracking-tighter">
              TRUST<span className="text-blue-600">ESTATE</span>
            </Link>
            <nav className="flex gap-4">
              <Link to="/" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
                Home
              </Link>
              <Link to="/agent" className="text-sm font-medium bg-blue-50 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors">
                Agent Portal
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/agent" element={<AgentDashboard />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App;
