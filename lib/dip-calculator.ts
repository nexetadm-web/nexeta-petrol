import { db } from "@/lib/db";
import { dipCharts } from "@/lib/schema";
import { eq, asc } from "drizzle-orm";

/**
 * Interpolates or calculates litres from dip value (inches)
 */
export async function calculateDipLitres(tankId: number, fuelType: string, dipValue: number): Promise<number> {
  const points = await db
    .select()
    .from(dipCharts)
    .where(eq(dipCharts.fuel_type, fuelType))
    .orderBy(asc(dipCharts.dip_value));

  if (points.length === 0) {
    // Default fallback approximation if no chart points
    const maxCapacity = fuelType === "Diesel" ? 40000 : 30000;
    const maxHeight = fuelType === "Diesel" ? 108 : 96;
    return Math.round(Math.min(maxCapacity, (dipValue / maxHeight) * maxCapacity));
  }

  // Exact match
  const exact = points.find((p) => Math.abs(p.dip_value - dipValue) < 0.05);
  if (exact) return Math.round(exact.litres);

  // Below minimum
  if (dipValue <= points[0].dip_value) {
    const ratio = dipValue / points[0].dip_value;
    return Math.max(0, Math.round(points[0].litres * ratio));
  }

  // Above maximum
  if (dipValue >= points[points.length - 1].dip_value) {
    return Math.round(points[points.length - 1].litres);
  }

  // Linear interpolation between closest lower and upper points
  let lower = points[0];
  let upper = points[points.length - 1];

  for (let i = 0; i < points.length - 1; i++) {
    if (points[i].dip_value <= dipValue && points[i + 1].dip_value >= dipValue) {
      lower = points[i];
      upper = points[i + 1];
      break;
    }
  }

  const fraction = (dipValue - lower.dip_value) / (upper.dip_value - lower.dip_value);
  const litres = lower.litres + fraction * (upper.litres - lower.litres);
  return Math.round(litres);
}
