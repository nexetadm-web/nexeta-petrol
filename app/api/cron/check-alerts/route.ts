import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { 
  alertSettings, 
  pumps, 
  tanks, 
  dailyReadings, 
  expenses, 
  aiAlerts 
} from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getTodayDatePK, formatLitres, formatRs } from "@/lib/formatters";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pumpIdParam = searchParams.get("pump_id");
    const today = getTodayDatePK();

    // Query pumps
    let pumpList = await db.select().from(pumps);
    if (pumpIdParam) {
      pumpList = pumpList.filter((p) => p.id === Number(pumpIdParam));
    }

    const alertsGenerated: any[] = [];

    for (const pump of pumpList) {
      // 1. Fetch alert settings for this pump
      const settingsRows = await db
        .select()
        .from(alertSettings)
        .where(eq(alertSettings.pump_id, pump.id))
        .limit(1);

      const settings = settingsRows[0] || {
        low_stock_alert: 1,
        low_stock_percent: 20,
        daily_report_alert: 1,
        owner_phone: pump.phone || "923001234567",
      };

      const ownerPhone = (settings.owner_phone || pump.phone || "923001234567").replace(/[^0-9]/g, "");

      // 2. CHECK LOW STOCK TANKS
      if (settings.low_stock_alert) {
        const pumpTanks = await db.select().from(tanks).where(eq(tanks.pump_id, pump.id));
        const threshold = settings.low_stock_percent || 20;

        for (const t of pumpTanks) {
          const cap = t.capacity_liters || t.capacity || 25000;
          const cur = t.current_stock_liters !== undefined && t.current_stock_liters !== null ? t.current_stock_liters : t.current_stock;
          const pct = cap > 0 ? Math.round((cur / cap) * 100) : 0;

          if (pct < threshold) {
            const tankName = t.tank_name || t.name || `Tank ${t.id}`;
            const fuelName = t.product || t.fuel_type || "Fuel";
            const msg = `⚠️ [${pump.pump_name}] - ${tankName} ${fuelName} صرف ${pct}% باقی - ${Math.round(cur)}L - فوری خرید کریں`;
            const waUrl = `https://wa.me/${ownerPhone}?text=${encodeURIComponent(msg)}`;

            alertsGenerated.push({
              pump_id: pump.id,
              pump_name: pump.pump_name,
              type: "low_stock",
              tank_id: t.id,
              tank_name: tankName,
              percentage: pct,
              stock_liters: cur,
              message: msg,
              phone: ownerPhone,
              whatsapp_url: waUrl,
            });

            // Log into ai_alerts if table exists
            try {
              await db.insert(aiAlerts).values({
                pump_id: pump.id,
                tank_id: t.id,
                alert_type: "unusual_loss",
                avg_loss: 0,
                days: 1,
                severity: "high",
                message: msg,
                status: "active",
                date: today,
              });
            } catch (e) {}
          }
        }
      }

      // 3. CHECK DAILY 9 PM SUMMARY REPORT ALERT
      if (settings.daily_report_alert) {
        // Fetch today's sales
        const readings = await db
          .select({
            litresSold: dailyReadings.litres_sold,
            amount: dailyReadings.amount,
          })
          .from(dailyReadings)
          .where(and(eq(dailyReadings.pump_id, pump.id), eq(dailyReadings.date, today)));

        let totalSaleLiters = 0;
        let totalIncome = 0;
        readings.forEach((r) => {
          totalSaleLiters += r.litresSold || 0;
          totalIncome += r.amount || 0;
        });

        // Expenses
        const dayExpenses = await db
          .select()
          .from(expenses)
          .where(and(eq(expenses.pump_id, pump.id), eq(expenses.date, today)));

        const totalExpense = dayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const estProfit = Math.max(0, Math.round(totalSaleLiters * 9.87 - totalExpense));

        const summaryMsg = `آج کی رپورٹ [${pump.pump_name}] - Sale ${Math.round(totalSaleLiters)}L - Income Rs ${Math.round(totalIncome / 1000)}k - Profit Rs ${Math.round(estProfit / 1000)}k - Expense Rs ${Math.round(totalExpense / 1000)}k`;
        const waSummaryUrl = `https://wa.me/${ownerPhone}?text=${encodeURIComponent(summaryMsg)}`;

        alertsGenerated.push({
          pump_id: pump.id,
          pump_name: pump.pump_name,
          type: "daily_summary",
          message: summaryMsg,
          phone: ownerPhone,
          whatsapp_url: waSummaryUrl,
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      alerts_count: alertsGenerated.length,
      alerts: alertsGenerated,
    });
  } catch (error: any) {
    console.error("GET check-alerts error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
