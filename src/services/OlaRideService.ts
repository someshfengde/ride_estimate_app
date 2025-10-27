import { BaseRideService } from './BaseRideService';
import type { RideEstimate, RideRequest } from '@/types/ride';
import { simulatePricing } from './pricing';

const OLA_BASE_URL = process.env.OLA_BASE_URL ?? 'https://devapi.olacabs.com/v1';
const OLA_API_KEY = process.env.OLA_API_KEY ?? '';

type OlaFareBreakup = {
  type?: string;
  value?: number;
};

type OlaCategory = {
  id?: string;
  display_name?: string;
  currency?: string;
  eta?: number;
  fare_breakup?: OlaFareBreakup[];
};

export class OlaRideService extends BaseRideService {
  constructor() {
    super('Ola', OLA_BASE_URL, OLA_API_KEY);
  }

  async getEstimates(request: RideRequest): Promise<RideEstimate[]> {
    if (this.apiKey && request.pickups.length > 0 && request.pickups[0].lat !== 0) {
      const primaryPickup = request.pickups[0];
      const dropoff = request.dropoff;

      const params = new URLSearchParams({
        pickup_lat: primaryPickup.lat.toString(),
        pickup_lng: primaryPickup.lng.toString(),
        drop_lat: dropoff.lat.toString(),
        drop_lng: dropoff.lng.toString(),
      });

      try {
        const data = await this.makeRequest(`/products?${params.toString()}`, {
          headers: {
            'X-APP-TOKEN': this.apiKey,
          },
        });

        const payload = data as { categories?: OlaCategory[] };

        if (Array.isArray(payload.categories)) {
          return payload.categories
            .filter((category): category is OlaCategory & { fare_breakup: OlaFareBreakup[] } =>
              Array.isArray(category.fare_breakup) && category.fare_breakup.length > 0,
            )
            .map((category): RideEstimate => {
              const price = category.fare_breakup.reduce(
                (sum, fee) => sum + (fee.value ?? 0),
                0,
              );
              const etaMinutes = typeof category.eta === 'number' ? category.eta : undefined;
              const durationMinutes = Math.round(
                etaMinutes ?? request.approxDurationMinutes ?? 35,
              );
              return {
                service: 'ola',
                price: Math.round(price),
                currency: category.currency ?? 'INR',
                duration: durationMinutes,
                distance: Number(request.approxDistanceKm ?? 10),
                arrivalTime: new Date(
                  (request.departureTime?.getTime() ?? Date.now()) + durationMinutes * 60_000,
                ).toISOString(),
                productName: category.display_name ?? 'Ola',
                productId: category.id,
              };
            });
        }
      } catch (error) {
        console.warn('Falling back to simulated Ola pricing', error);
      }
    }

    return simulatePricing(request, {
      service: 'ola',
      productName: 'Ola Mini',
      productVariants: [
        { productName: 'Ola Bike', multiplier: 0.6 },
        { productName: 'Ola Mini', multiplier: 1 },
        { productName: 'Ola Prime Sedan', multiplier: 1.35 },
      ],
      baseFare: 55,
      perKm: 12,
      perMinute: 2.2,
      surgeMultiplier: request.pickups.length > 1 ? 1.1 : 1,
    });
  }
}
