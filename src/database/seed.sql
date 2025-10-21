-- Clear existing caps data and insert only your 4 caps
DELETE FROM caps;

-- Insert only your 4 caps with correct names and prices
INSERT INTO caps (name, name_ar, description, description_ar, price, image_url, category, brand, color, size, stock_quantity, is_featured) VALUES
('Blanc', 'قبعة بيضاء', 'Classic white cap with premium quality', 'قبعة بيضاء كلاسيكية بجودة عالية', 150.00, '/products/blanc-front.svg', 'Classic', 'Sleven', 'white', 'One Size', 100, false),
('Noir', 'قبعة سوداء', 'Elegant black cap for any occasion', 'قبعة سوداء أنيقة لأي مناسبة', 150.00, '/products/noir-front.svg', 'Classic', 'Sleven', 'Black', 'One Size', 100, false),
('Marron', 'قبعة بنية', 'Warm brown cap with modern design', 'قبعة بنية دافئة بتصميم عصري', 150.00, '/products/marron-front.svg', 'Classic', 'Sleven', 'Brown', 'One Size', 100, false),
('Campeone', 'قبعة كامبيون', 'Champion cap with sporty look', 'قبعة بطل بمظهر رياضي', 200.00, '/products/champ-front.svg', 'Sports', 'Sleven', 'Multi', 'One Size', 100, true);
