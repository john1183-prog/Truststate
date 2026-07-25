import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { PropertyRead, PropertyTypeEnum, PropertyFilters } from '../types';
import { PropertyCard } from '../components/PropertyCard';
import { FilterBar } from '../components/FilterBar';
import { Search, Sparkles, CheckCircle, Clock } from 'lucide-react';

export const HomePage: React.FC = () => {
  const [properties, setProperties] = useState<PropertyRead[]>([]);
  const [recentlyAdded, setRecentlyAdded] = useState<PropertyRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Hero search inputs (kept separate from filters so typing doesn't spam requests until debounced)
  const [neighborhoodInput, setNeighborhoodInput] = useState('');
  const [typeInput, setTypeInput] = useState<PropertyTypeEnum | ''>('');

  // Everything else — price, bedrooms, verified, sort — lives here, fetched server-side
  const [filters, setFilters] = useState<PropertyFilters>({ sort: 'newest' });

  // Debounce neighborhood text input so we don't fire a request on every keystroke
  useEffect(() => {
    const timeout = setTimeout(() => {
      setFilters((prev) => ({ ...prev, neighborhood: neighborhoodInput || undefined }));
    }, 400);
    return () => clearTimeout(timeout);
  }, [neighborhoodInput]);

  useEffect(() => {
    setFilters((prev) => ({ ...prev, property_type: typeInput || undefined }));
  }, [typeInput]);

  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number | boolean> = {};
      if (filters.neighborhood) params.neighborhood = filters.neighborhood;
      if (filters.property_type) params.property_type = filters.property_type;
      if (filters.min_price !== undefined) params.min_price = filters.min_price;
      if (filters.max_price !== undefined) params.max_price = filters.max_price;
      if (filters.bedrooms !== undefined) params.bedrooms = filters.bedrooms;
      if (filters.verified_only) params.verified_only = true;
      if (filters.sort) params.sort = filters.sort;

      const response = await api.get<PropertyRead[]>('/properties/', { params });
      setProperties(response.data);
      setError(null);
    } catch {
      setError('Failed to load properties. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  // Recently added — fetched once, unfiltered, newest-first (independent of the user's active filters)
  useEffect(() => {
    api.get<PropertyRead[]>('/properties/', { params: { sort: 'newest' } })
      .then((res) => setRecentlyAdded(res.data.slice(0, 3)))
      .catch(() => { /* non-critical section, fail silently */ });
  }, []);

  const hasActiveFilters =
    !!filters.neighborhood || !!filters.property_type ||
    filters.min_price !== undefined || filters.max_price !== undefined ||
    filters.bedrooms !== undefined || filters.verified_only;

  return (
    <div className="min-h-screen bg-[#F8F6F1]">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="bg-[#0A0A0A] text-white pt-16 pb-20 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#C9A84C]" />

        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[#C9A84C]/15 text-[#C9A84C] text-xs font-bold px-3 py-1.5 rounded-full mb-6 uppercase tracking-wider border border-[#C9A84C]/30">
            <CheckCircle size={13} />
            100% Verified Listings
          </div>

          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight mb-5">
            Find a home you can<br />
            <span className="text-[#C9A84C]">actually trust.</span>
          </h1>
          <p className="text-white/60 text-lg max-w-xl mx-auto mb-10">
            No fake listings. No ghost agents. Just real, verified properties in Nigeria.
          </p>

          {/* Search bar */}
          <div className="bg-white rounded-2xl p-2 flex flex-col md:flex-row max-w-4xl mx-auto shadow-2xl gap-2">
            <div className="flex-1 relative flex items-center">
              <Search className="absolute left-4 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search by neighbourhood — Lekki, Ikoyi, Yaba…"
                className="w-full pl-11 pr-4 py-3 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
                value={neighborhoodInput}
                onChange={(e) => setNeighborhoodInput(e.target.value)}
              />
            </div>

            <select
              className="px-4 py-3 rounded-xl text-gray-900 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C] md:w-44 border border-gray-100"
              value={typeInput}
              onChange={(e) => setTypeInput(e.target.value as PropertyTypeEnum | '')}
            >
              <option value="">All Types</option>
              <option value="rent">For Rent</option>
              <option value="sale">For Sale</option>
              <option value="short_let">Short Let</option>
            </select>

            <button
              onClick={fetchProperties}
              className="bg-[#C9A84C] hover:bg-[#b8963e] text-black font-black px-8 py-3 rounded-xl transition-colors text-sm"
            >
              Search
            </button>
          </div>
        </div>
      </section>

      {/* ── Trust strip ───────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-gray-100 py-4 px-4">
        <div className="max-w-6xl mx-auto flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-gray-500 font-medium">
          {[
            'Verified listings only',
            'Verified agent identities',
            'Direct WhatsApp & phone contact',
            'No hidden fees',
          ].map((t) => (
            <div key={t} className="flex items-center gap-1.5">
              <CheckCircle size={14} className="text-[#C9A84C]" />
              {t}
            </div>
          ))}
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 py-14 space-y-16">

        {/* ── Recently Added — only shown when no filters are active ─────── */}
        {!hasActiveFilters && recentlyAdded.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Clock size={20} className="text-[#C9A84C]" />
                <h2 className="text-xl font-black text-[#0A0A0A]">Recently Added</h2>
              </div>
              <span className="text-xs font-bold text-[#C9A84C] uppercase tracking-wider">New this week</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentlyAdded.map((p) => (
                <PropertyCard key={p.id} property={p} />
              ))}
            </div>
          </section>
        )}

        {/* ── All Verified Listings ─────────────────────────────────────── */}
        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={20} className="text-[#C9A84C]" />
              <div>
                <h2 className="text-xl font-black text-[#0A0A0A]">
                  {hasActiveFilters ? 'Search Results' : 'Verified Properties'}
                </h2>
                {!loading && (
                  <p className="text-gray-400 text-sm mt-0.5">
                    {properties.length} {properties.length === 1 ? 'property' : 'properties'} found
                  </p>
                )}
              </div>
            </div>
          </div>

          <FilterBar filters={filters} onChange={setFilters} />

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C9A84C]" />
            </div>
          ) : error ? (
            <div className="bg-red-50 text-red-600 p-5 rounded-xl text-center text-sm">{error}</div>
          ) : properties.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl text-center border border-gray-100 shadow-sm">
              <Search size={40} className="text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">No properties found</h3>
              <p className="text-gray-400 text-sm">Try a different neighbourhood, price range, or property type.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((p) => (
                <PropertyCard key={p.id} property={p} />
              ))}
            </div>
          )}
        </section>

        {/* ── Are you an agent CTA ──────────────────────────────────────── */}
        <section className="bg-[#0A0A0A] rounded-3xl p-10 md:p-14 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#C9A84C]" />
          <p className="text-[#C9A84C] text-xs font-black uppercase tracking-widest mb-3">For Agents & Landlords</p>
          <h2 className="text-3xl font-black text-white mb-3">List your property today.</h2>
          <p className="text-white/50 text-sm max-w-md mx-auto mb-8">
            Reach serious buyers and tenants. Get verified. Stand out on Nigeria's most trusted property platform.
          </p>
          <Link
            to="/agent"
            className="inline-flex items-center gap-2 bg-[#C9A84C] hover:bg-[#b8963e] text-black font-black px-8 py-4 rounded-xl transition-colors text-sm"
          >
            List a Property
          </Link>
        </section>

      </main>
    </div>
  );
};
