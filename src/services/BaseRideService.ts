import { RideEstimate, RideRequest, RideService } from '@/types/ride';

export abstract class BaseRideService implements RideService {
  protected serviceName: string;
  protected baseUrl: string;
  protected apiKey: string;

  constructor(serviceName: string, baseUrl: string, apiKey: string) {
    this.serviceName = serviceName;
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  abstract getEstimates(request: RideRequest): Promise<RideEstimate[]>;

  protected async makeRequest(endpoint: string, options: RequestInit = {}) {
    const headers = new Headers(options.headers ?? {});
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    if (this.apiKey && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${this.apiKey}`);
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => undefined);
      const details =
        body && typeof body === 'object' ? ` | ${JSON.stringify(body)}` : '';
      throw new Error(
        `Failed to fetch from ${this.serviceName}: ${response.status} ${response.statusText}${details}`
      );
    }

    return response.json();
  }
}
