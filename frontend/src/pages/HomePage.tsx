import React, { useEffect, useState } from 'react';
import api from '../api';
import { PropertyRead, PropertyTypeEnum } from '../types';
import { PropertyCard } from '../components/PropertyCard';
import { Search } from 'lucide-react';

export const HomePage: React.FC = () => {
  const [properties, setProperties] = useState<PropertyRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterType, setFilterType] = useState<PropertyTypeEnum | 'all'>('all');
  const [searchNeighborhood, setSearchNeighborhood] = useState('');

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        const response = await api.get<PropertyRead[]>('/properties/');
        setProperties(response.data);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch properties", err);
        setError("Failed to load properties. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  const filteredProperties = properties.filter((prop) => {
    const matchType = filterType === 'all' || prop.property_type === filterType;
    const matchNeighborhood = prop.neighborhood.toLowerCase().includes(searchNeighborhood.toLowerCase());
    return matchType && matchNeighborhood;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-blue-900 text-white py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight">
            Find Properties You Can Trust
          </h1>
          <p className="text-lg md:text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
            Nigeria's first real estate platform with 100% verified listings. No scams, no hidden fees, just homes.
          </p>
          
          {/* Search/Filter Bar */}
          <div className="bg-white p-2 rounded-xl flex flex-col md:flex-row max-w-4xl mx-auto shadow-2xl gap-2">
            <div className="flex-1 relative flex items-center">
              <Search className="absolute left-4 text-gray-400" size={20} />
              <input 
                type="text" 
                placeholder="Search neighborhood (e.g. Lekki, Ikoyi)" 
                className="w-full pl-12 pr-4 py-3 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchNeighborhood}
                onChange={(e) => setSearchNeighborhood(e.target.value)}
              />
            </div>
            
            <div className="h-px md:h-auto md:w-px bg-gray-200 mx-2 hidden md:block"></div>
            
            <select 
              className="px-4 py-3 rounded-lg text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 md:w-48 border-none"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
            >
              <option value="all">All Types</option>
              <option value="rent">For Rent</option>
              <option value="sale">For Sale</option>
              <option value="short_let">Short Let</option>
            </select>
            
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold transition-colors">
              Search
            </button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-16">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Verified Properties</h2>
            <p className="text-gray-500 mt-1">Showing {filteredProperties.length} results</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg text-center">
            {error}
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="bg-white p-10 rounded-xl text-center border border-gray-100 shadow-sm">
            <div className="text-gray-400 mb-4 flex justify-center">
              <Search size={48} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No properties found</h3>
            <p className="text-gray-500">Try adjusting your search criteria or checking back later.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProperties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
