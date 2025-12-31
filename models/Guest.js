import mongoose from "mongoose";

const guestSchema = new mongoose.Schema(
    {
        name: String,
        guestId: String,
    },
    { strict: false, timestamps: true }
);

const Guest = mongoose.models.Guest || mongoose.model("Guest", guestSchema);

export default Guest;
