/**
 * Shift Calculation Engine - Nexeta Petrol
 * Exact formula for Shift Open / Close reconciliations:
 * 
 * 1. Total Sale Litre: nozzle_end - nozzle_start
 * 2. Total Sale Amount: total_litre * rate
 * 3. Cash in Hand: total_amount - credit - expense (Cash that should be in the drawer)
 * 4. Short / Extra Difference: cash_received - cash_in_hand
 *    - Negative = Short (کمی / شارٹ)
 *    - Positive = Extra / Surplus (اضافی)
 *    - Zero = Matched (برابر)
 */

export interface ShiftCalculationResult {
  total_litre: number;
  total_amount: number;
  cash_in_hand: number;
  difference: number;
  status: "matched" | "short" | "extra";
  formatted: {
    total_litre: string;
    total_amount: string;
    cash_in_hand: string;
    difference: string;
    summary_line: string;
  };
}

export function validateShiftReadings(
  nozzle_start: number | string,
  nozzle_end: number | string
): { valid: boolean; error?: string } {
  const start = typeof nozzle_start === "number" ? nozzle_start : parseFloat(nozzle_start);
  const end = typeof nozzle_end === "number" ? nozzle_end : parseFloat(nozzle_end);

  if (isNaN(start) || isNaN(end)) {
    return { valid: false, error: "نوزل ریڈنگ درست نمبر درج کریں" };
  }

  if (end < start) {
    return {
      valid: false,
      error: "End reading start se kam nahi ho sakta (اختتامی ریڈنگ ابتدائی سے کم نہیں ہو سکتی)",
    };
  }

  return { valid: true };
}

export function calculateShift(
  nozzle_start: number | string,
  nozzle_end: number | string,
  rate: number | string,
  cash_received: number | string = 0,
  credit: number | string = 0,
  expense: number | string = 0
): ShiftCalculationResult {
  const start = typeof nozzle_start === "number" ? nozzle_start : parseFloat(nozzle_start) || 0;
  const end = typeof nozzle_end === "number" ? nozzle_end : parseFloat(nozzle_end) || 0;
  const appliedRate = typeof rate === "number" ? rate : parseFloat(rate) || 0;
  const cashRec = typeof cash_received === "number" ? cash_received : parseFloat(cash_received) || 0;
  const cred = typeof credit === "number" ? credit : parseFloat(credit) || 0;
  const exp = typeof expense === "number" ? expense : parseFloat(expense) || 0;

  // 1. Total Sale Litre
  const total_litre = parseFloat(Math.max(0, end - start).toFixed(2));

  // 2. Total Sale Amount
  const total_amount = parseFloat((total_litre * appliedRate).toFixed(2));

  // 3. Cash in Hand - Yeh asal cash jo daraz me hona chahiye
  const cash_in_hand = parseFloat((total_amount - cred - exp).toFixed(2));

  // 4. Short / Extra
  const difference = parseFloat((cashRec - cash_in_hand).toFixed(2));

  let status: "matched" | "short" | "extra" = "matched";
  if (difference < -0.01) {
    status = "short";
  } else if (difference > 0.01) {
    status = "extra";
  }

  const summary_line = `Cash Hona Chahiye: ${total_amount.toLocaleString("en-PK")} - ${cred.toLocaleString("en-PK")} udhar - ${exp.toLocaleString("en-PK")} kharcha = ${cash_in_hand.toLocaleString("en-PK")}`;

  return {
    total_litre,
    total_amount,
    cash_in_hand,
    difference,
    status,
    formatted: {
      total_litre: `${total_litre.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`,
      total_amount: `Rs. ${total_amount.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      cash_in_hand: `Rs. ${cash_in_hand.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      difference: `Rs. ${Math.abs(difference).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      summary_line,
    },
  };
}

export interface NozzleReadingEntry {
  nozzle_id: number | string;
  nozzle_name?: string;
  fuel_type?: string;
  start: number | string;
  end: number | string;
  rate: number | string;
}

export function calculateMultiNozzleShift(
  nozzles: NozzleReadingEntry[],
  cash_received: number | string = 0,
  credit: number | string = 0,
  expense: number | string = 0
): ShiftCalculationResult & { nozzle_breakdown: Array<{ nozzle_id: number | string; litre: number; amount: number }> } {
  let total_litre = 0;
  let total_amount = 0;

  const nozzle_breakdown = nozzles.map((n) => {
    const s = typeof n.start === "number" ? n.start : parseFloat(n.start) || 0;
    const e = typeof n.end === "number" ? n.end : parseFloat(n.end) || 0;
    const r = typeof n.rate === "number" ? n.rate : parseFloat(n.rate) || 0;

    const litre = parseFloat(Math.max(0, e - s).toFixed(2));
    const amount = parseFloat((litre * r).toFixed(2));

    total_litre += litre;
    total_amount += amount;

    return {
      nozzle_id: n.nozzle_id,
      litre,
      amount,
    };
  });

  total_litre = parseFloat(total_litre.toFixed(2));
  total_amount = parseFloat(total_amount.toFixed(2));

  const cashRec = typeof cash_received === "number" ? cash_received : parseFloat(cash_received) || 0;
  const cred = typeof credit === "number" ? credit : parseFloat(credit) || 0;
  const exp = typeof expense === "number" ? expense : parseFloat(expense) || 0;

  const cash_in_hand = parseFloat((total_amount - cred - exp).toFixed(2));
  const difference = parseFloat((cashRec - cash_in_hand).toFixed(2));

  let status: "matched" | "short" | "extra" = "matched";
  if (difference < -0.01) {
    status = "short";
  } else if (difference > 0.01) {
    status = "extra";
  }

  const summary_line = `Cash Hona Chahiye: ${total_amount.toLocaleString("en-PK")} - ${cred.toLocaleString("en-PK")} udhar - ${exp.toLocaleString("en-PK")} kharcha = ${cash_in_hand.toLocaleString("en-PK")}`;

  return {
    total_litre,
    total_amount,
    cash_in_hand,
    difference,
    status,
    nozzle_breakdown,
    formatted: {
      total_litre: `${total_litre.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`,
      total_amount: `Rs. ${total_amount.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      cash_in_hand: `Rs. ${cash_in_hand.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      difference: `Rs. ${Math.abs(difference).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      summary_line,
    },
  };
}
