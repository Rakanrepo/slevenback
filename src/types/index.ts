// User Types
export interface User {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  full_name?: string;
  phone?: string;
}

export interface UpdateUserData {
  full_name?: string;
  phone?: string;
}

// Cap Types
export interface Cap {
  id: number;
  name: string;
  name_ar: string;
  description: string;
  description_ar: string;
  price: number;
  image_url: string;
  category: string;
  brand: string;
  color: string;
  size: string;
  stock_quantity: number;
  is_featured: boolean;
  created_at: string;
}

export interface CreateCapData {
  name: string;
  name_ar: string;
  description: string;
  description_ar: string;
  price: number;
  image_url: string;
  category: string;
  brand: string;
  color: string;
  size: string;
  stock_quantity?: number;
  is_featured?: boolean;
}

export interface UpdateCapData {
  name?: string;
  name_ar?: string;
  description?: string;
  description_ar?: string;
  price?: number;
  image_url?: string;
  category?: string;
  brand?: string;
  color?: string;
  size?: string;
  stock_quantity?: number;
  is_featured?: boolean;
}

// Order Types
export interface OrderItem {
  cap_id: number;
  quantity: number;
  price: number;
  name: string;
  name_ar: string;
  image_url?: string;
  payment_type?: string;
}

export interface Order {
  id: string;
  user_id: string;
  total_amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'processing' | 'failed' | 'cancelled' | 'completed';
  payment_id?: string;
  payment_type?: string;
  shipping_address?: any;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface CreateOrderData {
  user_id: string;
  total_amount: number;
  currency: string;
  shipping_address?: any;
  items: OrderItem[];
  payment_type?: string;
}

export interface UpdateOrderData {
  status?: 'pending' | 'paid' | 'processing' | 'failed' | 'cancelled' | 'completed';
  payment_id?: string;
  payment_type?: string;
}

// Payment Types
export interface Payment {
  id: string;
  order_id: string;
  moyasar_payment_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentData {
  order_id: string;
  moyasar_payment_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  metadata?: any;
}

export interface UpdatePaymentData {
  status?: string;
  metadata?: any;
}

// Omniful Queue Types
export interface OmnifulQueueItem {
  id: string;
  order_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  payload: any;
  attempts: number;
  max_attempts: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface OmnifulInventoryUpdate {
  product_id: string;
  quantity_change: number;
  operation: 'deduct' | 'add';
  reason: string;
  order_id: string;
  timestamp: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Auth Types
export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  full_name?: string;
  phone?: string;
}

// Moyasar Types
export interface MoyasarPaymentRequest {
  amount: number;
  currency: string;
  description: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  shipping_address?: string;
  quantity?: number;
  payment_method: 'card' | 'applepay';
  card_data?: {
    number: string;
    name: string;
    month: string;
    year: string;
    cvc: string;
  };
  apple_pay_token?: string;
  metadata?: Record<string, unknown>;
}

export interface MoyasarPaymentResponse {
  success: boolean;
  payment?: {
    id: string;
    status: 'initiated' | 'paid' | 'failed' | 'cancelled';
    amount: number;
    currency: string;
    description: string;
    source?: {
      type: string;
      transaction_url?: string;
      message?: string;
    };
    transaction_url?: string;
    created_at: string;
  };
  error?: string;
}

// Email Types
export interface InvoiceEmailData {
  customerName: string;
  customerEmail: string;
  orderId: string;
  orderDate: string;
  items: Array<{
    name: string;
    name_ar: string;
    price: number;
    quantity: number;
    total: number;
  }>;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  shippingAddress: string;
  currency: string;
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}
