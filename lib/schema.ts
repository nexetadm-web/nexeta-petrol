import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// ==========================================
// 0. MULTI-TENANT SAAS CORE TABLES
// ==========================================

// Pumps (Tenants - Petrol Stations)
export const pumps = sqliteTable("pumps", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pump_name: text("pump_name").notNull(),
  owner_name: text("owner_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull().unique(),
  city: text("city").notNull(),
  cnic: text("cnic"),
  password_hash: text("password_hash").notNull(),
  subscription_status: text("subscription_status").notNull().default("trial"), // "active" | "trial" | "expired"
  trial_ends_at: text("trial_ends_at").notNull(), // ISO Date string
  created_at: text("created_at").notNull(),
});

// Users (Staff / Owners belonging to a specific Pump)
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pump_id: integer("pump_id").references(() => pumps.id, { onDelete: "cascade" }).notNull(),
  email: text("email").notNull().unique(),
  password_hash: text("password_hash").notNull(),
  role: text("role").notNull().default("owner"), // "owner" | "manager" | "cashier"
  name: text("name").notNull(),
  created_at: text("created_at").notNull(),
});

// Super Admins (Platform Owners - e.g. Naveed Bhatti)
export const superAdmins = sqliteTable("super_admins", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  password_hash: text("password_hash").notNull(),
  name: text("name").notNull().default("Super Admin"),
  created_at: text("created_at").notNull(),
});

// ==========================================
// 1. PUMP OPERATIONAL TABLES (ALL WITH pump_id)
// ==========================================

// 1. Tanks (Petrol, Diesel, Hi-Octane)
export const tanks = sqliteTable("tanks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pump_id: integer("pump_id").references(() => pumps.id, { onDelete: "cascade" }).notNull().default(1),
  tank_no: integer("tank_no").default(1), // 1, 2, 3...
  name: text("name").notNull(), // e.g. "Tank 1", "Tank 2"
  tank_name: text("tank_name"), // alias for name
  fuel_type: text("fuel_type").notNull(), // "Petrol" | "Diesel" | "HiOctane" | "Super" | "HOBC"
  product: text("product"), // alias for fuel_type
  capacity: real("capacity").notNull().default(25000), // in litres
  capacity_liters: real("capacity_liters"), // alias for capacity
  height_mm: integer("height_mm").default(2500), // Tank height mm (e.g. 2500)
  tank_height_mm: real("tank_height_mm").default(2500), // backwards compatibility
  current_dip_mm: real("current_dip_mm").default(0), // mm
  current_stock: real("current_stock").notNull().default(0), // in litres
  current_stock_liters: real("current_stock_liters").default(0), // in litres
  dip_chart_image_url: text("dip_chart_image_url"), // Image of calibration sheet
  has_dip_chart: integer("has_dip_chart").default(0), // 1 = true, 0 = false
  created_at: text("created_at"),
});

// 2. Nozzles (Supports 4 to 20 dynamically linked to a Tank)
export const nozzles = sqliteTable("nozzles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pump_id: integer("pump_id").references(() => pumps.id, { onDelete: "cascade" }).notNull().default(1),
  name: text("name").notNull(), // e.g. "Nozzle 1", "Nozzle 2"
  tank_id: integer("tank_id").references(() => tanks.id, { onDelete: "cascade" }).notNull(),
});

// 3. Daily Rates (Set daily prices for Petrol, Diesel, HiOctane)
export const dailyRates = sqliteTable("daily_rates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pump_id: integer("pump_id").references(() => pumps.id, { onDelete: "cascade" }).notNull().default(1),
  date: text("date").notNull(), // DD-MM-YYYY or YYYY-MM-DD
  petrol_rate: real("petrol_rate").notNull(),
  diesel_rate: real("diesel_rate").notNull(),
  hioctane_rate: real("hioctane_rate").notNull(),
});

