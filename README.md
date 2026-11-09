
# HerCloset - E-commerce Store

A modern fashion and lifestyle e-commerce website built with Node.js, Express.js, MySQL, HTML, CSS and JavaScript.

## Features

- User Registration and Login
- Product Browsing
- Product Categories
- Shopping Cart
- Wishlist
- Secure Checkout
- Order Management
- User Profile
- Admin Dashboard
- Product Management
- Newsletter Subscription
- Responsive Design

## Technologies Used

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js and Express.js
- Database: MySQL
- Database Driver: mysql2
- Environment Variables: dotenv

## Project Structure

```text
HerCloset/
ÃÄÄ config/
³   ÀÄÄ db.js
ÃÄÄ public/
³   ÃÄÄ images/
³   ÃÄÄ admin.html
³   ÃÄÄ admin.css
³   ÃÄÄ admin.js
³   ÃÄÄ index.html
³   ÃÄÄ products.html
³   ÃÄÄ app.js
³   ÀÄÄ style.css
ÃÄÄ admin-setup.sql
ÃÄÄ create-tables.sql
ÃÄÄ migrate-existing.sql
ÃÄÄ seed-products.sql
ÃÄÄ server.js
ÃÄÄ package.json
ÀÄÄ README.md
```

## Installation

1. Clone the repository.

```bash
git clone https://github.com/nazifaanima-dev/CodeAlpha_HerCloset.git
```

2. Open the project folder.

```bash
cd CodeAlpha_HerCloset
```

3. Install dependencies.

```bash
npm install
```

4. Create a `.env` file and configure your local MySQL database credentials.

5. Create the database named `hercloset`.

6. Import the SQL files in the appropriate order:

- create-tables.sql
- migrate-existing.sql
- seed-products.sql
- admin-setup.sql

Run only the migrations needed for your database state.

7. Start the application.

```bash
npm start
```

8. Open:

```text
http://localhost:3000
```

## Database

Database: MySQL

Database name: `hercloset`

SQL scripts are included in this repository.

## Security

- Environment variables are used for database configuration.
- Passwords are hashed.
- Sensitive credentials should never be committed to GitHub.

## Developer

Nazifa Tabassum

## Project

CodeAlpha Internship Project
