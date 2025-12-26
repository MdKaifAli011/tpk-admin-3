import mongoose from "mongoose";

const orderCounterSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    last: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

// Ensure model reloading in dev
if (mongoose.connection?.models?.OrderCounter) {
  delete mongoose.connection.models.OrderCounter;
}

const OrderCounter = mongoose.model("OrderCounter", orderCounterSchema);

export default OrderCounter;
