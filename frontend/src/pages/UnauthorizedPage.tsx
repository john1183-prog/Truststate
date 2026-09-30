import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, Home, LogOut } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

export const UnauthorizedPage: React.FC = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 bg-[#F8F6F1]">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
          <ShieldAlert size={28} />
        </div>

        <span className="inline-block text-xs font-black uppercase tracking-widest text-[#C9A84C] mb-1">
          Error 403
        </span>
        <h1 className="text-2xl font-black text-[#0A0A0A] tracking-tight">
          Access Denied
        </h1>
        <p className="text-sm text-gray-600 mt-2 mb-6">
          Your current account does not have permission to access this page.
          {user?.role && (
            <span className="block mt-1 text-xs text-gray-400">
              Signed in as: <strong className="text-gray-700 capitalize">{user.role}</strong>
            </span>
          )}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="flex items-center justify-center gap-2 bg-[#0A0A0A] hover:bg-black text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors"
          >
            <Home size={16} />
            Back to Home
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 border border-gray-200 hover:border-gray-300 text-gray-700 hover:text-black font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};
