import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { successResponse, errorResponse } from "@/utils/apiResponse";

export async function GET(request) {
  try {
    // getUserFromRequest now checks database for user existence
    // This ensures deleted users cannot verify their tokens
    const user = await getUserFromRequest(request);

    if (!user) {
      return errorResponse(
        "Invalid or expired token, or account not found",
        401
      );
    }

    return successResponse(user, "Token is valid");
  } catch (error) {
    return errorResponse("Token verification failed", 401);
  }
}
