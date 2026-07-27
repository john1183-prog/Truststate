import React, { useState, FormEvent } from 'react';
import { X, CalendarCheck, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../api';
import { InspectionRequestCreate } from '../types';

interface ScheduleViewModalProps {
  propertyId: number;
  propertyTitle: string;
  onClose: () => void;
}

export const ScheduleViewModal: React.FC<ScheduleViewModalProps> = ({ propertyId, propertyTitle, onClose }) => {
  const [form, setForm] = useState<InspectionRequestCreate>({
    name: '', phone: '', email: '', preferred_date: '', message: '',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      await api.post(`/properties/${propertyId}/inspections`, form);
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarCheck size={20} className="text-[#C9A84C]" />
            <h2 className="font-black text-[#0A0A0A]">Schedule a View</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-5">
          {status === 'success' ? (
            <div className="text-center py-6">
              <CheckCircle size={44} className="text-emerald-500 mx-auto mb-3" />
              <p className="font-bold text-[#0A0A0A] mb-1">Request sent</p>
              <p className="text-sm text-gray-500">
                The agent for "{propertyTitle}" will get back to you to confirm a time.
              </p>
              <button
                onClick={onClose}
                className="mt-5 bg-[#0A0A0A] text-white px-6 py-2.5 rounded-xl font-bold text-sm"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-gray-500 -mt-1">
                For <span className="font-semibold text-[#0A0A0A]">{propertyTitle}</span>
              </p>

              {status === 'error' && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
                  <AlertCircle size={16} />
                  Something went wrong. Please try again.
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Your Name</label>
                <input
                  required name="name" value={form.name} onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#C9A84C] focus:border-[#C9A84C] outline-none"
                  placeholder="e.g. Amaka Eze"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone Number</label>
                <input
                  required name="phone" value={form.phone} onChange={handleChange} type="tel"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#C9A84C] focus:border-[#C9A84C] outline-none"
                  placeholder="e.g. 08012345678"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email (optional)</label>
                <input
                  name="email" value={form.email} onChange={handleChange} type="email"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#C9A84C] focus:border-[#C9A84C] outline-none"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Preferred Date / Time</label>
                <input
                  required name="preferred_date" value={form.preferred_date} onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#C9A84C] focus:border-[#C9A84C] outline-none"
                  placeholder="e.g. Saturday afternoon"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Message (optional)</label>
                <textarea
                  name="message" value={form.message} onChange={handleChange} rows={3}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#C9A84C] focus:border-[#C9A84C] outline-none"
                  placeholder="Anything the agent should know"
                />
              </div>

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full bg-[#C9A84C] hover:bg-[#b8963e] text-black font-black py-3.5 rounded-xl transition-colors disabled:opacity-60"
              >
                {status === 'loading' ? 'Sending...' : 'Request Viewing'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
