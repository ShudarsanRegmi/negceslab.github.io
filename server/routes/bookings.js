const express = require("express");
const router = express.Router();
const Booking = require("../models/booking");
const Computer = require("../models/computer");
const User = require("../models/user");
const Notification = require("../models/notification");
const { verifyToken } = require("../middleware/auth");

// Get all bookings (admin) or user's bookings
router.get("/", verifyToken, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findOne({ firebaseUid: req.user.firebaseUid });
    const isAdmin = user && user.role === "admin";

    let bookings;
    if (isAdmin) {
      // Admin gets all bookings
      bookings = await Booking.find()
        .populate("computerId")
        .sort({ createdAt: -1 });

      // Add user info to each booking
      const bookingsWithUserInfo = await Promise.all(
        bookings.map(async (booking) => {
          const user = await User.findOne({ firebaseUid: booking.userId });
          const bookingObj = booking.toObject();
          return {
            ...bookingObj,
            userInfo: user
              ? {
                  name: user.name,
                  email: user.email,
                }
              : null,
          };
        })
      );

      res.json(bookingsWithUserInfo);
    } else {
      // Regular users only get their own bookings
      bookings = await Booking.find({ userId: req.user.firebaseUid })
        .populate("computerId")
        .sort({ createdAt: -1 });
      res.json(bookings);
    }
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res
      .status(500)
      .json({ message: "Error fetching bookings", error: error.message });
  }
});

// Get current bookings (admin only)
router.get("/current", verifyToken, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findOne({ firebaseUid: req.user.firebaseUid });
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    // Get current date and time
    const now = new Date();
    const currentDate = now.toISOString().split("T")[0];
    const currentTime = now.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });

    console.log("Fetching current bookings for:", { currentDate, currentTime });

    // Get all approved bookings that haven't expired yet
    const currentBookings = await Booking.find({
      status: "approved",
      $or: [
        // Single day bookings that haven't ended yet
        {
          startDate: currentDate,
          endDate: currentDate,
          endTime: { $gte: currentTime },
        },
        // Future bookings
        {
          startDate: { $gt: currentDate },
        },
        // Multi-day bookings that haven't ended yet
        {
          endDate: { $gte: currentDate },
        },
      ],
    })
      .populate("computerId")
      .sort({ startDate: 1, startTime: 1 });

    console.log("Found current bookings:", currentBookings.length);

    // Add user info to each booking
    const bookingsWithUserInfo = await Promise.all(
      currentBookings.map(async (booking) => {
        const user = await User.findOne({ firebaseUid: booking.userId });
        const bookingObj = booking.toObject();
        return {
          ...bookingObj,
          userInfo: user
            ? {
                name: user.name,
                email: user.email,
              }
            : null,
        };
      })
    );

    res.json(bookingsWithUserInfo);
  } catch (error) {
    console.error("Error fetching current bookings:", error);
    res
      .status(500)
      .json({
        message: "Error fetching current bookings",
        error: error.message,
      });
  }
});

