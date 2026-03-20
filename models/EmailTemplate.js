import mongoose from "mongoose";

const emailTemplateSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    subject: { type: String, default: "", trim: true },
    bodyText: { type: String, default: "" },
    bodyHtml: { type: String, default: "" },
    placeholders: [{ type: String, trim: true }],
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const EmailTemplate =
  mongoose.models.EmailTemplate ||
  mongoose.model("EmailTemplate", emailTemplateSchema);
export default EmailTemplate;
