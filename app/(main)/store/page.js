"use client";

import React, { useState, useMemo, useEffect } from "react";
import ProductCard from "./components/ProductCard";
import CartSlideOver from "./components/CartSlideOver";
import { FaSearch, FaFilter, FaShoppingBag, FaArrowRight } from "react-icons/fa";
import { useStore } from "./StoreContext";
import Link from "next/link";
import ExamAreaLoading from "@/app/(main)/components/ExamAreaLoading";
import { STORE_CATEGORIES } from "./storeData";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";
const CATEGORY_PILLS = STORE_CATEGORIES;

export default function StorePage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { setIsCartOpen, cartCount } = useStore();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ status: "active", limit: "50", page: "1" });
    if (selectedCategory !== "all") params.set("category", selectedCategory);
    if (searchQuery.trim()) params.set("search", searchQuery.trim());
    fetch(`${basePath}/api/store?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data?.success) return;
        const list = data?.data?.data ?? data?.data ?? [];
        const arr = Array.isArray(list) ? list : [];
        setProducts(arr);
      })
      .catch(() => { if (!cancelled) setProducts([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedCategory, searchQuery]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
      const matchesSearch =
        !searchQuery.trim() ||
        (product.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.subject || "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  if (loading) {
    return (
      <>
        <CartSlideOver />
        <div className="min-h-screen bg-white text-slate-900">
          <section className="relative bg-white overflow-hidden border-b border-slate-200/60">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-50/50 rounded-full blur-3xl opacity-60 pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-50/50 rounded-full blur-3xl opacity-60 pointer-events-none" />
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
              <div className="h-3 w-40 bg-slate-200 rounded animate-pulse mb-5" />
              <div className="h-7 w-3/4 max-w-xl bg-slate-200 rounded animate-pulse mb-2" />
              <div className="h-4 w-full max-w-lg bg-slate-100 rounded animate-pulse" />
            </div>
          </section>
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
            <ExamAreaLoading variant="compact" message="Loading products..." />
          </section>
        </div>
      </>
    );
  }

  return (
    <>
      <CartSlideOver />

      <div className="min-h-screen bg-white text-slate-900 space-y-6 mt-6">
        {/* Hero — same as course listing */}
        <section className="hero-section relative rounded-xl p-3 sm:p-4 bg-gradient-to-br from-indigo-50 via-white to-purple-50 border border-indigo-100/60 shadow-[0_2px_12px_rgba(100,70,200,0.08)]" aria-labelledby="store-title">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-50/50 rounded-full blur-3xl opacity-60 pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-50/50 rounded-full blur-3xl opacity-60 pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <div className="absolute top-6 right-4 sm:right-6 z-20">
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="relative w-11 h-11 rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 flex items-center justify-center text-indigo-600 transition-all"
                aria-label="Open cart"
              >
                <FaShoppingBag className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center border-2 border-white">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>

            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 mb-5" aria-label="Breadcrumb">
              <Link
                href="/"
                className="text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors rounded px-1.5 py-0.5 hover:bg-indigo-50"
              >
                Home
              </Link>
              <span className="text-slate-300 select-none" aria-hidden>/</span>
              <span className="text-xs font-semibold text-slate-800 bg-slate-50 rounded px-2 py-0.5 truncate max-w-[200px] sm:max-w-none">
                Store
              </span>
            </nav>

            {/* Main header */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pr-14 sm:pr-16">
              <div className="max-w-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-indigo-600/10 text-indigo-600 text-[11px] font-semibold uppercase tracking-wider">
                    Elite Resources
                  </span>
                  <span className="w-1 h-1 rounded-full bg-slate-300" aria-hidden />
                  <span className="text-xs font-medium text-slate-500">
                    {filteredProducts.length} {filteredProducts.length === 1 ? "product" : "products"}
                  </span>
                </div>

                <h1 id="store-title" className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight leading-tight mb-2">
                  Master Your Future with <span className="text-indigo-600">Elite Resources</span>
                </h1>

                <p className="text-sm sm:text-base text-slate-600 leading-snug max-w-xl">
                  Premium courses, curated eBooks, and specialized practice papers for NEET, JEE, and SAT excellence.
                </p>
              </div>
            </div>

            {/* Search + category bar — single bar like course utility */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-2 flex flex-col md:flex-row gap-2">
                <div className="flex-1 flex items-center px-4 gap-3 min-h-[44px]">
                  <FaSearch className="text-slate-400 w-4 h-4 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search courses, subjects, or eBooks..."
                    className="w-full border-none focus:ring-0 bg-transparent text-slate-900 placeholder-slate-400 text-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex gap-1 p-1 bg-slate-50 rounded-lg overflow-x-auto whitespace-nowrap shrink-0">
                  {CATEGORY_PILLS.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                        selectedCategory === cat.id
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "bg-transparent text-slate-600 hover:bg-white hover:shadow-sm"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Content — grid same as course listing */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12 px-5 bg-gradient-to-b from-slate-50 to-white rounded-xl border border-slate-200 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center mx-auto mb-4 text-2xl">
                📚
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-1.5 tracking-tight">No products found</h2>
              <p className="text-slate-600 text-sm leading-snug max-w-md mx-auto mb-5">
                Try different keywords or choose a category above.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                {CATEGORY_PILLS.filter((c) => c.id !== "all").map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => { setSelectedCategory("all"); setSearchQuery(""); }}
                className="text-sm font-semibold text-indigo-600 hover:underline"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-2">
                  <FaFilter className="text-indigo-600 w-4 h-4 shrink-0" />
                  <h2 className="text-lg font-bold text-slate-900">
                    Showing {filteredProducts.length} {filteredProducts.length === 1 ? "result" : "results"}
                  </h2>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Sorted by: Best selling</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product._id || product.slug}
                    product={{ ...product, id: product.slug || product._id }}
                  />
                ))}
              </div>
            </>
          )}

          {/* CTA section — same as course/store reference */}
          <section className="mt-16 sm:mt-20 rounded-2xl overflow-hidden">
            <div className="bg-indigo-600 py-14 sm:py-16 text-white text-center px-6">
              <h2 className="text-2xl sm:text-3xl font-bold mb-3 tracking-tight">
                Join 50,000+ students who achieved their dream scores.
              </h2>
              <p className="text-indigo-100 mb-8 max-w-xl mx-auto opacity-90">
                Premium content, professional guidance, and proven results.
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-1.5 px-6 py-3 rounded-lg bg-white text-indigo-600 text-sm font-semibold shadow-xl hover:bg-indigo-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Get personalized guidance <FaArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </section>
        </section>
      </div>
    </>
  );
}
