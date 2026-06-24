const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// router.post('/', productController.createProduct);

// router.get("/all", productController.getAllProducts);
// router.get('/:slug', productController.getProductBySlug);

// router.put('/:slug', productController.updateProduct);
// router.delete('/:slug', productController.deleteProduct);

router.route('/')
        .post(productController.createProduct)
        .get(productController.getAllProducts);

router.route('/:slug')
        .get(productController.getProductBySlug)
        .patch(productController.updateProduct)
        .delete(productController.deleteProduct);

module.exports = router;