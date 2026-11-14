require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const interviewRoutes = require('./routes/interviewRoutes');
// Connect to MongoDB
connectDB();

// Initialize Express app
const app = express();

// Middleware
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      process.env.CLIENT_URL, // You will add your Vercel URL here after deploying the frontend
    ].filter(Boolean),
    credentials: true,
  })
);
app.use(express.json());


// A simple test route to check if our server is alive
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'PrepPilot server is running happily!' });
});

// Use the authentication routes
app.use('/api/auth', authRoutes);
app.use('/api/interview', interviewRoutes);

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running live at http://localhost:${PORT}`);
});
