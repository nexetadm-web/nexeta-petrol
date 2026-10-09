import { db } from "./db";
import {
  tanks,
  nozzles,
  dailyRates,
  dailyReadings,
  fuelPurchases,
  products,
  productSales,
  creditCustomers,
  creditSales,
  expenses,
} from "./schema";
import { sql } from "drizzle-orm";

export async function seedDatabase() {
  console.log("Checking if database needs seeding...");

  // Check if tanks already exist
  const existingTanks = await db.select().from(tanks);
  if (existingTanks.length > 0) {
    console.log("Database already contains data, skipping seed.");
    return { success: true, message: "Already seeded" };
  }

  console.log("Seeding Nexeta Petrol Pump Manager initial data...");

  // 1. Tanks
  const [tank1] = await db
    .insert(tanks)
    .values({
      name: "Tank 1 (Super Petrol)",
      fuel_type: "Petrol",
      capacity: 30000,
      current_stock: 18450,
    })
    .returning();

  const [tank2] = await db
    .insert(tanks)
    .values({
      name: "Tank 2 (High Speed Diesel)",
      fuel_type: "Diesel",
      capacity: 40000,
      current_stock: 24800,
    })
    .returning();

  const [tank3] = await db
    .insert(tanks)
    .values({
      name: "Tank 3 (Hi-Octane HOBC)",
      fuel_type: "HiOctane",
      capacity: 15000,
      current_stock: 7900,
    })
    .returning();

  // 2. Nozzles (6 default nozzles)
  const [n1] = await db
    .insert(nozzles)
    .values({ name: "Nozzle 1 (Petrol)", tank_id: tank1.id })
    .returning();
  const [n2] = await db
    .insert(nozzles)
    .values({ name: "Nozzle 2 (Petrol)", tank_id: tank1.id })
    .returning();
  const [n3] = await db
    .insert(nozzles)
    .values({ name: "Nozzle 3 (Petrol)", tank_id: tank1.id })
    .returning();
  const [n4] = await db
    .insert(nozzles)
    .values({ name: "Nozzle 4 (Diesel)", tank_id: tank2.id })
    .returning();
  const [n5] = await db
    .insert(nozzles)
    .values({ name: "Nozzle 5 (Diesel)", tank_id: tank2.id })
    .returning();
  const [n6] = await db
    .insert(nozzles)
    .values({ name: "Nozzle 6 (Hi-Octane)", tank_id: tank3.id })
    .returning();

  // 3. Daily Rates (Today)
  const todayStr = new Date().toISOString().split("T")[0];
  await db.insert(dailyRates).values({
    date: todayStr,
    petrol_rate: 285.5,
    diesel_rate: 292.0,
    hioctane_rate: 312.0,
  });

  // Yesterday rate for historical calculations
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];
  await db.insert(dailyRates).values({
    date: yesterdayStr,
    petrol_rate: 285.5,
    diesel_rate: 292.0,
    hioctane_rate: 312.0,
  });

  // 4. Initial Daily Readings for Today
  await db.insert(dailyReadings).values([
    {
      date: todayStr,
      nozzle_id: n1.id,
      morning_reading: 104250.0,
      evening_reading: 105650.0,
      litres_sold: 1400.0,
      rate: 285.5,
      amount: 1400.0 * 285.5,
    },
    {
      date: todayStr,
      nozzle_id: n2.id,
      morning_reading: 88400.0,
      evening_reading: 89620.0,
      litres_sold: 1220.0,
      rate: 285.5,
      amount: 1220.0 * 285.5,
    },
    {
      date: todayStr,
      nozzle_id: n3.id,
      morning_reading: 52100.0,
      evening_reading: 53080.0,
      litres_sold: 980.0,
      rate: 285.5,
      amount: 980.0 * 285.5,
    },
    {
      date: todayStr,
      nozzle_id: n4.id,
      morning_reading: 142000.0,
      evening_reading: 144150.0,
      litres_sold: 2150.0,
      rate: 292.0,
      amount: 2150.0 * 292.0,
    },
    {
      date: todayStr,
      nozzle_id: n5.id,
      morning_reading: 96300.0,
      evening_reading: 98120.0,
      litres_sold: 1820.0,
      rate: 292.0,
      amount: 1820.0 * 292.0,
    },
    {
      date: todayStr,
      nozzle_id: n6.id,
      morning_reading: 31200.0,
      evening_reading: 31650.0,
      litres_sold: 450.0,
      rate: 312.0,
      amount: 450.0 * 312.0,
    },
  ]);

  // 5. Fuel Purchases
  await db.insert(fuelPurchases).values([
    {
      date: todayStr,
      fuel_type: "Petrol",
      qty: 12000,
      rate: 275.0,
      total_cost: 12000 * 275.0,
      supplier: "Pakistan State Oil (PSO)",
    },
    {
      date: yesterdayStr,
      fuel_type: "Diesel",
      qty: 16000,
      rate: 281.5,
      total_cost: 16000 * 281.5,
      supplier: "Shell Pakistan",
    },
  ]);

  // 6. Products
  const [p1] = await db
    .insert(products)
    .values({
      name: "Havoline Formula 20W-50 (4 Litre)",
      category: "Mobil Oil",
      purchase_price: 3750,
      sale_price: 4450,
      stock_qty: 28,
    })
    .returning();

  const [p2] = await db
    .insert(products)
    .values({
      name: "Total Rubia TIR 7400 15W-40 (5 Litre)",
      category: "Mobil Oil",
      purchase_price: 4200,
      sale_price: 4950,
      stock_qty: 16,
    })
    .returning();

  const [p3] = await db
    .insert(products)
    .values({
      name: "Guard Universal Oil Filter G-102",
      category: "Filter",
      purchase_price: 380,
      sale_price: 600,
      stock_qty: 45,
    })
    .returning();

  const [p4] = await db
    .insert(products)
    .values({
      name: "Caltex Marfak MP Grease (1 KG Can)",
      category: "Grease",
      purchase_price: 880,
      sale_price: 1250,
      stock_qty: 12,
    })
    .returning();

  // 7. Product Sales
  await db.insert(productSales).values([
    {
      date: todayStr,
      product_id: p1.id,
      qty: 2,
      total: 2 * 4450,
      profit: 2 * (4450 - 3750),
    },
    {
      date: todayStr,
      product_id: p3.id,
      qty: 3,
      total: 3 * 600,
      profit: 3 * (600 - 380),
    },
  ]);

  // 8. Credit Customers
  const [c1] = await db
    .insert(creditCustomers)
    .values({
      name: "Chaudhry Riaz Gujjar",
      company: "Al-Madina Freight Lines",
      vehicle_no: "LES-9921",
      phone: "03004455667",
    })
    .returning();

  const [c2] = await db
    .insert(creditCustomers)
    .values({
      name: "Malik Usman Tariq",
      company: "Tariq Goods Transport",
      vehicle_no: "TKJ-4512",
      phone: "03218899123",
    })
    .returning();

  const [c3] = await db
    .insert(creditCustomers)
    .values({
      name: "Mian Sajid",
      company: "Sajid Agriculture Farms",
      vehicle_no: "MN-8801",
      phone: "03335566778",
    })
    .returning();

  // 9. Credit Sales & Payments
  await db.insert(creditSales).values([
    {
      customer_id: c1.id,
      date: todayStr,
      type: "Fuel",
      details: "Diesel 250 Litres for LES-9921",
      qty: 250,
      total: 250 * 292.0, // 73,000
      is_payment: 0,
    },
    {
      customer_id: c1.id,
      date: todayStr,
      type: "Payment",
      details: "Online Bank Transfer / Cash Wasooli",
      qty: 0,
      total: 30000,
      is_payment: 1,
    },
    {
      customer_id: c2.id,
      date: todayStr,
      type: "Fuel",
      details: "Diesel 180 Litres for TKJ-4512",
      qty: 180,
      total: 180 * 292.0, // 52,560
      is_payment: 0,
    },
    {
      customer_id: c3.id,
      date: yesterdayStr,
      type: "Product",
      details: "2x Havoline 20W-50 + 2x Filter",
      qty: 4,
      total: 10100,
      is_payment: 0,
    },
  ]);

  // 10. Expenses
  await db.insert(expenses).values([
    {
      date: todayStr,
      type: "Bijli",
      amount: 14500,
      note: "LESCO Commercial Meter instalment",
    },
    {
      date: todayStr,
      type: "Tea/Khaba",
      amount: 1650,
      note: "Staff chai, lunch and customer hospitality",
    },
    {
      date: todayStr,
      type: "Generator",
      amount: 3200,
      note: "Generator engine oil change and filter",
    },
  ]);

  console.log("Database seeded successfully!");
  return { success: true };
}

// Allow direct execution via CLI
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log("Seed script completed.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Seed error:", err);
      process.exit(1);
    });
}
