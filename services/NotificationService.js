const { Expo } = require('expo-server-sdk');

class NotificationService {
  constructor() {
    this.expo = new Expo();
  }

  async sendPushNotification(pushTokens, title, body) {
    // Validate and send notifications to multiple tokens
    const messages = pushTokens
      .filter(pushToken => Expo.isExpoPushToken(pushToken))
      .map(pushToken => ({
        to: pushToken,
        sound: 'default',
        title: title,
        body: body,
        data: { withSome: 'data' },
      }));

    try {
      // Send notifications in chunks
      const chunks = this.expo.chunkPushNotifications(messages);
      const tickets = [];

      for (let chunk of chunks) {
        const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      }

      return tickets;
    } catch (error) {
      console.error('Error sending notifications:', error);
      return [];
    }
  }

  async checkScheduleNotifications(schedules, currentTime = new Date()) {
    const notificationsToSend = [];

    schedules.forEach(schedule => {
      const startTime = new Date(schedule.startTime);
      const endTime = new Date(schedule.endTime);
      
      // 1. 10 minutes before start time
      const tenMinutesBefore = new Date(startTime.getTime() - 10 * 60000);
      if (currentTime >= tenMinutesBefore && currentTime < startTime && !schedule.tenMinWarning) {
        notificationsToSend.push({
          pushTokens: schedule.user.pushTokens,
          title: 'Booking Reminder',
          body: 'Your booking is about to arrive in 10 minutes!',
          type: 'tenMinWarning'
        });
      }

      // 2. At start time
      if (currentTime >= startTime && currentTime < endTime && !schedule.startTimeNotification) {
        notificationsToSend.push({
          pushTokens: schedule.user.pushTokens,
          title: 'Booking Started',
          body: 'Your booking slot has arrived!',
          type: 'startTimeNotification'
        });
      }

      // 3. At or past end time
      if (currentTime >= endTime && !schedule.expiredNotification) {
        notificationsToSend.push({
          pushTokens: schedule.user.pushTokens,
          title: 'Booking Expired',
          body: 'Your booking has expired.',
          type: 'expiredNotification'
        });
      }
    });

    return notificationsToSend;
  }

  async processScheduleNotifications(schedules, currentTime = new Date()) {
    // Get notifications to send
    const notifications = await this.checkScheduleNotifications(schedules, currentTime);

    // Send notifications
    for (let notification of notifications) {
      await this.sendPushNotification(
        notification.pushTokens, 
        notification.title, 
        notification.body
      );
    }

    return notifications;
  }
}

module.exports = new NotificationService();
