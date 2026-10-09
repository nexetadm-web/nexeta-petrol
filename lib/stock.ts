/**
 * Nexeta Petrol - Tank Stock & Dip Chart Interpolation Engine
 * 
 * Accurately calculates volume (litres) from dip measurement (mm)
 * using calibration chart interpolation.
 */

export interface DipChartEntry {
  dip_mm: number;
  volume_liters: number;
}

/**
 * Calculates stock in litres for a given dip (mm) from calibration chart rows.
 * Uses piecewise linear interpolation between chart points.
 * 
 * @param dip_mm The measured dip in millimeters
 * @param dipChartRows Array of { dip_mm, volume_liters } points
 * @param maxCapacity Optional tank maximum capacity in litres
 * @returns Calculated volume in litres (rounded to 2 decimal places)
 */
export function getStockFromDip(
  dip_mm: number,
  dipChartRows: DipChartEntry[] | null | undefined,
  maxCapacity?: number
): number {
  if (dip_mm === null || dip_mm === undefined || isNaN(dip_mm) || dip_mm <= 0) {
    return 0;
  }

  if (!dipChartRows || dipChartRows.length === 0) {
    return 0;
  }

  // Sort ascending by dip_mm
  const sorted = [...dipChartRows]
    .map((r) => ({
      dip_mm: Number(r.dip_mm),
      volume_liters: Number(r.volume_liters),
    }))
    .filter((r) => !isNaN(r.dip_mm) && !isNaN(r.volume_liters))
    .sort((a, b) => a.dip_mm - b.dip_mm);

  if (sorted.length === 0) return 0;

  // If dip is at or below the first calibration point
  const first = sorted[0];
  if (dip_mm <= first.dip_mm) {
    if (first.dip_mm === 0) return first.volume_liters;
    // Linear scale from 0 to first point
    const vol = (dip_mm / first.dip_mm) * first.volume_liters;
    return Math.max(0, Math.round(vol * 100) / 100);
  }

  // If dip is at or above the last calibration point
  const last = sorted[sorted.length - 1];
  if (dip_mm >= last.dip_mm) {
    const cap = maxCapacity && maxCapacity > last.volume_liters ? maxCapacity : last.volume_liters;
    return Math.round(cap * 100) / 100;
  }

  // Check for exact match
  const exact = sorted.find((r) => r.dip_mm === dip_mm);
  if (exact) {
    return Math.round(exact.volume_liters * 100) / 100;
  }

  // Find lower and upper bounds for piecewise linear interpolation
  let lower = sorted[0];
  let upper = sorted[sorted.length - 1];

  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].dip_mm <= dip_mm && sorted[i + 1].dip_mm >= dip_mm) {
      lower = sorted[i];
      upper = sorted[i + 1];
      break;
    }
  }

  const dipDiff = upper.dip_mm - lower.dip_mm;
  if (dipDiff === 0) {
    return Math.round(lower.volume_liters * 100) / 100;
  }

  // Linear interpolation formula:
  // volume = lower.vol + (dip - lower.dip) * (upper.vol - lower.vol) / (upper.dip - lower.dip)
  const volDiff = upper.volume_liters - lower.volume_liters;
  const interpolated = lower.volume_liters + ((dip_mm - lower.dip_mm) * volDiff) / dipDiff;

  return Math.max(0, Math.round(interpolated * 100) / 100);
}

/**
 * Generates an initial linear calibration chart if user does not have calibration sheet
 * @param height_mm Total height of tank in mm (e.g. 2500)
 * @param capacity_liters Total volume capacity in litres (e.g. 40000)
 * @param step_mm Interval between calibration points (default 100mm)
 */
export function generateLinearDipChart(
  height_mm: number,
  capacity_liters: number,
  step_mm: number = 100
): DipChartEntry[] {
  const chart: DipChartEntry[] = [];
  const safeHeight = height_mm > 0 ? height_mm : 2500;
  const safeCapacity = capacity_liters > 0 ? capacity_liters : 40000;
  const safeStep = step_mm > 0 ? step_mm : 100;

  chart.push({ dip_mm: 0, volume_liters: 0 });

  for (let d = safeStep; d < safeHeight; d += safeStep) {
    const vol = Math.round(((d / safeHeight) * safeCapacity) * 100) / 100;
    chart.push({ dip_mm: d, volume_liters: vol });
  }

  chart.push({ dip_mm: safeHeight, volume_liters: safeCapacity });
  return chart;
}

/**
 * Parses CSV string in format `dip_mm,volume_liters`
 */
export function parseDipChartCSV(csvText: string): { rows: DipChartEntry[]; errors: string[] } {
  const rows: DipChartEntry[] = [];
  const errors: string[] = [];
  const lines = csvText.split(/\r?\n/);

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) return;

    // Skip header line if detected
    if (index === 0 && (line.toLowerCase().includes("dip") || line.toLowerCase().includes("volume"))) {
      return;
    }

    const parts = line.split(/[,\t;]/).map((s) => s.trim());
    if (parts.length < 2) {
      errors.push(`Line ${index + 1}: Invalid format (expected dip,volume)`);
      return;
    }

    const dip = parseFloat(parts[0]);
    const vol = parseFloat(parts[1]);

    if (isNaN(dip) || isNaN(vol)) {
      errors.push(`Line ${index + 1}: Non-numeric values found ("${parts[0]}", "${parts[1]}")`);
      return;
    }

    if (dip < 0 || vol < 0) {
      errors.push(`Line ${index + 1}: Negative values not allowed`);
      return;
    }

    rows.push({ dip_mm: dip, volume_liters: vol });
  });

  // Sort ascending
  rows.sort((a, b) => a.dip_mm - b.dip_mm);
  return { rows, errors };
}
