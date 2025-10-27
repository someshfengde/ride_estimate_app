import { BaseRideService } from './BaseRideService';
import type { RideEstimate, RideRequest } from '@/types/ride';
import { simulatePricing } from './pricing';

const RAPIDO_BASE_URL = process.env.RAPIDO_BASE_URL ?? 'https://api.rapido.bike/v1';
const RAPIDO_API_KEY = process.env.RAPIDO_API_KEY ?? '';

export class RapidoRideService extends BaseRideService {
  constructor() {
    super('Rapido', RAPIDO_BASE_URL, RAPIDO_API_KEY);
  }

  async getEstimates(request: RideRequest): Promise<RideEstimate[]> {
    if (this.apiKey && request.pickups.length > 0 && request.pickups[0].lat !== 0) {
      const primaryPickup = request.pickups[0];
      const dropoff = request.dropoff;

      try {
        const data = await this.makeRequest('/estimate', {
          method: 'POST',
          body: JSON.stringify({
            pickup: {
              lat: primaryPickup.lat,
              lng: primaryPickup.lng,
            },
            drop: {
              lat: dropoff.lat,
              lng: dropoff.lng,
            },
          }),
        });

        if (data?.fare) {
          return [
            {
              service: 'rapido',
              price: Math.round(data.fare.total ?? data.fare.estimated_fare ?? 0),
              currency: data.fare.currency ?? 'INR',
              duration: Math.round(data.fare.eta ?? request.approxDurationMinutes ?? 25),
              distance: Number(data.fare.distance ?? request.approxDistanceKm ?? 8),
              arrivalTime: new Date(
                (request.departureTime?.getTime() ?? Date.now()) +
                  (data.fare.eta ?? request.approxDurationMinutes ?? 25) * 60_000,
              ).toISOString(),
              productName: 'Rapido Bike Taxi',
            },
          ];
        }
      } catch (error) {
        console.warn('Falling back to simulated Rapido pricing', error);
      }
    }

    return simulatePricing(request, {
      service: 'rapido',
      productName: 'Rapido Bike Taxi',
      productVariants: [
        { productName: 'Rapido Bike Taxi', multiplier: 1 },
        { productName: 'Rapido Auto', multiplier: 1.25 },
      ],
      baseFare: 40,
      perKm: 10,
      perMinute: 1.8,
      surgeMultiplier: request.approxDistanceKm && request.approxDistanceKm > 15 ? 1.1 : 1,
    });
  }
}
