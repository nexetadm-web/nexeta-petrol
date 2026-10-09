import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { creditCustomers, creditSales, products } from "@/lib/schema";
import { eq, desc, sql } from "drizzle-orm";
import { getTodayDatePK, formatDate } from "@/lib/formatters";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customer_id");

    if (customerId) {
      const records = await db
        .select()
        .from(creditSales)
        .where(eq(creditSales.customer_id, Number(customerId)))
        .orderBy(desc(creditSales.id));

      const customer = await db
        .select()
        .from(creditCustomers)
        .where(eq(creditCustomers.id, Number(customerId)));

      return NextResponse.json({
        success: true,
        customer: customer[0] || null,
        ledger: records,
      });
    }

    const allRecords = await db
      .select({
        id: creditSales.id,
        customerId: creditSales.customer_id,
        customerName: creditCustomers.name,
        company: creditCustomers.company,
        phone: creditCustomers.phone,
        vehicleNo: creditCustomers.vehicle_no,
        date: creditSales.date,
        type: creditSales.type,
        details: creditSales.details,
        qty: creditSales.qty,
        total: creditSales.total,
        is_payment: creditSales.is_payment,
      })
      .from(creditSales)
      .leftJoin(creditCustomers, eq(creditSales.customer_id, creditCustomers.id))
      .orderBy(desc(creditSales.id))
      .limit(50);

    return NextResponse.json({ success: true, records: allRecords });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customer_id, date, type, details, qty, total, is_payment, product_id } = body;

    if (!customer_id || total == null || !type) {
      return NextResponse.json(
        { success: false, error: "Customer, transaction type, and total amount required" },
        { status: 400 }
      );
    }

    const targetDate = date ? formatDate(date) : getTodayDatePK();
    const isPaymentFlag =
      is_payment === 1 || type.toLowerCase() === "payment" || type.toLowerCase() === "wasooli" ? 1 : 0;

    const nQty = Number(qty) || 0;

    const [record] = await db
      .insert(creditSales)
      .values({
        customer_id: Number(customer_id),
        date: targetDate,
        type: type || "Fuel",
        details: details || "",
        qty: nQty,
        total: Number(total),
        is_payment: isPaymentFlag,
      })
      .returning();

    // If an Udhar product sale specifies a product_id and qty > 0, deduct product stock!
    if (product_id && nQty > 0 && isPaymentFlag === 0) {
      await db
        .update(products)
        .set({
          stock_qty: sql`MAX(0, ${products.stock_qty} - ${nQty})`,
        })
        .where(eq(products.id, Number(product_id)));
    }

    return NextResponse.json({
      success: true,
      message: isPaymentFlag ? "وصولی کا اندراج ہو گیا (Payment recorded)" : "ادھار انٹری محفوظ ہو گئی (Credit sale recorded)",
      record,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
