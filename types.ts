
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
}

export interface BillingLineItem {
  type: string;
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
  payment_status: 'Paid' | 'Pending';
  stitching_breakup: BillingLineItem[];
  fitting_breakup: BillingLineItem[];
}
