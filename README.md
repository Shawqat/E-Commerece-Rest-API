# E-Commerce REST API

A Node.js + Express backend with a static frontend for managing products in MongoDB.

## Project structure

- `app.js` - main Express server
- `routes/productRoutes.js` - product API routes
- `routes/userRoutes.js` - authentication routes
- `controllers/productController.js` - product CRUD logic
- `controllers/authController.js` - authentication logic
- `models/productModel.js` - Mongoose product schema
- `models/userModel.js` - Mongoose user schema
- `front end/` - frontend UI files served by Express

## Features

- Product listing, filtering, and sorting
- Admin-only product creation, update, and deletion
- JWT-based authentication with login and signup
- MongoDB persistence via Mongoose

## Requirements

- Node.js
- npm
- MongoDB connection string

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file in the project root with:
   ```env
   MONGO_URI=<your-mongodb-connection-string>
   PORT=3000
   ```
3. Start the server:
   ```bash
   npm start
   ```

## Running the app

- Backend API: `http://localhost:3000/api/products`
- Auth API: `http://localhost:3000/api/users`
- Frontend: `http://localhost:3000/`

## API endpoints

- `POST /api/users/signup` - register a new user
- `POST /api/users/login` - login and receive a JWT token
- `GET /api/products` - list products
- `GET /api/products/:slug` - get product by slug
- `POST /api/products` - create a new product (admin only)
- `PATCH /api/products/:slug` - update a product (admin only)
- `DELETE /api/products/:slug` - delete a product (admin only)

## Frontend

The frontend in `front end/` includes:

- `index.html` - dashboard layout with auth and product manager
- `style.css` - page styles
- `script.js` - frontend logic for auth and product management

## Notes

- Product listing is publicly available.
- Creating, updating, and deleting products requires an admin JWT token.
- Authentication is handled by `/api/users/login` and `/api/users/signup`.
- Tokens are stored in `localStorage` and sent as `Authorization: Bearer <token>` for protected routes.
- Product slugs are generated automatically from the product name.
- Query parameters support filtering and sorting on the product API.
