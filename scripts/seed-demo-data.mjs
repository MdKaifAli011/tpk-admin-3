import dotenv from "dotenv";
import mongoose from "mongoose";

import User from "../models/User.js";
import Exam from "../models/Exam.js";
import ExamDetails from "../models/ExamDetails.js";
import Subject from "../models/Subject.js";
import SubjectDetails from "../models/SubjectDetails.js";
import Unit from "../models/Unit.js";
import UnitDetails from "../models/UnitDetails.js";
import Chapter from "../models/Chapter.js";
import ChapterDetails from "../models/ChapterDetails.js";
import Topic from "../models/Topic.js";
import TopicDetails from "../models/TopicDetails.js";
import SubTopic from "../models/SubTopic.js";
import SubTopicDetails from "../models/SubTopicDetails.js";
import Definition from "../models/Definition.js";
import DefinitionDetails from "../models/DefinitionDetails.js";
import BlogCategory from "../models/BlogCategory.js";
import Blog from "../models/Blog.js";
import BlogDetails from "../models/BlogDetails.js";
import Course from "../models/Course.js";
import Page from "../models/Page.js";
import Form from "../models/Form.js";
import SiteSettings from "../models/SiteSettings.js";
import Notification from "../models/Notification.js";
import StoreProduct from "../models/StoreProduct.js";

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

