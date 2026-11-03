import type { Trip, TravelStyle } from './types';

export type DiscoverySort = 'recommended' | 'upcoming' | 'recent' | 'budget_low' | 'budget_high' | 'rating';

export type DiscoveryFilters = {
  destination?: string;
  query?: string;
  startDate?: string;
  endDate?: string;
  minBudget?: number;
  maxBudget?: number;
  duration?: number;
  category?: TravelStyle | 'All styles';
  experience?: string;
  minSeats?: number;
  verifiedOnly?: boolean;
  minRating?: number;
  sort?: DiscoverySort;
  page?: number;
  pageSize?: number;
};

export type DiscoveryTrip = Trip & {
  availableSeats: number;
  organizerRating: number | null;
  reviewCount: number;
  recommendationScore: number;
  recommendationReasons: string[];
};

export type DiscoveryResponse = {
  trips: DiscoveryTrip[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  activeFilters: number;
  recommendationAvailable: boolean;
};

const normalize = (value: string) => value.trim().toLowerCase();

export function parseDurationDays(value: string) {
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

export function tripDateValue(value: string) {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
}

export function recommendationForTrip(trip: Trip, profile?: { preferredDestinations?: string[]; travelInterests?: string[]; travelStyle?: string; budgetRange?: string; }, rating: number | null = null) {
  const reasons: string[] = [];
  let score = 0;
  const destinations = (profile?.preferredDestinations ?? []).map(normalize);
  const interests = (profile?.travelInterests ?? []).map(normalize);
  const tripText = normalize([trip.destinationName, trip.title, trip.summary, trip.style, ...trip.tags].join(' '));
  if (destinations.some((item) => tripText.includes(item) || normalize(trip.destinationName).includes(item))) { score += 35; reasons.push('matches a preferred destination'); }
  const matchedInterests = interests.filter((item) => tripText.includes(item));
  if (matchedInterests.length) { score += Math.min(25, matchedInterests.length * 10); reasons.push(`fits ${matchedInterests.slice(0, 2).join(' and ')}`); }
  if (profile?.travelStyle && normalize(profile.travelStyle) === normalize(trip.style)) { score += 20; reasons.push(`fits your ${trip.style.toLowerCase()} pace`); }
  if (profile?.budgetRange) {
    const numbers = profile.budgetRange.match(/\d+/g)?.map(Number) ?? [];
    if (numbers.length >= 2 && trip.budget >= numbers[0] && trip.budget <= numbers[1]) { score += 15; reasons.push('fits your budget range'); }
  }
  if (rating && rating >= 4) { score += 5; reasons.push('trusted organizer reviews'); }
  return { score, reasons: reasons.length ? reasons : ['a useful starting point based on your search'] };
}
