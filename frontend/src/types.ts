// --- Enum Types ---
export enum RoleEnum {
  seeker = 'seeker',
  agent = 'agent',
  admin = 'admin',
  lawyer = 'lawyer',
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

export enum InspectionStatusEnum {
  pending = 'pending',
  confirmed = 'confirmed',
  completed = 'completed',
  cancelled = 'cancelled',
}

export enum LegalRequestStatusEnum {
  pending = 'pending',
  contacted = 'contacted',
  completed = 'completed',
  cancelled = 'cancelled',
}

// --- Authentication & User Types ---
export interface UserRead {
  name: string;
  email: string;
  phone: string;
  role: RoleEnum;
  id: number;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  specializations?: string[];
  bio?: string;
  years_of_experience?: number;
}

export type User = UserRead;

export interface UserRegister {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: RoleEnum;
  specializations?: string[];
  bio?: string;
  years_of_experience?: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: UserRead;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface UserUpdate {
  is_verified?: boolean;
  is_active?: boolean;
  specializations?: string[];
  bio?: string;
  years_of_experience?: number;
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

// --- Inspection Request Types ("Schedule a View" / Enquiries) ---
export interface PropertySummary {
  id: number;
  title: string;
  neighborhood: string;
}

export interface InspectionRequestCreate {
  name: string;
  phone: string;
  email?: string;
  preferred_date: string;
  message?: string;
}

export interface InspectionRequestRead {
  name: string;
  phone: string;
  email?: string;
  preferred_date: string;
  message?: string;
  id: number;
  property_id: number;
  status: InspectionStatusEnum;
  created_at: string;
  property: PropertySummary;
}

// --- Legal Services Types ---
export const LEGAL_SERVICES = [
  'Title Verification',
  'Due Diligence',
  'Contract Drafting',
  'Deed Preparation',
  "Governor's Consent Guidance",
  'Land Registration',
  'Dispute Resolution',
  'General Legal Advice',
] as const;

export type LegalServiceType = typeof LEGAL_SERVICES[number];

export interface LawyerSummary {
  id: number;
  name: string;
  email: string;
  phone: string;
  specializations?: string[];
  years_of_experience?: number;
  is_verified: boolean;
}

export interface LegalRequestCreate {
  name: string;
  phone: string;
  email?: string;
  service_type: string;
  message?: string;
  lawyer_id?: number;
}

export interface LegalRequestRead {
  id: number;
  name: string;
  phone: string;
  email?: string;
  service_type: string;
  message?: string;
  lawyer_id?: number;
  status: LegalRequestStatusEnum;
  created_at: string;
  lawyer?: LawyerSummary;
}

// --- Notification Types ---
export interface NotificationRead {
  id: number;
  notification_type: string;
  title: string;
  message: string;
  link?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationUnreadCount {
  unread_count: number;
}
