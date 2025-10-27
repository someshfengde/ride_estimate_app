import { NextRequest, NextResponse } from 'next/server';
import { resolveLocation, computeRouteMetrics } from '@/utils/geo';
import { RideAggregator } from '@/services/RideAggregator';
import { UberRideService } from '@/services/UberRideService';
import { OlaRideService } from '@/services/OlaRideService';
import { RapidoRideService } from '@/services/RapidoRideService';
import type { RideRequest } from '@/types/ride';

type EstimateRequestPayload = {
  pickups: string[];
  dropoff: string;
  departureTime?: string;
  city?: string;
};

const aggregator = new RideAggregator([
  new UberRideService(),
  new OlaRideService(),
  new RapidoRideService(),
]);

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as EstimateRequestPayload;

    if (!payload.pickups || payload.pickups.length === 0) {
      return NextResponse.json(
        { ok: false, message: 'At least one pickup location is required.' },
        { status: 400 },
      );
    }

    if (!payload.dropoff) {
      return NextResponse.json(
        { ok: false, message: 'Drop-off location is required.' },
        { status: 400 },
      );
    }

    const pickupLocations = payload.pickups.map((entry) => resolveLocation(entry));
    const dropoffLocation = resolveLocation(payload.dropoff);

    const { distanceKm, durationMinutes } = computeRouteMetrics(pickupLocations, dropoffLocation);

    const rideRequest: RideRequest = {
      pickups: pickupLocations,
      dropoff: dropoffLocation,
      departureTime: payload.departureTime ? new Date(payload.departureTime) : undefined,
      city: payload.city ?? undefined,
      approxDistanceKm: distanceKm,
      approxDurationMinutes: durationMinutes,
    };

    const estimates = await aggregator.getEstimates(rideRequest);

    return NextResponse.json({ ok: true, estimates });
  } catch (error) {
    console.error('Failed to compute estimates', error);
    return NextResponse.json(
      {
        ok: false,
        message: 'Unable to compute ride estimates right now. Please try again shortly.',
      },
      { status: 500 },
    );
  }
}
