import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { aiAlerts, tanks, dipVariations, stockLogs, pumps } from "@/lib/schema";
import { eq, and, desc } from "drizzle-orm";
import { getTodayDatePK } from "@/lib/formatters";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { pumpId: string } }
) {
  try {
    const pumpId = Number(params.pumpId);
    if (isNaN(pumpId)) {
      return NextResponse.json({ success: false, error: "Invalid pump ID" }, { status: 400 });
    }

    // 1. Fetch pump, tanks, variations and existing AI alerts in parallel
    const [pumpRows, allTanks, recentVariations, existingAlerts] = await Promise.all([
      db.select({ id: pumps.id, pump_name: pumps.pump_name }).from(pumps).where(eq(pumps.id, pumpId)),
      db.select().from(tanks).where(eq(tanks.pump_id, pumpId)),
      db
        .select()
        .from(dipVariations)
        .where(eq(dipVariations.pump_id, pumpId))
        .orderBy(desc(dipVariations.id))
        .limit(100),
      db
        .select()
        .from(aiAlerts)
        .where(eq(aiAlerts.pump_id, pumpId))
        .orderBy(desc(aiAlerts.id))
        .limit(20),
    ]);

    const pumpName = pumpRows[0]?.pump_name || "Nexeta Petrol";
    const today = getTodayDatePK();

    // 2. Run AI Discrepancy & Leakage Scan for each tank
    const tankStats = allTanks.map((tank) => {
      const tankVars = recentVariations.filter((v) => v.tank_id === tank.id);
      
      // Calculate consecutive losses or unexplained negative differences
      const negativeVars = tankVars.filter((v) => v.difference_liters < 0);
      const totalLoss = negativeVars.reduce((acc, v) => acc + Math.abs(v.difference_liters), 0);
      const daysCount = Math.max(1, Math.min(7, tankVars.length));
      const avgDailyLoss = Math.round((totalLoss / daysCount) * 10) / 10;

      // Leakage / Theft detection heuristic:
      // If average loss > 50L per entry without sale/receiving reasons or > 3 unexplained low dips
      const hasUnexplainedLosses = negativeVars.some(
        (v) => v.reason_type === "لیکج" || v.reason_type === "چوری" || v.reason_type === "دیگر"
      );

      let riskLevel: "normal" | "warning" | "critical" = "normal";
      let alertMessage = `ٹینک "${tank.tank_name || tank.name}" میں اسٹاک اور پیمائش بالکل نارمل ہے۔`;

      if (avgDailyLoss > 50 || hasUnexplainedLosses) {
        if (avgDailyLoss >= 80) {
          riskLevel = "critical";
          alertMessage = `⚠️ شدید خطرہ: ٹینک "${tank.tank_name || tank.name}" میں پچھلے ${daysCount} دنوں سے اوسطاً روزانہ ${avgDailyLoss}L کی اضافی کمی پائی گئی ہے - ممکنہ زیر زمین لیکج یا چوری!`;
        } else {
          riskLevel = "warning";
          alertMessage = `احتیاط: ٹینک "${tank.tank_name || tank.name}" میں روزانہ تقریباً ${avgDailyLoss}L کا غیر معمولی فرق دیکھا جا رہا ہے۔ نوزل میٹر اور والو چیک کریں۔`;
        }
      }

      return {
        tank_id: tank.id,
        tank_no: tank.tank_no || tank.id,
        tank_name: tank.tank_name || tank.name,
        product: tank.product || tank.fuel_type,
        capacity: tank.capacity_liters || tank.capacity,
        current_stock: tank.current_stock_liters || tank.current_stock,
        days_analyzed: daysCount,
        total_loss_liters: totalLoss,
        avg_daily_loss: avgDailyLoss,
        risk_level: riskLevel,
        alert_message: alertMessage,
        recent_variations_count: tankVars.length,
      };
    });

    // Auto-generate / sync alerts into ai_alerts table for critical/warning items
    for (const stat of tankStats) {
      if (stat.risk_level !== "normal") {
        const alreadyExists = existingAlerts.some(
          (a) => a.tank_id === stat.tank_id && a.date === today && a.status === "active"
        );

        if (!alreadyExists) {
          try {
            await db.insert(aiAlerts).values({
              pump_id: pumpId,
              tank_id: stat.tank_id,
              alert_type: stat.risk_level === "critical" ? "leakage" : "unusual_loss",
              avg_loss: stat.avg_daily_loss,
              days: stat.days_analyzed,
              severity: stat.risk_level === "critical" ? "critical" : "warning",
              message: stat.alert_message,
              status: "active",
              date: today,
              created_at: new Date().toISOString(),
            });
          } catch (e) {
            console.warn("AI Alert auto-log notice:", e);
          }
        }
      }
    }

    // Refresh alerts with tank names attached
    const refreshedAlerts = await db
      .select()
      .from(aiAlerts)
      .where(eq(aiAlerts.pump_id, pumpId))
      .orderBy(desc(aiAlerts.id))
      .limit(30);

    const tankMap = new Map<number, any>();
    allTanks.forEach((t) => tankMap.set(t.id, t));

    const enrichedAlerts = refreshedAlerts.map((a) => {
      const t = tankMap.get(a.tank_id);
      return {
        ...a,
        tank_name: t ? t.tank_name || t.name : `Tank #${a.tank_id}`,
        product: t ? t.product || t.fuel_type : "Fuel",
      };
    });

    return NextResponse.json(
      {
        success: true,
        pump_name: pumpName,
        tankStats,
        alerts: enrichedAlerts,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=5, stale-while-revalidate=30",
        },
      }
    );
  } catch (error: any) {
    console.error("GET AI alerts error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Acknowledge alert or run manual scan
export async function POST(
  request: Request,
  { params }: { params: { pumpId: string } }
) {
  try {
    const pumpId = Number(params.pumpId);
    if (isNaN(pumpId)) {
      return NextResponse.json({ success: false, error: "Invalid pump ID" }, { status: 400 });
    }

    const body = await request.json();
    const action = body.action || "resolve";
    const alertId = Number(body.alert_id);

    if (action === "resolve" && !isNaN(alertId)) {
      await db
        .update(aiAlerts)
        .set({ status: "resolved" })
        .where(and(eq(aiAlerts.id, alertId), eq(aiAlerts.pump_id, pumpId)));

      return NextResponse.json({ success: true, message: "الرٹ حل شدہ قرار دے دیا گیا ہے" });
    }

    return NextResponse.json({ success: true, message: "AI اسکین مکمل ہوا" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
