import React from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { PropertyFilters } from '../types';

interface FilterBarProps {
  filters: PropertyFilters;
  onChange: (filters: PropertyFilters) => void;
}

const PRICE_PRESETS = [
  { label: 'Any Price', min: undefined, max: undefined },
  { label: 'Under ₦1M', min: undefined, max: 1_000_000 },
  { label: '₦1M – ₦5M', min: 1_000_000, max: 5_000_000 },
  { label: '₦5M – ₦20M', min: 5_000_000, max: 20_000_000 },
  { label: 'Over ₦20M', min: 20_000_000, max: undefined },
];

export const FilterBar: React.FC<FilterBarProps> = ({ filters, onChange }) => {
  const activeCount = [
    filters.min_price !== undefined || filters.max_price !== undefined,
    filters.bedrooms !== undefined,
    filters.verified_only,
  ].filter(Boolean).length;

  const clearAll = () => {
    onChange({
      ...filters,
      min_price: undefined,
      max_price: undefined,
      bedrooms: undefined,
      verified_only: false,
      sort: 'newest',
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1.5 text-gray-400 text-xs font-bold uppercase tracking-wider mr-1">
        <SlidersHorizontal size={14} />
        Filters
      </div>

      {/* Price */}
      <select
        className="text-sm px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#C9A84C] text-gray-700"
        value={PRICE_PRESETS.findIndex(
          (p) => p.min === filters.min_price && p.max === filters.max_price
        )}
        onChange={(e) => {
          const preset = PRICE_PRESETS[Number(e.target.value)];
          onChange({ ...filters, min_price: preset.min, max_price: preset.max });
        }}
      >
        {PRICE_PRESETS.map((p, i) => (
          <option key={p.label} value={i}>{p.label}</option>
        ))}
      </select>

      {/* Bedrooms */}
      <select
        className="text-sm px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#C9A84C] text-gray-700"
        value={filters.bedrooms ?? ''}
        onChange={(e) =>
          onChange({ ...filters, bedrooms: e.target.value ? Number(e.target.value) : undefined })
        }
      >
        <option value="">Any Beds</option>
        {[1, 2, 3, 4, 5].map((n) => (
          <option key={n} value={n}>{n}+ Bed{n > 1 ? 's' : ''}</option>
        ))}
      </select>

      {/* Sort */}
      <select
        className="text-sm px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#C9A84C] text-gray-700"
        value={filters.sort ?? 'newest'}
        onChange={(e) => onChange({ ...filters, sort: e.target.value as PropertyFilters['sort'] })}
      >
        <option value="newest">Newest First</option>
        <option value="price_asc">Price: Low to High</option>
        <option value="price_desc">Price: High to Low</option>
      </select>

      {/* Verified only toggle */}
      <button
        onClick={() => onChange({ ...filters, verified_only: !filters.verified_only })}
        className={`text-sm px-3 py-2 rounded-lg border font-semibold transition-colors ${
          filters.verified_only
            ? 'bg-[#C9A84C] border-[#C9A84C] text-black'
            : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-[#C9A84C]'
        }`}
      >
        Verified Only
      </button>

      {activeCount > 0 && (
        <button
          onClick={clearAll}
          className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-[#C9A84C] ml-auto"
        >
          <X size={13} />
          Clear {activeCount} filter{activeCount > 1 ? 's' : ''}
        </button>
      )}
    </div>
  );
};
