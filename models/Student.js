import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const studentSchema = new mongoose.Schema(
  {
    // Numeric public student id (not Mongo ObjectId). Auto-assigned on save.
    // Used for things like folder naming: /discussion/[examName]/[studentId]/...
    publicId: {
      type: Number,
      default: null,
    },
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // Don't return password by default
    },
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    className: {
      type: String,
      required: [true, "Class name is required"],
      trim: true,
    },
    prepared: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    lastLogin: {
      type: Date,
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
    },
  },
  { timestamps: true }
);

// Hash password before saving
studentSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Assign sequential numeric publicId on first save (if missing)
studentSchema.pre("save", async function (next) {
  if (this.publicId !== null && this.publicId !== undefined) return next();
  try {
    const UploadCounter =
      mongoose.models.UploadCounter ||
      (await import("./UploadCounter.js")).default;
    const counter = await UploadCounter.findOneAndUpdate(
      { path: "student/publicId" },
      { $inc: { last: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    this.publicId = counter?.last ?? 1;
    return next();
  } catch (error) {
    return next(error);
  }
});

// Method to compare password
studentSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to get student without password
studentSchema.methods.toJSON = function () {
  const studentObject = this.toObject();
  delete studentObject.password;
  return studentObject;
};

// Indexes for performance
// Note: email index is automatically created by unique: true
studentSchema.index({ status: 1 });
studentSchema.index({ className: 1 });
studentSchema.index({ prepared: 1 });
studentSchema.index({ publicId: 1 }, { unique: true, sparse: true });

// Helper function to perform cascading delete for a student
// This ensures all related data is deleted when a student is removed
async function cascadeDeleteStudent(studentId) {
  // Get all related models - dynamically import if not already registered
  const StudentProgress =
    mongoose.models.StudentProgress ||
    (await import("./StudentProgress.js")).default;
  const SubjectProgress =
    mongoose.models.SubjectProgress ||
    (await import("./SubjectProgress.js")).default;
  const StudentTestResult =
    mongoose.models.StudentTestResult ||
    (await import("./StudentTestResult.js")).default;

  console.log(
    `🗑️ Cascading delete: Deleting all data for student ${studentId}`
  );

  // Delete in order (child documents first, then parent)
  // Order: StudentTestResult → SubjectProgress → StudentProgress → Student

  // 1. Delete all StudentTestResult documents (test results, scores, answers)
  const testResultsResult = await StudentTestResult.deleteMany({
    studentId: studentId,
  });
  console.log(
    `🗑️ Cascading delete: Deleted ${testResultsResult.deletedCount} StudentTestResult documents for student ${studentId}`
  );

  // 2. Delete all SubjectProgress documents (subject-level progress)
  const subjectProgressResult = await SubjectProgress.deleteMany({
    studentId: studentId,
  });
  console.log(
    `🗑️ Cascading delete: Deleted ${subjectProgressResult.deletedCount} SubjectProgress documents for student ${studentId}`
  );

  // 3. Delete all StudentProgress documents (unit/chapter progress, visited items)
  const studentProgressResult = await StudentProgress.deleteMany({
    studentId: studentId,
  });
  console.log(
    `🗑️ Cascading delete: Deleted ${studentProgressResult.deletedCount} StudentProgress documents for student ${studentId}`
  );

  // Note: Lead data is NOT deleted (marketing/sales data persists)
  // Lead relationship is one-way (Student → Lead), no cleanup needed

  console.log(
    `✅ Cascading delete completed for student ${studentId}. Summary: ${testResultsResult.deletedCount} test results, ${subjectProgressResult.deletedCount} subject progress, ${studentProgressResult.deletedCount} student progress deleted. Lead data preserved.`
  );

  return {
    testResults: testResultsResult.deletedCount,
    subjectProgress: subjectProgressResult.deletedCount,
    studentProgress: studentProgressResult.deletedCount,
  };
}

// Cascading delete: When a Student is deleted, delete all related data
// Deletes: StudentProgress, SubjectProgress, StudentTestResult
// Keeps: Lead data (marketing/sales data persists)
// 
// This hook covers: findOneAndDelete(), findByIdAndDelete()
studentSchema.pre("findOneAndDelete", async function () {
  try {
    const student = await this.model.findOne(this.getQuery());
    if (student) {
      await cascadeDeleteStudent(student._id);
    }
  } catch (error) {
    console.error(
      "❌ Error in Student cascading delete middleware (findOneAndDelete):",
      error
    );
    throw error; // Prevent deletion if cascading fails
  }
});

// Cascading delete for deleteOne() operations
// This hook covers: deleteOne() when called on a single document
studentSchema.pre("deleteOne", { document: true, query: false }, async function () {
  try {
    if (this._id) {
      await cascadeDeleteStudent(this._id);
    }
  } catch (error) {
    console.error(
      "❌ Error in Student cascading delete middleware (deleteOne):",
      error
    );
    throw error; // Prevent deletion if cascading fails
  }
});

// Cascading delete for deleteMany() and deleteOne() query operations
// This hook covers: deleteMany(), deleteOne() when called as query
studentSchema.pre(["deleteOne", "deleteMany"], { document: false, query: true }, async function () {
  try {
    const query = this.getQuery();
    // Extract student IDs from the query
    let studentIds = [];
    
    if (query._id) {
      // Single ID or array of IDs
      studentIds = Array.isArray(query._id) ? query._id : [query._id];
    } else if (query.$or) {
      // Handle $or queries
      query.$or.forEach((condition) => {
        if (condition._id) {
          const ids = Array.isArray(condition._id) ? condition._id : [condition._id];
          studentIds.push(...ids);
        }
      });
    } else {
      // For other query patterns, find matching students first
      const students = await this.model.find(query).select("_id");
      studentIds = students.map((s) => s._id);
    }

    // Perform cascading delete for each student
    for (const studentId of studentIds) {
      await cascadeDeleteStudent(studentId);
    }
  } catch (error) {
    console.error(
      "❌ Error in Student cascading delete middleware (deleteOne/deleteMany query):",
      error
    );
    throw error; // Prevent deletion if cascading fails
  }
});

const Student =
  mongoose.models.Student || mongoose.model("Student", studentSchema);

export default Student;
