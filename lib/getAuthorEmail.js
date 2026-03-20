/**
 * Resolve discussion author (or subscriber) id + type to email.
 * Used for sending emails to thread/reply authors and thread subscribers.
 * Server-side only (uses DB).
 */
import connectDB from "@/lib/mongodb";
import Student from "@/models/Student";
import User from "@/models/User";
import mongoose from "mongoose";

/**
 * Get email for a discussion author.
 * @param {string|ObjectId} authorId - Author _id
 * @param {string} authorType - "Student" | "User" | "Guest"
 * @returns {Promise<string|null>} Email or null (e.g. for Guest or missing user)
 */
export async function getAuthorEmail(authorId, authorType) {
  if (!authorId || !authorType) return null;
  if (authorType === "Guest") return null;
  const id = typeof authorId === "string" ? authorId : authorId?.toString?.();
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
  try {
    await connectDB();
    if (authorType === "Student") {
      const s = await Student.findById(id).select("email").lean();
      return s?.email || null;
    }
    if (authorType === "User") {
      const u = await User.findById(id).select("email").lean();
      return u?.email || null;
    }
  } catch (e) {
    console.error("getAuthorEmail error:", e);
  }
  return null;
}

/**
 * Resolve multiple subscriber ids to emails. Subscribers are stored as string ids
 * (could be Student or User ObjectId). Try Student first, then User; skip invalid or Guest.
 * @param {string[]} subscriberIds - Array of id strings
 * @returns {Promise<string[]>} Deduplicated list of emails
 */
export async function getSubscriberEmails(subscriberIds) {
  if (!Array.isArray(subscriberIds) || subscriberIds.length === 0) return [];
  const emails = new Set();
  await connectDB();
  for (const id of subscriberIds) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) continue;
    const s = await Student.findById(id).select("email").lean();
    if (s?.email) {
      emails.add(s.email);
      continue;
    }
    const u = await User.findById(id).select("email").lean();
    if (u?.email) emails.add(u.email);
  }
  return [...emails];
}
