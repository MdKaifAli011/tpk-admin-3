import mongoose from "mongoose";
import { US_TIMEZONE_VALUES } from "../constants/usTimezone";

const leadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        "Please provide a valid email",
      ],
    },
    country: {
      type: String,
      required: [true, "Country is required"],
      trim: true,
    },
    className: {
      type: String,
      required: [true, "Class name is required"],
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    status: {
      type: String,
      enum: ["new", "contacted", "converted", "archived", "updated"],
      default: "new",
    },
    updateCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    form_name: {
      type: String,
      trim: true,
    },
    form_id: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      trim: true,
    },
    prepared: {
      type: String,
      trim: true,
    },
    /** Optional: preferred demo / call date (ISO) */
    preferredDate: {
      type: Date,
    },
    /** Optional: EST, CST, PST, MST, HST, Other — see constants/usTimezone.js */
    usTimezone: {
      type: String,
      trim: true,
      validate: {
        validator(v) {
          if (v == null || v === "") return true;
          return US_TIMEZONE_VALUES.includes(v);
        },
        message: "Invalid usTimezone",
      },
    },
    /** Optional free-text (e.g. detail when Other, or custom note) */
    timezoneTellUs: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
  },
  { timestamps: true }
);

leadSchema.index({ status: 1 });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ country: 1 });
leadSchema.index({ className: 1 });
leadSchema.index({ form_name: 1 });
leadSchema.index({ form_id: 1 });
leadSchema.index({ source: 1 });
leadSchema.index({ usTimezone: 1 });
leadSchema.index({ preferredDate: 1 });

if (mongoose.models?.Lead) {
  delete mongoose.models.Lead;
}
if (mongoose.modelSchemas?.Lead) {
  delete mongoose.modelSchemas.Lead;
}

const Lead = mongoose.model("Lead", leadSchema);

export default Lead;
