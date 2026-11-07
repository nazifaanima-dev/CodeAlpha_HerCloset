USE hercloset;

-- Run this file ONCE against your existing HerCloset database.
-- If a column already exists, remove its ALTER TABLE statement before running.
ALTER TABLE orders ADD COLUMN phone VARCHAR(30) NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN payment_method VARCHAR(50) NOT NULL DEFAULT 'Cash on Delivery';
ALTER TABLE order_items ADD COLUMN size VARCHAR(20) NULL;
ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'customer';

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(150) NOT NULL UNIQUE,
  subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE INDEX idx_orders_status ON orders(status);

-- Repair legacy sample image paths that did not match the actual image filenames.
UPDATE products SET image = 'images/teal-classic-bag.jpg' WHERE image = 'images/shoulder-bag.jpg';
UPDATE products SET image = 'images/burgundy-mini-bag.jpg' WHERE image = 'images/crossbody-bag.jpg';

-- After creating/logging in with your account, promote it using your own email:
-- UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
