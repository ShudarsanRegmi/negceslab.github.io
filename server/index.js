require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const admin = require("firebase-admin");
const path = require("path");

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin
try {
  const serviceAccount = require("./config/serviceAccountKey.json");
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} catch (error) {
  console.error("Error initializing Firebase Admin:", error.message);
  console.log("Please ensure serviceAccountKey.json is properly configured");
}

// MongoDB Connection
if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is not defined in .env file");
  process.exit(1);
}
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB");

    // Initialize booking expiration service
    const BookingExpirationService = require("./services/bookingExpirationService");
    const bookingExpirationService = new BookingExpirationService();

    // Store service instance for potential cleanup
    app.locals.bookingExpirationService = bookingExpirationService;
  })
  .catch((err) => console.error("MongoDB connection error:", err));

// Import routes
const authRoutes = require("./routes/auth");
const computerRoutes = require("./routes/computers");
const bookingRoutes = require("./routes/bookings");
const notificationRoutes = require("./routes/notifications");
const feedbackRoutes = require("./routes/feedback");

// Use routes
app.use("/api/auth", authRoutes);
app.use("/api/computers", computerRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/feedback", feedbackRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!" });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