// 4. Daily Readings (Nozzle meter readings - 24-Hour Time-Based)
export const dailyReadings = sqliteTable("daily_readings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pump_id: integer("pump_id").references(() => pumps.id, { onDelete: "cascade" }).notNull().default(1),
  date: text("date").notNull(), // DD-MM-YYYY or YYYY-MM-DD
  nozzle_id: integer("nozzle_id").references(() => nozzles.id, { onDelete: "cascade" }).notNull(),
  start_time: text("start_time"), // e.g. "08:00 AM"
  end_time: text("end_time"),     // e.g. "08:00 PM"
  start_reading: real("start_reading"), // Start meter reading
  end_reading: real("end_reading"),     // End meter reading
  morning_reading: real("morning_reading").notNull().default(0), // Backwards compatibility
  evening_reading: real("evening_reading").notNull().default(0), // Backwards compatibility
  litres_sold: real("litres_sold").notNull().default(0), // end - start
  rate: real("rate").notNull().default(0),
  amount: real("amount").notNull().default(0), // litres_sold * rate
});

// 5. Fuel Purchases (Tankers received from PSO/Shell/Attock/etc.)
export const fuelPurchases = sqliteTable("fuel_purchases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pump_id: integer("pump_id").references(() => pumps.id, { onDelete: "cascade" }).notNull().default(1),
  date: text("date").notNull(), // YYYY-MM-DD or DD-MM-YYYY
  fuel_type: text("fuel_type").notNull(), // "Petrol" | "Diesel" | "HiOctane"
  qty: real("qty").notNull(), // Litres
  rate: real("rate").notNull(), // Purchase rate per litre
  total_cost: real("total_cost").notNull(), // qty * rate
  supplier: text("supplier").notNull(), // PSO, Total, Shell, Attock, Byco, etc.
});

// 6. Products (Mobil Oil, Grease, Filters, Coolants, etc.)
export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pump_id: integer("pump_id").references(() => pumps.id, { onDelete: "cascade" }).notNull().default(1),
  name: text("name").notNull(), // "Havoline 20W-50 4L", "Delo Gold 5L"
  category: text("category").notNull(), // "Mobil Oil", "Filter", "Grease", "Brake Fluid", "Other"
  purchase_price: real("purchase_price").notNull(),
  sale_price: real("sale_price").notNull(),
  stock_qty: real("stock_qty").notNull().default(0),
});

// 7. Product Sales (Retail counter sales)
export const productSales = sqliteTable("product_sales", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pump_id: integer("pump_id").references(() => pumps.id, { onDelete: "cascade" }).notNull().default(1),
  date: text("date").notNull(), // YYYY-MM-DD or DD-MM-YYYY
  product_id: integer("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  qty: real("qty").notNull(),
  total: real("total").notNull(), // qty * sale_price
  profit: real("profit").notNull(), // (sale_price - purchase_price) * qty
});

// 8. Credit Customers (Udhar Party / Fleet accounts)
export const creditCustomers = sqliteTable("credit_customers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pump_id: integer("pump_id").references(() => pumps.id, { onDelete: "cascade" }).notNull().default(1),
  name: text("name").notNull(), // Customer or driver name
  company: text("company"), // e.g. "Al-Madina Goods Transport"
  vehicle_no: text("vehicle_no"), // e.g. "LES-24-1188"
  phone: text("phone").notNull(), // e.g. "03001234567"
});

// 9. Credit Sales & Payments (Ledger transactions)
export const creditSales = sqliteTable("credit_sales", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pump_id: integer("pump_id").references(() => pumps.id, { onDelete: "cascade" }).notNull().default(1),
  customer_id: integer("customer_id").references(() => creditCustomers.id, { onDelete: "cascade" }).notNull(),
  date: text("date").notNull(), // YYYY-MM-DD or DD-MM-YYYY
  type: text("type").notNull(), // "Fuel" | "Product" | "Payment"
  details: text("details"), // "Diesel 120 Litres" or "Mobil Oil 4L" or "Cash Wasooli"
  qty: real("qty").notNull().default(0),
  total: real("total").notNull(), // Rs. amount
  is_payment: integer("is_payment").notNull().default(0), // 1 if cash payment/wasooli, 0 if credit sale
});

