import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import StoreProduct from "@/models/StoreProduct";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/utils/apiResponse";
import { requireAuth } from "@/middleware/authMiddleware";
import { parsePagination, createPaginationResponse } from "@/utils/pagination";
import { createSlug } from "@/utils/serverSlug";
import { escapeRegex, regexExactInsensitive } from "@/utils/escapeRegex.js";

const STORE_CATEGORIES = ["course", "ebook", "paper"];

/** GET: List store products. Public: status=active only. Admin (auth): status=all|active|draft|inactive, category, search, pagination. */
export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const authCheck = await requireAuth(request);
    const isAdmin = !authCheck.error;

    let statusFilter = searchParams.get("status") || "active";
    if (!isAdmin) statusFilter = "active";

    const category = searchParams.get("category");
    const search = searchParams.get("search") || "";
    const { page, limit, skip } = parsePagination(searchParams);

    const query = {};
    if (statusFilter !== "all") {
      query.status = { $regex: regexExactInsensitive(statusFilter) };
    }
    if (category && STORE_CATEGORIES.includes(category)) {
      query.category = category;
    }
    if (search.trim()) {
      const safe = escapeRegex(search.trim());
      query.$or = [
        { name: { $regex: safe, $options: "i" } },
        { subject: { $regex: safe, $options: "i" } },
        { description: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const [list, total] = await Promise.all([
      StoreProduct.find(query)
        .sort({ orderNumber: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      StoreProduct.countDocuments(query),
    ]);

    const pagination = createPaginationResponse(list, total, page, limit);
    return successResponse(pagination);
  } catch (error) {
    return handleApiError(error, "Failed to fetch store products");
  }
}

/** POST: Create store product (admin only). */
export async function POST(request) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    await connectDB();
    const body = await request.json();
    const {
      name,
      slug,
      category,
      subject,
      price,
      originalPrice,
      rating,
      reviews,
      image,
      description,
      features,
      badge,
      status,
      orderNumber,
      courseDetails,
      featureCards,
      faq,
    } = body;

    if (!name?.trim()) return errorResponse("name is required", 400);
    if (!STORE_CATEGORIES.includes(category))
      return errorResponse("category must be one of: course, ebook, paper", 400);
    if (typeof price !== "number" || price < 0)
      return errorResponse("price must be a non-negative number", 400);

    const doc = await StoreProduct.create({
      name: name.trim(),
      slug: slug?.trim() || createSlug(name),
      category,
      subject: subject?.trim() ?? "",
      price: Number(price),
      originalPrice: Number(originalPrice) || 0,
      rating: Number(rating) || 0,
      reviews: Number(reviews) || 0,
      image: image?.trim() ?? "",
      description: description?.trim() ?? "",
      features: Array.isArray(features) ? features : [],
      badge: badge?.trim() ?? "",
      status: status || "active",
      orderNumber: orderNumber ?? 0,
      courseDetails: Array.isArray(courseDetails) ? courseDetails : undefined,
      featureCards: Array.isArray(featureCards) ? featureCards : undefined,
      faq: Array.isArray(faq) ? faq : undefined,
    });

    return successResponse(doc, "Product created", 201);
  } catch (error) {
    return handleApiError(error, "Failed to create store product");
  }
}
