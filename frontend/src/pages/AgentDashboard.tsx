import React, { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { PropertyCreate, PropertyRead, PropertyTypeEnum, NotificationRead } from '../types';
import { Upload, Home, List, AlertCircle, CheckCircle, Bell, Check, ExternalLink } from 'lucide-react';
import { useNotificationPolling } from '../hooks/useNotificationPolling';

const STATUS_STYLES: Record<string, string> = {
  approved: 'bg-emerald-100 text-emerald-800',
  pending: 'bg-amber-100 text-amber-800',
  rejected: 'bg-red-100 text-red-700',
  taken: 'bg-gray-200 text-gray-600',
};

export const AgentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'upload' | 'listings' | 'notifications'>('listings');
  const [myListings, setMyListings] = useState<PropertyRead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hardcoded agent ID for MVP — no auth yet
  const AGENT_ID = 1;

  const [notifications, setNotifications] = useState<NotificationRead[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [markingReadId, setMarkingReadId] = useState<number | null>(null);

  const { unreadCount, refreshUnreadCount } = useNotificationPolling({
    userId: AGENT_ID,
    enabled: true,
  });

  const [formData, setFormData] = useState<PropertyCreate>({
    title: '',
    description: '',
    price: 0,
    property_type: PropertyTypeEnum.rent,
    bedrooms: 0,
    bathrooms: 0,
    neighborhood: '',
    address: '',
    agent_id: AGENT_ID
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const fetchMyListings = async () => {
    try {
      setLoading(true);
      // For MVP, we'll fetch all admin properties and filter by agent ID.
      // In a real app, there'd be an /agent/properties route.
      const response = await api.get<PropertyRead[]>('/admin/properties/');
      const mine = response.data.filter(p => p.agent_id === AGENT_ID);
      setMyListings(mine);
    } catch (err) {
      console.error(err);
      setError("Failed to load your listings.");
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      setNotificationsLoading(true);
      const response = await api.get<NotificationRead[]>('/notifications/', {
        params: { user_id: AGENT_ID, limit: 20 },
      });
      setNotifications(response.data);
      setNotificationsError(null);
    } catch (err) {
      console.error(err);
      setNotificationsError('Failed to load notifications.');
    } finally {
      setNotificationsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'listings') {
      fetchMyListings();
    } else if (activeTab === 'notifications') {
      fetchNotifications();
    }
  }, [activeTab]);

  const handleMarkAsRead = async (id: number) => {
    setMarkingReadId(id);
    try {
      await api.patch(`/notifications/${id}/read`, null, {
        params: { user_id: AGENT_ID },
      });
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
      );
      refreshUnreadCount();
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    } finally {
      setMarkingReadId(null);
    }
  };

  const handleNotificationNavigate = (link?: string | null) => {
    if (!link) return;
    try {
      if (link === '/agent' || link.startsWith('/agent?')) {
        setActiveTab('listings');
      } else {
        navigate(link);
      }
    } catch (err) {
      console.error('Failed to navigate:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'price' || name === 'bedrooms' || name === 'bathrooms') {
      setFormData(prev => ({ ...prev, [name]: Number(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitStatus('loading');

    try {
      const propResponse = await api.post<PropertyRead>('/properties/', formData);
      const newProperty = propResponse.data;

      if (imageFile) {
        const imageFormData = new FormData();
        imageFormData.append('file', imageFile);

        await api.post(`/properties/${newProperty.id}/images?is_main=true`, imageFormData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      setSubmitStatus('success');
      setFormData({
        title: '',
        description: '',
        price: 0,
        property_type: PropertyTypeEnum.rent,
        bedrooms: 0,
        bathrooms: 0,
        neighborhood: '',
        address: '',
        agent_id: AGENT_ID
      });
      setImageFile(null);

      setTimeout(() => {
        setSubmitStatus('idle');
        setActiveTab('listings');
      }, 2000);

    } catch (err) {
      console.error(err);
      setSubmitStatus('error');
    }
  };

  const inputClass = "w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#C9A84C] focus:border-[#C9A84C] outline-none transition-colors";
  const labelClass = "block text-sm font-semibold text-gray-700 mb-1.5";

  return (
    <div className="min-h-screen bg-[#F8F6F1] flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="md:w-64 bg-[#0A0A0A] shrink-0">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-lg font-black text-white">Agent Portal</h2>
          <p className="text-xs text-white/40 mt-0.5">Trust Estate</p>
        </div>
        <nav className="flex md:flex-col p-3 gap-1 overflow-x-auto md:overflow-visible">
          <button
            onClick={() => setActiveTab('listings')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-colors shrink-0 ${activeTab === 'listings' ? 'bg-[#C9A84C] text-black' : 'text-white/60 hover:bg-white/5'}`}
          >
            <List size={18} />
            My Listings
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-colors shrink-0 ${activeTab === 'upload' ? 'bg-[#C9A84C] text-black' : 'text-white/60 hover:bg-white/5'}`}
          >
            <Upload size={18} />
            Upload Property
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-colors shrink-0 ${
              activeTab === 'notifications' ? 'bg-[#C9A84C] text-black' : 'text-white/60 hover:bg-white/5'
            }`}
          >
            <span className="flex items-center gap-3">
              <Bell size={18} />
              Notifications
            </span>
            {unreadCount > 0 && (
              <span
                className={`text-xs font-black px-2 py-0.5 rounded-full ${
                  activeTab === 'notifications'
                    ? 'bg-[#0A0A0A] text-[#C9A84C]'
                    : 'bg-[#C9A84C] text-black'
                }`}
              >
                {unreadCount}
              </span>
            )}
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-5 md:p-8">

        {activeTab === 'upload' && (
          <div className="max-w-3xl mx-auto bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
            <h1 className="text-2xl font-black text-[#0A0A0A] mb-6">Upload New Property</h1>

            {submitStatus === 'success' && (
              <div className="mb-6 bg-emerald-50 text-emerald-700 p-4 rounded-xl flex items-center gap-2 text-sm font-medium">
                <CheckCircle size={20} />
                Property submitted successfully! It is now pending admin approval.
              </div>
            )}

            {submitStatus === 'error' && (
              <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-2 text-sm font-medium">
                <AlertCircle size={20} />
                Failed to submit property. Please check your connection and try again.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className={labelClass}>Title</label>
                  <input required name="title" value={formData.title} onChange={handleInputChange} type="text" className={inputClass} placeholder="e.g. Luxury 4 Bedroom Duplex" />
                </div>

                <div className="md:col-span-2">
                  <label className={labelClass}>Description</label>
                  <textarea required name="description" value={formData.description} onChange={handleInputChange} rows={4} className={inputClass} placeholder="Describe the property..."></textarea>
                </div>

                <div>
                  <label className={labelClass}>Price (₦)</label>
                  <input required name="price" value={formData.price || ''} onChange={handleInputChange} type="number" min="0" className={inputClass} />
                </div>

                <div>
                  <label className={labelClass}>Property Type</label>
                  <select name="property_type" value={formData.property_type} onChange={handleInputChange} className={`${inputClass} bg-white`}>
                    <option value={PropertyTypeEnum.rent}>For Rent</option>
                    <option value={PropertyTypeEnum.sale}>For Sale</option>
                    <option value={PropertyTypeEnum.short_let}>Short Let</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Bedrooms</label>
                  <input required name="bedrooms" value={formData.bedrooms || ''} onChange={handleInputChange} type="number" min="0" className={inputClass} />
                </div>

                <div>
                  <label className={labelClass}>Bathrooms</label>
                  <input required name="bathrooms" value={formData.bathrooms || ''} onChange={handleInputChange} type="number" min="0" className={inputClass} />
                </div>

                <div>
                  <label className={labelClass}>Neighborhood</label>
                  <input required name="neighborhood" value={formData.neighborhood} onChange={handleInputChange} type="text" className={inputClass} placeholder="e.g. Lekki Phase 1" />
                </div>

                <div>
                  <label className={labelClass}>Full Address</label>
                  <input required name="address" value={formData.address} onChange={handleInputChange} type="text" className={inputClass} placeholder="e.g. 12 Admiralty Way" />
                </div>

                <div className="md:col-span-2">
                  <label className={labelClass}>Property Image (Main)</label>
                  <input required type="file" accept="image/*" onChange={handleFileChange} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#FBF5E6] file:text-[#b8963e] hover:file:bg-[#C9A84C]/20" />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={submitStatus === 'loading'}
                  className="bg-[#C9A84C] hover:bg-[#b8963e] text-black px-8 py-3 rounded-xl font-black transition-colors disabled:opacity-70 flex items-center gap-2"
                >
                  {submitStatus === 'loading' ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                      Submitting...
                    </>
                  ) : (
                    'Submit Property'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'listings' && (
          <div className="max-w-5xl mx-auto">
            <h1 className="text-2xl font-black text-[#0A0A0A] mb-6">My Submitted Listings</h1>

            {loading ? (
              <div className="flex justify-center items-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#C9A84C]"></div>
              </div>
            ) : error ? (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm">{error}</div>
            ) : myListings.length === 0 ? (
              <div className="bg-white p-10 rounded-2xl text-center border border-gray-100 shadow-sm flex flex-col items-center">
                <Home size={48} className="text-gray-300 mb-4" />
                <h3 className="text-lg font-bold text-gray-900 mb-1">No listings yet</h3>
                <p className="text-gray-500 mb-6">You haven't uploaded any properties.</p>
                <button
                  onClick={() => setActiveTab('upload')}
                  className="bg-[#FBF5E6] hover:bg-[#C9A84C]/20 text-[#b8963e] px-6 py-2.5 rounded-xl font-bold transition-colors"
                >
                  Upload your first property
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-6 py-4 font-bold text-gray-500 text-xs uppercase tracking-wider">Property</th>
                      <th className="px-6 py-4 font-bold text-gray-500 text-xs uppercase tracking-wider">Type</th>
                      <th className="px-6 py-4 font-bold text-gray-500 text-xs uppercase tracking-wider">Price</th>
                      <th className="px-6 py-4 font-bold text-gray-500 text-xs uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {myListings.map(property => (
                      <tr key={property.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-[#0A0A0A]">{property.title}</p>
                          <p className="text-sm text-gray-400">{property.neighborhood}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="capitalize text-sm text-gray-600">{property.property_type.replace('_', ' ')}</span>
                        </td>
                        <td className="px-6 py-4 font-bold text-[#0A0A0A]">
                          ₦{property.price.toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold capitalize ${STATUS_STYLES[property.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {property.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-black text-[#0A0A0A]">Notifications</h1>
                <p className="text-gray-500 text-sm mt-1">
                  Viewing requests and inspection alerts for your properties.
                </p>
              </div>
              {unreadCount > 0 && (
                <span className="bg-[#FBF5E6] text-[#b8963e] border border-[#C9A84C]/30 text-xs font-bold px-3 py-1 rounded-full">
                  {unreadCount} unread
                </span>
              )}
            </div>

            {notificationsLoading ? (
              <div className="flex justify-center items-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#C9A84C]" />
              </div>
            ) : notificationsError ? (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm">{notificationsError}</div>
            ) : notifications.length === 0 ? (
              <div className="bg-white p-10 rounded-2xl text-center border border-gray-100 shadow-sm flex flex-col items-center">
                <Bell size={48} className="text-gray-300 mb-4" />
                <h3 className="text-lg font-bold text-gray-900 mb-1">No notifications yet</h3>
                <p className="text-gray-500 text-sm">
                  You will receive notifications here when seekers request inspections on your listings.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`bg-white rounded-2xl border transition-all p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      !n.is_read
                        ? 'border-[#C9A84C]/50 shadow-xs ring-1 ring-[#C9A84C]/20'
                        : 'border-gray-100 opacity-90'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          !n.is_read
                            ? 'bg-[#FBF5E6] text-[#b8963e]'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        <Bell size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-[#0A0A0A] text-base">{n.title}</h3>
                          {!n.is_read && (
                            <span className="inline-block w-2 h-2 rounded-full bg-[#C9A84C]" />
                          )}
                        </div>
                        <p className="text-gray-700 text-sm mt-1">{n.message}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(n.created_at).toLocaleString('en-NG', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {!n.is_read && (
                        <button
                          onClick={() => handleMarkAsRead(n.id)}
                          disabled={markingReadId === n.id}
                          className="flex items-center gap-1.5 text-xs font-bold bg-[#0A0A0A] hover:bg-black/80 text-white px-3.5 py-2 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Check size={14} />
                          Mark read
                        </button>
                      )}
                      {n.link && (
                        <button
                          onClick={() => handleNotificationNavigate(n.link)}
                          className="flex items-center gap-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 px-3.5 py-2 rounded-lg transition-colors"
                        >
                          <span>View</span>
                          <ExternalLink size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
