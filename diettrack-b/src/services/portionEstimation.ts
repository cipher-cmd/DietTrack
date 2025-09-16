// src/services/portionEstimation.ts
import { PortionEstimate } from '@/types';

type ReferenceObject =
  | 'katori'
  | 'plate'
  | 'coin_10_rupee'
  | 'spoon_steel'
  | 'phone'
  | 'bowl'
  | 'hand';

export interface PortionEstimationInput {
  modelEstimate?: number;
  referenceObject?: ReferenceObject;
  detectedSizePx?: number;
  userRegion?: string;
  foodName?: string;
}

const referenceWeights: Record<ReferenceObject, number> = {
  katori: 150,
  plate: 250,
  coin_10_rupee: 7.7,
  spoon_steel: 8,
  phone: 170,
  bowl: 200,
  hand: 100,
};

const regionDefaults: Record<string, Record<string, number>> = {
  north: { dal: 150, roti: 35, rice: 150 },
  south: { idli: 40, dosa: 80, rice: 130 },
};

export function estimatePortionSize(
  input: PortionEstimationInput = {}
): PortionEstimate {
  let estimated =
    typeof input.modelEstimate === 'number' && input.modelEstimate > 0
      ? input.modelEstimate
      : 100;

  if (input.referenceObject && referenceWeights[input.referenceObject]) {
    estimated = referenceWeights[input.referenceObject];
  }

  const region = (input.userRegion || '').toLowerCase();
  const food = (input.foodName || '').toLowerCase();
  if (region && food && regionDefaults[region]?.[food]) {
    estimated = regionDefaults[region][food];
  }

  const servingSizeCategory: PortionEstimate['servingSizeCategory'] =
    estimated < 80 ? 'small' : estimated > 200 ? 'large' : 'medium';

  return {
    estimatedGrams: estimated,
    confidenceRange: {
      min: Math.round(estimated * 0.85),
      max: Math.round(estimated * 1.15),
    },
    referenceDetected: input.referenceObject,
    servingSizeCategory,
  };
}
