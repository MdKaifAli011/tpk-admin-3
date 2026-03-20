import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import StoreProduct from "@/models/StoreProduct";
import {
  successResponse,
  errorResponse,
  handleApiError,
  notFoundResponse,
} from "@/utils/apiResponse";
import { requireAuth } from "@/middleware/authMiddleware";
import mongoose from "mongoose";

/** GET: Get one product by id or slug. Public: only active. With auth (admin): by id returns any status. */
export async function GET(request, { params }) {
  try {
    await connectDB();
    const { idOrSlug } = await params;
    if (!idOrSlug) return errorResponse("id or slug required", 400);

    const authCheck = await requireAuth(request);
    const isAdmin = !authCheck.error;
    const byId =
      mongoose.Types.ObjectId.isValid(idOrSlug) && idOrSlug.length === 24;

    let product;
    if (byId) {
      if (isAdmin) {
        product = await StoreProduct.findById(idOrSlug).lean();
      } else {
        product = await StoreProduct.findOne({
          _id: new mongoose.Types.ObjectId(idOrSlug),
          status: "active",
        }).lean();
      }
    }
    if (!product) {
      product = await StoreProduct.findOne({
        slug: idOrSlug,
        ...(isAdmin ? {} : { status: "active" }),
      }).lean();
    }
    if (!product) return notFoundResponse("Product not found");

    return successResponse(product);
  } catch (error) {
    return handleApiError(error, "Failed to fetch product");
  }
}

/** PUT: Update product (admin only). */
export async function PUT(request, { params }) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    await connectDB();
    const { idOrSlug } = await params;
    if (!mongoose.Types.ObjectId.isValid(idOrSlug))
      return errorResponse("Invalid product ID", 400);

    const product = await StoreProduct.findById(idOrSlug);
    if (!product) return notFoundResponse("Product not found");

    const body = await request.json();
    const allowed = [
      "name",
      "slug",
      "category",
      "subject",
      "price",
      "originalPrice",
      "rating",
      "reviews",
      "image",
      "description",
      "features",
      "badge",
      "status",
      "orderNumber",
      "courseDetails",
      "featureCards",
      "faq",
    ];
    for (const key of allowed) {
      if (body[key] !== undefined) {
        if (key === "features" && Array.isArray(body[key])) {
          product[key] = body[key];
        } else if (
          (key === "courseDetails" ||
            key === "featureCards" ||
            key === "faq") &&
          Array.isArray(body[key])
        ) {
          product[key] = body[key];
        } else if (
          ["price", "originalPrice", "rating", "reviews", "orderNumber"].includes(
            key
          )
        ) {
          product[key] = Number(body[key]) ?? product[key];
        } else if (typeof body[key] === "string") {
          product[key] = body[key].trim();
        } else {
          product[key] = body[key];
        }
      }
    }
    await product.save();
    const updated = await StoreProduct.findById(product._id).lean();
    return successResponse(updated, "Product updated");
  } catch (error) {
    return handleApiError(error, "Failed to update product");
  }
}

/** DELETE: Delete product (admin only). */
export async function DELETE(request, { params }) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: authCheck.status || 401 });
    }

    await connectDB();
    const { idOrSlug } = await params;
    if (!mongoose.Types.ObjectId.isValid(idOrSlug))
      return errorResponse("Invalid product ID", 400);

    const product = await StoreProduct.findByIdAndDelete(idOrSlug);
    if (!product) return notFoundResponse("Product not found");
    return successResponse({ deleted: true }, "Product deleted");
  } catch (error) {
    return handleApiError(error, "Failed to delete product");
  }
}
