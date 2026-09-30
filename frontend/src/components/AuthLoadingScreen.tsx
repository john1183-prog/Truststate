import React from 'react';

export const AuthLoadingScreen: React.FC = () => {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex-1 flex flex-col items-center justify-center py-32 px-4 bg-[#F8F6F1]"
    >
      <div className="flex flex-col items-center space-y-4">
        <div className="text-xl font-black tracking-tighter text-[#0A0A0A]">
          TRUST<span className="text-[#C9A84C]">ESTATE</span>
        </div>
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-[#C9A84C]" />
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Restoring session...
        </p>
      </div>
    </div>
  );
};
