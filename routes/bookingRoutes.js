const express = require('express');
const { saveBookingDetails,getAllBookings  } = require('../controllers/bookingController');

const router = express.Router();


// Define route for saving a booking
router.post('/', saveBookingDetails);
// Define route for fetching bookings
// Fetch all bookings
router.get('/', getAllBookings);
module.exports = router;
