import mongoose from "mongoose";
import { config } from "../config/config.js";
import { logger } from "../utils/logger.js";

// Connection state
let isConnected = false;
let connectionPromise = null;
let eventHandlersRegistered = false;
let lastConnectErrorAt = 0;
let lastConnectErrorMessage = "";

// Store listener references for cleanup
const eventListeners = {
  connected: null,
  error: null,
  disconnected: null,
  sigint: null,
};

// Cleanup function to remove event listeners
function removeEventListeners() {
  if (eventListeners.connected) {
    mongoose.connection.removeListener("connected", eventListeners.connected);
    eventListeners.connected = null;
  }
  if (eventListeners.error) {
    mongoose.connection.removeListener("error", eventListeners.error);
    eventListeners.error = null;
  }
  if (eventListeners.disconnected) {
    mongoose.connection.removeListener("disconnected", eventListeners.disconnected);
    eventListeners.disconnected = null;
  }
  if (eventListeners.sigint) {
    process.removeListener("SIGINT", eventListeners.sigint);
    eventListeners.sigint = null;
  }
}

// Disconnect function for proper cleanup
export async function disconnectDB() {
  removeEventListeners();
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    isConnected = false;
    logger.info("MongoDB disconnected");
  }
}

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

function logConnectionError(error) {
  const message = error?.message || String(error);
  const now = Date.now();

  // Avoid flooding logs with the same connection failure on every request.
  if (message === lastConnectErrorMessage && now - lastConnectErrorAt < 30000) {
    return;
  }

  lastConnectErrorAt = now;
  lastConnectErrorMessage = message;
  logger.error("❌Error connecting to MongoDB:", { message });
}

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
      // Remove old listeners before adding new ones (prevents accumulation on hot reload)
      if (eventHandlersRegistered) {
        removeEventListeners();
      }

      if (!eventHandlersRegistered) {
        // Create listener functions and store references
        eventListeners.connected = () => {
          isConnected = true;
          logger.info("✅MongoDB connected");
        };
        eventListeners.error = (err) => {
          isConnected = false;
          logger.error("❌MongoDB connection error:", {
            message: err?.message || String(err),
          });
        };
        eventListeners.disconnected = () => {
          isConnected = false;
          logger.warn("⚠️MongoDB disconnected");
        };
        eventListeners.sigint = async () => {
          await disconnectDB();
          logger.info("MongoDB connection closed through app termination");
          process.exit(0);
        };

        // Register listeners with stored references
        mongoose.connection.on("connected", eventListeners.connected);
        mongoose.connection.on("error", eventListeners.error);
        mongoose.connection.on("disconnected", eventListeners.disconnected);
        process.on("SIGINT", eventListeners.sigint);

        eventHandlersRegistered = true;
      }

      return mongoose.connection;
    } catch (error) {
      isConnected = false;
      connectionPromise = null;
      logConnectionError(error);
      throw error;
    }
  })();

  return connectionPromise;
};

export default connectDB;
