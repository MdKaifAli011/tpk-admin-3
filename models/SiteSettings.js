import mongoose from "mongoose";

const siteSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    // Custom code to inject in <head> (e.g. Google tag gtag.js)
    headerCode: {
      type: String,
      default: "",
    },
    // Custom code to inject before </body> (e.g. analytics, chat widgets)
    footerCode: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const SiteSettings =
  mongoose.models.SiteSettings ||
  mongoose.model("SiteSettings", siteSettingsSchema);
export default SiteSettings;
