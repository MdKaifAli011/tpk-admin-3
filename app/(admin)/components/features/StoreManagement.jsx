"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  FaShoppingBag,
  FaSearch,
  FaPlus,
  FaEdit,
  FaTrash,
  FaTimes,
  FaPowerOff,
} from "react-icons/fa";
import { ToastContainer, useToast } from "../ui/Toast";
import { LoadingSpinner } from "../ui/SkeletonLoader";
import PaginationBar from "../ui/PaginationBar";
import { useFilterPersistence } from "../../hooks/useFilterPersistence";
import { useDebouncedSearchQuery } from "../../hooks/useDebouncedSearchQuery";
import api from "@/lib/api";

const CATEGORIES = [
  { id: "all", name: "All" },
  { id: "course", name: "Online Courses" },
  { id: "ebook", name: "eBooks & Notes" },
  { id: "paper", name: "Practice Papers" },
];

export default function StoreManagement() {
  const { toasts, removeToast, success, error: showError } = useToast();
  const [filterState, setFilterState] = useFilterPersistence("store", { statusFilter: "all", searchQuery: "" });
  const { page, limit, statusFilter, searchQuery } = filterState;
  const [searchInput, setSearchInput] = useDebouncedSearchQuery(searchQuery, setFilterState);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const formSectionRef = useRef(null);

  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formCategory, setFormCategory] = useState("course");
  const [formSubject, setFormSubject] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formOriginalPrice, setFormOriginalPrice] = useState("");
  const [formRating, setFormRating] = useState("");
  const [formReviews, setFormReviews] = useState("");
  const [formImage, setFormImage] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formFeatures, setFormFeatures] = useState("");
  const [formBadge, setFormBadge] = useState("");
  const [formStatus, setFormStatus] = useState("active");
  const [formOrderNumber, setFormOrderNumber] = useState("0");

  const fetchProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        status: statusFilter,
        limit: String(limit),
        page: String(page),
      });
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      const res = await api.get(`/store?${params.toString()}`);
      const payload = res?.data?.data;
      let list = [];
      if (Array.isArray(payload)) list = payload;
      else if (payload && Array.isArray(payload.data)) list = payload.data;
      else if (res?.data?.data?.data && Array.isArray(res.data.data.data)) list = res.data.data.data;
      setProducts(list);
      if (res?.data?.pagination) setPagination(res.data.pagination);
    } catch (err) {
      console.error(err);
      showError("Failed to fetch products");
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, statusFilter, categoryFilter, searchQuery, showError]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const openCreate = () => {
    setEditingId(null);
    setEditingProduct(null);
    setFormName("");
    setFormSlug("");
    setFormCategory("course");
    setFormSubject("");
    setFormPrice("");
    setFormOriginalPrice("");
    setFormRating("");
    setFormReviews("");
    setFormImage("");
    setFormDescription("");
    setFormFeatures("");
    setFormBadge("");
    setFormStatus("active");
    setFormOrderNumber("0");
    setShowForm(true);
    requestAnimationFrame(() =>
      formSectionRef.current?.scrollIntoView({ behavior: "smooth" })
    );
  };

  const openEdit = (p) => {
    setEditingId(p._id);
    setEditingProduct(p);
    setFormName(p.name || "");
    setFormSlug(p.slug || "");
    setFormCategory(p.category || "course");
    setFormSubject(p.subject || "");
    setFormPrice(String(p.price ?? ""));
    setFormOriginalPrice(String(p.originalPrice ?? ""));
    setFormRating(String(p.rating ?? ""));
    setFormReviews(String(p.reviews ?? ""));
    setFormImage(p.image || "");
    setFormDescription(p.description || "");
    setFormFeatures(Array.isArray(p.features) ? p.features.join("\n") : "");
    setFormBadge(p.badge || "");
    setFormStatus(p.status || "active");
    setFormOrderNumber(String(p.orderNumber ?? "0"));
    setShowForm(true);
    requestAnimationFrame(() =>
      formSectionRef.current?.scrollIntoView({ behavior: "smooth" })
    );
  };

  const saveForm = async () => {
    if (!formName.trim()) {
      showError("Name is required.");
      return;
    }
    const price = parseFloat(formPrice);
    if (isNaN(price) || price < 0) {
      showError("Price must be a non-negative number.");
      return;
    }
    setFormLoading(true);
    try {
      const payload = {
        name: formName.trim(),
        slug: formSlug.trim() || undefined,
        category: formCategory,
        subject: formSubject.trim(),
        price,
        originalPrice: parseFloat(formOriginalPrice) || 0,
        rating: parseFloat(formRating) || 0,
        reviews: parseInt(formReviews, 10) || 0,
        image: formImage.trim(),
        description: formDescription.trim(),
        features: formFeatures
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        badge: formBadge.trim(),
        status: formStatus,
        orderNumber: parseInt(formOrderNumber, 10) || 0,
      };
      if (editingId) {
        await api.put(`/store/${editingId}`, payload);
        success("Product updated");
      } else {
        await api.post("/store", payload);
        success("Product created");
      }
      setShowForm(false);
      fetchProducts();
    } catch (err) {
      showError(err?.response?.data?.message || "Failed to save product");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product? It will no longer appear in the store."))
      return;
    try {
      await api.delete(`/store/${id}`);
      success("Product deleted");
      fetchProducts();
    } catch (err) {
      showError(err?.response?.data?.message || "Failed to delete");
    }
  };

  const handleToggleStatus = async (p) => {
    const next = p.status === "active" ? "inactive" : "active";
    try {
      await api.put(`/store/${p._id}`, {
        ...p,
        status: next,
        name: p.name,
        slug: p.slug,
        category: p.category,
        subject: p.subject,
        price: p.price,
        originalPrice: p.originalPrice ?? 0,
        rating: p.rating ?? 0,
        reviews: p.reviews ?? 0,
        image: p.image ?? "",
        description: p.description ?? "",
        features: p.features ?? [],
        badge: p.badge ?? "",
        orderNumber: p.orderNumber ?? 0,
      });
      success(`Product ${next === "active" ? "activated" : "deactivated"}`);
      fetchProducts();
    } catch (err) {
      showError(err?.response?.data?.message || "Failed to update status");
    }
  };

  const formatPrice = (n) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <>
      <div className="space-y-6">
        <ToastContainer toasts={toasts} removeToast={removeToast} />

        {showForm && (
          <div
            ref={formSectionRef}
            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
          >
            <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-b from-indigo-50/60 to-white">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingId ? "Edit Product" : "Create Product"}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Close form"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Name *</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Product name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Slug (URL)</label>
                  <input
                    type="text"
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Auto from name if empty"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="course">Online Courses</option>
                    <option value="ebook">eBooks & Notes</option>
                    <option value="paper">Practice Papers</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
                  <input
                    type="text"
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Physics, Maths"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Price (INR) *</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Original price (INR)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formOriginalPrice}
                    onChange={(e) => setFormOriginalPrice(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Rating (0–5)</label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={formRating}
                    onChange={(e) => setFormRating(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Reviews count</label>
                  <input
                    type="number"
                    min="0"
                    value={formReviews}
                    onChange={(e) => setFormReviews(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Image URL</label>
                <input
                  type="text"
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={5}
                  placeholder="Product description..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder-gray-400 resize-y min-h-[120px]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Features (one per line)</label>
                <textarea
                  value={formFeatures}
                  onChange={(e) => setFormFeatures(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Feature 1&#10;Feature 2"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Badge</label>
                  <input
                    type="text"
                    value={formBadge}
                    onChange={(e) => setFormBadge(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Best Seller"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Order number</label>
                <input
                  type="number"
                  min="0"
                  value={formOrderNumber}
                  onChange={(e) => setFormOrderNumber(e.target.value)}
                  className="w-full max-w-xs px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveForm}
                  disabled={formLoading}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {formLoading ? <LoadingSpinner size="small" /> : null}
                  {formLoading ? "Saving…" : editingId ? "Update" : "Create"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-5 sm:px-6 border-b border-gray-200 bg-gradient-to-b from-gray-50/80 to-white">
            <div className="flex flex-col gap-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 shrink-0">
                      <FaShoppingBag className="w-5 h-5" />
                    </span>
                    Store Management
                  </h1>
                  <p className="text-sm text-gray-500 mt-2">
                    Manage products shown on the store (courses, eBooks, practice papers).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openCreate}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-sm font-medium shrink-0"
                >
                  <FaPlus className="w-4 h-4 shrink-0" />
                  Create Product
                </button>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="relative flex-1 sm:max-w-xs">
                  <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search by name, subject..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <select
                    value={statusFilter}
                    onChange={(e) => setFilterState({ statusFilter: e.target.value, page: 1 })}
                    className="min-w-[120px] px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">All status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="draft">Draft</option>
                  </select>
                  <select
                    value={categoryFilter}
                    onChange={(e) => { setCategoryFilter(e.target.value); setFilterState({ page: 1 }); }}
                    className="min-w-[140px] px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="large" />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm px-4">
                No products found. Create one to show on the store.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-16">Order</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[200px]">Name</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-28">Category</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">Subject</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">Price</th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">Status</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-32">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {products.map((p) => (
                      <tr key={p._id} className="hover:bg-gray-50/80">
                        <td className="px-4 py-3 text-sm text-gray-700">{p.orderNumber ?? 0}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 max-w-[240px] truncate" title={p.name}>
                          {p.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{p.category}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{p.subject || "—"}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatPrice(p.price)}</td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${p.status === "active"
                                ? "bg-green-100 text-green-800"
                                : p.status === "draft"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => openEdit(p)}
                              className="text-blue-600 hover:text-blue-800 p-1.5 rounded-lg hover:bg-blue-50"
                              title="Edit"
                            >
                              <FaEdit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(p._id)}
                              className="text-red-600 hover:text-red-800 p-1.5 rounded-lg hover:bg-red-50"
                              title="Delete"
                            >
                              <FaTrash className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(p)}
                              className={`p-1.5 rounded-lg ${p.status === "active"
                                  ? "text-red-600 hover:bg-red-50"
                                  : "text-green-600 hover:bg-green-50"
                                }`}
                              title={p.status === "active" ? "Deactivate" : "Activate"}
                            >
                              <FaPowerOff className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <PaginationBar
            page={page}
            limit={limit}
            total={pagination.total}
            totalPages={pagination.totalPages}
            hasNextPage={pagination.hasNextPage}
            hasPrevPage={pagination.hasPrevPage}
            onPageChange={(p) => setFilterState({ page: p })}
            onLimitChange={(l) => setFilterState({ limit: l, page: 1 })}
          />
        </div>
      </div>
    </>
  );
}
