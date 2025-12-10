import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Student from "@/models/Student";
import { parsePagination, createPaginationResponse } from "@/utils/pagination";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/utils/apiResponse";
import { requireUserManagement } from "@/middleware/authMiddleware";

// GET: Fetch all students with pagination and filters (admin only)
export async function GET(request) {
  try {
    // Check authentication and permissions (only admin can view students)
    const authCheck = await requireUserManagement(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 403 });
    }

    await connectDB();
    const { searchParams } = new URL(request.url);

    const { page, limit, skip } = parsePagination(searchParams);
    const countryFilter = searchParams.get("country");
    const classNameFilter = searchParams.get("className");
    const statusFilter = searchParams.get("status");
    const searchQuery = searchParams.get("search");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const query = {};

    if (countryFilter) {
      query.country = { $regex: countryFilter, $options: "i" };
    }

    if (classNameFilter) {
      query.className = { $regex: classNameFilter, $options: "i" };
    }

    if (statusFilter && statusFilter !== "all") {
      query.status = statusFilter.toLowerCase();
    }

    if (searchQuery) {
      query.$or = [
        { firstName: { $regex: searchQuery, $options: "i" } },
        { lastName: { $regex: searchQuery, $options: "i" } },
        { email: { $regex: searchQuery, $options: "i" } },
        { phoneNumber: { $regex: searchQuery, $options: "i" } },
      ];
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        query.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDate;
      }
    }

    const total = await Student.countDocuments(query);
    const students = await Student.find(query)
      .select("-password") // Exclude password
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json(
      createPaginationResponse(students, total, page, limit)
    );
  } catch (error) {
    return handleApiError(error, "Failed to fetch students");
  }
}

