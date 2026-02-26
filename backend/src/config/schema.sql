CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  stock INTEGER DEFAULT 0,
  image_url VARCHAR(500),
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cart_items (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Seed categories
INSERT INTO categories (name, slug) VALUES
  ('Electronics', 'electronics'),
  ('Clothing', 'clothing'),
  ('Books', 'books'),
  ('Home & Kitchen', 'home-kitchen'),
  ('Sports', 'sports')
ON CONFLICT (slug) DO NOTHING;

-- Seed products
INSERT INTO products (name, description, price, stock, image_url, category_id) VALUES
  ('iPhone 15 Pro', 'Latest Apple flagship with titanium design', 999.99, 50, 'https://placehold.co/400x400?text=iPhone+15', 1),
  ('Samsung 4K TV 55"', 'Crystal clear 4K display with smart features', 649.99, 20, 'https://placehold.co/400x400?text=Samsung+TV', 1),
  ('Sony WH-1000XM5', 'Industry-leading noise cancelling headphones', 349.99, 75, 'https://placehold.co/400x400?text=Sony+Headphones', 1),
  ('Nike Air Max 270', 'Lightweight running shoes with Air cushioning', 129.99, 100, 'https://placehold.co/400x400?text=Nike+Air+Max', 2),
  ('Levi 501 Jeans', 'Classic straight fit denim jeans', 69.99, 200, 'https://placehold.co/400x400?text=Levis+501', 2),
  ('Clean Code Book', 'A handbook of agile software craftsmanship by Robert Martin', 39.99, 150, 'https://placehold.co/400x400?text=Clean+Code', 3),
  ('The Pragmatic Programmer', 'Your journey to mastery — classic dev book', 44.99, 120, 'https://placehold.co/400x400?text=Pragmatic+Prog', 3),
  ('Instant Pot Duo 7-in-1', 'Multi-use pressure cooker, slow cooker, rice cooker', 89.99, 60, 'https://placehold.co/400x400?text=Instant+Pot', 4),
  ('Yoga Mat Premium', 'Non-slip 6mm thick exercise mat', 29.99, 300, 'https://placehold.co/400x400?text=Yoga+Mat', 5),
  ('Dumbbell Set 20kg', 'Adjustable dumbbell set for home gym', 119.99, 40, 'https://placehold.co/400x400?text=Dumbbells', 5)
ON CONFLICT DO NOTHING;
