const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'عفواً، يجب إدخال اسم المنتج'],
        trim: true
    },
    slug: {
        type: String,
        unique: true 
    },
    price: {
        type: Number,
        required: [true, 'عفواً، يجب إدخال سعر المنتج'],
        min: [0, 'السعر لا يمكن أن يكون أقل من صفر']
    },
    description: {
        type: String,
        required: [true, 'عفواً، يجب إدخال وصف للمنتج']
    },
    category: {
        type: String,
        required: [true, 'عفواً، يجب تحديد قسم المنتج']
    },
    stock: {
        type: Number,
        default: 0
    }
}, { 
    timestamps: true 
});

productSchema.pre('save', function() {
   if (this.name) {
        this.slug = this.name
            .trim()
            .toLowerCase()
            .replace(/[^a-zA-Z0-9آ-ي0-9\s]/g, '') 
            .replace(/\s+/g, '-'); 
    }
});

const Product = mongoose.model('Product', productSchema);
module.exports = Product;