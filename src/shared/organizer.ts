import type { Trip } from './types';

export type OrganizerType = 'individual' | 'business';
export type OrganizerProfile = {
  userId: string;
  displayName: string;
  organizerType: OrganizerType;
  organizationName?: string;
  description: string;
  contactPreferences: string[];
  operatingLocation: string;
  specialties: string[];
  experienceCategories: string[];
  publicImageUrl?: string;
  websiteUrl?: string;
  socialUrl?: string;
  verificationStatus: 'not_submitted' | 'pending' | 'under_review' | 'verified' | 'rejected' | 'expired' | 'suspended';
};
export type OrganizerDashboard = { profile: OrganizerProfile | null; trips: Trip[]; requests: { id: string; tripId: string; userId: string; status: string; createdAt: string }[] };
