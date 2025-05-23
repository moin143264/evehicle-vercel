const Payment = require('../models/Payment');
const Station = require('../models/Station');
const User = require('../models/User');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createError } = require('../utils/error');

const paymentController = {
  createPaymentIntent: async (req, res, next) => {
    try {
      console.log('Received payment intent request:', req.body);

      const { amount, station, chargingPoint, chargingPointId, vehiclePlateNo,stationName } = req.body;

      // Detailed validation
      const missingFields = [];
      if (!amount) missingFields.push('amount');
      if (!station) missingFields.push('station');
      if (!vehiclePlateNo) missingFields.push('vehiclePlateNo');

      // Handle both formats of charging point data
      let validatedChargingPoint;
      if (chargingPoint && typeof chargingPoint === 'object') {
        validatedChargingPoint = chargingPoint;
      } else if (chargingPointId) {
        const stationData = await Station.findOne({ name: station });
        if (!stationData) {
          return next(createError(404, 'Station not found'));
        }

        const foundChargingPoint = stationData.chargingPoints.find(
          cp => cp.pointId === chargingPointId
        );

        if (!foundChargingPoint) {
          return next(createError(404, 'Charging point not found'));
        }

        validatedChargingPoint = {
          pointId: foundChargingPoint.pointId,
          type: foundChargingPoint.type,
          power: foundChargingPoint.power,
          price: foundChargingPoint.price,
          connectorType: foundChargingPoint.connectorType
        };
      } else {
        missingFields.push('chargingPoint or chargingPointId');
      }

      if (missingFields.length > 0) {
        return next(createError(400, 'Missing required fields', { missingFields }));
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount),
        currency: 'inr',
        metadata: {
          stationName: stationName,
          userId: req.user.id,
          chargingPointId: validatedChargingPoint.pointId,
          vehiclePlateNo
        }
      });

      res.status(200).json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        merchantName: stationName,
        chargingPoint: validatedChargingPoint
      });
    } catch (error) {
      next(error);
    }
  },

  confirmPayment: async (req, res, next) => {
    try {
      const {
        paymentIntentId,
        userEmail,
        stationId,
        chargingPoint,
        bookingDate,
        startTime,
        endTime,
        duration,
        amount,
        latitude,
        longitude,
        vehiclePlateNo,
        stationName,
        address
      } = req.body;

      // Validate payment with Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (paymentIntent.status !== 'succeeded') {
        return next(createError(400, 'Payment not successful'));
      }

      // Check for existing payment
      const existingPayment = await Payment.findOne({ paymentIntentId });
      if (existingPayment) {
        return res.status(200).json({
          success: true,
          payment: existingPayment
        });
      }

      const payment = new Payment({
        userId: req.user.id,
        userEmail,
        stationId,
        chargingPoint,
        vehiclePlateNo,
        bookingDate,
        startTime,
        endTime,
        duration,
        amount,
        paymentIntentId,
        paymentStatus: 'completed',
        latitude,
        longitude,
        stationName,
        address
      });

      const savedPayment = await payment.save();

      // Update station bookings
      await Station.findByIdAndUpdate(stationId, {
        $push: {
          bookings: {
            date: bookingDate,
            time: startTime,
            endTime,
            duration,
            chargingPoint,
            paymentId: savedPayment._id,
            userId: req.user.id
          }
        }
      });

      // Update user bookings
      await User.findByIdAndUpdate(req.user.id, {
        $push: {
          bookings: savedPayment._id
        }
      });

      res.status(200).json({
        success: true,
        payment: savedPayment
      });
    } catch (error) {
      next(error);
    }
  },

  getPaymentHistory: async (req, res, next) => {
    try {
      const payments = await Payment.find({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .populate('stationId', 'name location');

      res.status(200).json(payments);
    } catch (error) {
      next(error);
    }
  },

  cancelBooking: async (req, res, next) => {
    try {
      const payment = await Payment.findOne({
        _id: req.params.paymentId,
        userId: req.user.id
      });

      if (!payment) {
        return next(createError(404, 'Payment not found'));
      }

      if (payment.bookingStatus !== 'confirmed') {
        return next(createError(400, 'Booking cannot be cancelled'));
      }

      // Calculate refund amount
      const bookingTime = new Date(`${payment.bookingDate} ${payment.startTime}`);
      const now = new Date();
      const hoursUntilBooking = (bookingTime - now) / (1000 * 60 * 60);

      let refundAmount = 0;
      if (hoursUntilBooking > 24) {
        refundAmount = payment.amount;
      } else if (hoursUntilBooking > 12) {
        refundAmount = payment.amount * 0.5;
      }

      if (refundAmount > 0) {
        const refund = await stripe.refunds.create({
          payment_intent: payment.paymentIntentId,
          amount: Math.round(refundAmount * 100)
        });

        payment.refundStatus = 'processed';
        payment.refundAmount = refundAmount;
        payment.refundDate = new Date();
      }

      payment.bookingStatus = 'cancelled';
      await payment.save();

      // Remove booking from station
      await Station.findByIdAndUpdate(payment.stationId, {
        $pull: {
          bookings: {
            paymentId: payment._id
          }
        }
      });

      res.status(200).json({
        success: true,
        payment,
        refundAmount
      });
    } catch (error) {
      next(error);
    }
  },
  getAllBookings : async (req, res) => {
    try {
      const { userId } = req.query; // Get the userId from query params
  
      // If no userId is provided, return an error
      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }
  
      // Find bookings by userId (assuming userId is part of the booking model)
      const bookings = await Payment.find({ userId: userId });
      
      // If bookings are found, format and return them
      const formattedBookings = bookings.map((booking) => {
        return {
          stationName: booking.stationName,
          selectedDate: booking.bookingDate,
          stationAddrres:booking.address,
          startTime: booking.startTime,
          endTime:booking.endTime,
          duration: booking.duration, // Fetch the duration directly
          totalAmount: booking.amount,
          paymentStatus: booking.paymentStatus,
          bookingId: booking.bookingId,
          latitude:booking.latitude,
          longitude:booking.longitude,
          VehcileDetails:booking.vehiclePlateNo
         
          
        };
       
      });
      console.log(formattedBookings);
      res.status(200).json({ bookings: formattedBookings });
    } catch (error) {
      console.error('Error fetching bookings:', error.message);
      res.status(500).json({ message: 'Error fetching bookings', error: error.message });
    }
  }
};

module.exports = paymentController;
