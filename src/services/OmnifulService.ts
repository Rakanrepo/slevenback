import axios from 'axios';
import { config } from '../config/index.js';
import { OmnifulInventoryUpdate } from '../types/index.js';

export class OmnifulService {
  private apiUrl: string;
  private apiKey: string;

  constructor() {
    this.apiUrl = config.omniful.apiUrl;
    this.apiKey = config.omniful.apiKey;
  }

  async sendInventoryUpdate(updates: OmnifulInventoryUpdate[], orderId: string, userId: string, totalAmount: number, currency: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.apiKey) {
        console.warn('OMNIFUL_API_KEY not configured, skipping Omniful API call');
        return { success: true };
      }

      console.log('🔄 Sending inventory updates to Omniful for order:', orderId);

      const payload = {
        updates,
        order_id: orderId,
        user_id: userId,
        total_amount: totalAmount,
        currency,
        timestamp: new Date().toISOString(),
        source: 'sleven_landing'
      };

      const response = await axios.post(`${this.apiUrl}/inventory/update`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-API-Version': '1.0',
          'User-Agent': 'Sleven-Backend-Integration/1.0'
        }
      });

      console.log('✅ Successfully sent inventory updates to Omniful:', response.data);
      return { success: true };

    } catch (error: any) {
      console.error('❌ Failed to send data to Omniful API:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Omniful API error'
      };
    }
  }

  async processQueueItem(orderData: any): Promise<{ success: boolean; error?: string }> {
    try {
      const items = Array.isArray(orderData.items) ? orderData.items : [];
      
      if (items.length === 0) {
        console.warn(`No items to process for order ${orderData.id}`);
        return { success: true };
      }

      // Prepare inventory updates for Omniful
      const omnifulUpdates: OmnifulInventoryUpdate[] = items.map((item: any) => ({
        product_id: item.cap_id?.toString() || item.id?.toString(),
        quantity_change: -(item.quantity || 0), // Negative for deduction
        operation: 'deduct',
        reason: `Order ${orderData.id} - ${item.name || 'Unknown Product'}`,
        order_id: orderData.id,
        timestamp: new Date().toISOString()
      }));

      return await this.sendInventoryUpdate(
        omnifulUpdates,
        orderData.id,
        orderData.user_id,
        orderData.total_amount,
        orderData.currency
      );

    } catch (error: any) {
      console.error('❌ Error processing queue item:', error);
      return {
        success: false,
        error: error.message || 'Failed to process queue item'
      };
    }
  }

  async getInventoryStatus(productId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      if (!this.apiKey) {
        return { success: false, error: 'Omniful API key not configured' };
      }

      const response = await axios.get(`${this.apiUrl}/inventory/${productId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-API-Version': '1.0'
        }
      });

      return {
        success: true,
        data: response.data
      };

    } catch (error: any) {
      console.error('❌ Failed to get inventory status from Omniful:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to get inventory status'
      };
    }
  }

  async syncProduct(productData: any): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.apiKey) {
        console.warn('OMNIFUL_API_KEY not configured, skipping product sync');
        return { success: true };
      }

      console.log('🔄 Syncing product with Omniful:', productData.id);

      const payload = {
        product_id: productData.id.toString(),
        name: productData.name,
        name_ar: productData.name_ar,
        description: productData.description,
        description_ar: productData.description_ar,
        price: productData.price,
        category: productData.category,
        brand: productData.brand,
        color: productData.color,
        size: productData.size,
        stock_quantity: productData.stock_quantity,
        image_url: productData.image_url,
        is_featured: productData.is_featured,
        timestamp: new Date().toISOString(),
        source: 'sleven_landing'
      };

      const response = await axios.post(`${this.apiUrl}/products/sync`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-API-Version': '1.0'
        }
      });

      console.log('✅ Successfully synced product with Omniful:', response.data);
      return { success: true };

    } catch (error: any) {
      console.error('❌ Failed to sync product with Omniful:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Product sync failed'
      };
    }
  }
}