async function upsertDetails(Model, key, id, payload) {
  return Model.findOneAndUpdate(
    { [key]: id },
    { $set: payload },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function seedAdminUser() {
  const existing = await User.findOne({ email: ADMIN_EMAIL }).select("+password");
  if (!existing) {
    await User.create({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role: "admin",
      status: "active",
    });
    return "created";
  }

  existing.name = ADMIN_NAME;
  existing.password = ADMIN_PASSWORD;
  existing.role = "admin";
  existing.status = "active";
  await existing.save();
  return "updated";
}

async function seedHierarchy() {
  const exam = await Exam.findOneAndUpdate(
    { name: "NEET Demo" },
    {
      $set: {
        orderNumber: 1,
        status: "active",
        image: "/self-study/logo.png",
        description: [
          "Demo exam for local validation",
          "Used by automated smoke checks",
        ],
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await upsertDetails(ExamDetails, "examId", exam._id, {
    content: "<p>NEET Demo exam overview content.</p>",
    title: "NEET Demo Exam",
    metaDescription: "Demo exam details for local testing.",
    keywords: "neet,demo,exam",
    status: "publish",
  });

  const subject = await Subject.findOneAndUpdate(
    { examId: exam._id, name: "Biology Demo" },
    {
      $set: { orderNumber: 1, status: "active" },
      $setOnInsert: { slug: "biology-demo" },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await upsertDetails(SubjectDetails, "subjectId", subject._id, {
    content: "<p>Biology demo subject content.</p>",
    title: "Biology Demo Subject",
    metaDescription: "Demo subject details.",
    keywords: "biology,demo,subject",
    status: "publish",
  });

  const unit = await Unit.findOneAndUpdate(
    { examId: exam._id, subjectId: subject._id, name: "Cell Biology Unit" },
    {
      $set: { orderNumber: 1, status: "active", time: 120, weightage: 30 },
      $setOnInsert: { slug: "cell-biology-unit" },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await upsertDetails(UnitDetails, "unitId", unit._id, {
    content: "<p>Unit demo details.</p>",
    title: "Cell Biology Unit",
    metaDescription: "Demo unit details.",
    keywords: "unit,cell biology,demo",
    status: "publish",
  });

  const chapter = await Chapter.findOneAndUpdate(
    { examId: exam._id, subjectId: subject._id, unitId: unit._id, name: "Cell Structure Chapter" },
    {
      $set: { orderNumber: 1, status: "active", time: 60, weightage: 20, questions: 25 },
      $setOnInsert: { slug: "cell-structure-chapter" },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await upsertDetails(ChapterDetails, "chapterId", chapter._id, {
    content: "<p>Chapter demo details.</p>",
    title: "Cell Structure",
    metaDescription: "Demo chapter details.",
    keywords: "chapter,cell structure,demo",
    status: "publish",
  });

  const topic = await Topic.findOneAndUpdate(
    { examId: exam._id, subjectId: subject._id, unitId: unit._id, chapterId: chapter._id, name: "Cell Membrane Topic" },
    {
      $set: { orderNumber: 1, status: "active", time: 30, weightage: 10 },
      $setOnInsert: { slug: "cell-membrane-topic" },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await upsertDetails(TopicDetails, "topicId", topic._id, {
    content: "<p>Topic demo details.</p>",
    title: "Cell Membrane",
    metaDescription: "Demo topic details.",
    keywords: "topic,cell membrane,demo",
    status: "publish",
  });

  const subTopic = await SubTopic.findOneAndUpdate(
    {
      examId: exam._id,
      subjectId: subject._id,
      unitId: unit._id,
      chapterId: chapter._id,
      topicId: topic._id,
      name: "Phospholipid Bilayer SubTopic",
    },
    {
      $set: { orderNumber: 1, status: "active", time: 15, weightage: 5 },
      $setOnInsert: { slug: "phospholipid-bilayer-subtopic" },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await upsertDetails(SubTopicDetails, "subTopicId", subTopic._id, {
    content: "<p>SubTopic demo details.</p>",
    title: "Phospholipid Bilayer",
    metaDescription: "Demo subtopic details.",
    keywords: "subtopic,phospholipid bilayer,demo",
    status: "publish",
  });

  const definition = await Definition.findOneAndUpdate(
    {
      examId: exam._id,
      subjectId: subject._id,
      unitId: unit._id,
      chapterId: chapter._id,
      topicId: topic._id,
      subTopicId: subTopic._id,
      name: "Fluid Mosaic Model Definition",
    },
    {
      $set: { orderNumber: 1, status: "active", time: 10, weightage: 4 },
      $setOnInsert: { slug: "fluid-mosaic-model-definition" },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await upsertDetails(DefinitionDetails, "definitionId", definition._id, {
    content: "<p>Definition demo details.</p>",
    title: "Fluid Mosaic Model",
    metaDescription: "Demo definition details.",
    keywords: "definition,fluid mosaic model,demo",
    status: "publish",
  });

  return { exam, subject, unit, chapter, topic, subTopic, definition };
}

async function seedContent(exam, hierarchy) {
  const blogCategory = await BlogCategory.findOneAndUpdate(
    { examId: exam._id, name: "Study Tips" },
    {
      $set: {
        status: "active",
        orderNumber: 1,
        description: "Tips for better preparation.",
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  let blog = await Blog.findOne({ name: "How to Prepare Biology Fast" });
  if (!blog) {
    blog = await Blog.create({
      name: "How to Prepare Biology Fast",
      category: "Study Tips",
      categoryId: blogCategory._id,
      examId: exam._id,
      status: "active",
      image: "/self-study/logo.png",
      author: "Admin",
      publishDate: new Date(),
      assignmentLevel: "topic",
      assignmentSubjectId: hierarchy.subject._id,
      assignmentUnitId: hierarchy.unit._id,
      assignmentChapterId: hierarchy.chapter._id,
      assignmentTopicId: hierarchy.topic._id,
    });
  } else {
    blog.category = "Study Tips";
    blog.categoryId = blogCategory._id;
    blog.examId = exam._id;
    blog.status = "active";
    blog.image = "/self-study/logo.png";
    blog.author = "Admin";
    blog.publishDate = new Date();
    blog.assignmentLevel = "topic";
    blog.assignmentSubjectId = hierarchy.subject._id;
    blog.assignmentUnitId = hierarchy.unit._id;
    blog.assignmentChapterId = hierarchy.chapter._id;
    blog.assignmentTopicId = hierarchy.topic._id;
    await blog.save();
  }

  await upsertDetails(BlogDetails, "blogId", blog._id, {
    content: "<p>Focus on NCERT and revise with active recall.</p>",
    title: "How to Prepare Biology Fast",
    metaDescription: "Demo blog details for local testing.",
    shortDescription: "Quick strategy for NEET biology prep.",
    keywords: "neet,biology,study tips,demo",
    tags: "NEET, Biology, Tips",
    status: "publish",
  });

  await Course.findOneAndUpdate(
    { examId: exam._id, title: "NEET Biology Crash Course" },
    {
      $set: {
        status: "active",
        shortDescription: "Rapid revision crash course.",
        hours: "40h",
        lessonsRange: "30-40",
        durationLabel: "8 weeks",
        createdBy: "Admin",
        price: 4999,
        rating: 4.8,
        reviewCount: 120,
        image: "/self-study/logo.png",
        content: "<p>Comprehensive crash course syllabus.</p>",
        metaTitle: "NEET Biology Crash Course",
        metaDescription: "Demo course for local validation.",
        keywords: "neet,course,biology,demo",
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await Page.findOneAndUpdate(
    { exam: exam._id, title: "About NEET Demo" },
    {
      $set: {
        status: "active",
        content: "<p>This is a demo page for test data.</p>",
        metaTitle: "About NEET Demo",
        metaDescription: "Demo page content.",
        keywords: "neet,demo,page",
        deletedAt: null,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await StoreProduct.findOneAndUpdate(
    { name: "NEET Biology Practice Pack" },
    {
      $set: {
        category: "paper",
        subject: "Biology",
        price: 999,
        originalPrice: 1499,
        rating: 4.7,
        reviews: 52,
        image: "/self-study/logo.png",
        description: "Practice pack for NEET biology.",
        features: ["Topic-wise", "Timed tests", "Solutions included"],
        badge: "Best Seller",
        status: "active",
        orderNumber: 1,
      },
      $setOnInsert: { slug: "neet-biology-practice-pack" },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await Form.findOneAndUpdate(
    { formId: "demo-lead-form" },
    {
      $set: {
        formName: "Demo Lead Form",
        description: "Sample form for lead capture.",
        status: "active",
        highlightInLeads: true,
        fields: [
          {
            fieldId: "name",
            type: "text",
            label: "Full Name",
            name: "name",
            required: true,
            order: 1,
          },
          {
            fieldId: "email",
            type: "email",
            label: "Email",
            name: "email",
            required: true,
            order: 2,
          },
          {
            fieldId: "phone",
            type: "tel",
            label: "Phone",
            name: "phone",
            required: true,
            order: 3,
          },
        ],
        settings: {
          title: "Get Counseling",
          description: "Request a call back from our team.",
          buttonText: "Submit",
          buttonColor: "#2563eb",
          successMessage: "Request submitted successfully.",
          modal: true,
          showVerification: true,
        },
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await SiteSettings.findOneAndUpdate(
    { key: "custom_code" },
    {
      $set: {
        headerCode: "",
        footerCode: "",
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await Notification.findOneAndUpdate(
    { slug: "neet-demo-announcement" },
    {
      $set: {
        entityType: "exam_with_children",
        entityId: exam._id,
        title: "NEET Demo Content Available",
        message: "Sample data has been seeded for testing.",
        stripMessage: "NEET demo dataset is ready.",
        link: `/neet-demo/pages/about-neet-demo`,
        linkLabel: "View",
        status: "active",
        iconType: "announcement",
        orderNumber: 1,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
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

  const adminState = await seedAdminUser();
  const hierarchy = await seedHierarchy();
  await seedContent(hierarchy.exam, hierarchy);

  const counts = {
    users: await User.countDocuments(),
    exams: await Exam.countDocuments(),
    subjects: await Subject.countDocuments(),
    units: await Unit.countDocuments(),
    chapters: await Chapter.countDocuments(),
    topics: await Topic.countDocuments(),
    subTopics: await SubTopic.countDocuments(),
    definitions: await Definition.countDocuments(),
    blogs: await Blog.countDocuments(),
    courses: await Course.countDocuments(),
    pages: await Page.countDocuments(),
    forms: await Form.countDocuments(),
    notifications: await Notification.countDocuments(),
    storeProducts: await StoreProduct.countDocuments(),
  };

  console.log(
    JSON.stringify(
      {
        ok: true,
        admin: { email: ADMIN_EMAIL, action: adminState },
        seededExam: hierarchy.exam.name,
        counts,
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
      console.error("Seed failed: MongoDB is not running.");
      console.error("Start MongoDB first, then run: npm run seed:demo");
    } else {
      console.error("Seed failed:", err?.message || err);
    }
    try {
      await mongoose.connection.close();
    } catch {}
    process.exit(1);
  });