// 10. Expenses (Bijli, Generator, Staff Salary, Khaba/Tea, Maintenance)
export const expenses = sqliteTable("expenses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pump_id: integer("pump_id").references(() => pumps.id, { onDelete: "cascade" }).notNull().default(1),
  date: text("date").notNull(), // YYYY-MM-DD or DD-MM-YYYY
  type: text("type").notNull(), // "Bijli" | "Salary" | "Generator" | "Tea/Khaba" | "Maintenance" | "Other"
  amount: real("amount").notNull(),
  note: text("note"),
});

// 11. Dip Chart Calibration Table (Maps Dip mm/inch/cm to Litres per tank)
export const dipCharts = sqliteTable("dip_charts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pump_id: integer("pump_id").references(() => pumps.id, { onDelete: "cascade" }).notNull().default(1),
  tank_id: integer("tank_id").references(() => tanks.id, { onDelete: "cascade" }),
  fuel_type: text("fuel_type").notNull().default("Petrol"), // "Petrol" | "Diesel" | "HiOctane" | "Super"
  dip_value: real("dip_value").notNull().default(0), // Backwards compatibility
  dip_mm: real("dip_mm"), // Calibration dip in mm (e.g. 10, 20, 30... 2500)
  unit: text("unit").notNull().default("mm"), // "mm" | "inch" | "cm"
  litres: real("litres").notNull().default(0), // Backwards compatibility
  volume_liters: real("volume_liters"), // Calibrated volume in litres
});

// 11b. Stock Logs Table (Tank-wise daily dip entries & calculated stock)
export const stockLogs = sqliteTable("stock_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tank_id: integer("tank_id").references(() => tanks.id, { onDelete: "cascade" }).notNull(),
  pump_id: integer("pump_id").references(() => pumps.id, { onDelete: "cascade" }).notNull().default(1),
  date: text("date").notNull(), // DD-MM-YYYY
  dip_mm: real("dip_mm").notNull(), // Measured dip in mm
  calculated_stock_liters: real("calculated_stock_liters").notNull(), // Litres from dip chart
  received_liters: real("received_liters").notNull().default(0), // Inward tanker litres
  sale_liters: real("sale_liters").notNull().default(0), // Outward sale litres
  difference_liters: real("difference_liters").notNull().default(0), // Gain (+) / Loss (-)
  created_by: text("created_by"),
  created_at: text("created_at"),
});

// 11c. Dip Variations Table (Low/High Dip variation reasons & audit trail)
export const dipVariations = sqliteTable("dip_variations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tank_id: integer("tank_id").references(() => tanks.id, { onDelete: "cascade" }).notNull(),
  pump_id: integer("pump_id").references(() => pumps.id, { onDelete: "cascade" }).notNull().default(1),
  previous_dip_mm: real("previous_dip_mm").notNull().default(0),
  current_dip_mm: real("current_dip_mm").notNull(),
  difference_liters: real("difference_liters").notNull(),
  variation_type: text("variation_type").notNull(), // 'low' | 'high' | 'normal'
  reason_type: text("reason_type").notNull(), // 'فروخت', 'لیکج', 'چوری', 'بخارات', 'میٹر ایرر', 'نئی وصولی', 'واپسی', 'درجہ حرارت', 'دیگر'
  reason_note: text("reason_note"),
  date: text("date").notNull(), // DD-MM-YYYY
  created_by: text("created_by"),
  created_at: text("created_at"),
});

// 12. Daily Tank Khata Table (Physical Dip vs Register Stock & Gain/Loss)
export const tankKhata = sqliteTable("tank_khata", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pump_id: integer("pump_id").references(() => pumps.id, { onDelete: "cascade" }).notNull().default(1),
  date: text("date").notNull(), // DD-MM-YYYY or YYYY-MM-DD
  tank_id: integer("tank_id").references(() => tanks.id, { onDelete: "cascade" }).notNull(),
  fuel_type: text("fuel_type").notNull(), // "Petrol" | "Diesel" | "HiOctane"
  dip_value: real("dip_value").notNull(), // Dip measurement (e.g. 52.5)
  dip_unit: text("dip_unit").notNull().default("inch"), // "inch" | "cm"
  dip_litres: real("dip_litres").notNull(), // Litres from Dip Chart
  tank_stock: real("tank_stock").notNull(), // Physical tank stock from dip
  register_stock: real("register_stock").notNull(), // (Previous Register - Sale + Purchase)
  gain_loss: real("gain_loss").notNull(), // tank_stock - register_stock (Positive = Gain, Negative = Loss)
  remarks: text("remarks"),
});

