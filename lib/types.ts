export type FuelType = "Petrol" | "Diesel" | "HiOctane";

export interface Pump {
  id: number;
  pump_name: string;
  owner_name: string;
  phone: string;
  email: string;
  city: string;
  cnic?: string | null;
  password_hash?: string;
  subscription_status: "active" | "trial" | "expired";
  trial_ends_at: string;
  created_at: string;
}

export interface User {
  id: number;
  pump_id: number;
  email: string;
  role: "owner" | "manager" | "cashier";
  name: string;
  created_at: string;
}

export interface SuperAdmin {
  id: number;
  email: string;
  name: string;
  created_at: string;
}

export interface AuthSession {
  userId: number;
  pumpId: number;
  email: string;
  name: string;
  role: "owner" | "manager" | "cashier";
  pumpName: string;
  city: string;
  subscriptionStatus: "active" | "trial" | "expired";
  trialEndsAt: string;
  impersonating?: boolean;
}

export interface Tank {
  id: number;
  pump_id?: number;
  tank_no?: number;
  name: string;
  tank_name?: string;
  fuel_type: FuelType | string;
  product?: string;
  capacity: number;
  capacity_liters?: number;
  height_mm?: number;
  tank_height_mm?: number;
  current_dip_mm?: number;
  current_stock: number;
  current_stock_liters?: number;
  dip_chart_image_url?: string | null;
  has_dip_chart?: boolean | number;
  created_at?: string;
}

export interface Nozzle {
  id: number;
  pump_id?: number;
  name: string;
  tank_id: number;
  tank?: Tank;
}

export interface DailyRate {
  id: number;
  pump_id?: number;
  date: string;
  petrol_rate: number;
  diesel_rate: number;
  hioctane_rate: number;
}

export interface DailyReading {
  id: number;
  pump_id?: number;
  date: string;
  nozzle_id: number;
  start_time?: string;
  end_time?: string;
  start_reading?: number;
  end_reading?: number;
  morning_reading: number;
  evening_reading: number;
  litres_sold: number;
  rate: number;
  amount: number;
  nozzle?: Nozzle & { tank?: Tank };
  prevClosing?: number;
}

export interface FuelPurchase {
  id: number;
  pump_id?: number;
  date: string;
  fuel_type: FuelType;
  qty: number;
  rate: number;
  total_cost: number;
  supplier: string;
}

export interface Product {
  id: number;
  pump_id?: number;
  name: string;
  category: string;
  purchase_price: number;
  sale_price: number;
  stock_qty: number;
}

export interface ProductSale {
  id: number;
  pump_id?: number;
  date: string;
  product_id: number;
  qty: number;
  total: number;
  profit: number;
  product?: Product;
}

export interface CreditCustomer {
  id: number;
  pump_id?: number;
  name: string;
  company: string | null;
  vehicle_no: string | null;
  phone: string;
  total_credit?: number;
  total_paid?: number;
  balance?: number;
}

export interface CreditSale {
  id: number;
  pump_id?: number;
  customer_id: number;
  date: string;
  type: string;
  details: string | null;
  qty: number;
  total: number;
  is_payment: number;
  customer?: CreditCustomer;
}

export interface Expense {
  id: number;
  pump_id?: number;
  date: string;
  type: string;
  amount: number;
  note: string | null;
}

export interface DipChart {
  id: number;
  pump_id?: number;
  tank_id?: number;
  fuel_type?: FuelType | string;
  dip_value: number;
  dip_mm?: number;
  unit: "mm" | "inch" | "cm" | string;
  litres: number;
  volume_liters?: number;
}

export interface StockLog {
  id: number;
  tank_id: number;
  pump_id?: number;
  date: string;
  dip_mm: number;
  calculated_stock_liters: number;
  received_liters: number;
  sale_liters: number;
  difference_liters: number;
  created_by?: string | null;
  created_at?: string | null;
  tank_name?: string;
  fuel_type?: string;
}

export interface DipVariation {
  id: number;
  tank_id: number;
  pump_id?: number;
  previous_dip_mm: number;
  current_dip_mm: number;
  difference_liters: number;
  variation_type: "low" | "high" | "normal" | string;
  reason_type: string;
  reason_note?: string | null;
  date: string;
  created_by?: string | null;
  created_at?: string | null;
  tank_name?: string;
  product?: string;
}

export interface TankKhata {
  id: number;
  pump_id?: number;
  date: string;
  tank_id: number;
  fuel_type: FuelType;
  dip_value: number;
  dip_unit: "inch" | "cm" | string;
  dip_litres: number;
  tank_stock: number;
  register_stock: number;
  gain_loss: number;
  remarks?: string | null;
  tankName?: string;
}

export interface Employee {
  id: number;
  pump_id?: number;
  name: string;
  phone: string;
  duty_type: string;
  salary: number;
  status: "Active" | "Inactive" | string;
}

export interface EmployeeDuty {
  id: number;
  pump_id?: number;
  date: string;
  employee_id: number;
  shift: "Morning" | "Evening" | "Night" | string;
  nozzle_assigned?: string | null;
  present: number;
  notes?: string | null;
  employee?: Employee;
  employeeName?: string;
  employeePhone?: string;
  duty_type?: string;
  salary?: number;
}

export interface DashboardMetrics {
  totalFuelSaleLitres: number;
  fuelRevenueRs: number;
  goodsRevenueRs: number;
  totalRevenueRs: number;
  creditOutstandingRs: number;
  totalExpensesRs: number;
  netProfitRs: number;
  tanks: {
    id: number;
    name: string;
    fuel_type: FuelType;
    capacity: number;
    current_stock: number;
    fill_percentage: number;
  }[];
}

export interface CashClosing {
  id: number;
  pump_id?: number;
  date: string;
  shift: "Morning" | "Evening" | "Night" | "FullDay" | string;
  total_nozzle_sale_rs: number;
  total_oil_products_sale_rs: number;
  total_sale_rs: number;
  total_udhar_rs: number;
  total_kharcha_rs: number;
  expected_cash_in_hand: number;
  actual_cash_submitted_rs: number;
  difference_rs: number;
  submitted_by?: string | null;
  receiver_name?: string | null;
  notes?: string | null;
  created_at?: string | null;
}

export interface PumpSettings {
  low_stock_threshold: number; // percentage, default 20
  pump_name: string;
  phone?: string;
  address?: string;
}
