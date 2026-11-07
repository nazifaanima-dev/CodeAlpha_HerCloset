HERCLOSET - CODEALPHA TASK 1 FULL-STACK E-COMMERCE

STACK
- Frontend: HTML5, CSS3, vanilla JavaScript
- Backend: Node.js + Express
- Database: MySQL 8 / MariaDB
- Authentication: bcrypt password hashing + session cookie
- Currency: Bangladeshi Taka (BDT)

FEATURES IMPLEMENTED
CUSTOMER STOREFRONT
- Responsive HerCloset storefront and product catalogue
- Category filtering, search, sorting and product detail view
- Product images, stock availability and clothing/footwear size selection
- Shopping cart, quantity controls, remove item and browser cart persistence
- Wishlist saved in the browser
- Customer registration, login and logout
- Customer order history
- Checkout with delivery phone/address and Cash on Delivery
- Server-side price/stock validation and transactional order creation
- Stock decrement after successful order
- Newsletter subscriptions stored in MySQL

ADMIN STUDIO
- Protected admin dashboard at /admin.html
- Store summary: products, stock, orders, customers and order value
- Create, edit and delete products
- Product category, price, image path, description and stock management
- View customer orders and delivery information
- Update order status: pending, processing, shipped, delivered, cancelled
- Cancelling an order restores its reserved stock; reactivating checks stock first
- Products linked to historical orders cannot be deleted; set stock to 0 instead

SETUP (WINDOWS + XAMPP)
1. Install Node.js 18+ and XAMPP.
2. Start MySQL in XAMPP.
3. Open http://localhost/phpmyadmin
4. For a NEW database, import create-tables.sql, then import seed-products.sql.
5. For an EXISTING HerCloset database, BACK UP first. If it already has phone, payment_method and size columns, run admin-setup.sql to add role. If it is an older schema missing those columns, run migrate-existing.sql ONCE; remove any ALTER line for a column that already exists. Never import create-tables.sql over an existing live database.
6. Open the project root .env file and set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME. Add ADMIN_EMAIL=your-login-email@example.com.
7. In CMD, from the HerCloset project root run:
   npm install
   node server.js
8. Open http://localhost:3000
9. Test database health at http://localhost:3000/api/health
10. Register using the exact ADMIN_EMAIL address (or log in if that account already exists). The configured account is promoted to admin at login.
11. Open http://localhost:3000/admin.html to manage the store.

IMPORTANT DATABASE NOTES
- Existing product records are preserved by migrate-existing.sql.
- Only import seed-products.sql if the products table is empty. The seed script inserts sample products only when the table is empty.
- The migration is a one-time operation. Back up your database before applying it.
- Admin privileges are controlled by ADMIN_EMAIL in .env. Never expose the .env file or commit it to GitHub.

RUN COMMANDS
cd /d "C:\Users\YourName\Desktop\HerCloset"
npm install
node server.js

Open: http://localhost:3000
Admin: http://localhost:3000/admin.html

SECURITY / PRODUCTION NOTES
This is a local internship/demo implementation. Before public deployment, use HTTPS, a long random SESSION_SECRET, a persistent production session store (not Express MemoryStore), rate limiting, CSRF protection, secure production cookies, environment-specific secrets, database backups and a restricted database user. Online card/bKash/Nagad payments are not connected; checkout is Cash on Delivery only.
