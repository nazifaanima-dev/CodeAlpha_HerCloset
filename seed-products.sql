USE hercloset;

-- Safe to run more than once: products are inserted only when the table is empty.
INSERT INTO products (name, category, description, price, image, stock)
SELECT * FROM (
  SELECT 'Floral Summer Dress' AS name, 'Clothing' AS category, 'Beautiful floral dress for everyday style.' AS description, 1490.00 AS price, 'images/floral-dress.jpg' AS image, 15 AS stock UNION ALL
  SELECT 'Elegant Black Kurti', 'Clothing', 'Elegant black kurti for casual and festive wear.', 1290.00, 'images/black-kurti.jpg', 12 UNION ALL
  SELECT 'Pink Co-ord Set', 'Clothing', 'Trendy matching outfit for a modern look.', 1890.00, 'images/pink-coord.jpg', 10 UNION ALL
  SELECT 'Teal Classic Bag', 'Bags', 'A polished everyday shoulder bag.', 1690.00, 'images/teal-classic-bag.jpg', 8 UNION ALL
  SELECT 'Burgundy Mini Bag', 'Bags', 'A compact mini bag for day-to-night styling.', 1190.00, 'images/burgundy-mini-bag.jpg', 10 UNION ALL
  SELECT 'Matte Lipstick', 'Makeup', 'Smooth matte lipstick for a bold look.', 450.00, 'images/lipstick.jpg', 20 UNION ALL
  SELECT 'Blush Palette', 'Makeup', 'Soft blush shades for everyday makeup.', 690.00, 'images/blush-palette.jpg', 12 UNION ALL
  SELECT 'Comfort Flat Sandals', 'Footwear', 'Comfortable flat sandals for daily wear.', 990.00, 'images/flat-sandals.jpg', 14 UNION ALL
  SELECT 'Elegant Block Heels', 'Footwear', 'Stylish block heels for special occasions.', 1590.00, 'images/block-heels.jpg', 8 UNION ALL
  SELECT 'Pearl Drop Earrings', 'Accessories', 'Elegant pearl-style earrings.', 390.00, 'images/pearl-earrings.jpg', 25 UNION ALL
  SELECT 'Colorful Bracelet', 'Accessories', 'A bright finishing touch for your outfit.', 350.00, 'images/colorful-bracelet.jpg', 18 UNION ALL
  SELECT 'Layered Necklace', 'Accessories', 'A delicate layered necklace.', 590.00, 'images/layered-necklace.jpg', 15 UNION ALL
  SELECT 'Gold Hoop Earrings', 'Accessories', 'Classic gold-tone hoop earrings.', 420.00, 'images/gold-hoops.jpg', 20 UNION ALL
  SELECT 'Strappy Sandals', 'Footwear', 'Minimal strappy sandals for everyday wear.', 1090.00, 'images/strappy-sandals.jpg', 12 UNION ALL
  SELECT 'Tropical Maxi Dress', 'Clothing', 'A breezy maxi dress for sunny days.', 2190.00, 'images/tropical-maxi.jpg', 7
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM products LIMIT 1);
