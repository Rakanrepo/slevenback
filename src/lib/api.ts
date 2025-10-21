// Frontend API client for the new backend
declare global {
  interface ImportMeta {
    env: {
      VITE_API_URL?: string;
    };
  }
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}`,
        };
      }

      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Auth endpoints
  async register(userData: {
    email: string;
    password: string;
    full_name?: string;
    phone?: string;
  }) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(credentials: { email: string; password: string }) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response.success && response.data && typeof response.data === 'object' && 'token' in response.data) {
      this.setToken((response.data as { token: string }).token);
    }

    return response;
  }

  async logout() {
    this.setToken(null);
    return { success: true };
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  async updateProfile(updates: { full_name?: string; phone?: string }) {
    return this.request('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async changePassword(data: { currentPassword: string; newPassword: string }) {
    return this.request('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Caps endpoints
  async getCaps() {
    return this.request('/caps');
  }

  async getFeaturedCaps() {
    return this.request('/caps/featured');
  }

  async getCapsByCategory(category: string) {
    return this.request(`/caps/category/${category}`);
  }

  async getCap(id: number) {
    return this.request(`/caps/${id}`);
  }

  // Orders endpoints
  async createOrder(orderData: {
    total_amount: number;
    currency: string;
    shipping_address?: any;
    items: any[];
    payment_type?: string;
  }) {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  async getUserOrders() {
    return this.request('/orders/my-orders');
  }

  async getOrder(id: string) {
    return this.request(`/orders/${id}`);
  }

  async updateOrder(id: string, updates: any) {
    return this.request(`/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async getPendingPayOnArrivalOrder() {
    return this.request('/orders/pending/pay-on-arrival');
  }

  async deleteOrder(id: string) {
    return this.request(`/orders/${id}`, {
      method: 'DELETE',
    });
  }

  // Payments endpoints
  async createPayment(paymentData: {
    amount: number;
    currency: string;
    description: string;
    customer_name: string;
    customer_email: string;
    customer_phone?: string;
    shipping_address?: string;
    quantity?: number;
    payment_method: 'card' | 'applepay';
    card_data?: any;
    apple_pay_token?: string;
    metadata?: any;
  }) {
    return this.request('/payments/create', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  async validateApplePayMerchant(validationUrl: string) {
    return this.request('/payments/applepay/validate', {
      method: 'POST',
      body: JSON.stringify({ validation_url: validationUrl }),
    });
  }

  async getPaymentStatus(paymentId: string) {
    return this.request(`/payments/${paymentId}/status`);
  }

  async getPayment(paymentId: string) {
    return this.request(`/payments/${paymentId}`);
  }

  // Health check
  async healthCheck() {
    return this.request('/health');
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export type { ApiResponse };
