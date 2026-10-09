/**
 * Nexeta Petrol Pump Manager - Pakistan Formatters
 * Timezone: Asia/Karachi
 * Date Format: DD-MM-YYYY (e.g. 08-10-2026)
 * Time: 12-hour format (e.g. 05:30 PM)
 * Currency: Pakistani Rupee (Rs.)
 */

export const TIMEZONE_PK = "Asia/Karachi";

/**
 * Format numbers as Pakistani Rupee string (e.g. Rs. 285,400)
 */
export function formatRs(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return "Rs. 0";
  }
  const rounded = Math.round(amount * 100) / 100;
  return `Rs. ${rounded.toLocaleString("en-PK", {
    minimumFractionDigits: rounded % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format Litres with comma and L (e.g. 1,450.50 L)
 */
export function formatLitres(litres: number | null | undefined): string {
  if (litres === null || litres === undefined || isNaN(litres)) {
    return "0 L";
  }
  const rounded = Math.round(litres * 100) / 100;
  return `${rounded.toLocaleString("en-PK")} L`;
}

/**
 * Helper to get current Date object in Asia/Karachi timezone
 */
export function getNowInKarachi(): Date {
  return new Date();
}

/**
 * Returns today's date in standard YYYY-MM-DD for HTML input compatibility
 * based on Asia/Karachi timezone
 */
export function getTodayDateString(): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: TIMEZONE_PK,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(new Date()); // Outputs YYYY-MM-DD
  } catch {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}

/**
 * Returns today's date in Pakistan DD-MM-YYYY format (e.g. 08-10-2026)
 */
export function getTodayDatePK(): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: TIMEZONE_PK,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    return formatter.format(new Date()).replace(/\//g, "-");
  } catch {
    const parts = getTodayDateString().split("-");
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
}

/**
 * Formats any date string (YYYY-MM-DD, DD-MM-YYYY, or ISO) to Pakistan DD-MM-YYYY (e.g. 08-10-2026)
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "";
  try {
    if (typeof date === "string") {
      // Check if already DD-MM-YYYY
      const dmRegex = /^(\d{2})-(\d{2})-(\d{4})$/;
      if (dmRegex.test(date.trim())) {
        return date.trim();
      }

      // Check if YYYY-MM-DD
      const ymRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
      const match = date.trim().match(ymRegex);
      if (match) {
        return `${match[3]}-${match[2]}-${match[1]}`;
      }

      const d = new Date(date);
      if (isNaN(d.getTime())) return date;
      const formatter = new Intl.DateTimeFormat("en-GB", {
        timeZone: TIMEZONE_PK,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      return formatter.format(d).replace(/\//g, "-");
    }

    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: TIMEZONE_PK,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    return formatter.format(date).replace(/\//g, "-");
  } catch {
    return String(date);
  }
}

/**
 * Alias for formatDate to preserve backward compatibility:
 * Formats date strictly as DD-MM-YYYY (08-10-2026) in Pakistan Timezone
 */
export function formatDateDisplay(dateStr: string | null | undefined): string {
  return formatDate(dateStr);
}

export const formatPKDate = formatDate;

/**
 * Format time in 12-hour format with Asia/Karachi timezone (e.g. 05:30 PM)
 */
export function formatTime(date: string | Date | null | undefined): string {
  if (!date) return "";
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("en-US", {
      timeZone: TIMEZONE_PK,
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  } catch {
    return "";
  }
}

/**
 * Format both date and time in Pakistan format: DD-MM-YYYY hh:mm A
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "";
  const dStr = formatDate(date);
  const tStr = formatTime(date);
  return tStr ? `${dStr} ${tStr}` : dStr;
}

/**
 * Normalize DD-MM-YYYY or any date to standard YYYY-MM-DD
 */
export function toStandardYMD(dateStr: string): string {
  if (!dateStr) return getTodayDateString();
  const trimmed = dateStr.trim();
  // If DD-MM-YYYY
  const parts = trimmed.split("-");
  if (parts.length === 3) {
    if (parts[0].length === 2 && parts[2].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    if (parts[0].length === 4 && parts[2].length === 2) {
      return trimmed;
    }
  }
  return trimmed;
}

/**
 * Normalize YYYY-MM-DD or any date to DD-MM-YYYY
 */
export function toPKDate(dateStr: string): string {
  return formatDate(dateStr);
}

/**
 * Generate formatted WhatsApp bill message with Pakistan DD-MM-YYYY date
 */
export function generateWhatsAppBill({
  customerName,
  company,
  vehicleNo,
  phone,
  date,
  totalCredit,
  totalPaid,
  balance,
  lastTransaction,
}: {
  customerName: string;
  company?: string | null;
  vehicleNo?: string | null;
  phone: string;
  date: string;
  totalCredit: number;
  totalPaid: number;
  balance: number;
  lastTransaction?: {
    type: string;
    details?: string | null;
    qty?: number;
    amount: number;
  };
}): string {
  let cleanPhone = phone.replace(/[^0-9]/g, "");
  if (cleanPhone.startsWith("0")) {
    cleanPhone = "92" + cleanPhone.substring(1);
  } else if (!cleanPhone.startsWith("92")) {
    cleanPhone = "92" + cleanPhone;
  }

  const billDate = formatDate(date);

  const billText = `*⛽ NEXETA PETROL PUMP MANAGER*
*نیکسیٹا پیٹرول پمپ - ادھار کھاتہ بل*
----------------------------------------
*تاریخ (Date):* ${billDate}
*گاہک (Customer):* ${customerName}
${company ? `*کمپنی (Company):* ${company}\n` : ""}${vehicleNo ? `*گاڑی نمبر (Vehicle):* ${vehicleNo}\n` : ""}----------------------------------------
${
  lastTransaction
    ? `*آخری انٹری (Last Entry):*
• تفصیل: ${lastTransaction.details || lastTransaction.type}
${lastTransaction.qty ? `• مقدار: ${lastTransaction.qty} L\n` : ""}• رقم: ${formatRs(lastTransaction.amount)}
----------------------------------------\n`
    : ""
}*کل ادھار (Total Credit):* ${formatRs(totalCredit)}
*کل وصولی (Total Received):* ${formatRs(totalPaid)}
*🔴 واجب الادا بقایا (Net Balance Due):* ${formatRs(balance)}
----------------------------------------
برائے مہربانی اپنا بقایا جات جلد از جلد ادا فرمائیں۔ شکریہ!
*Nexeta Petroleum Services - Automation System*`;

  const encoded = encodeURIComponent(billText);
  return `https://wa.me/${cleanPhone}?text=${encoded}`;
}
