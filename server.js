require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken"); // Added this import
const Stripe = require("stripe");

const bodyParser = require("body-parser");
const moment = require('moment-timezone');
const cron = require("node-cron");
const Payment = require("./models/Payment");
const bookingRoutes = require("./routes/bookingRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const nodemailer = require("nodemailer");
const { Expo } = require('expo-server-sdk');
const stationRoutes = require("./routes/stationRoutes");
const userRoutes = require("./routes/userRoutes");
const User = require("./models/User"); // Added import for User model
const Station = require("./models/Station");
const Booking = require("./models/Booking"); // Ensure
const app = express();
const bcrypt = require('bcryptjs');
const { authenticateToken } = require("./middleware/auth");
const axios = require('axios'); // Ensure this line is present
const crypto = require('crypto'); // Add this import at the top
// Middleware
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

// MongoDB connection
mongoose
  .connect(process.env.DB_URI, {})
  .then(() => console.log("MongoDB connected successfully"))
  .catch((error) => console.error("MongoDB connection error:", error));

app.get("/", (req, res) => {
  res.status(200).send({
    success: true,
    msg: "running",
  });
});
const otpStore = new Map();
// Routes
app.use("/api", userRoutes);
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Use your app password here
  },
});

app.post('/api/push-token', (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ message: 'Token is required' });
    }

    // Here you can save the token to your database or perform any other logic
    console.log('Received push token:', token);

    // Respond with success
    res.status(200).json({ message: 'Token received successfully' });
});
// Endpoint to receive the user ID
app.post('/api/user-id', (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ message: 'userId is required' });
    }

    console.log('Received user ID:', userId);
    // Here you can save the userId to your database or perform any other logic

    res.status(200).json({ message: 'User ID received successfully' });
});

app.use("/api/stations", stationRoutes); // Keep only this route
const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";
const TOKEN_EXPIRATION_TIME = "7d"; // Increase to 7 days for better user experience

app.post("/renew-token", async (req, res) => {
  // Remove authenticateToken middleware since the token is expired
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    // Verify the token but ignore expiration
    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });

    // Create new token with the same user info
    const newToken = jwt.sign(
      { id: decoded.id, email: decoded.email },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRATION_TIME }
    );

    res.json({ token: newToken });
  } catch (error) {
    console.error("Token renewal error:", error);
    res.status(403).json({ error: error.message });
  }
});

// Endpoint to validate the token
app.post("/validate-token", (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      isValid: false,
      error: "Token is required",
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ isValid: true });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(403).json({
        isValid: false,
        error: "Token expired",
        expired: true, // Add flag to indicate expiration
      });
    }
    res.status(403).json({
      isValid: false,
      error: error.message,
    });
  }
});
app.get("/user-profile", authenticateToken, async (req, res) => {
  console.log("Route /user-profile accessed");
  try {
    const user = await User.findById(req.user.id); // Using the user ID from the token
    if (!user) return res.status(404).send("User not found");

    res.status(200).send(user); // Send user data back to frontend
  } catch (error) {
    res.status(500).send("Server error");
  }
});

