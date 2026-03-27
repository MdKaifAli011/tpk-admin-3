import dotenv from "dotenv";
import mongoose from "mongoose";

import User from "../models/User.js";
import Exam from "../models/Exam.js";
import Subject from "../models/Subject.js";
import Unit from "../models/Unit.js";
import Chapter from "../models/Chapter.js";
import Topic from "../models/Topic.js";
import SubTopic from "../models/SubTopic.js";
import Definition from "../models/Definition.js";
import BlogCategory from "../models/BlogCategory.js";
import Blog from "../models/Blog.js";
import BlogDetails from "../models/BlogDetails.js";
import Course from "../models/Course.js";
import Page from "../models/Page.js";
import StoreProduct from "../models/StoreProduct.js";
import Form from "../models/Form.js";
import Notification from "../models/Notification.js";

dotenv.config();

function isMongoConnectionError(err) {
  const message = String(err?.message || "");
  return (
    err?.name === "MongooseServerSelectionError" ||
    message.includes("ECONNREFUSED") ||
    message.includes("Server selection timed out")
  );
}

async function run() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGO_DB_NAME;
  if (!uri) {
    throw new Error("MONGODB_URI is missing in .env");
  }

  await mongoose.connect(uri, {
    dbName,
    serverSelectionTimeoutMS: 10000,
  });

  const [adminUser, exam, subject, unit, chapter, topic, subtopic, definition] =
    await Promise.all([
      User.findOne({ email: "admin@testprepkart.com", role: "admin", status: "active" }).lean(),
      Exam.findOne({ slug: "neet-demo", status: "active" }).lean(),
      Subject.findOne({ slug: "biology-demo", status: "active" }).lean(),
      Unit.findOne({ slug: "cell-biology-unit", status: "active" }).lean(),
      Chapter.findOne({ slug: "cell-structure-chapter", status: "active" }).lean(),
      Topic.findOne({ slug: "cell-membrane-topic", status: "active" }).lean(),
      SubTopic.findOne({ slug: "phospholipid-bilayer-subtopic", status: "active" }).lean(),
      Definition.findOne({ slug: "fluid-mosaic-model-definition", status: "active" }).lean(),
    ]);

  if (!adminUser) throw new Error("Admin user missing: admin@testprepkart.com");
  if (!exam) throw new Error("Missing demo exam");
  if (!subject) throw new Error("Missing demo subject");
  if (!unit) throw new Error("Missing demo unit");
  if (!chapter) throw new Error("Missing demo chapter");
  if (!topic) throw new Error("Missing demo topic");
  if (!subtopic) throw new Error("Missing demo subtopic");
  if (!definition) throw new Error("Missing demo definition");

  const counts = await Promise.all([
    BlogCategory.countDocuments({ examId: exam._id }),
    Blog.countDocuments({ examId: exam._id }),
    BlogDetails.countDocuments({}),
    Course.countDocuments({ examId: exam._id }),
    Page.countDocuments({ slug: "about-neet-demo", status: "active" }),
    StoreProduct.countDocuments({ slug: "neet-biology-practice-pack", status: "active" }),
    Form.countDocuments({ formId: "demo-lead-form", status: "active" }),
    Notification.countDocuments({ slug: "neet-demo-announcement", status: "active" }),
  ]);

  const [
    blogCategoryCount,
    blogCount,
    blogDetailsCount,
    courseCount,
    pageCount,
    storeCount,
    formCount,
    notificationCount,
  ] = counts;

  if (blogCategoryCount < 1) throw new Error("Missing demo blog category");
  if (blogCount < 1) throw new Error("Missing demo blog");
  if (blogDetailsCount < 1) throw new Error("Missing blog details");
  if (courseCount < 1) throw new Error("Missing demo course");
  if (pageCount < 1) throw new Error("Missing demo page");
  if (storeCount < 1) throw new Error("Missing demo store product");
  if (formCount < 1) throw new Error("Missing demo form");
  if (notificationCount < 1) throw new Error("Missing demo notification");

  console.log("Smoke check passed.");
  console.log(
    JSON.stringify(
      {
        admin: adminUser.email,
        hierarchy: {
          exam: exam.slug,
          subject: subject.slug,
          unit: unit.slug,
          chapter: chapter.slug,
          topic: topic.slug,
          subtopic: subtopic.slug,
          definition: definition.slug,
        },
        extras: {
          blogCategoryCount,
          blogCount,
          blogDetailsCount,
          courseCount,
          pageCount,
          storeCount,
          formCount,
          notificationCount,
        },
      },
      null,
      2
    )
  );
}

run()
  .then(async () => {
    await mongoose.connection.close();
    process.exit(0);
  })
  .catch(async (err) => {
    if (isMongoConnectionError(err)) {
      console.error("Smoke check failed: MongoDB is not running.");
      console.error("Start MongoDB first, then run: npm run setup:local");
    } else {
      console.error("Smoke check failed:", err?.message || err);
    }
    try {
      await mongoose.connection.close();
    } catch {}
    process.exit(1);
  });
