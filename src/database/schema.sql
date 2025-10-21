-- Create database schema for Sleven Caps Store

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Caps table
CREATE TABLE IF NOT EXISTS caps (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description TEXT NOT NULL,
  description_ar TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT NOT NULL,
  category TEXT NOT NULL,
  brand TEXT NOT NULL,
  color TEXT NOT NULL,
  size TEXT NOT NULL,
  stock_quantity INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments table (created first to avoid circular reference)
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID, -- Will add foreign key constraint later
  moyasar_payment_id TEXT UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'SAR' NOT NULL,
  status TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  total_amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'SAR' NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'processing', 'failed', 'cancelled', 'completed')),
  payment_id UUID REFERENCES payments(id),
  payment_type TEXT DEFAULT 'online',
  shipping_address JSONB,
  items JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint for payments.order_id (if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_payments_order_id'
  ) THEN
    ALTER TABLE payments ADD CONSTRAINT fk_payments_order_id 
      FOREIGN KEY (order_id) REFERENCES orders(id);
  END IF;
END $$;

-- Omniful queue table
CREATE TABLE IF NOT EXISTS omniful_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  payload JSONB NOT NULL,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_type ON orders(payment_type);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_moyasar_id ON payments(moyasar_payment_id);
CREATE INDEX IF NOT EXISTS idx_caps_stock_quantity ON caps(stock_quantity);
CREATE INDEX IF NOT EXISTS idx_caps_is_featured ON caps(is_featured);
CREATE INDEX IF NOT EXISTS idx_omniful_queue_status ON omniful_queue(status);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at 
  BEFORE UPDATE ON orders 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at 
  BEFORE UPDATE ON payments 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_omniful_queue_updated_at 
  BEFORE UPDATE ON omniful_queue 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to handle inventory deduction
CREATE OR REPLACE FUNCTION handle_inventory_deduction()
RETURNS TRIGGER AS $$
DECLARE
  order_items JSONB;
  item JSONB;
  cap_id INTEGER;
  quantity INTEGER;
  current_stock INTEGER;
  is_pay_on_arrival BOOLEAN := FALSE;
BEGIN
  -- Check if this is a Pay on Arrival order
  IF NEW.items IS NOT NULL THEN
    FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
    LOOP
      IF (item->>'payment_type') = 'Pay on Arrival' THEN
        is_pay_on_arrival := TRUE;
        EXIT;
      END IF;
    END LOOP;
  END IF;
  
  -- Process when:
  -- 1. Status changes to 'paid' (for regular payments)
  -- 2. Pay on Arrival order is created (INSERT with payment_type: 'Pay on Arrival')
  IF (NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid')) 
     OR (is_pay_on_arrival AND (OLD IS NULL OR OLD.status != 'paid')) THEN
    -- Get the order items
    order_items := NEW.items;
    
    -- Process each item in the order
    FOR item IN SELECT * FROM jsonb_array_elements(order_items)
    LOOP
      -- Extract cap_id and quantity from the item
      cap_id := (item->>'cap_id')::INTEGER;
      quantity := (item->>'quantity')::INTEGER;
      
      -- Get current stock for the cap
      SELECT stock_quantity INTO current_stock
      FROM caps
      WHERE id = cap_id;
      
      -- Check if cap exists
      IF current_stock IS NULL THEN
        RAISE EXCEPTION 'Cap with ID % not found', cap_id;
      END IF;
      
      -- Check if sufficient stock is available
      IF current_stock < quantity THEN
        RAISE EXCEPTION 'Insufficient stock for cap ID %. Available: %, Required: %', 
          cap_id, current_stock, quantity;
      END IF;
      
      -- Update the cap's stock quantity
      UPDATE caps
      SET 
        stock_quantity = stock_quantity - quantity
      WHERE id = cap_id;
      
      -- Log the deduction
      RAISE NOTICE 'Deducted % units from cap ID %. New stock: %', 
        quantity, cap_id, (current_stock - quantity);
    END LOOP;
    
    -- Update order status to 'processing' after inventory deduction
    NEW.status := 'processing';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically deduct inventory
CREATE TRIGGER trigger_inventory_deduction
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_inventory_deduction();

-- Create function to queue Omniful integration
CREATE OR REPLACE FUNCTION queue_omniful_integration()
RETURNS TRIGGER AS $$
DECLARE
  is_pay_on_arrival BOOLEAN := FALSE;
  item JSONB;
BEGIN
  -- Check if this is a Pay on Arrival order
  IF NEW.items IS NOT NULL THEN
    FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
    LOOP
      IF (item->>'payment_type') = 'Pay on Arrival' THEN
        is_pay_on_arrival := TRUE;
        EXIT;
      END IF;
    END LOOP;
  END IF;
  
  -- Process when:
  -- 1. Status changes to 'processing' (after inventory deduction from 'paid')
  -- 2. Pay on Arrival order is created (INSERT with payment_type: 'Pay on Arrival')
  IF (NEW.status = 'processing' AND OLD.status = 'paid') 
     OR (is_pay_on_arrival AND (OLD IS NULL OR OLD.status != 'paid')) THEN
    -- Insert into queue for processing
    INSERT INTO omniful_queue (order_id, payload)
    VALUES (
      NEW.id,
      jsonb_build_object(
        'order_id', NEW.id,
        'items', NEW.items,
        'user_id', NEW.user_id,
        'payment_id', NEW.payment_id,
        'total_amount', NEW.total_amount,
        'currency', NEW.currency
      )
    );
    
    RAISE NOTICE 'Queued Omniful integration for order %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to queue Omniful integration
CREATE TRIGGER trigger_queue_omniful_integration
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION queue_omniful_integration();
