import { pool } from '../config/database.js';
import bcrypt from 'bcryptjs';
import { User, CreateUserData, UpdateUserData } from '../types/index.js';

export class UserModel {
  static async create(userData: CreateUserData): Promise<User> {
    const client = await pool.connect();
    
    try {
      const { email, password, full_name, phone } = userData;
      
      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);
      
      const query = `
        INSERT INTO users (email, password_hash, full_name, phone)
        VALUES ($1, $2, $3, $4)
        RETURNING id, email, full_name, phone, is_verified, created_at, updated_at
      `;
      
      const result = await client.query(query, [email, passwordHash, full_name, phone]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  static async findByEmail(email: string): Promise<User | null> {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT id, email, password_hash, full_name, phone, is_verified, created_at, updated_at
        FROM users
        WHERE email = $1
      `;
      
      const result = await client.query(query, [email]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  static async findById(id: string): Promise<User | null> {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT id, email, full_name, phone, is_verified, created_at, updated_at
        FROM users
        WHERE id = $1
      `;
      
      const result = await client.query(query, [id]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  static async update(id: string, updates: UpdateUserData): Promise<User | null> {
    const client = await pool.connect();
    
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      if (updates.full_name !== undefined) {
        fields.push(`full_name = $${paramCount++}`);
        values.push(updates.full_name);
      }

      if (updates.phone !== undefined) {
        fields.push(`phone = $${paramCount++}`);
        values.push(updates.phone);
      }

      if (fields.length === 0) {
        return await this.findById(id);
      }

      const query = `
        UPDATE users
        SET ${fields.join(', ')}, updated_at = NOW()
        WHERE id = $${paramCount}
        RETURNING id, email, full_name, phone, is_verified, created_at, updated_at
      `;
      
      values.push(id);
      const result = await client.query(query, values);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  static async verifyPassword(user: User, password: string): Promise<boolean> {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT password_hash
        FROM users
        WHERE id = $1
      `;
      
      const result = await client.query(query, [user.id]);
      const passwordHash = result.rows[0]?.password_hash;
      
      if (!passwordHash) {
        return false;
      }
      
      return await bcrypt.compare(password, passwordHash);
    } finally {
      client.release();
    }
  }

  static async updatePassword(id: string, newPassword: string): Promise<boolean> {
    const client = await pool.connect();
    
    try {
      const passwordHash = await bcrypt.hash(newPassword, 12);
      
      const query = `
        UPDATE users
        SET password_hash = $1, updated_at = NOW()
        WHERE id = $2
      `;
      
      const result = await client.query(query, [passwordHash, id]);
      return result.rowCount > 0;
    } finally {
      client.release();
    }
  }

  static async delete(id: string): Promise<boolean> {
    const client = await pool.connect();
    
    try {
      const query = 'DELETE FROM users WHERE id = $1';
      const result = await client.query(query, [id]);
      return result.rowCount > 0;
    } finally {
      client.release();
    }
  }
}
