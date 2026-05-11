
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
  panel_split?: string;
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

export interface QuotationWindow {
  id: string;
  name: string;
  type: 'Curtain' | 'Roman Blind' | 'Roller Blind' | 'Rods Only' | 'Fabric Only' | 'Misc';
  fabric_qty: number;
  fabric_rate: number;
  panels: number;
  stitching_rate: number;
  track_ft: number;
  track_rate: number;
  sqft: number;
  blind_rate: number;
  mechanism_cost: number;
  installation_cost: number;
  comment?: string;
  include_stitching: boolean;
  include_fabric: boolean;
  include_hardware: boolean;
  is_double_curtain: boolean;
}

export interface QuotationRoom {
  id: string;
  name: string;
  windows: QuotationWindow[];
}

export interface MiscCharge {
  id: string;
  description: string;
  amount: number;
  comment: string;
}

export interface Quotation {
  id: string;
  customer_name: string;
  phone: string;
  date: string;
  rooms: QuotationRoom[];
  misc_charges: MiscCharge[];
  fabric_discount_percent: number;
  additional_discount: number;
  terms_conditions?: string;
  total_amount: number;
}
