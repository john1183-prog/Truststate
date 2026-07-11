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
  created_at: string;
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
