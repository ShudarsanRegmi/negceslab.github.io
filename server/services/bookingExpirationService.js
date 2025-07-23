const Computer = require("../models/computer");
const Booking = require("../models/booking");
const Notification = require("../models/notification");
const User = require("../models/user");

class BookingExpirationService {
  constructor() {
    this.checkInterval = null;
    this.initializeService();
  }

  initializeService() {
    // Check for expired bookings every minute
    this.checkInterval = setInterval(() => {
      this.checkExpiredBookings();
    }, 60000); // 60 seconds

    console.log("Booking expiration service initialized");
  }

  async checkExpiredBookings() {
    try {
      const currentDate = new Date().toISOString().split("T")[0];
      const currentTime = new Date().toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      });

      // Find bookings that have ended
      const expiredBookings = await Booking.find({
        status: "approved",
        $or: [
          // Single day bookings that have ended
          {
            startDate: currentDate,
            endDate: currentDate,
            endTime: { $lt: currentTime },
          },
          // Multi-day bookings that have ended
          {
            endDate: { $lt: currentDate },
          },
        ],
      });

      // Update status to completed for expired bookings
      for (const booking of expiredBookings) {
        await this.handleExpiredBooking(booking);
      }

      console.log(`Updated ${expiredBookings.length} expired bookings`);
    } catch (error) {
      console.error("Error in booking expiration service:", error);
    }
  }

  async handleExpiredBooking(booking) {
    try {
      // Update booking status to completed
      booking.status = "completed";
      await booking.save();

      // Always fetch the computer document by ID and update its status
      const computer = await Computer.findById(booking.computerId);
      if (computer && computer.status === "booked") {
        computer.status = "available";
        await computer.save();
        console.log(
          `Computer ${computer.name} (${computer._id}) status updated to: ${computer.status}`
        );
      } else if (computer) {
        console.log(
          `Computer ${computer.name} (${computer._id}) was not booked, current status: ${computer.status}`
        );
      } else {
        console.log(`Computer with ID ${booking.computerId} not found.`);
      }

      // Send notifications, passing the computer object
      await this.sendExpirationNotifications(booking, computer);

      console.log(`Booking ${booking._id} expired and processed`);
    } catch (error) {
      console.error("Error handling expired booking:", error);
    }
  }

  async sendExpirationNotifications(booking, computer) {
    try {
      const computerName = computer ? computer.name : "Unknown Computer";
      const computerId = computer ? computer._id : booking.computerId;
      const userBookingId = booking._id.toString().slice(-6).toUpperCase();
      // Notification for user
      const userNotification = new Notification({
        userId: booking.userId,
        title: "Booking Session Ended",
        message: `Your booking for ${computerName} (ID: ${userBookingId}) has ended. The computer is now available for other users.`,
        type: "info",
        metadata: {
          bookingId: userBookingId,
          computerId: computerId,
          computerName: computerName,
        },
      });
      await userNotification.save();

      // Notification for all admins
      const adminUsers = await User.find({ role: "admin" });
      for (const admin of adminUsers) {
        const adminNotification = new Notification({
          userId: admin._id,
          title: "Computer Available",
          message: `Computer ${computerName} (ID: ${userBookingId}) is now available after booking session ended.`,
          type: "success",
          metadata: {
            bookingId: userBookingId,
            computerId: computerId,
            computerName: computerName,
            userId: booking.userId,
          },
        });
        await adminNotification.save();
      }

      console.log(`Notifications sent for expired booking ${booking._id}`);
    } catch (error) {
      console.error("Error sending expiration notifications:", error);
    }
  }

  // Manual method to check and process expired bookings (for testing)
  async processExpiredBookings() {
    await this.checkExpiredBookings();
  }

  // Cleanup method
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

module.exports = BookingExpirationService;
