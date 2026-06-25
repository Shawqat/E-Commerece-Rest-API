const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');

const signToken = (user) => {
    return jwt.sign({ id: user._id, role: user.role, name: user.name }, 'my-ultra-secret-key-that-is-very-long', {
        expiresIn: '90d' 
    });
};

exports.protect = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ status: 'error', message: 'أنت غير مسجل دخول، برجاء تسجيل الدخول أولاً' });
        }

        const decoded = await promisify(jwt.verify)(token, 'my-ultra-secret-key-that-is-very-long');

        const currentUser = await User.findById(decoded.id);
        if (!currentUser) {
            return res.status(401).json({ status: 'error', message: 'المستخدم صاحب هذا التوكن لم يعد موجوداً' });
        }

        req.user = currentUser;

        next();
        
    } catch (error) {
        res.status(401).json({ status: 'error', message: 'توكن غير صحيح أو انتهت صلاحيته' });
    }
};



exports.signup = async (req, res) => {
    try {
        const newUser = await User.create({
            name: req.body.name,
            email: req.body.email,
            password: req.body.password,
            passwordConfirm: req.body.passwordConfirm
        });

        const token = signToken(newUser);
            
        res.status(201).json({
            status: 'success',
            token,
            data: {
                user: newUser
            }
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
};


exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ status: 'error', message: 'برجاء إدخال الإيميل والباسورد' });
        }

        const user = await User.findOne({ email }).select('+password');

        if (!user || !(await user.correctPassword(password, user.password))) {
            return res.status(401).json({ status: 'error', message: 'الإيميل أو الباسورد غير صحيح' });
        }

        const token = signToken(user);

        res.status(200).json({
            status: 'success',
            token
        });

    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};


exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                status: 'error',
                message: 'عذراً، ليس لديك الصلاحية للقيام بهذا الإجراء!'
            });
        }

        next(); 
    };
};