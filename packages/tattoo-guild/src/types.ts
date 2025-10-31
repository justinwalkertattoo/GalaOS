/**
 * Tattoo Guild Module Types
 * Business module for tattoo artists and studios
 */

export interface TattooGuildConfig {
  // Studio Information
  studioName: string;
  studioAddress?: string;
  studioPhone?: string;
  studioEmail?: string;
  studioWebsite?: string;
  studioInstagram?: string;

  // Business Settings
  timezone: string;
  currency: string;
  defaultSessionDuration: number; // minutes
  depositPercentage: number;

  // Instagram Integration
  instagramAutoPost: boolean;
  instagramHashtags: string[];
  instagramWatermark?: string;

  // Scheduling
  workDays: number[]; // 0-6 (Sunday-Saturday)
  workHours: {
    start: string; // HH:mm
    end: string;   // HH:mm
  };
  bookingBuffer: number; // minutes between appointments

  // Flash Sales
  flashSaleEnabled: boolean;
  flashSaleDiscount?: number;
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  instagram?: string;
  notes?: string;
  tags: string[];
  firstVisit: Date;
  lastVisit?: Date;
  totalSessions: number;
  totalRevenue: number;
  photoConsent: boolean;
  preferences?: {
    style?: string[];
    placement?: string[];
    size?: string[];
  };
}

export interface Design {
  id: string;
  title: string;
  description?: string;
  category: 'flash' | 'custom' | 'commission';
  style: string[]; // traditional, neo-traditional, realism, etc.
  placement?: string[];
  estimatedTime?: number; // minutes
  price?: number;
  imageUrl?: string;
  thumbnailUrl?: string;
  status: 'draft' | 'available' | 'reserved' | 'completed';
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Appointment {
  id: string;
  clientId: string;
  designId?: string;
  date: Date;
  duration: number; // minutes
  status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  deposit?: number;
  totalPrice?: number;
  notes?: string;
  reminderSent: boolean;
  photos?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Flash {
  id: string;
  designId: string;
  isAvailable: boolean;
  originalPrice: number;
  salePrice?: number;
  expiresAt?: Date;
  soldAt?: Date;
  soldTo?: string; // clientId
  instagramPostId?: string;
  instagramPostedAt?: Date;
  views: number;
  inquiries: number;
}

export interface Revenue {
  id: string;
  appointmentId?: string;
  clientId?: string;
  date: Date;
  amount: number;
  type: 'session' | 'deposit' | 'flash' | 'merchandise' | 'other';
  paymentMethod: 'cash' | 'card' | 'venmo' | 'cashapp' | 'other';
  notes?: string;
}

export interface InstagramPost {
  id: string;
  designId?: string;
  appointmentId?: string;
  caption: string;
  hashtags: string[];
  imageUrl: string;
  postedAt?: Date;
  instagramId?: string;
  likes?: number;
  comments?: number;
  status: 'draft' | 'scheduled' | 'posted' | 'failed';
}

export interface TattooGuildWorkflows {
  // Client Management
  clientOnboarding: string;
  clientFollowUp: string;
  birthdayReminder: string;

  // Appointments
  appointmentConfirmation: string;
  appointmentReminder: string;
  appointmentFollowUp: string;

  // Design & Portfolio
  flashGeneration: string;
  instagramAutoPost: string;
  portfolioUpdate: string;

  // Revenue
  invoiceGeneration: string;
  monthlyRevenueReport: string;
  yearlyTaxSummary: string;
}
