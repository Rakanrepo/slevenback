// Updated orders service for the new backend
import { apiClient } from './api.js';

export interface CreateOrderData {
  user_id: string;
  total_amount: number;
  currency: string;
  shipping_address: any;
  items: any[];
  payment_type?: string;
}

export interface UpdateOrderData {
  status?: 'pending' | 'paid' | 'processing' | 'failed' | 'cancelled' | 'completed';
  payment_id?: string;
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
  items: any[];
  created_at: string;
  updated_at: string;
  payment?: any;
}

class OrderService {
  async createOrder(orderData: CreateOrderData): Promise<{ order: Order | null; error: string | null }> {
    try {
      const response = await apiClient.createOrder(orderData);

      if (!response.success) {
        return { order: null, error: response.error || 'Failed to create order' };
      }

      return { order: (response.data as Order) || null, error: null };
    } catch (error) {
      return { 
        order: null, 
        error: error instanceof Error ? error.message : 'Failed to create order' 
      };
    }
  }

  async getOrder(orderId: string): Promise<{ order: Order | null; error: string | null }> {
    try {
      const response = await apiClient.getOrder(orderId);

      if (!response.success) {
        return { order: null, error: response.error || 'Failed to get order' };
      }

      return { order: (response.data as Order) || null, error: null };
    } catch (error) {
      return { 
        order: null, 
        error: error instanceof Error ? error.message : 'Failed to get order' 
      };
    }
  }

  async getUserOrders(userId: string): Promise<{ orders: Order[]; error: string | null }> {
    try {
      const response = await apiClient.getUserOrders();

      if (!response.success) {
        return { orders: [], error: response.error || 'Failed to get orders' };
      }

      return { orders: (response.data as Order[]) || [], error: null };
    } catch (error) {
      return { 
        orders: [], 
        error: error instanceof Error ? error.message : 'Failed to get orders' 
      };
    }
  }

  async updateOrder(orderId: string, updates: UpdateOrderData): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await apiClient.updateOrder(orderId, updates);

      if (!response.success) {
        return { success: false, error: response.error || 'Update failed' };
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update order' 
      };
    }
  }

  async createPayment(paymentData: {
    order_id: string;
    moyasar_payment_id: string;
    amount: number;
    currency: string;
    status: string;
    payment_method: string;
    metadata?: any;
  }): Promise<{ payment: any | null; error: string | null }> {
    try {
      // For the new backend, payment creation is handled through the payment service
      // This method is kept for compatibility but may not be needed
      return { payment: null, error: 'Payment creation handled by payment service' };
    } catch (error) {
      return { 
        payment: null, 
        error: error instanceof Error ? error.message : 'Failed to create payment' 
      };
    }
  }

  async updatePayment(paymentId: string, updates: {
    status?: string;
    metadata?: any;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      // Payment updates are handled by the payment service
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update payment' 
      };
    }
  }

  async getPaymentByMoyasarId(moyasarPaymentId: string): Promise<{ payment: any | null; error: string | null }> {
    try {
      const response = await apiClient.getPayment(moyasarPaymentId);

      if (!response.success) {
        return { payment: null, error: response.error || 'Failed to get payment' };
      }

      return { payment: response.data || null, error: null };
    } catch (error) {
      return { 
        payment: null, 
        error: error instanceof Error ? error.message : 'Failed to get payment' 
      };
    }
  }

  async getPendingPayOnArrivalOrder(userId: string): Promise<{ order: Order | null; error: string | null }> {
    try {
      const response = await apiClient.getPendingPayOnArrivalOrder();

      if (!response.success) {
        return { order: null, error: response.error || 'Failed to check for pending orders' };
      }

      return { order: (response.data as Order) || null, error: null };
    } catch (error) {
      return { 
        order: null, 
        error: error instanceof Error ? error.message : 'Failed to check for pending orders' 
      };
    }
  }
}

export const orderService = new OrderService();
