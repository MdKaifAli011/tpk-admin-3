import mongoose from "mongoose";

const notificationReadSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    notificationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Notification",
      required: true,
      index: true,
    },
    readAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

notificationReadSchema.index({ studentId: 1, notificationId: 1 }, { unique: true });

const NotificationRead =
  mongoose.models.NotificationRead ||
  mongoose.model("NotificationRead", notificationReadSchema);

export default NotificationRead;
