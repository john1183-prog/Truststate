import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PropertyRead } from '../types';
import { useSavedProperties } from '../hooks/useSavedProperties';
import { CheckCircle, ChevronLeft, ChevronRight, Bed, Bath, MapPin, Heart, Eye } from 'lucide-react';

const WHATSAPP_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

interface PropertyCardProps {
  property: PropertyRead;
}

const formatPrice = (price: number, type: string) => {
  const formatted = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(price);
  if (type === 'rent') return `${formatted}/yr`;
  if (type === 'short_let') return `${formatted}/night`;
  return formatted;
};

const typeLabel = (type: string) => {
  if (type === 'short_let') return 'Short Let';
  if (type === 'rent') return 'Rent';
  return 'Sale';
};

export const PropertyCard: React.FC<PropertyCardProps> = ({ property }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { isSaved, toggleSave } = useSavedProperties();
  const saved = isSaved(property.id);

  const images = property.images?.length > 0
    ? property.images
    : [{ cloudinary_url: 'https://placehold.co/600x400?text=No+Image', is_main: true, id: 0, property_id: property.id }];

  const nextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentImageIndex((p) => (p + 1) % images.length);
  };
  const prevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentImageIndex((p) => (p - 1 + images.length) % images.length);
  };

  const agentPhone = property.agent?.phone;
  const propertyUrl = `${window.location.origin}/property/${property.id}`;
  const waMessage = encodeURIComponent(
    `Hi, I'm interested in your property: ${property.title} at ${property.address}. ${propertyUrl}`
  );
  const waLink = agentPhone ? `https://wa.me/${agentPhone}?text=${waMessage}` : null;

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col border border-gray-100 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">

      {/* Image slider — clicking image goes to detail page */}
      <Link to={`/property/${property.id}`} className="block relative h-56 bg-gray-100 group shrink-0">
        <img
          src={images[currentImageIndex].cloudinary_url}
          alt={property.title}
          className="w-full h-full object-cover"
        />

        {/* Type badge */}
        <div className="absolute top-3 left-3 bg-[#C9A84C] text-black text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-wide shadow">
          {typeLabel(property.property_type)}
        </div>

        {/* Save button */}
        <button
          onClick={(e) => { e.preventDefault(); toggleSave(property.id); }}
          className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-sm transition-all ${
            saved ? 'bg-[#C9A84C] text-black' : 'bg-black/40 text-white hover:bg-[#C9A84C] hover:text-black'
          }`}
        >
          <Heart size={15} fill={saved ? 'currentColor' : 'none'} />
        </button>

        {/* Views */}
        {property.views > 0 && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-black/55 text-white text-xs px-2 py-0.5 rounded-full">
            <Eye size={11} />
            {property.views}
          </div>
        )}

        {/* Nav arrows */}
        {images.length > 1 && (
          <>
            <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronLeft size={16} />
            </button>
            <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight size={16} />
            </button>
            <div className="absolute bottom-3 right-3 flex gap-1">
              {images.map((_, i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === currentImageIndex ? 'bg-[#C9A84C]' : 'bg-white/50'}`} />
              ))}
            </div>
          </>
        )}
      </Link>

      {/* Content */}
      <div className="p-5 flex flex-col flex-grow">
        {/* Title + verified */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <Link to={`/property/${property.id}`} className="font-black text-[#0A0A0A] leading-snug hover:text-[#C9A84C] transition-colors line-clamp-1">
            {property.title}
          </Link>
          {property.is_verified && (
            <div className="flex items-center gap-1 bg-[#FBF5E6] text-[#b8963e] px-2 py-0.5 rounded-full text-xs font-bold border border-[#C9A84C]/30 shrink-0">
              <CheckCircle size={11} />
              Verified
            </div>
          )}
        </div>

        {/* Location */}
        <div className="flex items-center gap-1 text-gray-400 text-xs mb-3">
          <MapPin size={12} className="shrink-0 text-[#C9A84C]" />
          <span className="line-clamp-1">{property.address}, {property.neighborhood}</span>
        </div>

        {/* Price */}
        <p className="text-xl font-black text-[#C9A84C] mb-3">
          {formatPrice(property.price, property.property_type)}
        </p>

        {/* Beds/baths */}
        <div className="flex gap-4 text-sm text-gray-500 font-medium pb-4 border-b border-gray-100 mb-4">
          <span className="flex items-center gap-1.5">
            <Bed size={15} className="text-gray-300" />
            {property.bedrooms} Bed{property.bedrooms !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1.5">
            <Bath size={15} className="text-gray-300" />
            {property.bathrooms} Bath{property.bathrooms !== 1 ? 's' : ''}
          </span>
        </div>

        {/* CTA buttons */}
        <div className="mt-auto space-y-2">
          {waLink ? (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white py-2.5 rounded-xl font-bold text-sm transition-colors"
            >
              {WHATSAPP_ICON}
              WhatsApp
            </a>
          ) : (
            <div className="w-full flex items-center justify-center bg-gray-100 text-gray-400 py-2.5 rounded-xl font-semibold text-sm cursor-not-allowed">
              No contact available
            </div>
          )}

          <Link
            to={`/property/${property.id}`}
            className="w-full flex items-center justify-center gap-2 border-2 border-[#0A0A0A] text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white py-2.5 rounded-xl font-bold text-sm transition-colors"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
};
