
import { Order, OrderStatus, OrderBilling, WindowEntry } from '../types';

const BASE_URL = 'https://fabric-calc-5uhi.onrender.com';
const API_BASE = `${BASE_URL}/api`;

const getAuthHeader = () => {
  const token = localStorage.getItem('qd_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

const handleResponse = async (res: Response) => {
  if (res.status === 401) {
    localStorage.removeItem('qd_token');
    localStorage.removeItem('qd_user');
    throw new Error('AUTH_REQUIRED');
  }
  
  const contentType = res.headers.get("content-type");
  if (!res.ok) {
    const text = await res.text();
    console.error(`Server error (${res.status}):`, text);
    throw new Error(text || `Error ${res.status}`);
  }

  if (contentType && contentType.includes("application/json")) {
    return res.json();
  }
  return await res.text();
};

const normalizeStatus = (rawStatus: any): OrderStatus => {
  const s = String(rawStatus || '').trim().toLowerCase();
  
  if (s.includes('pending')) return OrderStatus.FABRIC_PENDING;
  if (s.includes('transit') || s.includes('cutting')) return OrderStatus.IN_TRANSIT;
  if (s.includes('stitching')) return OrderStatus.STITCHING;
  if (s.includes('installation') || s.includes('hardware') || s.includes('fit')) return OrderStatus.INSTALLATION;
  if (s.includes('completed') || s.includes('handed') || s.includes('done')) return OrderStatus.COMPLETED;
  
  return OrderStatus.FABRIC_PENDING;
};

const formatImageSource = (img: any): string => {
  if (!img || typeof img !== 'string') return '';
  let cleanStr = img.trim().replace(/^["']|["']$/g, '');

  if (cleanStr.toLowerCase().startsWith('gridfs:')) {
    const idPart = cleanStr.split(':')[1];
    return `${API_BASE}/images/gridfs/${idPart}`;
  }

  if (cleanStr.startsWith('data:image') || cleanStr.startsWith('http')) {
    return cleanStr;
  }

  if (cleanStr.length > 100 && !cleanStr.includes(' ')) {
    return `data:image/jpeg;base64,${cleanStr}`;
  }

  if (cleanStr.length === 24 && /^[0-9a-fA-F]+$/.test(cleanStr)) {
    return `${API_BASE}/images/gridfs/${cleanStr}`;
  }

  return '';
};

const sanitizeImages = (images: any): string[] => {
  if (!Array.isArray(images)) return [];
  return images.map(formatImageSource).filter(img => img.length > 0);
};

const mapBackendOrder = (o: any): Order => {
  const id = o.order_id || o._id || o.id || Math.random().toString();
  return {
    order_id: String(id),
    customer_name: o.name || (o.customer && o.customer.name) || o.customer_name || 'Client Name Unavailable',
    phone: o.phone || (o.customer && o.customer.phone) || '',
    address: o.address || (o.customer && o.customer.address) || '',
    showroom: o.showroom || (o.customer && o.customer.showroom) || 'Main Showroom',
    status: normalizeStatus(o.status),
    due_date: o.due_date || '',
    tailor: o.tailor || '',
    fitter: o.fitter || '',
    created_at: o.created_at || new Date().toISOString(),

    payments: Array.isArray(o.payments)
      ? o.payments.map((p: any) => ({
          amount: Number(p.amount) || 0,
          date: p.date || '',
          method: p.method || ''
        }))
      : [],

    total_bill: Number(o.total_bill) || 0,

    entries: Array.isArray(o.entries)
      ? o.entries.map((e: any) => ({
          window_id: e.window_id || Math.random().toString(36).substr(2, 9),
          window_name: e.Window || e.window_name || 'Unit',
          stitch_type: e.Stitch || e.stitch_type || 'Pleated',
          lining_type: e.Lining || e.lining_type || 'None',
          width: Number(e.Width || e.width || 0),
          height: Number(e.Height || e.height || 0),
          panels: Number(e.Panels || e.panels || 0),
          quantity: Number(e.Quantity || e.quantity || 0),
          sqft: Number(e.SQFT || e.sqft || 0),
          track: Number(e.Track || e.track || 0),
          notes: e.Notes || e.notes || '',
          images: e.Images ? sanitizeImages(e.Images) : (e.images ? sanitizeImages(e.images) : []),
          is_double_layer: !!(e.IsDouble || e.is_double_layer),
          model_type: e.model_type || '',
          fit_type: e.fit_type || '',
          mount_type: e.mount_type || '',
          fitting_comments: e.fitting_comments || ''
        }))
      : []
  };
};

export const dataService = {
  login: async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        mode: 'cors'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          localStorage.setItem('qd_token', data.token);
          return true;
        }
      }
      return false;
    } catch (err) {
      throw new Error('CORS_OR_CONNECTION_ERROR');
    }
  },

  logout: async (): Promise<void> => {
    localStorage.removeItem('qd_token');
    localStorage.removeItem('qd_user');
  },

  getOrders: async (search?: string): Promise<Order[]> => {
    try {
      // We append the search query to the URL
      const url = search 
        ? `${API_BASE}/orders/list?search=${encodeURIComponent(search)}` 
        : `${API_BASE}/orders/list`;

      const res = await fetch(url, {
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('qd_token')}` 
        },
        mode: 'cors'
      });
      
      const data = await handleResponse(res);
      const rawOrders = Array.isArray(data) ? data : (data.orders || data.data || []);
      return rawOrders.map(mapBackendOrder);
    } catch (err) {
      console.error("Order Fetch Error:", err);
      throw err;
    }
  },

  getKPIs: async () => {
    try {
      const res = await fetch(`${API_BASE}/dashboard/kpis`, {
        headers: { ...getAuthHeader() },
        mode: 'cors'
      });
      return await handleResponse(res);
    } catch (err) {
      return { orders: 0, fabric_pending: 0, stitching: 0, installation: 0, completed: 0 };
    }
  },

  getOrderById: async (id: string): Promise<Order | undefined> => {
    try {
      const res = await fetch(`${API_BASE}/orders/${id}`, {
        headers: { ...getAuthHeader() },
        mode: 'cors'
      });
      if (!res.ok) return undefined;
      const data = await handleResponse(res);
      return mapBackendOrder(data);
    } catch (err) {
      return undefined;
    }
  },

  saveOrder: async (order: Partial<Order>, entries: WindowEntry[]): Promise<void> => {
    const isUpdate = !!order.order_id;
    const url = isUpdate ? `${API_BASE}/orders/${order.order_id}` : `${API_BASE}/orders`;
    const method = isUpdate ? 'PUT' : 'POST';
    const payload = {
      ...order, // Use spread to get status, due_date, etc.
      customer_name: order.customer_name,
      phone: order.phone,
      address: order.address,
      showroom: order.showroom,
      payments: order.payments || [],
      total_bill: order.total_bill || 0,
      entries: entries // Send this once, not nested inside a customer object
    };
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
      mode: 'cors'
    });
    await handleResponse(res);
  },

  deleteOrder: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/orders/${id}`, { 
      method: 'DELETE', 
      headers: { ...getAuthHeader() },
      mode: 'cors'
    });
    await handleResponse(res);
  },

  getBillingData: async (startDate?: string, endDate?: string): Promise<OrderBilling[]> => {
    try {
      let url = `${API_BASE}/billing`;
      if (startDate && endDate) {
        url += `?start_date=${startDate}&end_date=${endDate}`;
      }
      
      const res = await fetch(url, {
        headers: { ...getAuthHeader() },
        mode: 'cors'
      });
      
      const data = await handleResponse(res);
      const raw = Array.isArray(data) ? data : (data?.billing || []);
      
      return raw.map((b: any) => ({
        order_id: String(b.order_id || b._id || 'N/A'),
        customer_name: b.customer || b.customer_name || b.name || 'Unknown Client',
        tailor: b.tailor || 'Not Assigned',
        fitter: b.fitter || 'Not Assigned',
        stitching_total: Number(b.stitching_total) || 0,
        fitting_total: Number(b.fitting_total) || 0,
        grand_total: Number(b.grand_total) || 0,
        total_bill: Number(b.total_bill) || 0,
        payment_status: b.payment_status || 'Pending',
        stitching_breakup: Array.isArray(b.stitching_breakup) ? b.stitching_breakup.map((i: any) => ({
          type: i.type || 'Window Allocation',
          subtype: i.subtype || '',
          qty: i.qty || 0,
          rate: i.rate || 0,
          amount: i.amount || 0
        })) : [],
        fitting_breakup: Array.isArray(b.fitting_breakup) ? b.fitting_breakup : [],
        payments: Array.isArray(b.payments) ? b.payments : [],
        paid_total: Number(b.paid_total) || 0
      }));
    } catch (err) {
      console.error("Billing Fetch Error:", err);
      throw err;
    }
  },

  updatePaymentStatus: async (orderId: string, status: 'Paid' | 'Pending'): Promise<void> => {
    const res = await fetch(`${API_BASE}/billing/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ payment_status: status }),
      mode: 'cors'
    });
    await handleResponse(res);
  },

  generateAIPreview: async (params: { window_image: string; fabric_image: string; mode: string; sub_type: string; style_prompt?: string }) => {
    try {
      const res = await fetch(`${API_BASE}/ai/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(params),
        mode: 'cors'
      });
      return await handleResponse(res);
    } catch (err) {
      console.error("AI Preview Error:", err);
      throw err;
    }
  }
};
