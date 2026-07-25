import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { PropertyRead, PropertyStatusEnum, UserRead, RoleEnum } from '../types';
import {
  ClipboardList, Users, CheckCircle, XCircle, ShieldCheck,
  Trash2, Home, AlertCircle, Ban, RotateCcw,
} from 'lucide-react';

type ListingFilter = 'all' | PropertyStatusEnum;

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-700',
  taken: 'bg-gray-200 text-gray-600',
};

const FILTER_TABS: { label: string; value: ListingFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: PropertyStatusEnum.pending },
  { label: 'Approved', value: PropertyStatusEnum.approved },
  { label: 'Rejected', value: PropertyStatusEnum.rejected },
  { label: 'Taken', value: PropertyStatusEnum.taken },
];

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'listings' | 'agents'>('listings');

  return (
    <div className="min-h-screen bg-[#F8F6F1] flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="md:w-64 bg-[#0A0A0A] shrink-0">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-lg font-black text-white">Admin Console</h2>
          <p className="text-xs text-white/40 mt-0.5">Trust Estate</p>
        </div>
        <nav className="flex md:flex-col p-3 gap-1">
          <button
            onClick={() => setActiveTab('listings')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-colors ${
              activeTab === 'listings' ? 'bg-[#C9A84C] text-black' : 'text-white/60 hover:bg-white/5'
            }`}
          >
            <ClipboardList size={18} />
            Listings
          </button>
          <button
            onClick={() => setActiveTab('agents')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-colors ${
              activeTab === 'agents' ? 'bg-[#C9A84C] text-black' : 'text-white/60 hover:bg-white/5'
            }`}
          >
            <Users size={18} />
            Agents
          </button>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-5 md:p-8 overflow-x-hidden">
        {activeTab === 'listings' ? <ListingsPanel /> : <AgentsPanel />}
      </main>
    </div>
  );
};

// ── Listings Panel ────────────────────────────────────────────────────────

