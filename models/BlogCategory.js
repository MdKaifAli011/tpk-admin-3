import mongoose from "mongoose";
import Exam from "./Exam.js";

const blogCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    // Optional: Order number for category within an exam
    orderNumber: {
      type: Number,
      min: 1,
    },
    // Optional: Description for the category
    description: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

// Ensure unique category name per exam
blogCategorySchema.index({ examId: 1, name: 1 }, { unique: true });

// Index for better query performance
blogCategorySchema.index({ examId: 1, status: 1 });
blogCategorySchema.index({ status: 1 });
blogCategorySchema.index({ createdAt: -1 });

// Ensure unique ordering per exam only when orderNumber is set
blogCategorySchema.index(
  { examId: 1, orderNumber: 1 },
  { unique: true, partialFilterExpression: { orderNumber: { $exists: true } } }
);

// Cascading delete: When a BlogCategory is deleted, update blogs to remove category reference
blogCategorySchema.pre("findOneAndDelete", async function () {
  try {
    const category = await this.model.findOne(this.getQuery());
    if (category) {
      console.log(
        `🗑️ Cascading delete: Deleting blog category ${category._id}`
      );
      // Get Blog model - dynamically import if not already registered
      const Blog = mongoose.models.Blog || (await import("./Blog.js")).default;

      // Update all blogs with this category to remove the category reference
      const updateResult = await Blog.updateMany(
        { categoryId: category._id },
        { $unset: { categoryId: "" } }
      );

      console.log(
        `🗑️ Cascading delete: Updated ${updateResult.modifiedCount} blogs to remove category reference`
      );
    }
  } catch (error) {
    console.error(
      "❌ Error in BlogCategory cascading delete middleware:",
      error
    );
    // Don't throw - allow the delete to continue even if cascading fails
  }
});

// Ensure the latest schema is used during dev hot-reload
if (mongoose.connection?.models?.BlogCategory) {
  delete mongoose.connection.models.BlogCategory;
}

const BlogCategory = mongoose.model("BlogCategory", blogCategorySchema);

export default BlogCategory;
