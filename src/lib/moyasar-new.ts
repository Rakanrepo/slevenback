// Updated Moyasar service for the new backend
import { apiClient } from './api.js';

export interface MoyasarPaymentProps {
  amount: number;
  currency: string;
  description: string;
  customerInfo: {
    name: string;
    email: string;
    phone?: string;
  };
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

export interface MoyasarCardData {
  number: string;
  name: string;
  month: string;
  year: string;
  cvc: string;
}

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
  card_data?: MoyasarCardData;
  apple_pay_token?: string;
  metadata?: Record<string, unknown>;
}

class MoyasarService {
  async createPayment(paymentData: MoyasarPaymentRequest): Promise<MoyasarPaymentResponse> {
    try {
      console.log('🔄 Creating payment via new backend API');
      console.log('📤 Payment data:', paymentData);

      const response = await apiClient.createPayment(paymentData);

      console.log('📋 Payment creation result:', response);
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Payment creation failed'
        };
      }

      return {
        success: true,
        payment: response.data?.payment
      };
    } catch (error) {
      console.error('❌ Moyasar payment creation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment creation failed'
      };
    }
  }

  async validateApplePayMerchant(validationUrl: string): Promise<{ success: boolean; merchantSession?: any; error?: string }> {
    try {
      console.log('🔄 Calling validation endpoint via new backend API');
      console.log('📤 Request payload:', { validation_url: validationUrl });

      const response = await apiClient.validateApplePayMerchant(validationUrl);

      console.log('📋 Validation result:', response);
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Validation failed'
        };
      }

      return {
        success: true,
        merchantSession: response.data
      };
    } catch (error) {
      console.error('❌ Apple Pay merchant validation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Merchant validation failed'
      };
    }
  }

  async getPaymentStatus(paymentId: string): Promise<MoyasarPaymentResponse> {
    try {
      const response = await apiClient.getPaymentStatus(paymentId);
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to get payment status'
        };
      }

      return {
        success: true,
        payment: response.data?.payment
      };
    } catch (error) {
      console.error('Moyasar payment status error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get payment status'
      };
    }
  }
}

export const moyasarService = new MoyasarService();
