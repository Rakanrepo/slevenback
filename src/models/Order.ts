import { pool } from '../config/database.js';
import { Order, CreateOrderData, UpdateOrderData, OrderItem } from '../types/index.js';

export class OrderModel {
  static async create(orderData: CreateOrderData): Promise<Order> {
    const client = await pool.connect();
    
    try {
      const { user_id, total_amount, currency, shipping_address, items, payment_type } = orderData;
      
      const query = `
        INSERT INTO orders (user_id, total_amount, currency, shipping_address, items, payment_type)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, user_id, total_amount, currency, status, payment_id, payment_type, 
                  shipping_address, items, created_at, updated_at
      `;
      
      const result = await client.query(query, [
        user_id, total_amount, currency, shipping_address, JSON.stringify(items), payment_type
      ]);
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  static async findById(id: string): Promise<Order | null> {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT id, user_id, total_amount, currency, status, payment_id, payment_type, 
               shipping_address, items, created_at, updated_at
        FROM orders
        WHERE id = $1
      `;
      
      const result = await client.query(query, [id]);
      const order = result.rows[0];
      
      if (order) {
        // Parse numeric fields
        order.total_amount = parseFloat(order.total_amount);
        // Parse JSON items safely
        order.items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
        if (order.shipping_address) {
          order.shipping_address = typeof order.shipping_address === 'string' ? 
            JSON.parse(order.shipping_address) : order.shipping_address;
        }
      }
      
      return order || null;
    } finally {
      client.release();
    }
  }

  static async findByUserId(userId: string): Promise<Order[]> {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT id, user_id, total_amount, currency, status, payment_id, payment_type, 
               shipping_address, items, created_at, updated_at
        FROM orders
        WHERE user_id = $1
        ORDER BY created_at DESC
      `;
      
      const result = await client.query(query, [userId]);
      
      return result.rows.map(order => ({
        ...order,
        total_amount: parseFloat(order.total_amount),
        items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
        shipping_address: order.shipping_address ? 
          (typeof order.shipping_address === 'string' ? JSON.parse(order.shipping_address) : order.shipping_address) : 
          null
      }));
    } finally {
      client.release();
    }
  }

  static async update(id: string, updates: UpdateOrderData): Promise<Order | null> {
    const client = await pool.connect();
    
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      if (updates.status !== undefined) {
        fields.push(`status = $${paramCount++}`);
        values.push(updates.status);
      }

      if (updates.payment_id !== undefined) {
        fields.push(`payment_id = $${paramCount++}`);
        values.push(updates.payment_id);
      }

      if (updates.payment_type !== undefined) {
        fields.push(`payment_type = $${paramCount++}`);
        values.push(updates.payment_type);
      }

      if (fields.length === 0) {
        return await this.findById(id);
      }

      const query = `
        UPDATE orders
        SET ${fields.join(', ')}, updated_at = NOW()
        WHERE id = $${paramCount}
        RETURNING id, user_id, total_amount, currency, status, payment_id, payment_type, 
                  shipping_address, items, created_at, updated_at
      `;
      
      values.push(id);
      const result = await client.query(query, values);
      const order = result.rows[0];
      
      if (order) {
        // Parse numeric fields
        order.total_amount = parseFloat(order.total_amount);
        order.items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
        if (order.shipping_address) {
          order.shipping_address = typeof order.shipping_address === 'string' ? 
            JSON.parse(order.shipping_address) : order.shipping_address;
        }
      }
      
      return order || null;
    } finally {
      client.release();
    }
  }

  static async findPendingPayOnArrival(userId: string): Promise<Order | null> {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT id, user_id, total_amount, currency, status, payment_id, payment_type, 
               shipping_address, items, created_at, updated_at
        FROM orders
        WHERE user_id = $1 
        AND status IN ('pending', 'processing', 'paid')
        AND items::jsonb @> '[{"payment_type": "Pay on Arrival"}]'
        ORDER BY created_at DESC
        LIMIT 1
      `;
      
      const result = await client.query(query, [userId]);
      const order = result.rows[0];
      
      if (order) {
        // Parse numeric fields
        order.total_amount = parseFloat(order.total_amount);
        order.items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
        if (order.shipping_address) {
          order.shipping_address = typeof order.shipping_address === 'string' ? 
            JSON.parse(order.shipping_address) : order.shipping_address;
        }
      }
      
      return order || null;
    } finally {
      client.release();
    }
  }

  static async delete(id: string): Promise<boolean> {
    const client = await pool.connect();
    
    try {
      const query = 'DELETE FROM orders WHERE id = $1';
      const result = await client.query(query, [id]);
      return result.rowCount > 0;
    } finally {
      client.release();
    }
  }

  static async getOrderStats(): Promise<{
    total: number;
    pending: number;
    paid: number;
    processing: number;
    failed: number;
    cancelled: number;
    completed: number;
  }> {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid,
          COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
        FROM orders
      `;
      
      const result = await client.query(query);
      return result.rows[0];
    } finally {
      client.release();
    }
  }
}
