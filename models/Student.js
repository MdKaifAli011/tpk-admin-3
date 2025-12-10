import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const studentSchema = new mongoose.Schema(
  {
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
studentSchema.index({ email: 1 });
studentSchema.index({ status: 1 });
studentSchema.index({ className: 1 });
studentSchema.index({ prepared: 1 });

// Cascading delete: When a Student is deleted, delete all related data
// Deletes: StudentProgress, SubjectProgress, StudentTestResult
// Keeps: Lead data (marketing/sales data persists)
studentSchema.pre("findOneAndDelete", async function () {
  try {
    const student = await this.model.findOne(this.getQuery());
    if (student) {
      console.log(
        `🗑️ Cascading delete: Deleting all data for student ${student._id}`
      );

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

      // Delete in order (child documents first, then parent)
      // Order: StudentTestResult → SubjectProgress → StudentProgress → Student

      // 1. Delete all StudentTestResult documents (test results, scores, answers)
      const testResultsResult = await StudentTestResult.deleteMany({
        studentId: student._id,
      });
      console.log(
        `🗑️ Cascading delete: Deleted ${testResultsResult.deletedCount} StudentTestResult documents for student ${student._id}`
      );

      // 2. Delete all SubjectProgress documents (subject-level progress)
      const subjectProgressResult = await SubjectProgress.deleteMany({
        studentId: student._id,
      });
      console.log(
        `🗑️ Cascading delete: Deleted ${subjectProgressResult.deletedCount} SubjectProgress documents for student ${student._id}`
      );

      // 3. Delete all StudentProgress documents (unit/chapter progress, visited items)
      const studentProgressResult = await StudentProgress.deleteMany({
        studentId: student._id,
      });
      console.log(
        `🗑️ Cascading delete: Deleted ${studentProgressResult.deletedCount} StudentProgress documents for student ${student._id}`
      );

      // Note: Lead data is NOT deleted (marketing/sales data persists)
      // Lead relationship is one-way (Student → Lead), no cleanup needed

      console.log(
        `✅ Cascading delete completed for student ${student._id}. Summary: ${testResultsResult.deletedCount} test results, ${subjectProgressResult.deletedCount} subject progress, ${studentProgressResult.deletedCount} student progress deleted. Lead data preserved.`
      );
    }
  } catch (error) {
    console.error(
      "❌ Error in Student cascading delete middleware:",
      error
    );
    throw error; // Prevent deletion if cascading fails
  }
});

const Student =
  mongoose.models.Student || mongoose.model("Student", studentSchema);

export default Student;
