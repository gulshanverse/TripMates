import type { Buddy, Destination, Trip } from './types';

export type ExperienceCategory = 'Adventure' | 'Nature' | 'Spirituality' | 'Culture' | 'Food';

export interface DestinationExperience {
  id: string;
  name: string;
  category: ExperienceCategory;
  description: string;
  imageUrl: string;
  duration: string;
  cost: string;
  season: string;
  safety: string;
}

export interface DestinationDetail extends Destination {
  introduction: string;
  about: string;
  highlights: string[];
  experiences: DestinationExperience[];
  travelInfo: { label: string; value: string }[];
  budgets: { label: string; value: string; note: string }[];
  recommendedDurations: string[];
  safetyGuidance: string[];
  relatedDestinations: Destination[];
}

export interface DestinationResponse {
  destination: DestinationDetail;
  trips: Trip[];
  buddies: Buddy[];
}
