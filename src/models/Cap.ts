import { pool } from '../config/database.js';
import { Cap, CreateCapData, UpdateCapData } from '../types/index.js';

export class CapModel {
  static async findAll(): Promise<Cap[]> {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT id, name, name_ar, description, description_ar, price, image_url, 
               category, brand, color, size, stock_quantity, is_featured, created_at
        FROM caps
        ORDER BY created_at DESC
      `;
      
      const result = await client.query(query);
      return result.rows.map(row => ({
        ...row,
        price: parseFloat(row.price),
        stock_quantity: parseInt(row.stock_quantity)
      }));
    } finally {
      client.release();
    }
  }

  static async findById(id: number): Promise<Cap | null> {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT id, name, name_ar, description, description_ar, price, image_url, 
               category, brand, color, size, stock_quantity, is_featured, created_at
        FROM caps
        WHERE id = $1
      `;
      
      const result = await client.query(query, [id]);
      const row = result.rows[0];
      if (!row) return null;
      
      return {
        ...row,
        price: parseFloat(row.price),
        stock_quantity: parseInt(row.stock_quantity)
      };
    } finally {
      client.release();
    }
  }

  static async findFeatured(): Promise<Cap[]> {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT id, name, name_ar, description, description_ar, price, image_url, 
               category, brand, color, size, stock_quantity, is_featured, created_at
        FROM caps
        WHERE is_featured = true
        ORDER BY created_at DESC
      `;
      
      const result = await client.query(query);
      return result.rows.map(row => ({
        ...row,
        price: parseFloat(row.price),
        stock_quantity: parseInt(row.stock_quantity)
      }));
    } finally {
      client.release();
    }
  }

  static async findByCategory(category: string): Promise<Cap[]> {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT id, name, name_ar, description, description_ar, price, image_url, 
               category, brand, color, size, stock_quantity, is_featured, created_at
        FROM caps
        WHERE category = $1
        ORDER BY created_at DESC
      `;
      
      const result = await client.query(query, [category]);
      return result.rows.map(row => ({
        ...row,
        price: parseFloat(row.price),
        stock_quantity: parseInt(row.stock_quantity)
      }));
    } finally {
      client.release();
    }
  }

  static async create(capData: CreateCapData): Promise<Cap> {
    const client = await pool.connect();
    
    try {
      const {
        name, name_ar, description, description_ar, price, image_url,
        category, brand, color, size, stock_quantity = 0, is_featured = false
      } = capData;
      
      const query = `
        INSERT INTO caps (name, name_ar, description, description_ar, price, image_url, 
                         category, brand, color, size, stock_quantity, is_featured)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id, name, name_ar, description, description_ar, price, image_url, 
                  category, brand, color, size, stock_quantity, is_featured, created_at
      `;
      
      const result = await client.query(query, [
        name, name_ar, description, description_ar, price, image_url,
        category, brand, color, size, stock_quantity, is_featured
      ]);
      
      const row = result.rows[0];
      return {
        ...row,
        price: parseFloat(row.price),
        stock_quantity: parseInt(row.stock_quantity)
      };
    } finally {
      client.release();
    }
  }

  static async update(id: number, updates: UpdateCapData): Promise<Cap | null> {
    const client = await pool.connect();
    
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      if (updates.name !== undefined) {
        fields.push(`name = $${paramCount++}`);
        values.push(updates.name);
      }

      if (updates.name_ar !== undefined) {
        fields.push(`name_ar = $${paramCount++}`);
        values.push(updates.name_ar);
      }

      if (updates.description !== undefined) {
        fields.push(`description = $${paramCount++}`);
        values.push(updates.description);
      }

      if (updates.description_ar !== undefined) {
        fields.push(`description_ar = $${paramCount++}`);
        values.push(updates.description_ar);
      }

      if (updates.price !== undefined) {
        fields.push(`price = $${paramCount++}`);
        values.push(updates.price);
      }

      if (updates.image_url !== undefined) {
        fields.push(`image_url = $${paramCount++}`);
        values.push(updates.image_url);
      }

      if (updates.category !== undefined) {
        fields.push(`category = $${paramCount++}`);
        values.push(updates.category);
      }

      if (updates.brand !== undefined) {
        fields.push(`brand = $${paramCount++}`);
        values.push(updates.brand);
      }

      if (updates.color !== undefined) {
        fields.push(`color = $${paramCount++}`);
        values.push(updates.color);
      }

      if (updates.size !== undefined) {
        fields.push(`size = $${paramCount++}`);
        values.push(updates.size);
      }

      if (updates.stock_quantity !== undefined) {
        fields.push(`stock_quantity = $${paramCount++}`);
        values.push(updates.stock_quantity);
      }

      if (updates.is_featured !== undefined) {
        fields.push(`is_featured = $${paramCount++}`);
        values.push(updates.is_featured);
      }

      if (fields.length === 0) {
        return await this.findById(id);
      }

      const query = `
        UPDATE caps
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING id, name, name_ar, description, description_ar, price, image_url, 
                  category, brand, color, size, stock_quantity, is_featured, created_at
      `;
      
      values.push(id);
      const result = await client.query(query, values);
      const row = result.rows[0];
      if (!row) return null;
      
      return {
        ...row,
        price: parseFloat(row.price),
        stock_quantity: parseInt(row.stock_quantity)
      };
    } finally {
      client.release();
    }
  }

  static async updateStock(id: number, quantity: number): Promise<boolean> {
    const client = await pool.connect();
    
    try {
      const query = `
        UPDATE caps
        SET stock_quantity = stock_quantity + $1
        WHERE id = $2
      `;
      
      const result = await client.query(query, [quantity, id]);
      return result.rowCount > 0;
    } finally {
      client.release();
    }
  }

  static async delete(id: number): Promise<boolean> {
    const client = await pool.connect();
    
    try {
      const query = 'DELETE FROM caps WHERE id = $1';
      const result = await client.query(query, [id]);
      return result.rowCount > 0;
    } finally {
      client.release();
    }
  }
}
