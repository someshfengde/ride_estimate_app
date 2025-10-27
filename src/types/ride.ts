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
  pickup: Location;
  dropoff: Location;
  departureTime?: Date;
}

export interface RideService {
  getEstimates(request: RideRequest): Promise<RideEstimate[]>;
}
