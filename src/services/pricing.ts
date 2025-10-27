import type { RideEstimate, RideRequest } from '@/types/ride';

type PricingConfig = {
  service: RideEstimate['service'];
  productName: string;
  productVariants?: Array<{ productName: string; multiplier: number }>;
  baseFare: number;
  perKm: number;
  perMinute: number;
  surgeMultiplier?: number;
  currency?: string;
};

export const simulatePricing = (
  request: RideRequest,
  config: PricingConfig,
): RideEstimate[] => {
  const distance = request.approxDistanceKm ?? 12;
  const duration = request.approxDurationMinutes ?? 35;
  const pickupsCount = request.pickups.length;
  const waitBuffer = Math.max(0, pickupsCount - 1) * 3;

  const surge = config.surgeMultiplier ?? 1;
  const currency = config.currency ?? 'INR';

  const variants = config.productVariants ?? [{ productName: config.productName, multiplier: 1 }];

  return variants.map((variant) => {
    const distanceCost = config.perKm * distance * variant.multiplier;
    const timeCost = config.perMinute * (duration + waitBuffer) * variant.multiplier;
    const base = config.baseFare * variant.multiplier;

    const price = Math.round((base + distanceCost + timeCost) * surge);

    const arrivalMinutesOffset = Math.round(duration + waitBuffer + variant.multiplier * 5);
    const arrivalTime = new Date(
      (request.departureTime?.getTime() ?? Date.now()) + arrivalMinutesOffset * 60_000,
    ).toISOString();

    return {
      service: config.service,
      price,
      currency,
      duration: Math.round(duration + waitBuffer * variant.multiplier),
      distance: Number(distance.toFixed(1)),
      arrivalTime,
      productName: variant.productName,
    };
  });
};
