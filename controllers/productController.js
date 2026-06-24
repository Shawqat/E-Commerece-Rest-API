const Product = require('../models/productModel');

exports.createProduct = async (req, res) => {
    try {
        const newProduct = await Product.create(req.body);

        res.status(201).json({
            status: 'success',
            message: 'تم إضافة المنتج بنجاح في MongoDB!',
            data: newProduct
        });
    } catch (error) {
        res.status(400).json({
            status: 'fail',
            message: error.message
        });
    }
};


exports.getAllProducts = async (req, res) => {
    try {
        const queryObj = { ...req.query };
        const excludedFields = ['page', 'sort', 'limit', 'fields'];
        excludedFields.forEach(el => delete queryObj[el]);

        const finalQuery = {};
        Object.keys(queryObj).forEach(key => {
            const match = key.match(/^(\w+)\[(gte|gt|lte|lt)\]$/i);
            if (match) {
                const [_, field, op] = match;
                const value = queryObj[key];
                finalQuery[field] = finalQuery[field] || {};
                finalQuery[field][`$${op.toLowerCase()}`] = isNaN(value) ? value : Number(value);
            } else {
                finalQuery[key] = queryObj[key];
            }
        });

        let query = Product.find(finalQuery);

        if (req.query.sort) {
            const sortBy = req.query.sort.split(',').join(' ');
            query = query.sort(sortBy);
        } else {
            query = query.sort('-createdAt');
        }

        if (req.query.fields) {
            const fields = req.query.fields.split(',').join(' ');
            query = query.select(fields);
        } else {
            query = query.select('-__v');
        }

        const page = req.query.page * 1 || 1;
        const limit = req.query.limit * 1 || 10;
        const skip = (page - 1) * limit;

        query = query.skip(skip).limit(limit);

        const products = await query;

        res.status(200).json({
            status: 'success',
            results: products.length,
            data: products
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};


exports.getProductBySlug = async (req, res) => {
    try {
        const product = await Product.findOne({ slug: req.params.slug });

        if (!product) {
            return res.status(404).json({
                status: 'fail',
                message: 'عذراً، هذا المنتج غير موجود في المتجر!'
            });
        }

        res.status(200).json({
            status: 'success',
            data: product
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};


exports.updateProduct = async (req, res) => {
   try {
        if (req.body.name) {
            req.body.slug = req.body.name
                .trim()
                .toLowerCase()
                .replace(/[^a-zA-Z0-9آ-ي0-9\s]/g, '')
                .replace(/\s+/g, '-');
        }

        const product = await Product.findOneAndUpdate(
            { slug: req.params.slug }, 
            req.body, 
            { returnDocument: true, runValidators: true }
        );

        if (!product) {
            return res.status(404).json({ status: 'fail', message: 'المنتج غير موجود!' });
        }

        res.status(200).json({ status: 'success', data: product });
    } catch (error) {
        res.status(400).json({ status: 'fail', message: error.message });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findOneAndDelete({ slug: req.params.slug });

        if (!product) {
            return res.status(404).json({
                status: 'fail',
                message: 'عذراً، هذا المنتج غير موجود لحذفه!'
            });
        }

        res.status(200).json({
            status: 'success',
            message: 'تم حذف المنتج بنجاح من قاعدة البيانات'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};