// Helper function to calculate the distance between two latitudes and longitudes
app.get("/stations", async (req, res) => {
  try {
    const { latitude, longitude } = req.query;
    console.log("\n=== Station Search Request ===");
    console.log("Received coordinates:", { latitude, longitude });

    // First, let's check what's in our database
    const allStations = await Station.find();
    console.log(`Total stations in database: ${allStations.length}`);

    // Log all stations to see their structure
    allStations.forEach((station, index) => {
      console.log(`\nStation ${index + 1}:`, {
        name: station.name,
        location: station.location,
        rawLat: station.location?.latitude,
        rawLon: station.location?.longitude,
      });
    });

    if (allStations.length === 0) {
      console.log("No stations found in database");
      return res.json([]);
    }

    // If no coordinates provided, return all stations
    if (!latitude || !longitude) {
      console.log("No coordinates provided, returning all stations");
      return res.json(allStations);
    }

    const userLat = parseFloat(latitude);
    const userLon = parseFloat(longitude);

    console.log("Parsed user coordinates:", { userLat, userLon });

    // Calculate distances and filter
    const nearbyStations = allStations.filter((station) => {
      // Get station coordinates
      const stationLat = parseFloat(station.location?.latitude);
      const stationLon = parseFloat(station.location?.longitude);

      console.log(`\nChecking station "${station.name}":`, {
        stationLat,
        stationLon,
      });

      if (isNaN(stationLat) || isNaN(stationLon)) {
        console.log("Invalid station coordinates, skipping");
        return false;
      }

      // Calculate distance using Haversine formula
      const R = 6371; // Earth's radius in km
      const dLat = ((stationLat - userLat) * Math.PI) / 180;
      const dLon = ((stationLon - userLon) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((userLat * Math.PI) / 180) *
          Math.cos((stationLat * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      console.log(`Distance to station: ${distance.toFixed(2)}km`);

      // Increase radius to 20km temporarily for testing
      const isNearby = distance <= 20; // Changed from 10km to 20km
      console.log(`Within range? ${isNearby ? "Yes" : "No"}`);

      return isNearby;
    });

    console.log(`\nFound ${nearbyStations.length} nearby stations`);

    // Format stations for response
    const formattedStations = nearbyStations.map((station) => ({
      _id: station._id,
      name: station.name,
      address: station.address,
      numChargers: station.chargingPoints?.length || 0,
      type: station.chargingPoints?.[0]?.type || "Regular",
      latitude: station.location?.latitude,
      longitude: station.location?.longitude,
      operationalStatus: station.operationalStatus,
      operatingHours: station.operatingHours,
      pricing: station.pricing?.basePrice || "0",
    }));

    console.log("Sending formatted stations:", formattedStations);
    return res.json(formattedStations);
  } catch (error) {
    console.error("Error in /stations route:", error);
    return res.status(500).json({
      message: "Error fetching stations",
      error: error.message,
    });
  }
});
app.use("/api/payments", require("./routes/paymentRoutes"));

// Error handling
// Add this error handling middleware
app.use((err, req, res, next) => {
  console.error("Global error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
    details: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});
// Add this after your MongoDB connection
mongoose.connection.once("open", async () => {
  try {
    const collection = mongoose.connection.collection("payments");

    // Get list of indexes
    const indexes = await collection.indexes();

    // Find and drop the problematic index if it exists
    const problematicIndex = indexes.find(
      (index) => index.name === "paymentID_1"
    );
    if (problematicIndex) {
      await collection.dropIndex("paymentID_1");
      console.log("Dropped problematic index");
    }

    // Ensure our new indexes exist
    await collection.createIndex({ paymentIntentId: 1 }, { unique: true });
    await collection.createIndex({ userId: 1, createdAt: -1 });

    console.log("Indexes updated successfully");
  } catch (error) {
    console.error("Error updating indexes:", error);
  }
});
//Booking
// app.use('/api/bookings', bookingRoutes);
app.use("/api/bookings", paymentRoutes);

//alert

// API endpoint
app.get("/ap/payments", async (req, res) => {
  try {
    const { userId, userEmail } = req.query;

    console.log("Searching for bookings with:", {
      userId: userId || "not provided",
      userEmail: userEmail || "not provided",
    });

    if (!userId && !userEmail) {
      console.log("Error: No userId or userEmail provided");
      return res.status(400).json({
        success: false,
        message: "Either userId or userEmail is required",
      });
    }

    const query = {};
    if (userId) query.userId = userId;
    if (userEmail) query.userEmail = userEmail;

    console.log("MongoDB query:", JSON.stringify(query, null, 2));

    const count = await Payment.countDocuments(query);
    console.log(`Found ${count} bookings matching query`);

    const bookings = await Payment.find(query)
      .sort({ bookingDate: -1, startTime: -1 })
      .lean();

    console.log(`Successfully retrieved ${bookings.length} bookings`);

    if (bookings.length > 0) {
      console.log("Sample booking data:", JSON.stringify(bookings[0], null, 2));
    }

    res.json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    console.error("Error in /payments route:", error);
    console.error("Stack trace:", error.stack);

    res.status(500).json({
      success: false,
      message: "Error fetching bookings",
      error: error.message,
      errorType: error.name,
      errorStack:
        process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

//payment
app.get("/payments", async (req, res) => {
  try {
    const currentDate = new Date();
    const { date } = req.query;

    const allPayments = await Payment.find();

    const filteredPayments = allPayments.filter((payment) => {
      try {
        // Ensure bookingDate is a Date object
        const bookingDate =
          payment.bookingDate instanceof Date
            ? payment.bookingDate
            : new Date(payment.bookingDate);

        // Compare dates
        const filterDate = date ? new Date(date) : currentDate;

        return (
          bookingDate.getFullYear() === filterDate.getFullYear() &&
          bookingDate.getMonth() === filterDate.getMonth() &&
          bookingDate.getDate() === filterDate.getDate()
        );
      } catch (parseError) {
        console.error(`Error parsing date for payment: ${parseError.message}`);
        return false;
      }
    });

    res.json(filteredPayments);
  } catch (err) {
    console.error("Error fetching payments:", err);
    res.status(500).send("Server Error");
  }
});
//slt start
// Add this new endpoint to check all bookings
app.get("/api/bookings/all", async (req, res) => {
  try {
    const allBookings = await Payment.find({});
    console.log("All bookings in database:", allBookings);
    res.json(allBookings);
  } catch (error) {
    console.error("Error fetching all bookings:", error);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});
app.get("/api/bookings/slots", async (req, res) => {
  try {
    const { chargingPointId, date, stationId } = req.query;

    if (!chargingPointId || !date || !stationId) {
      return res.status(400).json({
        error:
          "Missing required parameters: chargingPointId, date, and stationId are required",
      });
    }

    // Validate date format
    const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(date);
    if (!isValidDate) {
      return res.status(400).json({
        error: "Invalid date format. Use YYYY-MM-DD",
      });
    }

    console.log("Fetching slots:", {
      chargingPointId,
      date,
      stationId,
      currentTime: new Date().toISOString(),
    });

    const bookings = await Payment.find({
      "chargingPoint.pointId": chargingPointId,
      bookingDate: date,
      bookingStatus: { $in: ["confirmed", "ongoing"] },
      paymentStatus: "completed",
      stationId: stationId, // Filter by stationId
    })
      .select("startTime endTime duration chargingPoint.pointId")
      .lean();

    const formattedBookings = bookings.map((booking) => ({
      chargingPointId: booking.chargingPoint.pointId,
      startTime: booking.startTime,
      endTime: booking.endTime,
      duration: booking.duration,
    }));

    console.log(
      `Found ${formattedBookings.length} bookings for point ${chargingPointId} on ${date}`
    );

    res.json(formattedBookings);
  } catch (error) {
    console.error("Error fetching booked slots:", error);
    res.status(500).json({
      error: "Failed to fetch booked slots",
      message: error.message,
    });
  }
});

// Verify slot availability
app.post("/api/bookings/verify", async (req, res) => {
  try {
    const { chargingPointId, date, startTime, duration } = req.body;

    console.log("Verifying slot availability:", {
      chargingPointId,
      date,
      startTime,
      duration,
    });

    const requestStart = convertTo24Hour(startTime);
    const requestStartHour = parseInt(requestStart.split(":")[0]);
    const requestEndHour = requestStartHour + Math.ceil(duration / 60);

    const overlappingBookings = await Payment.find({
      chargingPointId,
      date,
      status: { $in: ["pending", "confirmed"] },
      paymentStatus: "success",
    });

    const isAvailable = !overlappingBookings.some((booking) => {
      const bookingStart = convertTo24Hour(booking.startTime);
      const bookingStartHour = parseInt(bookingStart.split(":")[0]);
      const bookingEndHour =
        bookingStartHour + Math.ceil(booking.duration / 60);

      return (
        (requestStartHour >= bookingStartHour &&
          requestStartHour < bookingEndHour) ||
        (requestEndHour > bookingStartHour &&
          requestEndHour <= bookingEndHour) ||
        (requestStartHour <= bookingStartHour &&
          requestEndHour >= bookingEndHour)
      );
    });

    res.json({ available: isAvailable });
  } catch (error) {
    console.error("Error verifying slot availability:", error);
    res.status(500).json({ error: "Failed to verify slot availability" });
  }
});

// Create booking
app.post("/api/bookings/create", async (req, res) => {
  try {
    const {
      chargingPointId,
      date,
      startTime,
      endTime,
      duration,
      vehiclePlateNo,
      userEmail,
      totalAmount,
      stationName,
    } = req.body;

    const payment = new Payment({
      chargingPointId,
      date,
      startTime,
      endTime,
      duration,
      vehiclePlateNo,
      userEmail,
      totalAmount,
      stationName,
      status: "pending",
      paymentStatus: "pending",
    });

    await payment.save();
    res.status(201).json(payment);
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({ error: "Failed to create booking" });
  }
});

// Utility function for time conversion
const convertTo24Hour = (time12) => {
  if (!time12) return "";
  const [time, period] = time12.split(" ");
  let [hours, minutes] = time.split(":");
  hours = parseInt(hours);

  if (period === "PM" && hours !== 12) {
    hours += 12;
  } else if (period === "AM" && hours === 12) {
    hours = 0;
  }

  return `${String(hours).padStart(2, "0")}:${minutes}`;
};
//

//slot end
app.post("/api/send-email", async (req, res) => {
  try {
    // Validate request
    const { to, subject, html } = req.body;
    if (!to || !subject || !html) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: to, subject, or html",
      });
    }

    // Verify token
    const token = req.headers.authorization;
    if (!token || !token.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Configure email options
    const mailOptions = {
      from: `"EV Charging Office" <${process.env.EMAIL_USER}>`, // Custom sender name
      to,
      subject,
      html,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    // Return success response
    res.json({
      success: true,
      message: "Email sent successfully",
    });
  } catch (error) {
    console.error("Email sending error:", error);

    // Return error in JSON format
    res.status(500).json({
      success: false,
      message: error.message || "Failed to send email",
    });
  }
});
app.post('/send-notification', async (req, res) => {
  const { token, title, body } = req.body;

  const message = {
    to: token,
    sound: 'default',
    title: title,
    body: body,
  };

  try {
    const response = await axios.post('https://exp.host/--/api/v2/push/send', message);
    
    if (response.data && response.data.errors) {
      console.error('Push notification errors:', response.data.errors);
      return res.status(400).send({ success: false, message: 'Failed to send notification', errors: response.data.errors });
    }

    return res.status(200).send({ success: true, message: 'Notification sent successfully' });
  } catch (error) {
    console.error('Error sending notification:', error.response ? error.response.data : error.message);
    return res.status(500).send({ success: false, message: 'Error sending notification', error: error.message });
  }
});
// Send OTP to the user's email

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