// 13. Employees Master (Staff records)
export const employees = sqliteTable("employees", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pump_id: integer("pump_id").references(() => pumps.id, { onDelete: "cascade" }).notNull().default(1),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  duty_type: text("duty_type").notNull(), // "Cashier" | "Nozzle Operator" | "Manager" | "Security" | "Cleaner"
  salary: real("salary").notNull().default(0), // Monthly salary in PKR
  status: text("status").notNull().default("Active"), // "Active" | "Inactive"
});

// 14. Employee Duty (Daily shift assignments & attendance)
export const employeeDuty = sqliteTable("employee_duty", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pump_id: integer("pump_id").references(() => pumps.id, { onDelete: "cascade" }).notNull().default(1),
  date: text("date").notNull(), // DD-MM-YYYY or YYYY-MM-DD
  employee_id: integer("employee_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
  shift: text("shift").notNull(), // "Morning" | "Evening" | "Night"
  nozzle_assigned: text("nozzle_assigned"), // e.g. "Nozzle 1 (Petrol)", "Nozzle 4 (Diesel)"
  present: integer("present").notNull().default(1), // 1 = Present, 0 = Absent
  notes: text("notes"),
});

// 15. Daily Cash Closing / Shift Handover Table
export const cashClosings = sqliteTable("cash_closings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pump_id: integer("pump_id").references(() => pumps.id, { onDelete: "cascade" }).notNull().default(1),
  date: text("date").notNull(), // DD-MM-YYYY
  shift: text("shift").notNull(), // "Morning" | "Evening" | "Night" | "FullDay"
  total_nozzle_sale_rs: real("total_nozzle_sale_rs").notNull().default(0),
  total_oil_products_sale_rs: real("total_oil_products_sale_rs").notNull().default(0),
  total_sale_rs: real("total_sale_rs").notNull().default(0),
  total_udhar_rs: real("total_udhar_rs").notNull().default(0),
  total_kharcha_rs: real("total_kharcha_rs").notNull().default(0),
  expected_cash_in_hand: real("expected_cash_in_hand").notNull().default(0),
  actual_cash_submitted_rs: real("actual_cash_submitted_rs").notNull().default(0),
  difference_rs: real("difference_rs").notNull().default(0), // actual - expected
  submitted_by: text("submitted_by"),
  receiver_name: text("receiver_name"),
  notes: text("notes"),
  created_at: text("created_at"),
});

// 16. Pump Settings (Key-Value per Pump for Low Stock Threshold, Pump Name, etc.)
export const pumpSettings = sqliteTable("pump_settings", {
  key: text("key").primaryKey(), // formatted as `${pump_id}:${settingKey}` or plain key for default pump
  value: text("value").notNull(),
});

// 17. AI Alerts (Leakage & Theft Detection)
export const aiAlerts = sqliteTable("ai_alerts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pump_id: integer("pump_id").references(() => pumps.id, { onDelete: "cascade" }).notNull().default(1),
  tank_id: integer("tank_id").references(() => tanks.id, { onDelete: "cascade" }).notNull(),
  alert_type: text("alert_type").notNull(), // "leakage" | "theft" | "unusual_loss" | "meter_drift"
  avg_loss: real("avg_loss").notNull(), // average daily loss in litres
  days: integer("days").notNull().default(7), // analysis period in days
  severity: text("severity").notNull().default("high"), // "warning" | "high" | "critical"
  message: text("message").notNull(),
  status: text("status").notNull().default("active"), // "active" | "investigating" | "resolved"
  date: text("date").notNull(),
  created_at: text("created_at"),
});

