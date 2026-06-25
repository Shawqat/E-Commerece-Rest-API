const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authController = require('../controllers/authController');

// router.post('/', productController.createProduct);

// router.get("/all", productController.getAllProducts);
// router.get('/:slug', productController.getProductBySlug);

// router.put('/:slug', productController.updateProduct);
// router.delete('/:slug', productController.deleteProduct);

router.route('/')
        .post(authController.protect, authController.restrictTo('admin'), productController.createProduct)
        .get(productController.getAllProducts);

router.route('/:slug')
        .get(productController.getProductBySlug)
        .patch(authController.protect, authController.restrictTo('admin'), productController.updateProduct)
        .delete(authController.protect, authController.restrictTo('admin'), productController.deleteProduct);

module.exports = router;