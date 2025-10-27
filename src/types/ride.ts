export interface Location {
  lat: number;
  lng: number;
  address?: string;
  name?: string;
}

export interface RideEstimate {
  service: 'uber' | 'ola' | 'rapido';
  price: number;
  currency: string;
  duration: number; // in minutes
  distance: number; // in kilometers
  arrivalTime: string;
  productName: string;
  productId?: string;
}

export interface RideRequest {
  pickups: Location[];
  dropoff: Location;
  departureTime?: Date;
  city?: string;
  approxDistanceKm?: number;
  approxDurationMinutes?: number;
}

export interface RideService {
  getEstimates(request: RideRequest): Promise<RideEstimate[]>;
}
