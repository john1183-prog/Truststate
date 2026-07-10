import React, { useState, useEffect, FormEvent } from 'react';
import api from '../api';
import { PropertyCreate, PropertyRead, PropertyTypeEnum } from '../types';
import { Upload, Home, List, AlertCircle, CheckCircle } from 'lucide-react';

export const AgentDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upload' | 'listings'>('listings');
  const [myListings, setMyListings] = useState<PropertyRead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Hardcoded agent ID for MVP
  const AGENT_ID = 1;

  // Form State
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

  useEffect(() => {
    if (activeTab === 'listings') {
      fetchMyListings();
    }
  }, [activeTab]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Parse numbers
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
      // 1. Create Property
      const propResponse = await api.post<PropertyRead>('/properties/', formData);
      const newProperty = propResponse.data;

      // 2. Upload Image if exists
      if (imageFile) {
        const imageFormData = new FormData();
        imageFormData.append('file', imageFile);
        
        await api.post(`/properties/${newProperty.id}/images?is_main=true`, imageFormData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      }

      setSubmitStatus('success');
      // Reset form
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
      
      // Auto switch back to listings after 2 seconds
      setTimeout(() => {
        setSubmitStatus('idle');
        setActiveTab('listings');
      }, 2000);

    } catch (err) {
      console.error(err);
      setSubmitStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Agent Portal</h2>
          <p className="text-sm text-gray-500">Trust Estate MVP</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('listings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'listings' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <List size={20} />
            My Listings
          </button>
          <button 
            onClick={() => setActiveTab('upload')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'upload' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Upload size={20} />
            Upload Property
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        
        {activeTab === 'upload' && (
          <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-100">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Upload New Property</h1>
            
            {submitStatus === 'success' && (
              <div className="mb-6 bg-green-50 text-green-700 p-4 rounded-lg flex items-center gap-2">
                <CheckCircle size={20} />
                Property submitted successfully! It is now pending admin approval.
              </div>
            )}
            
            {submitStatus === 'error' && (
              <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2">
                <AlertCircle size={20} />
                Failed to submit property. Please check your connection and try again.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input required name="title" value={formData.title} onChange={handleInputChange} type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="e.g. Luxury 4 Bedroom Duplex" />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea required name="description" value={formData.description} onChange={handleInputChange} rows={4} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="Describe the property..."></textarea>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (₦)</label>
                  <input required name="price" value={formData.price || ''} onChange={handleInputChange} type="number" min="0" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
                  <select name="property_type" value={formData.property_type} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white">
                    <option value={PropertyTypeEnum.rent}>For Rent</option>
                    <option value={PropertyTypeEnum.sale}>For Sale</option>
                    <option value={PropertyTypeEnum.short_let}>Short Let</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
                  <input required name="bedrooms" value={formData.bedrooms || ''} onChange={handleInputChange} type="number" min="0" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bathrooms</label>
                  <input required name="bathrooms" value={formData.bathrooms || ''} onChange={handleInputChange} type="number" min="0" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Neighborhood</label>
                  <input required name="neighborhood" value={formData.neighborhood} onChange={handleInputChange} type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="e.g. Lekki Phase 1" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Address</label>
                  <input required name="address" value={formData.address} onChange={handleInputChange} type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="e.g. 12 Admiralty Way" />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Property Image (Main)</label>
                  <input required type="file" accept="image/*" onChange={handleFileChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button 
                  type="submit" 
                  disabled={submitStatus === 'loading'}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold transition-colors disabled:opacity-70 flex items-center gap-2"
                >
                  {submitStatus === 'loading' ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
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
            <h1 className="text-2xl font-bold text-gray-900 mb-6">My Submitted Listings</h1>
            
            {loading ? (
              <div className="flex justify-center items-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>
            ) : myListings.length === 0 ? (
              <div className="bg-white p-10 rounded-xl text-center border border-gray-100 shadow-sm flex flex-col items-center">
                <Home size={48} className="text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No listings yet</h3>
                <p className="text-gray-500 mb-6">You haven't uploaded any properties.</p>
                <button 
                  onClick={() => setActiveTab('upload')}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Upload your first property
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-6 py-4 font-semibold text-gray-600 text-sm uppercase tracking-wider">Property</th>
                      <th className="px-6 py-4 font-semibold text-gray-600 text-sm uppercase tracking-wider">Type</th>
                      <th className="px-6 py-4 font-semibold text-gray-600 text-sm uppercase tracking-wider">Price</th>
                      <th className="px-6 py-4 font-semibold text-gray-600 text-sm uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {myListings.map(property => (
                      <tr key={property.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900">{property.title}</p>
                          <p className="text-sm text-gray-500">{property.neighborhood}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="capitalize">{property.property_type.replace('_', ' ')}</span>
                        </td>
                        <td className="px-6 py-4 font-medium">
                          ₦{property.price.toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${property.status === 'approved' ? 'bg-green-100 text-green-800' : 
                              property.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-gray-100 text-gray-800'}`
                          }>
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
      </main>
    </div>
  );
};
