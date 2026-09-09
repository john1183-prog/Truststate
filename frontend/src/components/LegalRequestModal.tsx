import React, { useState, FormEvent } from 'react';
import { X, Scale, CheckCircle, AlertCircle, Shield } from 'lucide-react';
import api from '../api';
import { LegalRequestCreate, LEGAL_SERVICES, LawyerSummary, UserRead } from '../types';

interface LegalRequestModalProps {
  onClose: () => void;
  lawyer?: UserRead | LawyerSummary | null;
  initialService?: string;
  propertyTitle?: string;
}

export const LegalRequestModal: React.FC<LegalRequestModalProps> = ({
  onClose,
  lawyer,
  initialService = 'Title Verification',
  propertyTitle,
}) => {
  const [form, setForm] = useState<LegalRequestCreate>({
    name: '',
    phone: '',
    email: '',
    service_type: initialService,
    message: propertyTitle ? `Legal verification inquiry regarding: ${propertyTitle}` : '',
    lawyer_id: lawyer ? lawyer.id : undefined,
  });

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      const payload: LegalRequestCreate = {
        ...form,
        email: form.email?.trim() ? form.email.trim() : undefined,
        lawyer_id: lawyer ? lawyer.id : undefined,
      };
      await api.post('/legal-requests/', payload);
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xs">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white p-5 border-b border-gray-100 flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#C9A84C]/15 flex items-center justify-center text-[#C9A84C]">
              <Scale size={20} />
            </div>
            <div>
              <h2 className="font-black text-[#0A0A0A] text-base sm:text-lg">
                {lawyer ? 'Book Legal Consultation' : 'Request Legal Services'}
              </h2>
              <p className="text-xs text-gray-500">
                {lawyer
                  ? `With ${lawyer.name}`
                  : propertyTitle
                  ? 'Request independent lawyer title review & due diligence'
                  : 'Connect with independent Nigerian property counsel'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          {status === 'success' ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={36} />
              </div>
              <h3 className="font-black text-xl text-[#0A0A0A] mb-2">Request Submitted</h3>
              <p className="text-sm text-gray-600 max-w-sm mx-auto leading-relaxed">
                {lawyer
                  ? `Your consultation inquiry has been routed to ${lawyer.name}. You will be contacted via phone or email.`
                  : 'Your legal verification request has been received. A property counsel will contact you to review your requirements.'}
              </p>
              <div className="mt-6 p-3 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-800 flex items-center gap-2 text-left">
                <Shield size={16} className="shrink-0 text-[#C9A84C]" />
                <span>Never transfer land payment or legal deed fees until official documentation is signed in person.</span>
              </div>
              <button
                onClick={onClose}
                className="mt-6 w-full bg-[#0A0A0A] hover:bg-black text-white px-6 py-3 rounded-xl font-bold text-sm transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {lawyer && (
                <div className="bg-[#F8F6F1] border border-[#C9A84C]/30 rounded-xl p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#C9A84C] text-black font-black flex items-center justify-center text-sm shrink-0">
                    {lawyer.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-[#0A0A0A]">{lawyer.name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {lawyer.years_of_experience ? `${lawyer.years_of_experience} yrs experience · ` : ''}
                      {lawyer.specializations?.slice(0, 2).join(', ') || 'Property Law Specialist'}
                    </p>
                  </div>
                </div>
              )}

              {propertyTitle && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs text-gray-600">
                  Property in reference: <span className="font-semibold text-[#0A0A0A]">{propertyTitle}</span>
                </div>
              )}

              {status === 'error' && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>Something went wrong while submitting. Please check your details and try again.</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#C9A84C] focus:border-[#C9A84C] outline-none transition-all"
                  placeholder="e.g. Babatunde Fashola"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#C9A84C] focus:border-[#C9A84C] outline-none transition-all"
                  placeholder="e.g. 08031234567"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Email Address <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#C9A84C] focus:border-[#C9A84C] outline-none transition-all"
                  placeholder="you@domain.ng"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Service Category <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  name="service_type"
                  value={form.service_type}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#C9A84C] focus:border-[#C9A84C] outline-none transition-all"
                >
                  {LEGAL_SERVICES.map((srv) => (
                    <option key={srv} value={srv}>
                      {srv}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Inquiry Details <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  name="message"
                  value={form.message || ''}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#C9A84C] focus:border-[#C9A84C] outline-none transition-all resize-none"
                  placeholder="Describe your property documentation, location, or specific questions..."
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full bg-[#C9A84C] hover:bg-[#b8963e] text-black font-black py-3.5 rounded-xl transition-colors disabled:opacity-60 text-sm shadow-md"
                >
                  {status === 'loading' ? 'Submitting Inquiry...' : 'Submit Legal Inquiry'}
                </button>
              </div>

              <p className="text-xs text-gray-400 text-center">
                This is a direct inquiry capture form. No online payment is collected.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
