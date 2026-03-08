import { User, Customer, Property, Contract, Payment, DashboardStats, Activity, OwnershipRequest, Reservation, Deposit } from '../types';

export const api = {
  login: async (username: string, password: string): Promise<{ success: boolean; user?: User; message?: string }> => {
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      return data;
    } catch (e) {
      throw new Error('Lỗi kết nối server');
    }
  },
  register: async (username: string, password: string, role: string): Promise<{ success: boolean; userId?: number; message?: string }> => {
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role })
      });
      const data = await res.json();
      return data;
    } catch (e) {
      throw new Error('Lỗi kết nối server');
    }
  },
  getCustomers: async (): Promise<Customer[]> => {
    const res = await fetch(`/api/customers?t=${Date.now()}`);
    return res.json();
  },
  checkDuplicate: async (phoneNumber: string, nationalId?: string, fullName?: string): Promise<{ exists: boolean; customer?: Customer }> => {
    const params = new URLSearchParams();
    if (phoneNumber) params.append('phoneNumber', phoneNumber);
    if (nationalId) params.append('nationalId', nationalId);
    if (fullName) params.append('fullName', fullName);
    const res = await fetch(`/api/customers/check?${params.toString()}`);
    return res.json();
  },
  createCustomer: async (data: Partial<Customer>): Promise<{ success: boolean; customerId?: number; message?: string }> => {
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  updateCustomer: async (id: number, data: Partial<Customer>): Promise<{ success: boolean }> => {
    const res = await fetch(`/api/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  getRequests: async (): Promise<OwnershipRequest[]> => {
    const res = await fetch('/api/requests');
    return res.json();
  },
  createRequest: async (data: { customer_id?: number; property_id?: number; request_by: number; new_data?: any; type?: string }): Promise<{ success: boolean; message?: string }> => {
    const res = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  deleteCustomer: async (id: number, userId: number, role: string): Promise<{ success: boolean; message?: string }> => {
    const res = await fetch(`/api/customers/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, role })
    });
    
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse JSON response:', text);
      return { success: false, message: `Lỗi hệ thống: Phản hồi không hợp lệ (${res.status})` };
    }
  },
  updateRequestStatus: async (id: number, status: string, processedBy: number): Promise<{ success: boolean }> => {
    const res = await fetch(`/api/requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, processed_by: processedBy })
    });
    return res.json();
  },
  getProperties: async (): Promise<Property[]> => {
    const res = await fetch('/api/properties');
    return res.json();
  },
  createProperty: async (data: Partial<Property>): Promise<{ success: boolean }> => {
    const res = await fetch('/api/properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  updateProperty: async (id: number, data: Partial<Property>): Promise<{ success: boolean }> => {
    const res = await fetch(`/api/properties/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  deleteProperty: async (id: number): Promise<{ success: boolean }> => {
    const res = await fetch(`/api/properties/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  },
  getContracts: async (): Promise<Contract[]> => {
    const res = await fetch('/api/contracts');
    return res.json();
  },
  getReservations: async (): Promise<Reservation[]> => {
    const res = await fetch('/api/reservations');
    return res.json();
  },
  createReservation: async (data: { customer_id: number; property_id: number; sales_id: number }): Promise<{ success: boolean; reservationId?: number; message?: string }> => {
    const res = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  getDeposits: async (): Promise<Deposit[]> => {
    const res = await fetch('/api/deposits');
    return res.json();
  },
  createDeposit: async (data: { reservation_id: number; amount: number }): Promise<{ success: boolean; depositId?: number; message?: string }> => {
    const res = await fetch('/api/deposits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  confirmContract: async (id: number, step: 'customer' | 'vendor', confirmed: boolean): Promise<{ success: boolean; message?: string }> => {
    const res = await fetch(`/api/contracts/${id}/confirm`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step, confirmed })
    });
    return res.json();
  },
  createContract: async (data: any): Promise<{ success: boolean; contractId?: number }> => {
    const res = await fetch('/api/contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  updateContractStatus: async (id: number, status: string): Promise<{ success: boolean }> => {
    const res = await fetch(`/api/contracts/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    return res.json();
  },
  getPayments: async (): Promise<Payment[]> => {
    const res = await fetch('/api/payments');
    return res.json();
  },
  getStats: async (): Promise<DashboardStats> => {
    const res = await fetch(`/api/stats?t=${Date.now()}`);
    return res.json();
  },
  getActivities: async (): Promise<Activity[]> => {
    const res = await fetch(`/api/activities?t=${Date.now()}`);
    return res.json();
  },
  search: async (q: string): Promise<{ customers: Customer[]; properties: Property[]; contracts: Contract[] }> => {
    const res = await fetch(`/api/search?q=${q}`);
    return res.json();
  },
  getUsers: async (role?: string): Promise<User[]> => {
    const params = role ? `?role=${role}` : '';
    const res = await fetch(`/api/users${params}`);
    return res.json();
  },
  approveUser: async (id: number): Promise<{ success: boolean }> => {
    const res = await fetch(`/api/users/${id}/approve`, {
      method: 'PATCH',
    });
    return res.json();
  },
  deleteUser: async (id: number): Promise<{ success: boolean }> => {
    console.log('[API] Deleting user:', id);
    const res = await fetch(`/api/users/${id}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    console.log('[API] Delete response:', data);
    return data;
  }
};
