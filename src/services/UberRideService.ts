import { BaseRideService } from './BaseRideService';
import type { RideEstimate, RideRequest } from '@/types/ride';
import { simulatePricing } from './pricing';

const UBER_BASE_URL = process.env.UBER_BASE_URL ?? 'https://api.uber.com/v1.2';
const UBER_SERVER_TOKEN = process.env.UBER_SERVER_TOKEN ?? '';

type UberPriceEstimate = {
  product_id?: string;
  display_name?: string;
  high_estimate?: number;
  estimate?: number;
  currency_code?: string;
  duration?: number;
  distance?: number;
};

export class UberRideService extends BaseRideService {
  constructor() {
    super('Uber', UBER_BASE_URL, UBER_SERVER_TOKEN);
  }

  async getEstimates(request: RideRequest): Promise<RideEstimate[]> {
    if (this.apiKey && request.pickups.length > 0 && request.pickups[0].lat !== 0) {
      const primaryPickup = request.pickups[0];
      const dropoff = request.dropoff;

      const params = new URLSearchParams({
        start_latitude: primaryPickup.lat.toString(),
        start_longitude: primaryPickup.lng.toString(),
        end_latitude: dropoff.lat.toString(),
        end_longitude: dropoff.lng.toString(),
      });

      try {
        const data = await this.makeRequest(`/estimates/price?${params.toString()}`, {
          headers: {
            Authorization: `Token ${this.apiKey}`,
          },
        });

        const payload = data as { prices?: UberPriceEstimate[] };
        if (Array.isArray(payload.prices) && payload.prices.length > 0) {
          return payload.prices.map((product) => ({
            service: 'uber',
            price: Math.round(product.high_estimate ?? product.estimate ?? 0),
            currency: product.currency_code ?? 'INR',
            duration: Math.round((product.duration ?? 0) / 60),
            distance: Number(product.distance ?? request.approxDistanceKm ?? 10),
            arrivalTime: new Date(
              (request.departureTime?.getTime() ?? Date.now()) + (product.duration ?? 1800) * 1000,
            ).toISOString(),
            productName: product.display_name ?? 'Uber',
            productId: product.product_id,
          }));
        }
      } catch (error) {
        console.warn('Falling back to simulated Uber pricing', error);
      }
    }

    return simulatePricing(request, {
      service: 'uber',
      productName: 'Uber Go',
      productVariants: [
        { productName: 'Uber Go', multiplier: 1 },
        { productName: 'Uber Premier', multiplier: 1.6 },
        { productName: 'Uber XL', multiplier: 1.9 },
      ],
      baseFare: 60,
      perKm: 13,
      perMinute: 2.5,
      surgeMultiplier: request.approxDurationMinutes && request.approxDurationMinutes > 45 ? 1.15 : 1,
    });
  }
}
