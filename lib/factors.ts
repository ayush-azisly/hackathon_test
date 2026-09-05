export type ActivityType =
  | "car"
  | "bus"
  | "flight"
  | "electricity"
  | "veg_meal"
  | "non_veg_meal";

export interface FactorInfo {
  label: string;
  unit: string;
  /** kg CO2 per unit */
  factor: number;
  /** Above this quantity the entry is treated as absurd and needs explicit confirmation */
  sanityMax: number;
  /** Above this quantity the entry is rejected outright */
  hardMax: number;
}

export const FACTORS: Record<ActivityType, FactorInfo> = {
  car: { label: "Car travel", unit: "km", factor: 0.2, sanityMax: 1500, hardMax: 50000 },
  bus: { label: "Bus travel", unit: "km", factor: 0.08, sanityMax: 1500, hardMax: 50000 },
  flight: { label: "Flight", unit: "km", factor: 0.25, sanityMax: 20000, hardMax: 45000 },
  electricity: { label: "Electricity", unit: "kWh", factor: 0.8, sanityMax: 300, hardMax: 100000 },
  veg_meal: { label: "Veg meal", unit: "meals", factor: 0.5, sanityMax: 10, hardMax: 1000 },
  non_veg_meal: { label: "Non-veg meal", unit: "meals", factor: 2.0, sanityMax: 10, hardMax: 1000 },
};

export const ACTIVITY_TYPES = Object.keys(FACTORS) as ActivityType[];

export function isActivityType(t: string): t is ActivityType {
  return t in FACTORS;
}

export function co2For(type: ActivityType, quantity: number): number {
  return Math.round(FACTORS[type].factor * quantity * 1000) / 1000;
}
