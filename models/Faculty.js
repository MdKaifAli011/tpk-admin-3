import mongoose from "mongoose";

const facultySchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    imageUrl: {
      type: String,
      trim: true,
      default: "",
    },
    orderNumber: {
      type: Number,
      default: 0,
      index: true,
    },
  },
  { timestamps: true }
);

facultySchema.index({ examId: 1, orderNumber: 1 });

export default mongoose.models.Faculty || mongoose.model("Faculty", facultySchema);
