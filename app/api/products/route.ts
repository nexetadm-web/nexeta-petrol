import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, productSales } from "@/lib/schema";
import { desc, eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const allProducts = await db
      .select()
      .from(products)
      .orderBy(products.category, products.name);

    const recentSales = await db
      .select({
        id: productSales.id,
        date: productSales.date,
        product_id: productSales.product_id,
        productName: products.name,
        qty: productSales.qty,
        total: productSales.total,
        profit: productSales.profit,
      })
      .from(productSales)
      .leftJoin(products, eq(productSales.product_id, products.id))
      .orderBy(desc(productSales.date), desc(productSales.id))
      .limit(20);

    return NextResponse.json({ success: true, products: allProducts, recentSales });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, category, purchase_price, sale_price, stock_qty } = body;

    if (!name || !category || purchase_price == null || sale_price == null) {
      return NextResponse.json(
        { success: false, error: "Product name, category, purchase and sale price required" },
        { status: 400 }
      );
    }

    const [newProduct] = await db
      .insert(products)
      .values({
        name,
        category,
        purchase_price: Number(purchase_price),
        sale_price: Number(sale_price),
        stock_qty: Number(stock_qty) || 0,
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: "پروڈکٹ کا اندراج ہو گیا",
      product: newProduct,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