// 18. Nozzle Sales (Daily nozzle meter readings linked to Tank)
export const nozzleSales = sqliteTable("nozzle_sales", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pump_id: integer("pump_id").references(() => pumps.id, { onDelete: "cascade" }).notNull().default(1),
  tank_id: integer("tank_id").references(() => tanks.id, { onDelete: "cascade" }).notNull(),
  nozzle_no: text("nozzle_no").notNull(), // e.g. "Nozzle 1 (Petrol)"
  date: text("date").notNull(), // DD-MM-YYYY
  opening_reading: real("opening_reading").notNull(),
  closing_reading: real("closing_reading").notNull(),
  sale_liters: real("sale_liters").notNull(), // closing_reading - opening_reading
  entered_by: text("entered_by"),
  created_at: text("created_at"),
});

// 19. Daily Reconciliation (Tank Dip Loss vs Nozzle Meter Sales)
export const dailyReconciliation = sqliteTable("daily_reconciliation", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pump_id: integer("pump_id").references(() => pumps.id, { onDelete: "cascade" }).notNull().default(1),
  tank_id: integer("tank_id").references(() => tanks.id, { onDelete: "cascade" }).notNull(),
  date: text("date").notNull(), // DD-MM-YYYY
  dip_loss_liters: real("dip_loss_liters").notNull(), // drop in physical tank
  nozzle_sale_liters: real("nozzle_sale_liters").notNull(), // sum of all nozzles linked to this tank
  difference: real("difference").notNull(), // dip_loss_liters - nozzle_sale_liters
  status: text("status").notNull().default("matched"), // "matched" | "mismatch"
  notes: text("notes"),
  created_at: text("created_at"),
});

// 20. Parties (Customers & Commercial Fleet Accounts)
export const parties = sqliteTable("parties", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pump_id: integer("pump_id").references(() => pumps.id, { onDelete: "cascade" }).notNull().default(1),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  vehicle_no: text("vehicle_no"),
  balance: real("balance").notNull().default(0), // Positive = credit owed to pump
  credit_limit: real("credit_limit").notNull().default(0),
  status: text("status").notNull().default("active"),
  created_at: text("created_at"),
});

// 21. Party Transactions (Credit fuel issue & Payment receiving ledger)
export const partyTransactions = sqliteTable("party_transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pump_id: integer("pump_id").references(() => pumps.id, { onDelete: "cascade" }).notNull().default(1),
  party_id: integer("party_id").references(() => parties.id, { onDelete: "cascade" }).notNull(),
  type: text("type").notNull(), // "credit" (fuel issued) | "debit" (payment received)
  liters: real("liters").notNull().default(0),
  rate: real("rate").notNull().default(0),
  amount: real("amount").notNull(), // PKR
  date: text("date").notNull(), // DD-MM-YYYY
  description: text("description"),
  created_at: text("created_at"),
});

// 22. Fuel Current Rates (Per product live rate)
export const fuelRates = sqliteTable("fuel_rates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pump_id: integer("pump_id").references(() => pumps.id, { onDelete: "cascade" }).notNull().default(1),
  product: text("product").notNull(), // "Petrol" | "Diesel" | "Super" | "HOBC"
  current_rate: real("current_rate").notNull(),
  last_effective_from: text("last_effective_from").notNull(),
  updated_at: text("updated_at"),
});

// 23. Fuel Rates History (With Effective Datetime Intervals for accurate intraday reports)
export const fuelRatesHistory = sqliteTable("fuel_rates_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pump_id: integer("pump_id").references(() => pumps.id, { onDelete: "cascade" }).notNull().default(1),
  product: text("product").notNull(), // "Petrol" | "Diesel" | "Super" | "HOBC"
  old_rate: real("old_rate").default(0),
  new_rate: real("new_rate").notNull(),
  effective_from: text("effective_from").notNull(), // ISO Datetime or YYYY-MM-DD HH:mm:ss
  effective_to: text("effective_to"), // Auto closed when next rate takes effect, NULL if current
  reason: text("reason"), // e.g. "Govt notification", "OGRA Price revision"
  changed_by: text("changed_by"),
  created_at: text("created_at"),
});

