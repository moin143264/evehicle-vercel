const Booking = require('../models/Booking');
const User = require('../models/User');
const NotificationService = require('./notificationService');

class NotificationScheduler {
  async checkAndSendBookingNotifications() {
    try {
      // Get current time
      const currentTime = new Date('2025-01-01T10:35:16+05:30');
      
      // Find all upcoming bookings
      const bookings = await Booking.find({
        selectedDate: { 
          $gte: new Date(currentTime.getTime() - 24 * 60 * 60 * 1000), // Look back 24 hours 
          $lte: new Date(currentTime.getTime() + 24 * 60 * 60 * 1000)  // Look ahead 24 hours
        }
      }).populate('userId', 'pushToken');

      for (const booking of bookings) {
        // Parse start and end times
        const bookingDate = new Date(booking.selectedDate);
        const [startHours, startMinutes] = booking.startTime.split(':').map(Number);
        const [endHours, endMinutes] = (booking.endTime || '00:00').split(':').map(Number);

        // Create full datetime for start and end times
        const startTime = new Date(bookingDate);
        startTime.setHours(startHours, startMinutes, 0, 0);

        const endTime = new Date(bookingDate);
        endTime.setHours(endHours, endMinutes, 0, 0);

        // 1. 10 minutes before start time notification
        const tenMinutesBefore = new Date(startTime.getTime() - 10 * 60 * 1000);
        if (currentTime >= tenMinutesBefore && currentTime < startTime) {
          await this.sendNotification(
            booking.userId.pushToken, 
            'Booking Reminder', 
            `Your booking at ${booking.stationName} is about to start in 10 minutes!`
          );
        }

        // 2. Exactly at start time notification
        if (currentTime.getTime() === startTime.getTime()) {
          await this.sendNotification(
            booking.userId.pushToken, 
            'Booking Started', 
            `Your booking at ${booking.stationName} has started now!`
          );
        }

        // 3. At or after end time notification
        if (currentTime >= endTime) {
          await this.sendNotification(
            booking.userId.pushToken, 
            'Booking Expired', 
            `Your booking at ${booking.stationName} has ended.`
          );
        }
      }
    } catch (error) {
      console.error('Error in checking booking notifications:', error);
    }
  }

  async sendNotification(pushToken, title, body) {
    if (!pushToken) return;

    try {
      await NotificationService.sendPushNotification([pushToken], title, body);
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }
}

module.exports = new NotificationScheduler();
