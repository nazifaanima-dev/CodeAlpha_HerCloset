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
|
|-- config/
|   |-- db.js
|
|-- public/
|   |-- images/
|   |-- admin.html
|   |-- admin.css
|   |-- admin.js
|   |-- index.html
|   |-- products.html
|   |-- app.js
|   |-- style.css
|
|-- admin-setup.sql
|-- create-tables.sql
|-- migrate-existing.sql
|-- seed-products.sql
|-- server.js
|-- package.json
|-- package-lock.json
|-- README.md
```

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/nazifaanima-dev/CodeAlpha_HerCloset.git
```

### 2. Open the Project Folder

```bash
cd CodeAlpha_HerCloset
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create a `.env` file and configure your local MySQL database credentials.

### 5. Create the Database

Create a MySQL database named:

```sql
hercloset
```

### 6. Import SQL Files

The repository includes the following SQL files:

- `create-tables.sql`
- `migrate-existing.sql`
- `seed-products.sql`
- `admin-setup.sql`

Run the appropriate scripts according to your database setup. Avoid rerunning migrations that have already been applied.

### 7. Start the Application

```bash
npm start
```

### 8. Open in Browser

```text
http://localhost:3000
```

## Database

- Database: MySQL
- Database Name: hercloset

SQL scripts are included in the repository for database setup and migration.

## Security

- Environment variables are used for database configuration.
- Passwords are securely hashed.
- Sensitive credentials should never be committed to GitHub.

## Developer

Nazifa Tabassum

## Project

CodeAlpha Internship Project