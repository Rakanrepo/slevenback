import { pool } from '../config/database.js';
import { Payment, CreatePaymentData, UpdatePaymentData } from '../types/index.js';

export class PaymentModel {
  static async create(paymentData: CreatePaymentData): Promise<Payment> {
    const client = await pool.connect();
    
    try {
      const { order_id, moyasar_payment_id, amount, currency, status, payment_method, metadata } = paymentData;
      
      const query = `
        INSERT INTO payments (order_id, moyasar_payment_id, amount, currency, status, payment_method, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, order_id, moyasar_payment_id, amount, currency, status, payment_method, 
                  metadata, created_at, updated_at
      `;
      
      const result = await client.query(query, [
        order_id, moyasar_payment_id, amount, currency, status, payment_method, 
        metadata ? JSON.stringify(metadata) : null
      ]);
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  static async findById(id: string): Promise<Payment | null> {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT id, order_id, moyasar_payment_id, amount, currency, status, payment_method, 
               metadata, created_at, updated_at
        FROM payments
        WHERE id = $1
      `;
      
      const result = await client.query(query, [id]);
      const payment = result.rows[0];
      
      if (payment && payment.metadata) {
        payment.metadata = JSON.parse(payment.metadata);
      }
      
      return payment || null;
    } finally {
      client.release();
    }
  }

  static async findByOrderId(orderId: string): Promise<Payment | null> {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT id, order_id, moyasar_payment_id, amount, currency, status, payment_method, 
               metadata, created_at, updated_at
        FROM payments
        WHERE order_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `;
      
      const result = await client.query(query, [orderId]);
      const payment = result.rows[0];
      
      if (payment && payment.metadata) {
        payment.metadata = JSON.parse(payment.metadata);
      }
      
      return payment || null;
    } finally {
      client.release();
    }
  }

  static async findByMoyasarId(moyasarPaymentId: string): Promise<Payment | null> {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT id, order_id, moyasar_payment_id, amount, currency, status, payment_method, 
               metadata, created_at, updated_at
        FROM payments
        WHERE moyasar_payment_id = $1
      `;
      
      const result = await client.query(query, [moyasarPaymentId]);
      const payment = result.rows[0];
      
      if (payment && payment.metadata) {
        payment.metadata = JSON.parse(payment.metadata);
      }
      
      return payment || null;
    } finally {
      client.release();
    }
  }

  static async update(id: string, updates: UpdatePaymentData): Promise<Payment | null> {
    const client = await pool.connect();
    
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      if (updates.status !== undefined) {
        fields.push(`status = $${paramCount++}`);
        values.push(updates.status);
      }

      if (updates.metadata !== undefined) {
        fields.push(`metadata = $${paramCount++}`);
        values.push(JSON.stringify(updates.metadata));
      }

      if (fields.length === 0) {
        return await this.findById(id);
      }

      const query = `
        UPDATE payments
        SET ${fields.join(', ')}, updated_at = NOW()
        WHERE id = $${paramCount}
        RETURNING id, order_id, moyasar_payment_id, amount, currency, status, payment_method, 
                  metadata, created_at, updated_at
      `;
      
      values.push(id);
      const result = await client.query(query, values);
      const payment = result.rows[0];
      
      if (payment && payment.metadata) {
        payment.metadata = JSON.parse(payment.metadata);
      }
      
      return payment || null;
    } finally {
      client.release();
    }
  }

  static async delete(id: string): Promise<boolean> {
    const client = await pool.connect();
    
    try {
      const query = 'DELETE FROM payments WHERE id = $1';
      const result = await client.query(query, [id]);
      return (result.rowCount ?? 0) > 0;
    } finally {
      client.release();
    }
  }

  static async getPaymentStats(): Promise<{
    total: number;
    successful: number;
    failed: number;
    pending: number;
    totalAmount: number;
  }> {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'paid' THEN 1 END) as successful,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as total_amount
        FROM payments
      `;
      
      const result = await client.query(query);
      return result.rows[0];
    } finally {
      client.release();
    }
  }
}
