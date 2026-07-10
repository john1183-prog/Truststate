import React, { useState } from 'react';
import { PropertyRead } from '../types';
import { CheckCircle, ChevronLeft, ChevronRight, Bed, Bath, MapPin } from 'lucide-react';

interface PropertyCardProps {
  property: PropertyRead;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({ property }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const images = property.images && property.images.length > 0 
    ? property.images 
    : [{ cloudinary_url: 'https://placehold.co/600x400?text=No+Image', is_main: true, id: 0, property_id: property.id }];

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const propertyUrl = `${window.location.origin}/property/${property.id}`;
  const whatsappMessage = encodeURIComponent(`Hi, I'm interested in your property: ${property.title} located at ${property.address}. View here: ${propertyUrl}`);
  // Real agent phone comes with the property now (backend eager-loads it) —
  // previously this always pointed at the same hardcoded placeholder number.
  const agentPhone = property.agent?.phone;
  const whatsappLink = agentPhone ? `https://wa.me/${agentPhone}?text=${whatsappMessage}` : null;

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col h-full border border-gray-100 transition-transform hover:shadow-lg hover:-translate-y-1 duration-300">
      {/* Image Slider */}
      <div className="relative h-64 w-full bg-gray-200 group">
        <img 
          src={images[currentImageIndex].cloudinary_url} 
          alt={property.title} 
          className="w-full h-full object-cover"
        />
        
        {images.length > 1 && (
          <>
            <button 
              onClick={prevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/75 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={nextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/75 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight size={20} />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`w-2 h-2 rounded-full ${idx === currentImageIndex ? 'bg-white' : 'bg-white/50'}`}
                />
              ))}
            </div>
          </>
        )}

        {/* Status Badge */}
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold shadow-sm uppercase tracking-wider text-gray-700">
          For {property.property_type.replace('_', ' ')}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-2 gap-2">
          <h3 className="text-lg font-bold text-gray-900 line-clamp-1">{property.title}</h3>
          {property.is_verified && (
            <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-md text-xs font-bold border border-green-200 shrink-0">
              <CheckCircle size={14} />
              <span>Verified</span>
            </div>
          )}
        </div>
        
        <p className="text-2xl font-extrabold text-blue-600 mb-3">
          {formatPrice(property.price)}
          {property.property_type === 'rent' && <span className="text-sm text-gray-500 font-normal"> / year</span>}
          {property.property_type === 'short_let' && <span className="text-sm text-gray-500 font-normal"> / night</span>}
        </p>

        <div className="flex items-center text-gray-500 text-sm mb-4">
          <MapPin size={16} className="mr-1 shrink-0" />
          <span className="line-clamp-1">{property.address}, {property.neighborhood}</span>
        </div>

        <div className="flex gap-4 mb-5 pb-5 border-b border-gray-100 text-gray-700">
          <div className="flex items-center gap-1.5 font-medium">
            <Bed size={18} className="text-gray-400" />
            <span>{property.bedrooms} Beds</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <Bath size={18} className="text-gray-400" />
            <span>{property.bathrooms} Baths</span>
          </div>
        </div>

        {/* WhatsApp Button */}
        <div className="mt-auto pt-2">
          {whatsappLink ? (
            <a 
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white py-2.5 rounded-lg font-semibold transition-colors duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              Contact on WhatsApp
            </a>
          ) : (
            <div className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-400 py-2.5 rounded-lg font-semibold cursor-not-allowed">
              Agent contact unavailable
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
