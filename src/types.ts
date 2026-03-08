export interface User {
  id: number;
  username: string;
  role: 'sales' | 'manager' | 'accountant' | 'admin' | 'staff';
  approved?: boolean;
}

export interface Customer {
  id: number;
  fullName: string;
  phoneNumber: string;
  email: string;
  address: string;
  nationalId?: string;
  status: string;
  owner_id?: number;
  owner_name?: string;
  createdBy?: number;
  createdDate: string;
}

export interface OwnershipRequest {
  id: number;
  customer_id?: number;
  customer_name?: string;
  property_id?: number;
  property_title?: string;
  request_by: number;
  requester_name?: string;
  current_owner_name?: string;
  type: 'Ownership' | 'Deletion' | 'PropertyUpdate';
  status: 'Pending' | 'Approved' | 'Rejected';
  new_data?: string;
  processed_by?: number;
  processor_name?: string;
  processed_at?: string;
  created_at: string;
}

export interface Property {
  id: number;
  title: string;
  type: string;
  price: number;
  area: number;
  location: string;
  status: 'Còn trống' | 'Giữ chỗ' | 'Đặt cọc' | 'Đã bán';
  image_url: string;
  description?: string;
  listing_type: 'Bán' | 'Thuê';
}

export interface Reservation {
  id: number;
  customer_id: number;
  property_id: number;
  sales_id: number;
  customer_name?: string;
  property_title?: string;
  reservation_code: string;
  status: 'Active' | 'Expired' | 'Converted';
  expires_at: string;
  created_at: string;
}

export interface Deposit {
  id: number;
  reservation_id: number;
  customer_id: number;
  property_id: number;
  amount: number;
  status: 'Pending' | 'Success' | 'Failed';
  created_at: string;
  customer_name?: string;
  property_title?: string;
}

export interface Contract {
  id: number;
  customer_id: number;
  property_id: number;
  deposit_id?: number;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  customer_address?: string;
  customer_nationalId?: string;
  property_title?: string;
  property_location?: string;
  property_type?: string;
  property_area?: number;
  property_listing_type?: 'Bán' | 'Thuê';
  total_value: number;
  status: 'Draft' | 'Customer_Confirmed' | 'Vendor_Confirmed' | 'Completed' | 'Cancelled';
  file_url?: string;
  created_at: string;
}

export interface Payment {
  id: number;
  contract_id: number;
  customer_name?: string;
  property_title?: string;
  amount: number;
  due_date: string;
  status: 'Đã thanh toán' | 'Chưa thanh toán';
  invoice_url?: string;
}

export interface DashboardStats {
  monthlyContracts: number;
  totalRevenue: number;
  pendingContracts: number;
  conversionRate: number;
  newCustomers: number;
  propertiesForSale: number;
  propertiesSold: number;
  totalTransactionValue: number;
  revenueByMonth: { month: string; revenue: number; contracts: number }[];
  propertyTypeDistribution: { name: string; value: number }[];
  contractStatusDistribution: { name: string; value: number }[];
}

export interface Activity {
  id: number;
  type: 'contract' | 'customer' | 'payment' | 'system';
  content: string;
  timestamp: string;
}

export interface AppState {
  user: User | null;
  view: string;
  isSidebarOpen: boolean;
  searchQuery: string;
}
