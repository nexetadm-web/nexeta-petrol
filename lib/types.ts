export type FuelType = "Petrol" | "Diesel" | "HiOctane";

export interface Tank {
  id: number;
  name: string;
  fuel_type: FuelType;
  capacity: number;
  current_stock: number;
}

export interface Nozzle {
  id: number;
  name: string;
  tank_id: number;
  tank?: Tank;
}

export interface DailyRate {
  id: number;
  date: string;
  petrol_rate: number;
  diesel_rate: number;
  hioctane_rate: number;
}

export interface DailyReading {
  id: number;
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
  date: string;
  fuel_type: FuelType;
  qty: number;
  rate: number;
  total_cost: number;
  supplier: string;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  purchase_price: number;
  sale_price: number;
  stock_qty: number;
}

export interface ProductSale {
  id: number;
  date: string;
  product_id: number;
  qty: number;
  total: number;
  profit: number;
  product?: Product;
}

export interface CreditCustomer {
  id: number;
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
  date: string;
  type: string;
  amount: number;
  note: string | null;
}

export interface DipChart {
  id: number;
  tank_id: number | null;
  fuel_type: string;
  dip_value: number;
  unit: string;
  litres: number;
  tank?: Tank;
}

export interface TankKhata {
  id: number;
  date: string;
  tank_id: number;
  fuel_type: string;
  dip_value: number;
  dip_unit: string;
  dip_litres: number;
  tank_stock: number;
  register_stock: number;
  gain_loss: number;
  remarks: string | null;
  tank?: Tank;
  tankName?: string;
}

export interface Employee {
  id: number;
  name: string;
  phone: string;
  duty_type: string;
  salary: number;
  status: string;
}

export interface EmployeeDuty {
  id: number;
  date: string;
  employee_id: number;
  shift: "Morning" | "Evening" | "Night" | string;
  nozzle_assigned: string | null;
  present: number;
  notes: string | null;
  employee?: Employee;
  employeeName?: string;
  employeePhone?: string;
  duty_type?: string;
  salary?: number;
}

export interface DashboardMetrics {
  todayFuelLitres: number;
  todayFuelSaleRs: number;
  todayProductSaleRs: number;
  todayTotalSaleRs: number;
  totalCreditRemainingRs: number;
  todayExpenseRs: number;
  todayEstimatedNetProfitRs: number;
  tanks: Tank[];
  todayRate: DailyRate | null;
  isRateSetToday: boolean;
  recentSales: {
    type: "Fuel" | "Product" | "Credit";
    title: string;
    description: string;
    amount: number;
    time: string;
  }[];
}

export interface CashClosing {
  id: number;
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
