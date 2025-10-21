-- Allow NULL user_id for guest orders
ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;
