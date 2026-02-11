import mongoose from "mongoose";
import { createSlug, generateUniqueSlug } from "../utils/serverSlug.js";

const NOTIFICATION_LEVELS = ["general", "exam", "exam_with_children", "subject", "unit", "chapter", "topic", "subtopic", "definition"];
const ICON_TYPES = ["comment", "trophy", "document", "info", "announcement"];

const notificationSchema = new mongoose.Schema(
  {
    // Level: which page(s) this notification shows on
    // general = all pages; exam = that exam page only; exam_with_children = that exam page + all its children pages
    entityType: {
      type: String,
      enum: NOTIFICATION_LEVELS,
      required: true,
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      default: null,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      default: "",
      trim: true,
    },
    // One-line text for strip banner; if empty, title is used
    stripMessage: {
      type: String,
      default: "",
      trim: true,
      maxlength: 300,
    },
    link: {
      type: String,
      default: "",
      trim: true,
    },
    linkLabel: {
      type: String,
      default: "View",
      trim: true,
      maxlength: 50,
    },
    slug: {
      type: String,
      trim: true,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "draft"],
      default: "active",
      index: true,
    },
    iconType: {
      type: String,
      enum: ICON_TYPES,
      default: "announcement",
    },
    orderNumber: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ entityType: 1, entityId: 1, status: 1 });
notificationSchema.index({ status: 1, createdAt: -1 });

notificationSchema.pre("validate", function (next) {
  if (this.entityType !== "general" && (this.entityId == null || this.entityId === "")) {
    this.invalidate("entityId", "entityId is required when entityType is not general");
  }
  next();
});

notificationSchema.pre("save", async function (next) {
  if (this.isModified("title") && !this.slug) {
    this.slug = createSlug(this.title);
  }
  if (this.isModified("slug") && this.slug) {
    const Notification = mongoose.model("Notification");
    const excludeId = this._id?.toString();
    const exists = await Notification.findOne({
      slug: this.slug,
      _id: { $ne: this._id },
    });
    if (exists) {
      this.slug = await generateUniqueSlug(
        this.slug,
        (s, excl) => Notification.findOne(excl ? { slug: s, _id: { $ne: excl } } : { slug: s }).then((doc) => !!doc),
        excludeId
      );
    }
  }
  next();
});

const Notification =
  mongoose.models.Notification ||
  mongoose.model("Notification", notificationSchema);

export default Notification;
export { NOTIFICATION_LEVELS, ICON_TYPES };
