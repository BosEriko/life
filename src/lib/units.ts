export type WeightUnit = "kg" | "lb";
export type VolumeUnit = "ml" | "l" | "floz";
export type HeightUnit = "ftin" | "cm";

export type Units = {
  weight: WeightUnit;
  volume: VolumeUnit;
  height: HeightUnit;
};

export const DEFAULT_UNITS: Units = {
  weight: "kg",
  volume: "ml",
  height: "ftin",
};

const LB_PER_KG = 2.2046226218;
const ML_PER_FLOZ = 29.5735295625;
const CM_PER_INCH = 2.54;

export function isWeightUnit(value: unknown): value is WeightUnit {
  return value === "kg" || value === "lb";
}

export function isVolumeUnit(value: unknown): value is VolumeUnit {
  return value === "ml" || value === "l" || value === "floz";
}

export function isHeightUnit(value: unknown): value is HeightUnit {
  return value === "ftin" || value === "cm";
}

/* ---------- weight (canonical: kilograms) ---------- */

export function fromKg(kg: number, unit: WeightUnit): number {
  return unit === "lb" ? kg * LB_PER_KG : kg;
}

export function toKg(value: number, unit: WeightUnit): number {
  return unit === "lb" ? value / LB_PER_KG : value;
}

export function weightSuffix(unit: WeightUnit): string {
  return unit === "lb" ? "lb" : "kg";
}

export function weightStep(unit: WeightUnit): number {
  return unit === "lb" ? 0.2 : 0.1;
}

export function formatWeight(kg: number, unit: WeightUnit): string {
  return `${fromKg(kg, unit).toFixed(1)} ${weightSuffix(unit)}`;
}

/* ---------- volume (canonical: millilitres) ---------- */

export function fromMl(ml: number, unit: VolumeUnit): number {
  if (unit === "l") return ml / 1000;
  if (unit === "floz") return ml / ML_PER_FLOZ;
  return ml;
}

export function toMl(value: number, unit: VolumeUnit): number {
  if (unit === "l") return value * 1000;
  if (unit === "floz") return value * ML_PER_FLOZ;
  return value;
}

export function volumeSuffix(unit: VolumeUnit): string {
  if (unit === "l") return "L";
  if (unit === "floz") return "fl oz";
  return "ml";
}

export function volumeStep(unit: VolumeUnit): number {
  if (unit === "l") return 0.25;
  if (unit === "floz") return 1;
  return 50;
}

export function volumeDecimals(unit: VolumeUnit): number {
  return unit === "l" ? 2 : 0;
}

export function volumeValue(ml: number, unit: VolumeUnit): number {
  const value = fromMl(ml, unit);
  const decimals = volumeDecimals(unit);
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function formatVolume(ml: number, unit: VolumeUnit): string {
  return `${volumeValue(ml, unit).toFixed(volumeDecimals(unit))} ${volumeSuffix(
    unit,
  )}`;
}

/* ---------- height (canonical: feet + inches) ---------- */

export function feetInchesToCm(feet: number, inches: number): number {
  return Math.round((feet * 12 + inches) * CM_PER_INCH);
}

export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = Math.round(cm / CM_PER_INCH);
  return { feet: Math.floor(totalInches / 12), inches: totalInches % 12 };
}

/* ---------- ideal ranges (stored canonically) ---------- */

export function convertRange(
  range: { min: number | null; max: number | null },
  convert: (value: number) => number,
): { min: number | null; max: number | null } {
  return {
    min: range.min == null ? null : Math.round(convert(range.min) * 10) / 10,
    max: range.max == null ? null : Math.round(convert(range.max) * 10) / 10,
  };
}