// Create a new booking
router.post("/", verifyToken, async (req, res) => {
  try {
    const {
      computerId,
      startDate,
      endDate,
      startTime,
      endTime,
      reason,
      requiresGPU,
      gpuMemoryRequired,
      problemStatement,
      datasetType,
      datasetSize,
      datasetLink,
      bottleneckExplanation,
    } = req.body;

    // Basic validation
    if (
      !computerId ||
      !startDate ||
      !endDate ||
      !startTime ||
      !endTime ||
      !reason
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check if computer exists
    const computer = await Computer.findById(computerId);
    if (!computer) {
      return res.status(404).json({ message: "Computer not found" });
    }

    // Create booking with all fields
    const booking = new Booking({
      userId: req.user.firebaseUid,
      computerId,
      startDate,
      endDate,
      startTime,
      endTime,
      reason,
      requiresGPU,
      gpuMemoryRequired,
      problemStatement,
      datasetType,
      datasetSize,
      datasetLink,
      bottleneckExplanation,
    });

    await booking.save();

    // Notify all admins about the new booking
    const userBookingId = booking._id.toString().slice(-6).toUpperCase();
    const admins = await User.find({ role: "admin" });
    const adminNotifications = admins.map(
      (admin) =>
        new Notification({
          userId: admin.firebaseUid,
          title: "New Booking Request",
          message: `A new booking (ID: ${userBookingId}) has been made for computer ${computer.name} (${computer.specifications}) by user ${req.user.firebaseUid}.`,
          type: "info",
          metadata: {
            bookingId: userBookingId,
            computerId: computer._id,
            computerName: computer.name,
            computerSpecifications: computer.specifications,
            userId: req.user.firebaseUid,
          },
        })
    );
    if (adminNotifications.length > 0) {
      await Notification.insertMany(adminNotifications);
    }

    // Populate computer details before sending response
    await booking.populate("computerId");
    res.status(201).json(booking);
  } catch (error) {
    console.error("Error creating booking:", error);
    res
      .status(500)
      .json({ message: "Error creating booking", error: error.message });
  }
});

// Update booking time (admin only)
router.put("/:id/time", verifyToken, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findOne({ firebaseUid: req.user.firebaseUid });
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Only allow updating approved bookings
    if (booking.status !== "approved") {
      return res
        .status(400)
        .json({ message: "Can only update approved bookings" });
    }

    const { startTime, endTime, computerId, endDate } = req.body;

    // If changing computer
    if (computerId && computerId !== booking.computerId.toString()) {
      const newComputer = await Computer.findById(computerId);
      if (!newComputer) {
        return res.status(404).json({ message: "New computer not found" });
      }

      // Update old computer status if no other active bookings
      const otherBookings = await Booking.findOne({
        computerId: booking.computerId,
        status: "approved",
        _id: { $ne: booking._id },
      });
      if (!otherBookings) {
        await Computer.findByIdAndUpdate(booking.computerId, {
          status: "available",
        });
      }

      // Update new computer status
      await Computer.findByIdAndUpdate(computerId, { status: "booked" });
      booking.computerId = computerId;
    }

    // Update booking details
    if (startTime) booking.startTime = startTime;
    if (endTime) booking.endTime = endTime;
    if (endDate) booking.endDate = endDate;

    const updatedBooking = await booking.save();
    await updatedBooking.populate("computerId");

    // Add user info
    const bookingUser = await User.findOne({
      firebaseUid: updatedBooking.userId,
    });
    const bookingObj = updatedBooking.toObject();
    const bookingWithUser = {
      ...bookingObj,
      userInfo: bookingUser
        ? {
            name: bookingUser.name,
            email: bookingUser.email,
          }
        : null,
    };

    res.json(bookingWithUser);
  } catch (error) {
    console.error("Error updating booking time:", error);
    res
      .status(500)
      .json({ message: "Error updating booking time", error: error.message });
  }
});

// Update booking status (admin only)
router.put("/:id/status", verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.firebaseUid });
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { status, rejectionReason } = req.body;
    if (!["approved", "rejected", "cancelled"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    // If status is rejected, require rejection reason
    if (status === "rejected" && !rejectionReason) {
      return res.status(400).json({ message: "Rejection reason is required" });
    }

    const booking = await Booking.findById(req.params.id).populate(
      "computerId"
    );
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    booking.status = status;
    if (status === "rejected") {
      booking.rejectionReason = rejectionReason;
    }
    await booking.save();

    // Update computer status if needed
    if (status === "approved") {
      await Computer.findByIdAndUpdate(booking.computerId._id, {
        status: "booked",
      });
    } else if (status === "rejected" || status === "cancelled") {
      // Check if there are other approved bookings for this computer
      const otherApprovedBookings = await Booking.findOne({
        computerId: booking.computerId._id,
        status: "approved",
        _id: { $ne: booking._id },
      });

      if (!otherApprovedBookings) {
        await Computer.findByIdAndUpdate(booking.computerId._id, {
          status: "available",
        });
      }
    }

    // Notify user about status change
    let notifTitle = "";
    let notifMsg = "";
    const userBookingId = booking._id.toString().slice(-6).toUpperCase();
    if (status === "approved") {
      notifTitle = "Booking Approved";
      notifMsg = `Your booking (ID: ${userBookingId}) for computer ${booking.computerId.name} (${booking.computerId.specifications}) has been approved.`;
    } else if (status === "rejected") {
      notifTitle = "Booking Rejected";
      notifMsg = `Your booking (ID: ${userBookingId}) for computer ${booking.computerId.name} (${booking.computerId.specifications}) has been rejected. Reason: ${rejectionReason}`;
    } else if (status === "cancelled") {
      notifTitle = "Booking Cancelled";
      notifMsg = `Your booking (ID: ${userBookingId}) for computer ${booking.computerId.name} (${booking.computerId.specifications}) has been cancelled.`;
    }
    if (notifTitle && notifMsg) {
      const userNotification = new Notification({
        userId: booking.userId,
        title: notifTitle,
        message: notifMsg,
        type: status === "approved" ? "success" : "error",
        metadata: {
          bookingId: userBookingId,
          computerId: booking.computerId._id,
          computerName: booking.computerId.name,
          computerSpecifications: booking.computerId.specifications,
        },
      });
      await userNotification.save();
    }

    res.json(booking);
  } catch (error) {
    console.error("Error updating booking status:", error);
    res
      .status(500)
      .json({ message: "Error updating booking status", error: error.message });
  }
});

module.exports = router;
