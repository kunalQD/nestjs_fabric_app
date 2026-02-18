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
  if (cleanStr.startsWith('data:image')) return cleanStr;
  if (cleanStr.length > 50 && !cleanStr.includes('/')) return `data:image/jpeg;base64,${cleanStr}`;
  if (cleanStr.length === 24 && /^[0-9a-fA-F]+$/.test(cleanStr)) return `${API_BASE}/images/gridfs/${cleanStr}`;
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
    entries: Array.isArray(o.entries) ? o.entries.map((e: any) => ({
      window_id: e.window_id || e._id || Math.random().toString(36).substr(2, 9),
      window_name: e.Window || e.window_name || 'Window',
      stitch_type: e.Stitch || e.stitch_type || 'Pleated',
      lining_type: e.Lining || e.lining_type || 'No Lining',
      width: parseFloat(e.Width || e.width) || 0,
      height: parseFloat(e.Height || e.height) || 0,
      panels: parseInt(e.Panels || e.panels) || 0,
      quantity: parseFloat(e.Quantity || e.quantity) || 0,
      track: parseFloat(e.Track || e.track) || 0,
      sqft: parseFloat(e.SQFT || e.sqft) || 0,
      notes: e.Notes || e.notes || '',
      images: sanitizeImages(e.Images || e.images)
    })) : []
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

  getOrders: async (): Promise<Order[]> => {
    try {
      const res = await fetch(`${API_BASE}/orders/list`, {
        headers: { ...getAuthHeader() },
        mode: 'cors'
      });
      const data = await handleResponse(res);
      let rawOrders: any[] = Array.isArray(data) ? data : (data.orders || data.data || []);
      return rawOrders.map(mapBackendOrder);
    } catch (err) {
      console.error("Order Fetch Error:", err);
      return [];
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
      customer: {
        name: order.customer_name,
        phone: order.phone,
        address: order.address,
        showroom: order.showroom
      },
      status: order.status,
      due_date: order.due_date,
      tailor: order.tailor,
      fitter: order.fitter,
      entries: entries.map(e => ({
        window_id: e.window_id,
        Window: e.window_name,
        Stitch: e.stitch_type,
        Lining: e.lining_type,
        Width: e.width,
        Height: e.height,
        Panels: e.panels,
        Quantity: e.quantity,
        Track: e.track,
        SQFT: e.sqft,
        Notes: e.notes,
        Images: e.images
      }))
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

  getBillingData: async (): Promise<OrderBilling[]> => {
    try {
      const res = await fetch(`${API_BASE}/billing`, {
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
        payment_status: b.payment_status || 'Pending',
        stitching_breakup: Array.isArray(b.stitching_breakup) ? b.stitching_breakup : [],
        fitting_breakup: Array.isArray(b.fitting_breakup) ? b.fitting_breakup : []
      }));
    } catch (err) {
      console.error("Billing Fetch Error:", err);
      throw err;
    }
  }
};