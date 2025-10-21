import axios from 'axios';
import { config } from '../config/index.js';
import { MoyasarPaymentRequest, MoyasarPaymentResponse } from '../types/index.js';

export class MoyasarService {
  private apiUrl: string;
  private secretKey: string;

  constructor() {
    this.apiUrl = config.moyasar.apiUrl;
    this.secretKey = config.moyasar.secretKey;
  }

  async createPayment(paymentData: MoyasarPaymentRequest): Promise<MoyasarPaymentResponse> {
    try {
      // Validate configuration
      if (!this.secretKey) {
        throw new Error('Moyasar secret key is not configured');
      }

      // Convert amount to smallest currency unit (halalas for SAR)
      const moyasarAmount = Math.round(paymentData.amount * 100);
      
      console.log('🔄 Creating payment with Moyasar:', {
        amount: moyasarAmount,
        currency: paymentData.currency,
        paymentMethod: paymentData.payment_method
      });

      const moyasarPaymentData: any = {
        given_id: `sleven_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`, // Required for idempotency
        amount: moyasarAmount,
        currency: paymentData.currency,
        description: paymentData.description || "Sleven Payment",
        metadata: {
          customer_name: paymentData.customer_name,
          customer_email: paymentData.customer_email,
          customer_phone: paymentData.customer_phone,
          shipping_address: paymentData.shipping_address,
          quantity: paymentData.quantity,
          source: 'sleven_website',
          original_amount: paymentData.amount
        }
      };

      // Add payment method specific data
      if (paymentData.payment_method === 'applepay' && paymentData.apple_pay_token) {
        moyasarPaymentData.source = {
          type: 'applepay',
          token: paymentData.apple_pay_token
        };
      } else if (paymentData.payment_method === 'card' && paymentData.card_data) {
        moyasarPaymentData.source = {
          type: 'creditcard',
          name: paymentData.card_data.name,
          number: paymentData.card_data.number.replace(/\s/g, ''),
          cvc: paymentData.card_data.cvc,
          month: parseInt(paymentData.card_data.month),
          year: parseInt(`20${paymentData.card_data.year}`),
          statement_descriptor: 'Sleven Store',
          '3ds': true,
          manual: false,
          save_card: false
        };
      } else {
        throw new Error('Invalid payment method or missing payment data');
      }

      // Debug the authorization header
      const authString = this.secretKey + ':';
      const authHeader = `Basic ${Buffer.from(authString).toString('base64')}`;
      
      console.log('🔐 Moyasar Auth Debug:', {
        secretKeyLength: this.secretKey.length,
        secretKeyPrefix: this.secretKey.substring(0, 15),
        secretKeySuffix: this.secretKey.substring(this.secretKey.length - 10),
        fullSecretKey: this.secretKey, // Show full key for debugging
        authStringLength: authString.length,
        authHeaderLength: authHeader.length,
        authHeaderPrefix: authHeader.substring(0, 25)
      });

      console.log('📦 Moyasar Payment Data:', JSON.stringify(moyasarPaymentData, null, 2));

      console.log('🌐 Moyasar API Request:', {
        url: `${this.apiUrl}/payments`,
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      });

      const response = await axios.post(`${this.apiUrl}/payments`, moyasarPaymentData, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
      });

      console.log('✅ Moyasar payment created successfully:', response.data.id);

      return {
        success: true,
        payment: {
          id: response.data.id,
          status: response.data.status,
          amount: response.data.amount,
          currency: response.data.currency,
          description: response.data.description,
          source: response.data.source,
          transaction_url: response.data.transaction_url,
          created_at: response.data.created_at
        }
      };

    } catch (error: any) {
      console.error('❌ Moyasar payment creation error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        }
      });
      
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Payment creation failed'
      };
    }
  }

  async validateApplePayMerchant(validationUrl: string): Promise<{ success: boolean; merchantSession?: any; error?: string }> {
    try {
      console.log('🔄 Validating Apple Pay merchant:', validationUrl);

      // Use Moyasar's Apple Pay initiate endpoint (same as Supabase function)
      const response = await axios.post(`${this.apiUrl}/applepay/initiate`, {
        validation_url: validationUrl,
        display_name: 'Sleven',
        domain_name: 'www.sleven.sa',
        publishable_api_key: config.moyasar.publicKey
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('✅ Apple Pay merchant validation successful');

      return {
        success: true,
        merchantSession: response.data
      };

    } catch (error: any) {
      console.error('❌ Apple Pay merchant validation error:', error.response?.data || error.message);
      
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Merchant validation failed'
      };
    }
  }

  async getPaymentStatus(paymentId: string): Promise<MoyasarPaymentResponse> {
    try {
      const response = await axios.get(`${this.apiUrl}/payments/${paymentId}`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(this.secretKey + ':').toString('base64')}`,
          'Content-Type': 'application/json',
        },
      });

      return {
        success: true,
        payment: {
          id: response.data.id,
          status: response.data.status,
          amount: response.data.amount,
          currency: response.data.currency,
          description: response.data.description,
          source: response.data.source,
          transaction_url: response.data.transaction_url,
          created_at: response.data.created_at
        }
      };

    } catch (error: any) {
      console.error('❌ Moyasar payment status error:', error.response?.data || error.message);
      
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to get payment status'
      };
    }
  }

  async verifyWebhookSignature(payload: string, signature: string): Promise<boolean> {
    try {
      // Moyasar uses HMAC-SHA256 for webhook signatures
      // You'll need to implement this verification based on Moyasar's documentation
      // For now, we'll skip verification in development
      if (config.nodeEnv === 'development') {
        return true;
      }

      // TODO: Implement proper HMAC-SHA256 verification
      // const crypto = require('crypto');
      // const expectedSignature = crypto
      //   .createHmac('sha256', config.moyasar.webhookSecret)
      //   .update(payload)
      //   .digest('hex');
      // return signature === expectedSignature;

      return true;
    } catch (error) {
      console.error('❌ Webhook signature verification error:', error);
      return false;
    }
  }
}
