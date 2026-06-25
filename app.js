const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

const express = require('express');
const mongoose = require('mongoose');
const productRoutes = require('./routes/productRoutes');
const userRouter = require('./routes/userRoutes');


const app = express();
const port = process.env.PORT || 3000; 

app.use(express.json());
app.use(express.static('front end')); 

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('Server connected to MongoDB successfully!');
    })
    .catch((error) => {
        console.error('Error connecting to MongoDB:', error.message);
    });

app.use('/api/products', productRoutes);
app.use('/api/users', userRouter);

app.get('/', (req, res) => {
    res.sendFile('index.html', { root: __dirname + '/public' });
});


app.listen(port, () => {
    console.log(`server running on http://localhost:${port}`);
});