
import { OrderStatus } from './types';

export const SHOWROOMS = ['Anna Nagar', 'Valasaravakkam'];
export const STITCH_TYPES = ['Pleated', 'Ripple', 'Eyelet', 'Roman Blinds 48"', 'Roman Blinds 54"', 'Blinds (Regular)'];
export const LINING_TYPES = ['No Lining', 'Normal Lining', 'B/O Lining'];
export const TAILORS = ['None', 'Dev', 'Dinesh'];
export const FITTERS = ['None', 'Dev', 'Dinesh', 'Krishna'];

// Branded Colors based on quiltanddrapes.com
export const BRAND_COLORS = {
  NAVY: '#002d62',
  GOLD: '#c5a059',
  SLATE: '#1e293b',
  BONE: '#f8fafc'
};

export const STATUS_COLORS: Record<OrderStatus, string> = {
  [OrderStatus.FABRIC_PENDING]: 'bg-amber-600',
  [OrderStatus.IN_TRANSIT]: 'bg-[#002d62]',
  [OrderStatus.STITCHING]: 'bg-indigo-700',
  [OrderStatus.INSTALLATION]: 'bg-[#c5a059]',
  [OrderStatus.COMPLETED]: 'bg-emerald-600'
};

export const STATUS_GRADIENTS: Record<OrderStatus, string> = {
  [OrderStatus.FABRIC_PENDING]: 'from-amber-600 to-amber-800',
  [OrderStatus.IN_TRANSIT]: 'from-[#002d62] to-[#001a3a]',
  [OrderStatus.STITCHING]: 'from-indigo-700 to-indigo-900',
  [OrderStatus.INSTALLATION]: 'from-[#c5a059] to-[#a38345]',
  [OrderStatus.COMPLETED]: 'from-emerald-600 to-emerald-800'
};
