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
export type OrganizerReview = { id: string; tripId: string; organizerId: string; reviewerId: string; reviewerDisplayName?: string; overallRating: number; tripExperienceRating: number; organizerExperienceRating: number; feedback?: string; status: 'visible' | 'hidden' | 'under_review'; createdAt: string; updatedAt: string; response?: { id: string; response: string; createdAt: string; updatedAt: string } };
export type OrganizerReputation = { count: number; averageRating: number | null; ratingBreakdown: { rating: number; count: number }[]; recentReviews: OrganizerReview[] };
export type OrganizerDashboard = { profile: OrganizerProfile | null; trips: Trip[]; requests: { id: string; tripId: string; userId: string; status: string; createdAt: string }[]; reputation: OrganizerReputation; reviews: OrganizerReview[] };
