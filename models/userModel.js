const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'برجاء إدخال اسم المستخدم']
    },
    email: {
        type: String,
        required: [true, 'برجاء إدخال البريد الإلكتروني'],
        unique: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'برجاء إدخال بريد إلكتروني صحيح']
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    password: {
        type: String,
        required: [true, 'برجاء إدخال كلمة المرور'],
        minlength: [8, 'كلمة المرور يجب أن لا تقل عن 8 أحرف'],
        select: false 
    },
    passwordConfirm: {
        type: String,
        required: [true, 'برجاء تأكيد كلمة المرور'],
        validator: function(el) {
            return el === this.password; 
        },
        message: 'كلمات المرور غير متطابقة!'
}
});


userSchema.pre('save', async function() {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 12);
    this.passwordConfirm = undefined;
});

userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

const User = mongoose.model('User', userSchema);
module.exports = User;