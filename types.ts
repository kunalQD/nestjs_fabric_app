
export enum OrderStatus {
  FABRIC_PENDING = 'Fabric Order Pending',
  IN_TRANSIT = 'Fabric In Transit',
  STITCHING = 'Stitching',
  INSTALLATION = 'Hardware/Material Installation',
  COMPLETED = 'Completed'
}

export enum UserRole {
  ADMIN = 'admin',
  STAFF = 'staff'
}

export interface WindowEntry {
  window_id: string;
  window_name: string;
  stitch_type: string;
  lining_type: string;
  width: number;
  height: number;
  panels: number;
  quantity: number;
  track: number;
  sqft: number;
  notes: string;
  images: string[];
  is_double_layer?: boolean;
  model_type?: string;
  fit_type?: string;
  mount_type?: string;
  fitting_comments?: string;
}

export interface Order {
  order_id: string;
  customer_name: string;
  phone: string;
  address: string;
  showroom: string;
  status: OrderStatus;
  due_date: string;
  tailor: string;
  fitter: string;
  entries: WindowEntry[];
  created_at: string;
  payments?: { amount: number; date: string; method: string }[];
  total_bill?: number;
}

export interface BillingLineItem {
  type: string;      // Used for Room/Description
  subtype?: string;  // Used for Stitch/Style (e.g. Pleated)
  qty: number;
  rate: number;
  amount: number;
}

export interface OrderBilling {
  order_id: string;
  customer_name: string;
  tailor: string;
  fitter: string;
  stitching_total: number;
  fitting_total: number;
  grand_total: number;
  total_bill: number;
  payment_status: 'Paid' | 'Pending';
  stitching_breakup: BillingLineItem[];
  fitting_breakup: BillingLineItem[];
  payments: { amount: number; date: string; method: string }[];
  paid_total: number;
}
