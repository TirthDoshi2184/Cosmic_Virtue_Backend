const dotenv = require('dotenv');
// Import required modules
const express = require('express');
const mongoose = require('mongoose');
const { swaggerUi, swaggerSpec } = require('./swagger');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

const cors = require('cors');
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://cosmic-virtue-frontend.vercel.app',
    'https://www.cosmicvirtues.com',
    'https://cosmicvirtues.com',
  ],
  credentials: true
}));

// Middleware
app.use(express.json());

// Database connection
mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => console.log('Database connected successfully'))
.catch((err) => console.error('Database connection error:', err));

// Add this to auto-reconnect
mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected! Reconnecting...');
  mongoose.connect(process.env.MONGO_URI);
});

const userRoutes = require('./src/routes/UserRoutes');
const productRoutes = require('./src/routes/ProductRoutes');
const categoryRoutes = require('./src/routes/CategoryRoutes');  
const reviewRoutes = require('./src/routes/ReviewRoutes');
const checkoutRoutes = require('./src/routes/CheckoutRoutes');
const cartRoutes = require('./src/routes/CartRoutes');
const wishlistRoutes = require('./src/routes/WishlistRoutes');
const adminRoutes = require('./src/routes/AdminRoutes');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/users', userRoutes);
app.use('/products', productRoutes);
app.use('/categories', categoryRoutes);
app.use('/checkout', checkoutRoutes);
app.use('/reviews', reviewRoutes);
app.use('/cart', cartRoutes);
app.use('/wishlist', wishlistRoutes);
app.use('/admin', adminRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:3000`);
  console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
});

module.exports = app;