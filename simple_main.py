#!/usr/bin/env python3
"""
Simple test version of the backend using only standard library
Run with: python simple_main.py
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import urllib.parse
import sqlite3
import hashlib
import secrets
import datetime
import os

# Simple database setup
def setup_database():
    conn = sqlite3.connect('caps_store.db')
    cursor = conn.cursor()
    
    # Create tables
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            hashed_password TEXT NOT NULL,
            full_name TEXT NOT NULL,
            phone TEXT,
            address TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS caps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            name_ar TEXT NOT NULL,
            description TEXT,
            description_ar TEXT,
            price REAL NOT NULL,
            image_url TEXT,
            category TEXT,
            brand TEXT,
            color TEXT,
            size TEXT,
            stock_quantity INTEGER DEFAULT 0,
            is_featured BOOLEAN DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Insert sample data if empty
    cursor.execute('SELECT COUNT(*) FROM caps')
    if cursor.fetchone()[0] == 0:
        sample_caps = [
            ("Classic Baseball Cap", "قبعة بيسبول كلاسيكية", "Premium cotton baseball cap", "قبعة بيسبول قطنية فاخرة", 45.99, "https://images.unsplash.com/photo-1521369909029-2afed882baee?w=500", "baseball", "Sleven", "Navy Blue", "Adjustable", 50, 1),
            ("Luxury Leather Cap", "قبعة جلدية فاخرة", "Handcrafted genuine leather cap", "قبعة جلدية أصلية مصنوعة يدوياً", 129.99, "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=500", "luxury", "Sleven", "Black", "L", 25, 1),
            ("Snapback Cap", "قبعة سناب باك", "Modern snapback cap with flat brim", "قبعة سناب باك عصرية بحافة مسطحة", 39.99, "https://images.unsplash.com/photo-1575428652377-a2d80e2040ae?w=500", "snapback", "Sleven", "White", "Adjustable", 75, 0),
        ]
        
        cursor.executemany('''
            INSERT INTO caps (name, name_ar, description, description_ar, price, image_url, category, brand, color, size, stock_quantity, is_featured)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', sample_caps)
    
    conn.commit()
    conn.close()

class CORSHTTPRequestHandler(BaseHTTPRequestHandler):
    def _set_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    def do_OPTIONS(self):
        self.send_response(200)
        self._set_cors_headers()
        self.end_headers()
    
    def do_POST(self):
        if self.path == '/api/auth/register':
            self.handle_register()
        elif self.path == '/api/auth/login':
            self.handle_login()
        elif self.path == '/api/orders':
            self.handle_create_order()
        else:
            self.send_error(404, "Not Found")
    
    def do_GET(self):
        # Parse the path and query parameters
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        query_params = urllib.parse.parse_qs(parsed_url.query)
        
        if path == '/api/caps':
            self.handle_get_caps(query_params)
        elif path == '/api/caps/featured':
            self.handle_get_featured_caps()
        elif path.startswith('/api/caps/'):
            cap_id = path.split('/')[-1]
            self.handle_get_cap(cap_id)
        else:
            self.send_error(404, "Not Found")
    
    def handle_get_caps(self, query_params=None):
        if query_params is None:
            query_params = {}
            
        # Get query parameters
        skip = int(query_params.get('skip', ['0'])[0])
        limit = int(query_params.get('limit', ['20'])[0])
        category = query_params.get('category', [None])[0]
        
        conn = sqlite3.connect('caps_store.db')
        cursor = conn.cursor()
        
        # Build query with optional category filter
        if category:
            cursor.execute('SELECT * FROM caps WHERE category = ? LIMIT ? OFFSET ?', (category, limit, skip))
        else:
            cursor.execute('SELECT * FROM caps LIMIT ? OFFSET ?', (limit, skip))
            
        caps = cursor.fetchall()
        conn.close()
        
        # Convert to list of dicts
        caps_list = []
        for cap in caps:
            caps_list.append({
                'id': cap[0],
                'name': cap[1],
                'name_ar': cap[2],
                'description': cap[3],
                'description_ar': cap[4],
                'price': cap[5],
                'image_url': cap[6],
                'category': cap[7],
                'brand': cap[8],
                'color': cap[9],
                'size': cap[10],
                'stock_quantity': cap[11],
                'is_featured': bool(cap[12]),
                'created_at': cap[13]
            })
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self._set_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(caps_list).encode())
    
    def handle_get_featured_caps(self):
        conn = sqlite3.connect('caps_store.db')
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM caps WHERE is_featured = 1')
        caps = cursor.fetchall()
        conn.close()
        
        # Convert to list of dicts
        caps_list = []
        for cap in caps:
            caps_list.append({
                'id': cap[0],
                'name': cap[1],
                'name_ar': cap[2],
                'description': cap[3],
                'description_ar': cap[4],
                'price': cap[5],
                'image_url': cap[6],
                'category': cap[7],
                'brand': cap[8],
                'color': cap[9],
                'size': cap[10],
                'stock_quantity': cap[11],
                'is_featured': bool(cap[12]),
                'created_at': cap[13]
            })
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self._set_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(caps_list).encode())
    
    def handle_get_cap(self, cap_id):
        conn = sqlite3.connect('caps_store.db')
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM caps WHERE id = ?', (cap_id,))
        cap = cursor.fetchone()
        conn.close()
        
        if cap:
            cap_dict = {
                'id': cap[0],
                'name': cap[1],
                'name_ar': cap[2],
                'description': cap[3],
                'description_ar': cap[4],
                'price': cap[5],
                'image_url': cap[6],
                'category': cap[7],
                'brand': cap[8],
                'color': cap[9],
                'size': cap[10],
                'stock_quantity': cap[11],
                'is_featured': bool(cap[12]),
                'created_at': cap[13]
            }
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self._set_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps(cap_dict).encode())
        else:
            self.send_error(404, "Cap not found")
    
    def handle_register(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            email = data.get('email')
            password = data.get('password')
            full_name = data.get('full_name')
            phone = data.get('phone', '')
            address = data.get('address', '')
            
            if not email or not password or not full_name:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self._set_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({'detail': 'Missing required fields'}).encode())
                return
            
            # Simple password hashing (not secure for production)
            hashed_password = hashlib.sha256(password.encode()).hexdigest()
            
            conn = sqlite3.connect('caps_store.db')
            cursor = conn.cursor()
            
            # Check if user exists
            cursor.execute('SELECT id FROM users WHERE email = ?', (email,))
            if cursor.fetchone():
                conn.close()
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self._set_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({'detail': 'Email already registered'}).encode())
                return
            
            # Insert user
            cursor.execute('''
                INSERT INTO users (email, hashed_password, full_name, phone, address)
                VALUES (?, ?, ?, ?, ?)
            ''', (email, hashed_password, full_name, phone, address))
            
            user_id = cursor.lastrowid
            conn.commit()
            conn.close()
            
            # Return user data
            user_data = {
                'id': user_id,
                'email': email,
                'full_name': full_name,
                'phone': phone,
                'address': address,
                'created_at': datetime.datetime.now().isoformat()
            }
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self._set_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps(user_data).encode())
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self._set_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({'detail': 'Registration failed'}).encode())
    
    def handle_login(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            email = data.get('email')
            password = data.get('password')
            
            if not email or not password:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self._set_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({'detail': 'Missing email or password'}).encode())
                return
            
            # Simple password hashing (not secure for production)
            hashed_password = hashlib.sha256(password.encode()).hexdigest()
            
            conn = sqlite3.connect('caps_store.db')
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT id, email, full_name, phone, address, created_at 
                FROM users WHERE email = ? AND hashed_password = ?
            ''', (email, hashed_password))
            
            user = cursor.fetchone()
            conn.close()
            
            if not user:
                self.send_response(401)
                self.send_header('Content-Type', 'application/json')
                self._set_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({'detail': 'Invalid credentials'}).encode())
                return
            
            # Create simple token (not secure for production)
            token = hashlib.sha256(f"{user[0]}{user[1]}{secrets.token_hex(16)}".encode()).hexdigest()
            
            user_data = {
                'id': user[0],
                'email': user[1],
                'full_name': user[2],
                'phone': user[3],
                'address': user[4],
                'created_at': user[5]
            }
            
            response_data = {
                'access_token': token,
                'token_type': 'bearer',
                'user': user_data
            }
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self._set_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps(response_data).encode())
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self._set_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({'detail': 'Login failed'}).encode())
    
    def handle_create_order(self):
        # Simple mock response for orders
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self._set_cors_headers()
        self.end_headers()
        order_data = {
            'id': 1,
            'total_amount': 45.99,
            'status': 'pending',
            'shipping_address': 'Test Address',
            'phone': '123-456-7890',
            'created_at': datetime.datetime.now().isoformat(),
            'items': []
        }
        self.wfile.write(json.dumps(order_data).encode())

def run_server():
    setup_database()
    server_address = ('', 8000)
    httpd = HTTPServer(server_address, CORSHTTPRequestHandler)
    print(f"Server running on http://localhost:8000")
    print("Available endpoints:")
    print("  GET /api/caps - All caps")
    print("  GET /api/caps/featured - Featured caps")
    print("  GET /api/caps/{id} - Specific cap")
    print("\nPress Ctrl+C to stop the server")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped")
        httpd.shutdown()

if __name__ == '__main__':
    run_server()