// 24. Cash Loans (Udhar Lena Dena Ledger)
export const cashLoans = sqliteTable("cash_loans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pump_id: integer("pump_id").references(() => pumps.id, { onDelete: "cascade" }).notNull().default(1),
  person_type: text("person_type").notNull().default("person"), // "person" | "bank" | "company" | "other"
  person_name: text("person_name").notNull(),
  phone: text("phone"),
  loan_type: text("loan_type").notNull(), // "lena" (Maine Liya - Payable) | "dena" (Maine Diya - Receivable)
  amount: real("amount").notNull(),
  remaining_amount: real("remaining_amount").notNull(),
  reason: text("reason"),
  loan_date: text("loan_date").notNull(), // DD-MM-YYYY
  due_date: text("due_date"), // DD-MM-YYYY (optional)
  status: text("status").notNull().default("pending"), // "pending" | "partial" | "paid"
  created_by: text("created_by"),
  created_at: text("created_at"),
});

// 25. Cash Loan Transactions (Repayments & Partial collections timeline)
export const cashLoanTransactions = sqliteTable("cash_loan_transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  loan_id: integer("loan_id").references(() => cashLoans.id, { onDelete: "cascade" }).notNull(),
  pump_id: integer("pump_id").references(() => pumps.id, { onDelete: "cascade" }).notNull().default(1),
  type: text("type").notNull(), // "pay" (Maine Wapas Kiya) | "receive" (Maine Wapas Liya)
  amount: real("amount").notNull(),
  date: text("date").notNull(), // DD-MM-YYYY
  note: text("note"),
  proof_image_url: text("proof_image_url"),
  created_at: text("created_at"),
});

// ==========================================
// RELATIONS
// ==========================================

export const pumpsRelations = relations(pumps, ({ many }) => ({
  users: many(users),
  tanks: many(tanks),
  nozzles: many(nozzles),
  rates: many(dailyRates),
  readings: many(dailyReadings),
  purchases: many(fuelPurchases),
  products: many(products),
  productSales: many(productSales),
  creditCustomers: many(creditCustomers),
  creditSales: many(creditSales),
  expenses: many(expenses),
  employees: many(employees),
  tankKhata: many(tankKhata),
  cashClosings: many(cashClosings),
}));

export const usersRelations = relations(users, ({ one }) => ({
  pump: one(pumps, {
    fields: [users.pump_id],
    references: [pumps.id],
  }),
}));

export const tanksRelations = relations(tanks, ({ one, many }) => ({
  pump: one(pumps, {
    fields: [tanks.pump_id],
    references: [pumps.id],
  }),
  nozzles: many(nozzles),
  dipCharts: many(dipCharts),
  tankKhata: many(tankKhata),
}));

export const nozzlesRelations = relations(nozzles, ({ one, many }) => ({
  pump: one(pumps, {
    fields: [nozzles.pump_id],
    references: [pumps.id],
  }),
  tank: one(tanks, {
    fields: [nozzles.tank_id],
    references: [tanks.id],
  }),
  readings: many(dailyReadings),
}));

export const dailyReadingsRelations = relations(dailyReadings, ({ one }) => ({
  nozzle: one(nozzles, {
    fields: [dailyReadings.nozzle_id],
    references: [nozzles.id],
  }),
}));

export const productsRelations = relations(products, ({ many }) => ({
  sales: many(productSales),
}));

export const productSalesRelations = relations(productSales, ({ one }) => ({
  product: one(products, {
    fields: [productSales.product_id],
    references: [products.id],
  }),
}));

export const creditCustomersRelations = relations(creditCustomers, ({ many }) => ({
  sales: many(creditSales),
}));

export const creditSalesRelations = relations(creditSales, ({ one }) => ({
  customer: one(creditCustomers, {
    fields: [creditSales.customer_id],
    references: [creditCustomers.id],
  }),
}));

export const dipChartsRelations = relations(dipCharts, ({ one }) => ({
  tank: one(tanks, {
    fields: [dipCharts.tank_id],
    references: [tanks.id],
  }),
}));

export const tankKhataRelations = relations(tankKhata, ({ one }) => ({
  tank: one(tanks, {
    fields: [tankKhata.tank_id],
    references: [tanks.id],
  }),
}));

export const employeesRelations = relations(employees, ({ many }) => ({
  duties: many(employeeDuty),
}));

export const employeeDutyRelations = relations(employeeDuty, ({ one }) => ({
  employee: one(employees, {
    fields: [employeeDuty.employee_id],
    references: [employees.id],
  }),
}));
