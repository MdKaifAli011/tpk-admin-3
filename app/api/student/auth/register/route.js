import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Student from "@/models/Student";
import Lead from "@/models/Lead";
import jwt from "jsonwebtoken";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/utils/apiResponse";
import { getJwtSecret } from "@/lib/auth";

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      password,
      phoneNumber,
      className,
      prepared,
      country,
      source, // URL path where student registered from (e.g., /neet)
    } = body;

    // Validate required fields
    if (!firstName?.trim()) {
      return errorResponse("First name is required", 400);
    }

    if (!lastName?.trim()) {
      return errorResponse("Last name is required", 400);
    }

    if (!email?.trim()) {
      return errorResponse("Email is required", 400);
    }

    if (!password || password.length < 6) {
      return errorResponse("Password must be at least 6 characters", 400);
    }

    if (!phoneNumber?.trim()) {
      return errorResponse("Phone number is required", 400);
    }

    if (!className?.trim()) {
      return errorResponse("Class name is required", 400);
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return errorResponse("Please provide a valid email address", 400);
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if student already exists
    const existingStudent = await Student.findOne({ email: normalizedEmail });
    if (existingStudent) {
      return errorResponse(
        "An account with this email already exists. Please login instead.",
        409
      );
    }

    // Create student
    const student = await Student.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      password,
      phoneNumber: phoneNumber.trim(),
      className: className.trim(),
      prepared: prepared?.trim() || null,
      country: country?.trim() || null,
      status: "active",
    });

    // Create or update lead
    const leadName = `${firstName.trim()} ${lastName.trim()}`;
    const existingLead = await Lead.findOne({ email: normalizedEmail });

    let lead;
    if (existingLead) {
      // Update existing lead
      const updateData = {
        name: leadName,
        phoneNumber: phoneNumber.trim(),
        className: className.trim(),
        prepared: prepared?.trim() || null,
        country: country?.trim() || null,
        status: "updated",
        updateCount: (existingLead.updateCount || 0) + 1,
        form_id: "student-registration", // Set form_id for student registration
      };
      
      // Update source if provided (URL path where student registered from)
      if (source?.trim()) {
        updateData.source = source.trim();
      }
      
      lead = await Lead.findOneAndUpdate(
        { email: normalizedEmail },
        updateData,
        { new: true }
      );
    } else {
      // Create new lead
      lead = await Lead.create({
        name: leadName,
        email: normalizedEmail,
        phoneNumber: phoneNumber.trim(),
        className: className.trim(),
        prepared: prepared?.trim() || null,
        country: country?.trim() || null,
        status: "new",
        updateCount: 0,
        source: source?.trim() || "/register", // Use provided source URL path or default to /register
        form_id: "student-registration", // Set form_id for student registration
      });
    }

    // Link lead to student
    student.leadId = lead._id;
    await student.save();

    // Generate JWT token
    const jwtSecret = getJwtSecret();
    const token = jwt.sign(
      {
        studentId: student._id,
        email: student.email,
        type: "student",
      },
      jwtSecret,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "30d", // Longer expiry for students
      }
    );

    // Return student data without password
    const studentData = student.toJSON();

    return successResponse(
      {
        student: studentData,
        token,
        lead: {
          id: lead._id,
          status: lead.status,
        },
      },
      "Registration successful"
    );
  } catch (error) {
    return handleApiError(error, "Registration failed");
  }
}
