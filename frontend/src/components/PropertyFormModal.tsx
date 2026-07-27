import React, { useState, useEffect, FormEvent } from 'react';
import { X, Home, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../api';
import { PropertyRead, PropertyTypeEnum, PropertyCreate, PropertyUpdate, UserRead, RoleEnum } from '../types';

interface PropertyFormModalProps {
  mode: 'add' | 'edit';
  property?: PropertyRead; // required for edit mode
  onClose: () => void;
  onSaved: () => void;
}

const emptyForm = {
  title: '',
  description: '',
  price: 0,
  property_type: PropertyTypeEnum.rent,
  bedrooms: 0,
  bathrooms: 0,
  neighborhood: '',
  address: '',
};

export const PropertyFormModal: React.FC<PropertyFormModalProps> = ({ mode, property, onClose, onSaved }) => {
  const [form, setForm] = useState(
    property
      ? {
          title: property.title,
          description: property.description,
          price: property.price,
          property_type: property.property_type,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          neighborhood: property.neighborhood,
          address: property.address,
        }
      : emptyForm
  );
  const [agentId, setAgentId] = useState<number | ''>('');
  const [agents, setAgents] = useState<UserRead[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Add mode needs an agent to assign the listing to
  useEffect(() => {
    if (mode === 'add') {
      api.get<UserRead[]>('/users/', { params: { role: RoleEnum.agent } })
        .then((res) => setAgents(res.data))
        .catch(() => setError('Could not load agent list.'));
    }
  }, [mode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'price' || name === 'bedrooms' || name === 'bathrooms') {
      setForm((prev) => ({ ...prev, [name]: Number(value) }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setError(null);

    try {
      if (mode === 'add') {
        if (!agentId) {
          setError('Please select an agent.');
          setStatus('idle');
          return;
        }
        const payload: PropertyCreate = { ...form, agent_id: Number(agentId) };
        const res = await api.post<PropertyRead>('/properties/', payload);

        if (imageFile) {
          const imageForm = new FormData();
          imageForm.append('file', imageFile);
          await api.post(`/properties/${res.data.id}/images?is_main=true`, imageForm, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        }
      } else if (property) {
        const payload: PropertyUpdate = { ...form };
        await api.patch(`/properties/${property.id}`, payload);
      }
      onSaved();
      onClose();
    } catch {
      setError('Something went wrong. Please check the form and try again.');
      setStatus('idle');
    }
  };

  const inputClass = "w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#C9A84C] focus:border-[#C9A84C] outline-none transition-colors";
  const labelClass = "block text-sm font-semibold text-gray-700 mb-1.5";

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white p-5 border-b border-gray-100 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <Home size={20} className="text-[#C9A84C]" />
            <h2 className="font-black text-[#0A0A0A]">
              {mode === 'add' ? 'Add Property' : 'Edit Property'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {mode === 'add' && (
              <div className="md:col-span-2">
                <label className={labelClass}>Assign to Agent</label>
                <select
                  required
                  value={agentId}
                  onChange={(e) => setAgentId(e.target.value ? Number(e.target.value) : '')}
                  className={`${inputClass} bg-white`}
                >
                  <option value="">Select an agent...</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.email})</option>
                  ))}
                </select>
              </div>
            )}

            <div className="md:col-span-2">
              <label className={labelClass}>Title</label>
              <input required name="title" value={form.title} onChange={handleChange} className={inputClass} placeholder="e.g. Luxury 4 Bedroom Duplex" />
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Description</label>
              <textarea required name="description" value={form.description} onChange={handleChange} rows={3} className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Price (₦)</label>
              <input required name="price" value={form.price || ''} onChange={handleChange} type="number" min="0" className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Property Type</label>
              <select name="property_type" value={form.property_type} onChange={handleChange} className={`${inputClass} bg-white`}>
                <option value={PropertyTypeEnum.rent}>For Rent</option>
                <option value={PropertyTypeEnum.sale}>For Sale</option>
                <option value={PropertyTypeEnum.short_let}>Short Let</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Bedrooms</label>
              <input required name="bedrooms" value={form.bedrooms || ''} onChange={handleChange} type="number" min="0" className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Bathrooms</label>
              <input required name="bathrooms" value={form.bathrooms || ''} onChange={handleChange} type="number" min="0" className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Neighborhood</label>
              <input required name="neighborhood" value={form.neighborhood} onChange={handleChange} className={inputClass} placeholder="e.g. Lekki Phase 1" />
            </div>

            <div>
              <label className={labelClass}>Full Address</label>
              <input required name="address" value={form.address} onChange={handleChange} className={inputClass} placeholder="e.g. 12 Admiralty Way" />
            </div>

            {mode === 'add' && (
              <div className="md:col-span-2">
                <label className={labelClass}>Property Image</label>
                <input
                  required
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#FBF5E6] file:text-[#b8963e] hover:file:bg-[#C9A84C]/20"
                />
              </div>
            )}
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={status === 'loading'}
              className="bg-[#C9A84C] hover:bg-[#b8963e] text-black px-8 py-3 rounded-xl font-black transition-colors disabled:opacity-70 flex items-center gap-2"
            >
              {status === 'loading' ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle size={18} />
                  {mode === 'add' ? 'Create Listing' : 'Save Changes'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
