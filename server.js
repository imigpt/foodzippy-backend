import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import vendorRoutes from './routes/vendor.routes.js';
import adminRoutes from './routes/admin.routes.js';
import agentRoutes from './routes/agent.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import userRoutes from './routes/user.routes.js';
import userAttendanceRoutes from './routes/userAttendance.routes.js';
import formConfigRoutes from './routes/formConfig.routes.js';
import vendorTypeRoutes from './routes/vendorType.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import franchiseInquiryRoutes from './routes/franchiseInquiry.routes.js';
import investorInquiryRoutes from './routes/investorInquiry.routes.js';
import careerRoutes from './routes/career.routes.js';
import subscriberRoutes from './routes/subscriber.routes.js';
import emailDraftRoutes from './routes/emailDraft.routes.js';
import deliveryPartnerRoutes from './routes/deliveryPartner.routes.js';
import emailTemplateRoutes from './routes/emailTemplate.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
await connectDB();

// CORS — reflect any requesting origin (works with credentials + all Vercel URLs)
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/vendors', vendorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/agents', agentRoutes); // Keep for backward compatibility
app.use('/api/agent/attendance', attendanceRoutes); // Keep for backward compatibility

// New unified routes for agents and employees
app.use('/api/users', userRoutes);
app.use('/api/attendance', userAttendanceRoutes);

// Form configuration routes
app.use('/api/form', formConfigRoutes);

// Vendor type routes
app.use('/api/vendor-types', vendorTypeRoutes);

// Payment routes
app.use('/api/payments', paymentRoutes);

// Notification routes
app.use('/api/notifications', notificationRoutes);

// Franchise inquiry routes
app.use('/api/franchise-inquiry', franchiseInquiryRoutes);

// Investor inquiry routes
app.use('/api/investor-inquiry', investorInquiryRoutes);

// Career application routes
app.use('/api/careers', careerRoutes);

// Subscriber routes
app.use('/api/subscribers', subscriberRoutes);

// Email draft routes
app.use('/api/email-drafts', emailDraftRoutes);

// Delivery partner routes
app.use('/api/delivery-partners', deliveryPartnerRoutes);

// Email template routes
app.use('/api/email-templates', emailTemplateRoutes);

// Health check
app.get('/health', (req, res) => {
  const dbState = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const mongoStatus = dbState[mongoose.connection.readyState] || 'unknown';
  const isHealthy = mongoose.connection.readyState === 1;

  res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    message: isHealthy ? 'Server is running' : 'Server is degraded',
    database: mongoStatus,
    timestamp: new Date().toISOString(),
  });
});

// Root handler (useful for platform health checks)
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'FoodZippy backend is up',
    routes: ['/health', '/api/*'],
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
