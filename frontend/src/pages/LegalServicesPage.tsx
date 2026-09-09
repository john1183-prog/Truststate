import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { UserRead, LEGAL_SERVICES, LegalServiceType } from '../types';
import { LegalRequestModal } from '../components/LegalRequestModal';
import {
  Scale,
  ShieldCheck,
  Briefcase,
  Phone,
  Mail,
  AlertCircle,
  FileCheck2,
  FileText,
  UserCheck,
} from 'lucide-react';

export const LegalServicesPage: React.FC = () => {
  const [lawyers, setLawyers] = useState<UserRead[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedLawyer, setSelectedLawyer] = useState<UserRead | null>(null);
  const [initialService, setInitialService] = useState<LegalServiceType>('Title Verification');

  const fetchLawyers = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (selectedCategory !== 'all') {
        params.specialization = selectedCategory;
      }
      const res = await api.get<UserRead[]>('/lawyers/', { params });
      setLawyers(res.data);
      setError(null);
    } catch {
      setError('Failed to load legal partners. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    fetchLawyers();
  }, [fetchLawyers]);

  const handleOpenModal = (lawyer: UserRead | null, service: LegalServiceType) => {
    setSelectedLawyer(lawyer);
    setInitialService(service);
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F8F6F1] pb-16">
      {/* ── Hero Banner (Black & Gold) ─────────────────────────────────── */}
      <section className="bg-[#0A0A0A] text-white py-12 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-[#C9A84C]/15 border border-[#C9A84C]/30 text-[#C9A84C] text-xs font-bold px-3 py-1.5 rounded-full mb-4 uppercase tracking-wider">
            <Scale size={14} />
            Verified Legal Services & Title Review
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight max-w-3xl">
            Protect your property transaction with vetted Nigerian legal counsel.
          </h1>
          <p className="text-white/70 text-sm sm:text-base mt-4 max-w-2xl leading-relaxed">
            Avoid land disputes, defective titles, and fraudulent deeds. Connect with registered property
            lawyers for title search, due diligence, and governor's consent perfection.
          </p>

          {/* Quick General Inquiry CTA */}
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={() => handleOpenModal(null, 'Title Verification')}
              className="bg-[#C9A84C] hover:bg-[#b8963e] text-black font-black px-6 py-3.5 rounded-xl text-sm transition-colors shadow-lg flex items-center gap-2"
            >
              <FileCheck2 size={18} />
              Request General Title Due Diligence
            </button>
            <button
              onClick={() => handleOpenModal(null, 'Contract Drafting')}
              className="bg-white/10 hover:bg-white/15 text-white font-bold px-5 py-3.5 rounded-xl text-sm transition-colors border border-white/15 flex items-center gap-2"
            >
              <FileText size={18} />
              Request Deed / Contract Review
            </button>
          </div>
        </div>
      </section>

      {/* ── Specializations Filter Bar ───────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-black text-[#0A0A0A]">Browse By Specialization</h2>
          {selectedCategory !== 'all' && (
            <button
              onClick={() => setSelectedCategory('all')}
              className="text-xs font-bold text-[#C9A84C] hover:underline"
            >
              Show All Specializations
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
              selectedCategory === 'all'
                ? 'bg-[#0A0A0A] text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-[#C9A84C]'
            }`}
          >
            All Specializations
          </button>
          {LEGAL_SERVICES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
                selectedCategory === cat
                  ? 'bg-[#0A0A0A] text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-[#C9A84C]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Lawyers Directory ────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-sm flex items-center gap-3">
            <AlertCircle size={20} className="shrink-0 text-red-500" />
            <div className="flex-1">
              <p className="font-bold">Unable to load legal counsel directory</p>
              <p className="text-xs text-red-600 mt-0.5">{error}</p>
            </div>
            <button
              onClick={() => fetchLawyers()}
              className="text-xs font-bold bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1.5 rounded-lg"
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-300 border-t-[#C9A84C] mb-4" />
            <p className="text-sm font-semibold text-gray-500">Loading verified legal counsel...</p>
          </div>
        ) : lawyers.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 shadow-sm max-w-lg mx-auto my-8">
            <div className="w-16 h-16 rounded-full bg-[#C9A84C]/10 text-[#C9A84C] flex items-center justify-center mx-auto mb-4">
              <Scale size={32} />
            </div>
            <h3 className="text-lg font-black text-[#0A0A0A] mb-1">No Lawyers Found</h3>
            <p className="text-sm text-gray-500 mb-6">
              {selectedCategory !== 'all'
                ? `No legal counsel currently listed under "${selectedCategory}". Try clearing your filter or submit a general legal inquiry.`
                : 'No lawyers are currently listed. You can still submit a general legal inquiry for prompt follow-up.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              {selectedCategory !== 'all' && (
                <button
                  onClick={() => setSelectedCategory('all')}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold text-gray-800 transition-colors"
                >
                  Clear Filter
                </button>
              )}
              <button
                onClick={() => handleOpenModal(null, 'Title Verification')}
                className="px-5 py-2.5 bg-[#C9A84C] hover:bg-[#b8963e] rounded-xl text-xs font-black text-black transition-colors"
              >
                Submit General Inquiry
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lawyers.map((lawyer) => {
              const initials = lawyer.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();

              return (
                <div
                  key={lawyer.id}
                  className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col border border-gray-100 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                >
                  {/* Top Card Banner */}
                  <div className="p-6 border-b border-gray-100 flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#0A0A0A] text-[#C9A84C] flex items-center justify-center font-black text-lg shrink-0 border border-[#C9A84C]/30 shadow-inner">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-black text-base text-[#0A0A0A] leading-tight truncate">
                          {lawyer.name}
                        </h3>
                        {lawyer.is_verified && (
                          <span
                            className="inline-flex items-center gap-1 text-[#C9A84C] text-xs font-bold"
                            title="Verified Identity by Trust Estate"
                          >
                            <ShieldCheck size={15} />
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-1.5">
                        {lawyer.years_of_experience !== undefined && lawyer.years_of_experience !== null && (
                          <span className="flex items-center gap-1 font-semibold text-gray-700">
                            <Briefcase size={13} className="text-[#C9A84C]" />
                            {lawyer.years_of_experience} Yrs Experience
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-gray-400">
                          <UserCheck size={13} />
                          Active
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    {/* Bio */}
                    {lawyer.bio ? (
                      <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">
                        {lawyer.bio}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400 italic">
                        Nigerian property law counsel specializing in real estate transactions and title perfection.
                      </p>
                    )}

                    {/* Specializations Pills */}
                    {lawyer.specializations && lawyer.specializations.length > 0 && (
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                          Specializations
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {lawyer.specializations.map((spec, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] font-semibold bg-[#F8F6F1] text-gray-700 px-2.5 py-1 rounded-lg border border-gray-200"
                            >
                              {spec}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Direct Contact Notice */}
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Phone size={12} /> {lawyer.phone}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail size={12} /> Direct Lead
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleOpenModal(lawyer, 'Title Verification')}
                        className="w-full bg-[#C9A84C] hover:bg-[#b8963e] text-black font-black py-2.5 px-2 rounded-xl text-xs transition-colors text-center shadow-xs"
                      >
                        Book Consultation
                      </button>
                      <button
                        onClick={() => handleOpenModal(lawyer, 'Contract Drafting')}
                        className="w-full bg-[#0A0A0A] hover:bg-black text-white font-bold py-2.5 px-2 rounded-xl text-xs transition-colors text-center"
                      >
                        Request Review
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Modal ────────────────────────────────────────────────────── */}
      {modalOpen && (
        <LegalRequestModal
          lawyer={selectedLawyer}
          initialService={initialService}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
};

export default LegalServicesPage;
