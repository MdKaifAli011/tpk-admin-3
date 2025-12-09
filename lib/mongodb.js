import mongoose from "mongoose";
import { config } from "@/config/config";
import { logger } from "@/utils/logger";

// Connection state
let isConnected = false;
let connectionPromise = null;
let eventHandlersRegistered = false;

// Optimized connection options
const connectionOptions = {
  dbName: config.mongoDbName,
  maxPoolSize: parseInt(process.env.MAX_CONNECTIONS || "10"),
  serverSelectionTimeoutMS: parseInt(process.env.CONNECTION_TIMEOUT || "30000"),
  socketTimeoutMS: 45000,
  // Enable connection pooling
  minPoolSize: 2,
  // Retry configuration
  retryWrites: true,
  retryReads: true,
  // Performance optimizations
  compressors: ["zlib"],
  zlibCompressionLevel: 6,
};

export const connectDB = async () => {
  // Return existing connection if already connected
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // Return existing connection promise if connection is in progress
  if (connectionPromise) {
    return connectionPromise;
  }

  // Create new connection promise
  connectionPromise = (async () => {
    try {
      if (mongoose.connection.readyState === 0) {
        logger.info("🔄Connecting to MongoDB...");
        await mongoose.connect(config.mongoUri, connectionOptions);
        isConnected = true;
        logger.info("✅Connected to MongoDB successfully");
      }

      // Handle connection events (register only once)
      if (!eventHandlersRegistered) {
        mongoose.connection.on("connected", () => {
          isConnected = true;
          logger.info("✅MongoDB connected");
        });

        mongoose.connection.on("error", (err) => {
          isConnected = false;
          logger.error("❌MongoDB connection error:", err);
        });

        mongoose.connection.on("disconnected", () => {
          isConnected = false;
          logger.warn("⚠️MongoDB disconnected");
        });

        // Handle process termination (register only once)
        process.on("SIGINT", async () => {
          await mongoose.connection.close();
          logger.info("MongoDB connection closed through app termination");
          process.exit(0);
        });

        eventHandlersRegistered = true;
      }

      return mongoose.connection;
    } catch (error) {
      isConnected = false;
      connectionPromise = null;
      logger.error("❌Error connecting to MongoDB:", error);
      throw error;
    }
  })();

  return connectionPromise;
};

export default connectDB;
