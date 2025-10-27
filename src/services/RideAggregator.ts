import type { RideEstimate, RideRequest } from '@/types/ride';
import type { RideService } from '@/types/ride';

export class RideAggregator {
  private services: RideService[];

  constructor(services: RideService[]) {
    this.services = services;
  }

  async getEstimates(request: RideRequest): Promise<RideEstimate[]> {
    const results = await Promise.all(
      this.services.map(async (service) => {
        try {
          return await service.getEstimates(request);
        } catch (error) {
          console.error('Provider failed', error);
          return [];
        }
      }),
    );

    return results.flat();
  }
}
