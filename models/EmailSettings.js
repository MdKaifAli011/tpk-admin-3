import mongoose from "mongoose";

const emailSettingsSchema = new mongoose.Schema(
  {
    // Single-document key so we always have one settings doc
    key: {
      type: String,
      required: true,
      unique: true,
      default: "default",
    },
    // SMTP
    mailMailer: { type: String, default: "smtp" },
    mailHost: { type: String, default: "" },
    mailPort: { type: Number, default: 465 },
    mailUsername: { type: String, default: "" },
    mailPassword: { type: String, default: "" },
    mailEncryption: { type: String, default: "ssl" },
    mailFromAddress: { type: String, default: "" },
    mailFromName: { type: String, default: "TestPrepKart" },
    // Notifications: recipient addresses (comma-separated for multiple)
    leadExportMailTo: { type: String, default: "" },
    // Reserved for future: e.g. notificationMailTo, formSubmissionMailTo
  },
  { timestamps: true }
);

const EmailSettings =
  mongoose.models.EmailSettings ||
  mongoose.model("EmailSettings", emailSettingsSchema);
export default EmailSettings;
