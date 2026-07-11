import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { PropertyRead, PropertyTypeEnum } from '../types';
import { PropertyCard } from '../components/PropertyCard';
import { Search, Sparkles, CheckCircle, Clock } from 'lucide-react';

export const HomePage: React.FC = () => {
  const [properties, setProperties] = useState<PropertyRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<PropertyTypeEnum | 'all'>('all');
  const [searchNeighborhood, setSearchNeighborhood] = useState('');

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        const response = await api.get<PropertyRead[]>('/properties/');
        setProperties(response.data);
        setError(null);
      } catch {
        setError('Failed to load properties. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, []);

  const filteredProperties = properties.filter((p) => {
    const matchType = filterType === 'all' || p.property_type === filterType;
    const matchNeighborhood = p.neighborhood.toLowerCase().includes(searchNeighborhood.toLowerCase());
    return matchType && matchNeighborhood;
  });

  // 3 most recent — backend already returns newest-first
  const recentlyAdded = properties.slice(0, 3);

  return (
    <div className="min-h-screen bg-[#F8F6F1]">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="bg-[#0A0A0A] text-white pt-16 pb-20 px-4 relative overflow-hidden">
        {/* Gold accent line */}
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
                value={searchNeighborhood}
                onChange={(e) => setSearchNeighborhood(e.target.value)}
              />
            </div>

            <select
              className="px-4 py-3 rounded-xl text-gray-900 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C] md:w-44 border border-gray-100"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as PropertyTypeEnum | 'all')}
            >
              <option value="all">All Types</option>
              <option value="rent">For Rent</option>
              <option value="sale">For Sale</option>
              <option value="short_let">Short Let</option>
            </select>

            <button className="bg-[#C9A84C] hover:bg-[#b8963e] text-black font-black px-8 py-3 rounded-xl transition-colors text-sm">
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

        {/* ── Recently Added ────────────────────────────────────────────── */}
        {!loading && recentlyAdded.length > 0 && (
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
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Sparkles size={20} className="text-[#C9A84C]" />
              <div>
                <h2 className="text-xl font-black text-[#0A0A0A]">Verified Properties</h2>
                {!loading && (
                  <p className="text-gray-400 text-sm mt-0.5">
                    {filteredProperties.length} {filteredProperties.length === 1 ? 'property' : 'properties'} found
                  </p>
                )}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C9A84C]" />
            </div>
          ) : error ? (
            <div className="bg-red-50 text-red-600 p-5 rounded-xl text-center text-sm">{error}</div>
          ) : filteredProperties.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl text-center border border-gray-100 shadow-sm">
              <Search size={40} className="text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">No properties found</h3>
              <p className="text-gray-400 text-sm">Try a different neighbourhood or property type.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProperties.map((p) => (
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
