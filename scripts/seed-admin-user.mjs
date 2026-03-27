import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../models/User.js";

dotenv.config();

const ADMIN_EMAIL = "admin@testprepkart.com";
const ADMIN_PASSWORD = "testprepkart@admin";
const ADMIN_NAME = "TestprepKart Admin";

function isMongoConnectionError(err) {
  const message = String(err?.message || "");
  return (
    err?.name === "MongooseServerSelectionError" ||
    message.includes("ECONNREFUSED") ||
    message.includes("Server selection timed out")
  );
}

async function run() {
  const mongoUri = process.env.MONGODB_URI;
  const dbName = process.env.MONGO_DB_NAME;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is required in .env");
  }

  await mongoose.connect(mongoUri, {
    dbName,
    serverSelectionTimeoutMS: 10000,
  });

  const existing = await User.findOne({ email: ADMIN_EMAIL }).select(
    "+password"
  );
  if (!existing) {
    await User.create({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role: "admin",
      status: "active",
    });
    console.log(`Created admin user: ${ADMIN_EMAIL}`);
  } else {
    existing.name = ADMIN_NAME;
    existing.password = ADMIN_PASSWORD;
    existing.role = "admin";
    existing.status = "active";
    await existing.save();
    console.log(`Updated admin user: ${ADMIN_EMAIL}`);
  }
}

run()
  .then(async () => {
    await mongoose.connection.close();
    process.exit(0);
  })
  .catch(async (err) => {
    if (isMongoConnectionError(err)) {
      console.error("Failed to seed admin user: MongoDB is not running.");
      console.error("Start MongoDB first, then run: npm run seed:admin");
      console.error("Expected URI source: MONGODB_URI from your .env file.");
    } else {
      console.error("Failed to seed admin user:", err?.message || err);
    }
    try {
      await mongoose.connection.close();
    } catch {}
    process.exit(1);
  });
