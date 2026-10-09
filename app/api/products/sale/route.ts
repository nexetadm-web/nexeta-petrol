import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, productSales } from "@/lib/schema";
import { eq, sql, and } from "drizzle-orm";
import { getTodayDateString } from "@/lib/formatters";
import { getCurrentPumpId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const pumpId = await getCurrentPumpId(request);
    const body = await request.json();
    const { product_id, qty, date } = body;

    if (!product_id || !qty) {
      return NextResponse.json(
        { success: false, error: "Product and quantity are required" },
        { status: 400 }
      );
    }

    const nQty = parseFloat(qty);
    if (nQty <= 0) {
      return NextResponse.json({ success: false, error: "Quantity must be greater than 0" }, { status: 400 });
    }

    const pList = await db
      .select()
      .from(products)
      .where(and(eq(products.id, Number(product_id)), eq(products.pump_id, pumpId)));

    if (pList.length === 0) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }

    const prod = pList[0];

    if (prod.stock_qty < nQty) {
      return NextResponse.json(
        {
          success: false,
          error: `اسٹاک میں صرف ${prod.stock_qty} موجود ہیں (Only ${prod.stock_qty} in stock)`,
        },
        { status: 400 }
      );
    }

    const total = nQty * prod.sale_price;
    const profit = nQty * (prod.sale_price - prod.purchase_price);
    const saleDate = date || getTodayDateString();

    const [saleRecord] = await db
      .insert(productSales)
      .values({
        pump_id: pumpId,
        date: saleDate,
        product_id: prod.id,
        qty: nQty,
        total,
        profit,
      })
      .returning();

    await db
      .update(products)
      .set({
        stock_qty: sql`MAX(0, ${products.stock_qty} - ${nQty})`,
      })
      .where(and(eq(products.id, prod.id), eq(products.pump_id, pumpId)));

    return NextResponse.json({
      success: true,
      message: `فروخت کامیابی سے درج ہو گئی! منافع: Rs. ${profit.toLocaleString()}`,
      sale: saleRecord,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
