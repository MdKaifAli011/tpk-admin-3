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

// Cascading delete: When a BlogCategory is deleted, delete all blogs in that category
// This will also trigger Blog's cascading delete middleware to remove BlogDetails
blogCategorySchema.pre("findOneAndDelete", async function () {
  try {
    const category = await this.model.findOne(this.getQuery());
    if (category) {
      console.log(
        `🗑️ Cascading delete: Deleting blog category ${category._id}`
      );
      // Get Blog model - dynamically import if not already registered
      const Blog = mongoose.models.Blog || (await import("./Blog.js")).default;

      // Find all blogs with this category
      const blogsToDelete = await Blog.find({
        categoryId: category._id,
      }).select("_id");

      if (blogsToDelete.length > 0) {
        // Delete each blog individually to trigger Blog's cascading delete middleware
        // This ensures BlogDetails are properly deleted via Blog's pre("findOneAndDelete") hook
        let deletedCount = 0;
        for (const blog of blogsToDelete) {
          try {
            await Blog.findByIdAndDelete(blog._id);
            deletedCount++;
            console.log(
              `🗑️ Cascading delete: Deleted blog ${blog._id} (BlogDetails auto-deleted)`
            );
          } catch (blogError) {
            console.error(`❌ Error deleting blog ${blog._id}:`, blogError);
          }
        }

        console.log(
          `🗑️ Cascading delete: Deleted ${deletedCount} blog(s) associated with category ${category._id}`
        );
      } else {
        console.log(
          `🗑️ Cascading delete: No blogs found for category ${category._id}`
        );
      }
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
