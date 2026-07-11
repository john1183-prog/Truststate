import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import { PropertyRead } from '../types';
import { useSavedProperties } from '../hooks/useSavedProperties';
import {
  CheckCircle, MapPin, Bed, Bath, ChevronLeft, ChevronRight,
  Heart, Phone, Eye, ArrowLeft, Shield, Calendar,
} from 'lucide-react';

// ── Design tokens ────────────────────────────────────────────────────────────
// Black: #0A0A0A  Gold: #C9A84C  Gold-light bg: #FBF5E6  Off-white: #F8F6F1

const WHATSAPP_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

const formatPrice = (price: number, type: string) => {
  const formatted = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(price);
  if (type === 'rent') return `${formatted} / yr`;
  if (type === 'short_let') return `${formatted} / night`;
  return formatted;
};

const typeLabel = (type: string) => {
  if (type === 'short_let') return 'Short Let';
  if (type === 'rent') return 'For Rent';
  return 'For Sale';
};

export const PropertyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [property, setProperty] = useState<PropertyRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImg, setCurrentImg] = useState(0);
  const { isSaved, toggleSave } = useSavedProperties();

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      try {
        setLoading(true);
        const res = await api.get<PropertyRead>(`/properties/${id}`);
        setProperty(res.data);
      } catch {
        setError('This property could not be found or is no longer available.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F6F1] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C9A84C]" />
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-[#F8F6F1] flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-gray-600 text-center">{error}</p>
        <Link to="/" className="text-[#C9A84C] font-semibold underline">Back to listings</Link>
      </div>
    );
  }

  const images = property.images.length > 0
    ? property.images
    : [{ cloudinary_url: 'https://placehold.co/900x600?text=No+Image', is_main: true, id: 0, property_id: property.id }];

  const agentPhone = property.agent?.phone;
  const propertyUrl = window.location.href;
  const waMessage = encodeURIComponent(
    `Hi, I'm interested in your property: ${property.title} at ${property.address}. ${propertyUrl}`
  );
  const waLink = agentPhone ? `https://wa.me/${agentPhone}?text=${waMessage}` : null;
  const callLink = agentPhone ? `tel:+${agentPhone}` : null;
  const saved = isSaved(property.id);

  return (
    <div className="min-h-screen bg-[#F8F6F1]">
      {/* Back nav */}
      <div className="max-w-6xl mx-auto px-4 pt-6 pb-2">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#C9A84C] transition-colors font-medium"
        >
          <ArrowLeft size={16} /> Back to listings
        </Link>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── LEFT COLUMN: gallery + details ────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Gallery */}
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video shadow-xl group">
              <img
                src={images[currentImg].cloudinary_url}
                alt={property.title}
                className="w-full h-full object-cover"
              />

              {/* Type badge */}
              <div className="absolute top-4 left-4 bg-[#C9A84C] text-black text-xs font-black px-3 py-1.5 rounded-full uppercase tracking-wider shadow">
                {typeLabel(property.property_type)}
              </div>

              {/* Verified badge */}
              {property.is_verified && (
                <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-black/80 text-[#C9A84C] text-xs font-bold px-3 py-1.5 rounded-full shadow">
                  <Shield size={13} />
                  Verified
                </div>
              )}

              {/* Views */}
              <div className="absolute bottom-4 left-4 flex items-center gap-1.5 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full">
                <Eye size={13} />
                {property.views} {property.views === 1 ? 'view' : 'views'}
              </div>

              {/* Image nav */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentImg((p) => (p - 1 + images.length) % images.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={() => setCurrentImg((p) => (p + 1) % images.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronRight size={20} />
                  </button>
                  <div className="absolute bottom-4 right-4 flex gap-1.5">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentImg(i)}
                        className={`w-2 h-2 rounded-full transition-colors ${i === currentImg ? 'bg-[#C9A84C]' : 'bg-white/50'}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentImg(i)}
                    className={`shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-colors ${
                      i === currentImg ? 'border-[#C9A84C]' : 'border-transparent'
                    }`}
                  >
                    <img src={img.cloudinary_url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Title + price row */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-black text-[#0A0A0A] leading-tight">{property.title}</h1>
                  <div className="flex items-center gap-1.5 text-gray-500 mt-2 text-sm">
                    <MapPin size={15} className="text-[#C9A84C]" />
                    {property.address}, {property.neighborhood}
                  </div>
                </div>
                <button
                  onClick={() => toggleSave(property.id)}
                  className={`shrink-0 p-2.5 rounded-full border-2 transition-all ${
                    saved
                      ? 'bg-[#C9A84C] border-[#C9A84C] text-white'
                      : 'border-gray-200 text-gray-400 hover:border-[#C9A84C] hover:text-[#C9A84C]'
                  }`}
                  title={saved ? 'Remove from saved' : 'Save property'}
                >
                  <Heart size={20} fill={saved ? 'currentColor' : 'none'} />
                </button>
              </div>

              <p className="text-3xl font-black text-[#C9A84C] mt-4">
                {formatPrice(property.price, property.property_type)}
              </p>

              {/* Stats row */}
              <div className="flex flex-wrap gap-6 mt-5 pt-5 border-t border-gray-100 text-[#0A0A0A]">
                <div className="flex items-center gap-2 font-semibold">
                  <Bed size={20} className="text-[#C9A84C]" />
                  {property.bedrooms} Bedroom{property.bedrooms !== 1 ? 's' : ''}
                </div>
                <div className="flex items-center gap-2 font-semibold">
                  <Bath size={20} className="text-[#C9A84C]" />
                  {property.bathrooms} Bathroom{property.bathrooms !== 1 ? 's' : ''}
                </div>
                <div className="flex items-center gap-2 font-semibold">
                  <Calendar size={20} className="text-[#C9A84C]" />
                  Listed {new Date(property.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-black text-[#0A0A0A] mb-3">About this property</h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">{property.description}</p>
            </div>

            {/* Trust signals */}
            {property.is_verified && (
              <div className="rounded-2xl p-5 border-2 border-[#C9A84C] bg-[#FBF5E6] flex items-start gap-4">
                <div className="bg-[#C9A84C] text-black p-2 rounded-full shrink-0 mt-0.5">
                  <Shield size={20} />
                </div>
                <div>
                  <p className="font-black text-[#0A0A0A]">Verified Listing</p>
                  <p className="text-sm text-gray-600 mt-0.5">
                    This property has been manually reviewed by Trust Estate. The agent identity and listing details have been checked.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN: agent card + CTAs ───────────────────────── */}
          <div className="space-y-4">

            {/* Contact card — sticky on desktop */}
            <div className="bg-[#0A0A0A] rounded-2xl p-6 shadow-xl sticky top-24 space-y-4">
              <p className="text-white text-xs font-bold uppercase tracking-widest opacity-60">Contact Agent</p>

              {/* Agent info */}
              <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                <div className="w-12 h-12 rounded-full bg-[#C9A84C] flex items-center justify-center shrink-0">
                  <span className="text-black font-black text-lg">
                    {property.agent?.name?.charAt(0)?.toUpperCase() ?? 'A'}
                  </span>
                </div>
                <div>
                  <p className="text-white font-bold">{property.agent?.name ?? 'Agent'}</p>
                  {property.agent?.is_verified && (
                    <div className="flex items-center gap-1 text-[#C9A84C] text-xs font-semibold mt-0.5">
                      <CheckCircle size={12} />
                      Verified Agent
                    </div>
                  )}
                </div>
              </div>

              {/* WhatsApp */}
              {waLink ? (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2.5 bg-[#25D366] hover:bg-[#1ebe5d] text-white py-3.5 rounded-xl font-bold transition-colors"
                >
                  {WHATSAPP_ICON}
                  Chat on WhatsApp
                </a>
              ) : null}

              {/* Phone call */}
              {callLink ? (
                <a
                  href={callLink}
                  className="w-full flex items-center justify-center gap-2.5 bg-[#C9A84C] hover:bg-[#b8963e] text-black py-3.5 rounded-xl font-bold transition-colors"
                >
                  <Phone size={19} />
                  Call Agent
                </a>
              ) : null}

              {!waLink && !callLink && (
                <p className="text-center text-white/40 text-sm py-2">No contact details available</p>
              )}

              {/* Save */}
              <button
                onClick={() => toggleSave(property.id)}
                className={`w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-semibold border-2 transition-all ${
                  saved
                    ? 'border-[#C9A84C] bg-[#C9A84C]/10 text-[#C9A84C]'
                    : 'border-white/20 text-white/60 hover:border-[#C9A84C] hover:text-[#C9A84C]'
                }`}
              >
                <Heart size={18} fill={saved ? 'currentColor' : 'none'} />
                {saved ? 'Saved' : 'Save Property'}
              </button>

              <p className="text-white/30 text-xs text-center pt-1">
                Always verify agent identity before making any payments.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