const ListingsPanel: React.FC = () => {
  const [properties, setProperties] = useState<PropertyRead[]>([]);
  const [filter, setFilter] = useState<ListingFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<number | null>(null);

  const fetchListings = useCallback(async () => {
    try {
      setLoading(true);
      const params = filter === 'all' ? {} : { status: filter };
      const res = await api.get<PropertyRead[]>('/admin/properties/', { params });
      setProperties(res.data);
      setError(null);
    } catch {
      setError('Failed to load listings.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  const patchProperty = async (id: number, body: Record<string, unknown>) => {
    setActioningId(id);
    try {
      await api.patch(`/properties/${id}`, body);
      await fetchListings();
    } catch {
      setError('Action failed. Please try again.');
    } finally {
      setActioningId(null);
    }
  };

  const deleteProperty = async (id: number, title: string) => {
    if (!window.confirm(`Permanently delete "${title}"? This cannot be undone.`)) return;
    setActioningId(id);
    try {
      await api.delete(`/properties/${id}`);
      setProperties((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setError('Delete failed. Please try again.');
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-black text-[#0A0A0A] mb-1">Listings</h1>
      <p className="text-gray-500 text-sm mb-6">Approve, reject, verify, or remove submitted properties.</p>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              filter === tab.value
                ? 'bg-[#0A0A0A] text-white'
                : 'bg-white text-gray-500 border border-gray-200 hover:border-[#C9A84C]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#C9A84C]" />
        </div>
      ) : properties.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl text-center border border-gray-100">
          <Home size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No listings in this category.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {properties.map((p) => {
            const thumb = p.images[0]?.cloudinary_url ?? 'https://placehold.co/100x100?text=No+Img';
            const busy = actioningId === p.id;
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <img src={thumb} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0 bg-gray-100" />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-[#0A0A0A] truncate">{p.title}</p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[p.status]}`}>
                      {p.status}
                    </span>
                    {p.is_verified && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#FBF5E6] text-[#b8963e] border border-[#C9A84C]/30">
                        Verified
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mt-0.5">
                    {p.neighborhood} · ₦{p.price.toLocaleString()} · Agent: {p.agent?.name ?? '—'}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {p.status === 'pending' && (
                    <>
                      <button
                        disabled={busy}
                        onClick={() => patchProperty(p.id, { status: 'approved' })}
                        className="flex items-center gap-1.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-lg disabled:opacity-50"
                      >
                        <CheckCircle size={14} /> Approve
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => patchProperty(p.id, { status: 'rejected' })}
                        className="flex items-center gap-1.5 text-xs font-bold bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg disabled:opacity-50"
                      >
                        <XCircle size={14} /> Reject
                      </button>
                    </>
                  )}

                  {p.status === 'approved' && (
                    <button
                      disabled={busy}
                      onClick={() => patchProperty(p.id, { status: 'taken' })}
                      className="text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg disabled:opacity-50"
                    >
                      Mark Taken
                    </button>
                  )}

                  <button
                    disabled={busy}
                    onClick={() => patchProperty(p.id, { is_verified: !p.is_verified })}
                    className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-50 ${
                      p.is_verified
                        ? 'bg-[#C9A84C] text-black'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <ShieldCheck size={14} />
                    {p.is_verified ? 'Verified' : 'Verify'}
                  </button>

                  <button
                    disabled={busy}
                    onClick={() => deleteProperty(p.id, p.title)}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-50"
                    title="Delete permanently"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Agents Panel ──────────────────────────────────────────────────────────

const AgentsPanel: React.FC = () => {
  const [agents, setAgents] = useState<UserRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<number | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<UserRead[]>('/users/', { params: { role: RoleEnum.agent } });
      setAgents(res.data);
      setError(null);
    } catch {
      setError('Failed to load agents.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  const patchAgent = async (id: number, body: Record<string, unknown>) => {
    setActioningId(id);
    try {
      await api.patch(`/users/${id}`, body);
      await fetchAgents();
    } catch {
      setError('Action failed. Please try again.');
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-black text-[#0A0A0A] mb-1">Agent Accounts</h1>
      <p className="text-gray-500 text-sm mb-6">Verify identities and suspend accounts if needed.</p>

      {error && (
        <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#C9A84C]" />
        </div>
      ) : agents.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl text-center border border-gray-100">
          <Users size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No agents registered yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {agents.map((agent) => {
            const busy = actioningId === agent.id;
            return (
              <div key={agent.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-[#0A0A0A] flex items-center justify-center shrink-0">
                  <span className="text-[#C9A84C] font-black">{agent.name.charAt(0).toUpperCase()}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-[#0A0A0A]">{agent.name}</p>
                    {agent.is_verified && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#FBF5E6] text-[#b8963e] border border-[#C9A84C]/30">
                        Verified
                      </span>
                    )}
                    {!agent.is_active && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                        Suspended
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mt-0.5">{agent.email} · {agent.phone}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    disabled={busy}
                    onClick={() => patchAgent(agent.id, { is_verified: !agent.is_verified })}
                    className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-50 ${
                      agent.is_verified ? 'bg-[#C9A84C] text-black' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <ShieldCheck size={14} />
                    {agent.is_verified ? 'Verified' : 'Verify'}
                  </button>

                  {agent.is_active ? (
                    <button
                      disabled={busy}
                      onClick={() => patchAgent(agent.id, { is_active: false })}
                      className="flex items-center gap-1.5 text-xs font-bold bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-lg disabled:opacity-50"
                    >
                      <Ban size={14} /> Suspend
                    </button>
                  ) : (
                    <button
                      disabled={busy}
                      onClick={() => patchAgent(agent.id, { is_active: true })}
                      className="flex items-center gap-1.5 text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-2 rounded-lg disabled:opacity-50"
                    >
                      <RotateCcw size={14} /> Reactivate
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
