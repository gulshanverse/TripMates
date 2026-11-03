export type TravelStyle = 'Slow & scenic' | 'Adventure' | 'Culture-led' | 'Wellness';

export interface Destination {
  id: string;
  name: string;
  region: string;
  country: string;
  description: string;
  imageUrl: string;
  tripCount: number;
  mood: string;
}

export interface Trip {
  id: string;
  title: string;
  destinationId: string;
  destinationName: string;
  region: string;
  startDate: string;
  endDate: string;
  duration: string;
  budget: number;
  currency: 'INR';
  members: number;
  capacity: number;
  organizer: string;
  organizerInitials: string;
  organizerVerified: boolean;
  style: TravelStyle;
  tags: string[];
  imageUrl: string;
  summary: string;
  itinerary: { day: string; title: string; detail: string }[];
  saved?: boolean;
}

export interface Buddy {
  id: string;
  name: string;
  age: number;
  city: string;
  initials: string;
  imageUrl: string;
  bio: string;
  match: number;
  travelStyle: TravelStyle;
  languages: string[];
  dates: string;
  interests: string[];
  verified: boolean;
}

export interface OverviewResponse {
  destinations: Destination[];
  trips: Trip[];
  buddies: Buddy[];
  stats: { travelers: string; trips: string; destinations: string };
}
