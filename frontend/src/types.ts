// --- Enum Types ---
export enum RoleEnum {
  seeker = 'seeker',
  agent = 'agent',
  admin = 'admin',
}

export enum PropertyTypeEnum {
  rent = 'rent',
  sale = 'sale',
  short_let = 'short_let',
}

export enum PropertyStatusEnum {
  pending = 'pending',
  approved = 'approved',
  rejected = 'rejected',
  taken = 'taken',
}

// --- User Types ---
export interface UserRead {
  name: string;
  email: string;
  phone: string;
  role: RoleEnum;
  id: number;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
}

export interface UserUpdate {
  is_verified?: boolean;
  is_active?: boolean;
}

// --- Property Image Types ---
export interface PropertyImageRead {
  cloudinary_url: string;
  is_main: boolean;
  id: number;
  property_id: number;
}

// --- Property Types ---
export interface PropertyCreate {
  title: string;
  description: string;
  price: number;
  property_type: PropertyTypeEnum;
  bedrooms: number;
  bathrooms: number;
  neighborhood: string;
  address: string;
  agent_id: number;
}

export interface PropertyRead {
  title: string;
  description: string;
  price: number;
  property_type: PropertyTypeEnum;
  bedrooms: number;
  bathrooms: number;
  neighborhood: string;
  address: string;
  id: number;
  agent_id: number;
  is_verified: boolean;
  status: PropertyStatusEnum;
  views: number;
  created_at: string;
  agent: UserRead;
  images: PropertyImageRead[];
}

export interface PropertyUpdate {
  title?: string;
  description?: string;
  price?: number;
  property_type?: PropertyTypeEnum;
  bedrooms?: number;
  bathrooms?: number;
  neighborhood?: string;
  address?: string;
  status?: PropertyStatusEnum;
  is_verified?: boolean;
}

// --- Search / Filter Types ---
export type SortOption = 'newest' | 'price_asc' | 'price_desc';

export interface PropertyFilters {
  neighborhood?: string;
  property_type?: PropertyTypeEnum | '';
  min_price?: number;
  max_price?: number;
  bedrooms?: number;
  bathrooms?: number;
  verified_only?: boolean;
  sort?: SortOption;
}
