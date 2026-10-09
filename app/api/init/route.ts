import { NextResponse } from "next/server";
import { tursoClient } from "@/lib/turso";
import { seedDatabase } from "@/lib/seed";
import { db } from "@/lib/db";
import { dipCharts, tankKhata, employees, employeeDuty, tanks } from "@/lib/schema";
import { getTodayDateString, getTodayDatePK } from "@/lib/formatters";
import { hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Ensure all core tables exist in Turso LibSQL
    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS tanks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        fuel_type TEXT NOT NULL,
        capacity REAL NOT NULL DEFAULT 25000,
        current_stock REAL NOT NULL DEFAULT 0
      );
    `);

    // Ensure custom dip chart and tank columns exist
    try { await tursoClient.execute("ALTER TABLE tanks ADD COLUMN tank_name TEXT;"); } catch (e) {}
    try { await tursoClient.execute("ALTER TABLE tanks ADD COLUMN product TEXT;"); } catch (e) {}
    try { await tursoClient.execute("ALTER TABLE tanks ADD COLUMN capacity_liters REAL;"); } catch (e) {}
    try { await tursoClient.execute("ALTER TABLE tanks ADD COLUMN tank_height_mm REAL DEFAULT 2500;"); } catch (e) {}
    try { await tursoClient.execute("ALTER TABLE tanks ADD COLUMN current_dip_mm REAL DEFAULT 0;"); } catch (e) {}
    try { await tursoClient.execute("ALTER TABLE tanks ADD COLUMN current_stock_liters REAL DEFAULT 0;"); } catch (e) {}
    try { await tursoClient.execute("ALTER TABLE tanks ADD COLUMN created_at TEXT;"); } catch (e) {}
    try { await tursoClient.execute("UPDATE tanks SET tank_name = name WHERE tank_name IS NULL;"); } catch (e) {}
    try { await tursoClient.execute("UPDATE tanks SET product = fuel_type WHERE product IS NULL;"); } catch (e) {}
    try { await tursoClient.execute("UPDATE tanks SET capacity_liters = capacity WHERE capacity_liters IS NULL;"); } catch (e) {}
    try { await tursoClient.execute("UPDATE tanks SET current_stock_liters = current_stock WHERE current_stock_liters IS NULL;"); } catch (e) {}

    // Ensure dip_charts has dip_mm and volume_liters
    try { await tursoClient.execute("ALTER TABLE dip_charts ADD COLUMN dip_mm REAL;"); } catch (e) {}
    try { await tursoClient.execute("ALTER TABLE dip_charts ADD COLUMN volume_liters REAL;"); } catch (e) {}
    try { await tursoClient.execute("UPDATE dip_charts SET dip_mm = dip_value WHERE dip_mm IS NULL;"); } catch (e) {}
    try { await tursoClient.execute("UPDATE dip_charts SET volume_liters = litres WHERE volume_liters IS NULL;"); } catch (e) {}

    // Ensure stock_logs table exists
    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS stock_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tank_id INTEGER NOT NULL REFERENCES tanks(id) ON DELETE CASCADE,
        pump_id INTEGER NOT NULL DEFAULT 1,
        date TEXT NOT NULL,
        dip_mm REAL NOT NULL,
        calculated_stock_liters REAL NOT NULL,
        received_liters REAL NOT NULL DEFAULT 0,
        sale_liters REAL NOT NULL DEFAULT 0,
        difference_liters REAL NOT NULL DEFAULT 0,
        created_by TEXT,
        created_at TEXT
      );
    `);

    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS nozzles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        tank_id INTEGER NOT NULL REFERENCES tanks(id) ON DELETE CASCADE
      );
    `);

    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS daily_rates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL UNIQUE,
        petrol_rate REAL NOT NULL,
        diesel_rate REAL NOT NULL,
        hioctane_rate REAL NOT NULL
      );
    `);

    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS daily_readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        nozzle_id INTEGER NOT NULL REFERENCES nozzles(id) ON DELETE CASCADE,
        morning_reading REAL NOT NULL DEFAULT 0,
        evening_reading REAL NOT NULL DEFAULT 0,
        litres_sold REAL NOT NULL DEFAULT 0,
        rate REAL NOT NULL DEFAULT 0,
        amount REAL NOT NULL DEFAULT 0,
        start_time TEXT,
        end_time TEXT,
        start_reading REAL DEFAULT 0,
        end_reading REAL DEFAULT 0
      );
    `);

    // Ensure 24-hour time-based columns exist on existing table
    try { await tursoClient.execute("ALTER TABLE daily_readings ADD COLUMN start_time TEXT DEFAULT '08:00 AM';"); } catch (e) {}
    try { await tursoClient.execute("ALTER TABLE daily_readings ADD COLUMN end_time TEXT DEFAULT '08:00 PM';"); } catch (e) {}
    try { await tursoClient.execute("ALTER TABLE daily_readings ADD COLUMN start_reading REAL DEFAULT 0;"); } catch (e) {}
    try { await tursoClient.execute("ALTER TABLE daily_readings ADD COLUMN end_reading REAL DEFAULT 0;"); } catch (e) {}
    try {
      await tursoClient.execute(`
        UPDATE daily_readings 
        SET start_reading = morning_reading, end_reading = evening_reading 
        WHERE (start_reading IS NULL OR start_reading = 0) AND morning_reading > 0;
      `);
    } catch (e) {}

    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS fuel_purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        fuel_type TEXT NOT NULL,
        qty REAL NOT NULL,
        rate REAL NOT NULL,
        total_cost REAL NOT NULL,
        supplier TEXT NOT NULL
      );
    `);

    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        purchase_price REAL NOT NULL,
        sale_price REAL NOT NULL,
        stock_qty REAL NOT NULL DEFAULT 0
      );
    `);

    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS product_sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        qty REAL NOT NULL,
        total REAL NOT NULL,
        profit REAL NOT NULL
      );
    `);

    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS credit_customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        company TEXT,
        vehicle_no TEXT,
        phone TEXT NOT NULL
      );
    `);

    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS credit_sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL REFERENCES credit_customers(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        type TEXT NOT NULL,
        details TEXT,
        qty REAL NOT NULL DEFAULT 0,
        total REAL NOT NULL,
        is_payment INTEGER NOT NULL DEFAULT 0
      );
    `);

    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        note TEXT
      );
    `);

    // 2. NEW TABLES FOR TANK KHATA & EMPLOYEES
    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS dip_charts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tank_id INTEGER REFERENCES tanks(id) ON DELETE CASCADE,
        fuel_type TEXT NOT NULL,
        dip_value REAL NOT NULL,
        unit TEXT NOT NULL DEFAULT 'inch',
        litres REAL NOT NULL
      );
    `);

    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS tank_khata (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        tank_id INTEGER NOT NULL REFERENCES tanks(id) ON DELETE CASCADE,
        fuel_type TEXT NOT NULL,
        dip_value REAL NOT NULL,
        dip_unit TEXT NOT NULL DEFAULT 'inch',
        dip_litres REAL NOT NULL,
        tank_stock REAL NOT NULL,
        register_stock REAL NOT NULL,
        gain_loss REAL NOT NULL,
        remarks TEXT
      );
    `);

    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        duty_type TEXT NOT NULL,
        salary REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'Active'
      );
    `);

    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS employee_duty (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        shift TEXT NOT NULL,
        nozzle_assigned TEXT,
        present INTEGER NOT NULL DEFAULT 1,
        notes TEXT
      );
    `);

    // 3. CASH CLOSINGS & PUMP SETTINGS
    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS cash_closings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        shift TEXT NOT NULL,
        total_nozzle_sale_rs REAL NOT NULL DEFAULT 0,
        total_oil_products_sale_rs REAL NOT NULL DEFAULT 0,
        total_sale_rs REAL NOT NULL DEFAULT 0,
        total_udhar_rs REAL NOT NULL DEFAULT 0,
        total_kharcha_rs REAL NOT NULL DEFAULT 0,
        expected_cash_in_hand REAL NOT NULL DEFAULT 0,
        actual_cash_submitted_rs REAL NOT NULL DEFAULT 0,
        difference_rs REAL NOT NULL DEFAULT 0,
        submitted_by TEXT,
        receiver_name TEXT,
        notes TEXT,
        created_at TEXT
      );
    `);

    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS pump_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    // 4. MULTI-TENANT SAAS CORE TABLES
    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS pumps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pump_name TEXT NOT NULL,
        owner_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        city TEXT NOT NULL,
        cnic TEXT,
        password_hash TEXT NOT NULL,
        subscription_status TEXT NOT NULL DEFAULT 'trial',
        trial_ends_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pump_id INTEGER NOT NULL REFERENCES pumps(id) ON DELETE CASCADE,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'owner',
        name TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS super_admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL DEFAULT 'Super Admin',
        created_at TEXT NOT NULL
      );
    `);

    // 5. MIGRATION: ADD pump_id TO ALL OPERATIONAL TABLES (DEFAULT 1)
    const tablesToAlter = [
      "tanks", "nozzles", "daily_rates", "daily_readings", "fuel_purchases",
      "products", "product_sales", "credit_customers", "credit_sales",
      "expenses", "dip_charts", "tank_khata", "employees", "employee_duty", "cash_closings"
    ];

    for (const tbl of tablesToAlter) {
      try {
        await tursoClient.execute(`ALTER TABLE ${tbl} ADD COLUMN pump_id INTEGER DEFAULT 1;`);
      } catch (e) {
        // column already exists
      }
      try {
        await tursoClient.execute(`UPDATE ${tbl} SET pump_id = 1 WHERE pump_id IS NULL;`);
      } catch (e) {}
    }

    // 6. DEFAULT PUMP 1 & SEED USERS
    try {
      const defaultPumpCountRes = await tursoClient.execute("SELECT count(*) as count FROM pumps WHERE id = 1");
      const defaultPumpCount = (defaultPumpCountRes.rows[0]?.count as number) || 0;
      if (defaultPumpCount === 0) {
        const defaultPasswordHash = await hashPassword("demo123456");
        const trialEnds = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
        await tursoClient.execute({
          sql: `INSERT OR IGNORE INTO pumps (id, pump_name, owner_name, phone, email, city, cnic, password_hash, subscription_status, trial_ends_at, created_at)
                VALUES (1, 'Nexeta Petrol', 'Muhammad Naveed', '03400072030', 'demo@nexetapetrol.com', 'Lahore', '35201-1234567-1', ?, 'active', ?, datetime('now'));`,
          args: [defaultPasswordHash, trialEnds]
        });

        await tursoClient.execute({
          sql: `INSERT OR IGNORE INTO users (id, pump_id, email, password_hash, role, name, created_at)
                VALUES (1, 1, 'demo@nexetapetrol.com', ?, 'owner', 'Muhammad Naveed', datetime('now'));`,
          args: [defaultPasswordHash]
        });
      }

      // Super Admin Seed
      const superAdminCountRes = await tursoClient.execute("SELECT count(*) as count FROM super_admins WHERE email = 'admin@nexetapetrol.com'");
      const superAdminCount = (superAdminCountRes.rows[0]?.count as number) || 0;
      if (superAdminCount === 0) {
        const adminPassHash = await hashPassword("admin123456");
        await tursoClient.execute({
          sql: `INSERT OR IGNORE INTO super_admins (id, email, password_hash, name, created_at)
                VALUES (1, 'admin@nexetapetrol.com', ?, 'Naveed Bhatti (Super Admin)', datetime('now'));`,
          args: [adminPassHash]
        });
      }
    } catch (e) {
      console.error("Auth seeding error:", e);
    }

    // Default pump settings if not exist
    try {
      await tursoClient.execute(`
        INSERT OR IGNORE INTO pump_settings (key, value) VALUES ('low_stock_threshold', '20');
      `);
      await tursoClient.execute(`
        INSERT OR IGNORE INTO pump_settings (key, value) VALUES ('pump_name', 'Nexeta Petrol');
      `);
    } catch (e) {}

    // Check if tanks table has data
    const tanksResult = await tursoClient.execute("SELECT count(*) as count FROM tanks");
    const count = (tanksResult.rows[0]?.count as number) || 0;

    if (count === 0) {
      await seedDatabase();
    }

    // Check if dip_charts table has data
    const dipCountRes = await tursoClient.execute("SELECT count(*) as count FROM dip_charts");
    const dipCount = (dipCountRes.rows[0]?.count as number) || 0;

    const allTanks = await db.select().from(tanks);
    const petrolTank = allTanks.find((t) => t.fuel_type === "Petrol") || allTanks[0];
    const dieselTank = allTanks.find((t) => t.fuel_type === "Diesel") || allTanks[1];

    if (dipCount === 0 && petrolTank && dieselTank) {
      // Seed realistic Pakistani Dip Chart calibration data
      // For Petrol Tank (30,000 L, ~96 inches height)
      const petrolDips = [
        { dip: 10, litres: 1850 },
        { dip: 20, litres: 4200 },
        { dip: 30, litres: 7100 },
        { dip: 40, litres: 10500 },
        { dip: 50, litres: 14200 },
        { dip: 60, litres: 18100 },
        { dip: 70, litres: 22000 },
        { dip: 80, litres: 25600 },
        { dip: 90, litres: 28700 },
        { dip: 96, litres: 30000 },
      ];
      for (const pd of petrolDips) {
        await db.insert(dipCharts).values({
          tank_id: petrolTank.id,
          fuel_type: "Petrol",
          dip_value: pd.dip,
          unit: "inch",
          litres: pd.litres,
        });
      }

      // For Diesel Tank (40,000 L, ~110 inches height)
      const dieselDips = [
        { dip: 10, litres: 2200 },
        { dip: 20, litres: 5100 },
        { dip: 30, litres: 8900 },
        { dip: 40, litres: 13200 },
        { dip: 50, litres: 18000 },
        { dip: 60, litres: 23100 },
        { dip: 70, litres: 28300 },
        { dip: 80, litres: 33200 },
        { dip: 90, litres: 37400 },
        { dip: 100, litres: 39500 },
        { dip: 105, litres: 40000 },
      ];
      for (const dd of dieselDips) {
        await db.insert(dipCharts).values({
          tank_id: dieselTank.id,
          fuel_type: "Diesel",
          dip_value: dd.dip,
          unit: "inch",
          litres: dd.litres,
        });
      }
    }

    // Check if tank_khata has initial entries
    const khataCountRes = await tursoClient.execute("SELECT count(*) as count FROM tank_khata");
    const khataCount = (khataCountRes.rows[0]?.count as number) || 0;

    const todayDate = getTodayDatePK(); // DD-MM-YYYY format
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const day = String(yesterday.getDate()).padStart(2, "0");
    const month = String(yesterday.getMonth() + 1).padStart(2, "0");
    const year = yesterday.getFullYear();
    const yesterdayDate = `${day}-${month}-${year}`;

    if (khataCount === 0 && petrolTank && dieselTank) {
      // Seed sample initial records for both Diesel and Petrol
      await db.insert(tankKhata).values([
        {
          date: yesterdayDate,
          tank_id: dieselTank.id,
          fuel_type: "Diesel",
          dip_value: 64.5,
          dip_unit: "inch",
          dip_litres: 25420,
          tank_stock: 25420,
          register_stock: 25400,
          gain_loss: 20, // +20 L Gain (Green)
          remarks: "Evening shift dip checked. OK.",
        },
        {
          date: todayDate,
          tank_id: dieselTank.id,
          fuel_type: "Diesel",
          dip_value: 63.2,
          dip_unit: "inch",
          dip_litres: 24800,
          tank_stock: 24800,
          register_stock: 24815,
          gain_loss: -15, // -15 L Loss (Red)
          remarks: "Normal temperature evaporation variance",
        },
        {
          date: yesterdayDate,
          tank_id: petrolTank.id,
          fuel_type: "Petrol",
          dip_value: 61.8,
          dip_unit: "inch",
          dip_litres: 18800,
          tank_stock: 18800,
          register_stock: 18780,
          gain_loss: 20, // +20 L Gain (Green)
          remarks: "Inward tanker decanted smoothly",
        },
        {
          date: todayDate,
          tank_id: petrolTank.id,
          fuel_type: "Petrol",
          dip_value: 60.5,
          dip_unit: "inch",
          dip_litres: 18450,
          tank_stock: 18450,
          register_stock: 18440,
          gain_loss: 10, // +10 L Gain (Green)
          remarks: "Morning shift dip verification",
        },
      ]);
    }

    // Check if employees table has data
    const empCountRes = await tursoClient.execute("SELECT count(*) as count FROM employees");
    const empCount = (empCountRes.rows[0]?.count as number) || 0;

    if (empCount === 0) {
      const [e1] = await db
        .insert(employees)
        .values({
          name: "Muhammad Tariq Mehmood",
          phone: "0300-4567891",
          duty_type: "Manager / کیشیئر",
          salary: 55000,
          status: "Active",
        })
        .returning();

      const [e2] = await db
        .insert(employees)
        .values({
          name: "Muhammad Imran",
          phone: "0321-7654321",
          duty_type: "Nozzle Operator (فلنگ سٹاف)",
          salary: 32000,
          status: "Active",
        })
        .returning();

      const [e3] = await db
        .insert(employees)
        .values({
          name: "Bilal Ahmed Khan",
          phone: "0333-8899001",
          duty_type: "Nozzle Operator (فلنگ سٹاف)",
          salary: 32000,
          status: "Active",
        })
        .returning();

      const [e4] = await db
        .insert(employees)
        .values({
          name: "Zahid Hussain",
          phone: "0345-1122334",
          duty_type: "Night Shift Incharge",
          salary: 35000,
          status: "Active",
        })
        .returning();

      const [e5] = await db
        .insert(employees)
        .values({
          name: "Sher Muhammad",
          phone: "0312-9988776",
          duty_type: "Security Guard",
          salary: 28000,
          status: "Active",
        })
        .returning();

      // Seed sample today duties
      await db.insert(employeeDuty).values([
        {
          date: todayDate,
          employee_id: e1.id,
          shift: "Morning",
          nozzle_assigned: "Cash Counter & Office",
          present: 1,
          notes: "Chief cashier on duty",
        },
        {
          date: todayDate,
          employee_id: e2.id,
          shift: "Morning",
          nozzle_assigned: "Nozzle 1 & 2 (Petrol)",
          present: 1,
          notes: "Morning shift operator",
        },
        {
          date: todayDate,
          employee_id: e3.id,
          shift: "Morning",
          nozzle_assigned: "Nozzle 4 & 5 (Diesel)",
          present: 1,
          notes: "Diesel truck island",
        },
        {
          date: todayDate,
          employee_id: e4.id,
          shift: "Night",
          nozzle_assigned: "Nozzle 1, 2, 4 (All Island)",
          present: 1,
          notes: "Night shift duty scheduled",
        },
      ]);
    }

    return NextResponse.json({
      success: true,
      message: "Database schema is verified, calibrated, and ready",
    });
  } catch (error: any) {
    console.error("Database initialization error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
