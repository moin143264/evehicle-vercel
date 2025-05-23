// controllers/bookingController.js
const User = require('../models/User'); // Import User model
const Booking = require('../models/Booking');

// Controller to save booking details
const saveBookingDetails = async (req, res) => {
  const {stationName,stationId,stationAdrres, selectedDate, startTime, duration, totalAmount, paymentId, paymentStatus ,paymentIntentId,userId,endTime,latitude,longitude,userEmail } = req.body;
  const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
  try {
    const newBooking = new Booking({
      stationName,
      stationAdrres,
      stationId,
      selectedDate,
      startTime,
      duration,
      totalAmount,
      paymentId,
      paymentStatus,
      paymentIntentId, // Store the paymentIntentId
      userId,
      endTime,
      latitude,
      longitude,
      userEmail
    });

    // Save the booking to the database
    const savedBooking = await newBooking.save();

    // Send back the saved booking along with the bookingId
    res.status(201).json({
      message: 'Booking saved successfully!',
      bookingId: savedBooking._id, // Send the booking ID to the frontends
      bookingId: savedBooking.bookingId
    });
  } catch (error) {
    console.error('Error saving booking:', error);
    res.status(500).json({
      message: 'An error occurred while saving the booking.',
      error: error.message
    });
  }
};// Controller to fetch booking details
const getAllBookings = async (req, res) => {
  try {
    const { userId } = req.query; // Get the userId from query params

    // If no userId is provided, return an error
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Find bookings by userId (assuming userId is part of the booking model)
    const bookings = await Booking.find({ userId: userId });

    // If bookings are found, format and return them
    const formattedBookings = bookings.map((booking) => {
      return {
        stationName: booking.stationName,
        selectedDate: booking.selectedDate,
        stationAdrres:booking.stationAdrres,
        startTime: booking.startTime,
        endTime:booking.endTime,
        duration: booking.duration, // Fetch the duration directly
        totalAmount: booking.totalAmount,
        paymentStatus: booking.paymentStatus,
        bookingId: booking.bookingId,
        latitude:booking.latitude,
        longitude:booking.longitude
        
      };
    });

    res.status(200).json({ bookings: formattedBookings });
  } catch (error) {
    console.error('Error fetching bookings:', error.message);
    res.status(500).json({ message: 'Error fetching bookings', error: error.message });
  }
};



module.exports = {
  saveBookingDetails,
  getAllBookings
};