# E-Commerce REST API

A simple Node.js + Express backend with a small frontend for managing products in MongoDB.

## Project structure

- `app.js` - main Express server
- `routes/productRoutes.js` - API route definitions
- `controllers/productController.js` - product CRUD logic
- `models/productModel.js` - Mongoose product schema
- `front end/` - simple frontend UI files

## Features

- Create, read, update, and delete products
- Filter and sort products using query parameters
- Frontend dashboard for product management
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
- Frontend: served from the `front end` folder by the Express server

## API endpoints

- `POST /api/products` - add a new product
- `GET /api/products` - list products
- `GET /api/products/:slug` - get product by slug
- `PATCH /api/products/:slug` - update product by slug
- `DELETE /api/products/:slug` - delete product by slug

## Frontend

The frontend in `front end/` includes:

- `index.html` - dashboard layout
- `styles.css` - page styles
- `app.js` - frontend logic for product CRUD operations

## Notes

- The backend uses `express.json()` to parse JSON request bodies.
- Product slugs are generated automatically from the product name.
- Query parameters support sorting and field selection.
