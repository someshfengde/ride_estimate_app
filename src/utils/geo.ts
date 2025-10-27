import type { Location } from '@/types/ride';
import { findLocationByName } from '@/data/locations';

const EARTH_RADIUS_KM = 6371;

const toRad = (value: number) => (value * Math.PI) / 180;

export const haversineDistance = (from: Location, to: Location) => {
  const dLat = toRad(to.lat - from.lat);
  const dLon = toRad(to.lng - from.lng);

  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
};

export const resolveLocation = (raw: string) => {
  const recommendation = findLocationByName(raw);
  if (recommendation) {
    return {
      lat: recommendation.lat,
      lng: recommendation.lng,
      address: recommendation.address,
      name: recommendation.name,
    };
  }

  return {
    lat: 0,
    lng: 0,
    address: raw,
    name: raw,
  };
};

export const computeRouteMetrics = (pickups: Location[], dropoff: Location) => {
  if (pickups.length === 0) {
    return {
      distanceKm: 0,
      durationMinutes: 0,
    };
  }

  let distance = 0;
  for (let i = 0; i < pickups.length - 1; i += 1) {
    distance += haversineDistance(pickups[i], pickups[i + 1]);
  }
  distance += haversineDistance(pickups[pickups.length - 1], dropoff);

  // Fallback fudge for unknown coordinates
  if (!Number.isFinite(distance) || distance === 0) {
    distance = 8 + (pickups.length - 1) * 3.5;
  }

  const averageSpeedKmPerHour = 24; // Indian metro average
  const durationMinutes = (distance / averageSpeedKmPerHour) * 60 + pickups.length * 4;

  return {
    distanceKm: Math.max(distance, 4),
    durationMinutes: Math.max(durationMinutes, 20),
  };
};
