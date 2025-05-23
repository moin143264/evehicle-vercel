const cron = require('node-cron');
const NotificationScheduler = require('./NotificationScheduler');

// Run every minute
cron.schedule('* * * * *', async () => {
  console.log('Checking booking notifications...');
  await NotificationScheduler.checkAndSendBookingNotifications();
});

console.log('Notification scheduler cron job started.');
