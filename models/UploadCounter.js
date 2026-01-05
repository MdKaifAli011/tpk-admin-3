import mongoose from "mongoose";

const uploadCounterSchema = new mongoose.Schema(
  {
    path: { type: String, required: true, unique: true, trim: true },
    last: { type: Number, default: 0 },
  },
  { timestamps: true }
);



const UploadCounter = mongoose.models.UploadCounter || mongoose.model("UploadCounter", uploadCounterSchema);

export default UploadCounter;
