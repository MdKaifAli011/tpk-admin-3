import mongoose from "mongoose";
import { createSlug, generateUniqueSlug } from "../utils/serverSlug.js";

const STORE_CATEGORIES = ["course", "ebook", "paper"];
const STATUSES = ["active", "inactive", "draft"];

const courseDetailSchema = new mongoose.Schema(
  { label: String, value: String },
  { _id: false }
);

const featureCardSchema = new mongoose.Schema(
  { icon: String, title: String, desc: String },
  { _id: false }
);

const faqItemSchema = new mongoose.Schema(
  { q: String, a: String },
  { _id: false }
);

const storeProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      enum: STORE_CATEGORIES,
      index: true,
    },
    subject: {
      type: String,
      trim: true,
      default: "",
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    originalPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviews: {
      type: Number,
      default: 0,
      min: 0,
    },
    image: {
      type: String,
      trim: true,
      default: "",
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    features: {
      type: [String],
      default: [],
    },
    badge: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: STATUSES,
      default: "active",
      index: true,
    },
    orderNumber: {
      type: Number,
      default: 0,
      index: true,
    },
    courseDetails: {
      type: [courseDetailSchema],
      default: undefined,
    },
    featureCards: {
      type: [featureCardSchema],
      default: undefined,
    },
    faq: {
      type: [faqItemSchema],
      default: undefined,
    },
  },
  { timestamps: true }
);

storeProductSchema.index({ status: 1, orderNumber: 1, createdAt: -1 });
storeProductSchema.index({ status: 1, category: 1 });

storeProductSchema.pre("save", async function (next) {
  if (this.isModified("name") && !this.slug) {
    this.slug = createSlug(this.name);
  }
  if (this.isModified("slug") && this.slug) {
    const StoreProduct = mongoose.model("StoreProduct");
    const excludeId = this._id?.toString();
    const exists = await StoreProduct.findOne({
      slug: this.slug,
      _id: excludeId ? { $ne: this._id } : undefined,
    });
    if (exists) {
      this.slug = await generateUniqueSlug(
        this.slug,
        (s, excl) =>
          StoreProduct.findOne(
            excl ? { slug: s, _id: { $ne: excl } } : { slug: s }
          ).then((doc) => !!doc),
        excludeId
      );
    }
  }
  next();
});

const StoreProduct =
  mongoose.models.StoreProduct ||
  mongoose.model("StoreProduct", storeProductSchema);

export default StoreProduct;
export { STORE_CATEGORIES, STATUSES };
