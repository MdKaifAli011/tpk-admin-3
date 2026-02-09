"use client";

import React, { useState, useMemo } from "react";
import { STORE_PRODUCTS, STORE_CATEGORIES } from "./storeData";
import ProductCard from "./components/ProductCard";
import CartSlideOver from "./components/CartSlideOver";
import { FaSearch, FaFilter, FaShoppingBag } from "react-icons/fa";
import { useStore } from "./StoreContext";
import Link from "next/link";

const CATEGORY_PILLS = [
  { id: "all", name: "All Products" },
  { id: "course", name: "Online Courses" },
  { id: "ebook", name: "eBooks & Notes" },
  { id: "paper", name: "Practice Papers" },
];

export default function StorePage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { setIsCartOpen, cartCount } = useStore();

  const filteredProducts = useMemo(() => {
    return STORE_PRODUCTS.filter((product) => {
      const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.subject.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <>
      <CartSlideOver />

      <div className="">
        {/* Hero — match image: headline, subtitle, single search + filters (no duplicate bar below) */}
        <section className="relative py-16 sm:py-20 bg-white">
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
          <div className="max-w-5xl mx-auto text-center px-4">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-slate-900 tracking-tight mb-5">
              Master Your Future with{" "}
              <span className="text-indigo-600 italic block sm:inline">Elite Resources</span>
            </h1>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
              Premium courses, curated eBooks, and specialized practice papers for NEET, JEE, and SAT excellence.
            </p>
            {/* Single search bar: white, shadow-2xl, border-slate-100 — filters only here */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl p-2 flex flex-col md:flex-row gap-2 max-w-4xl mx-auto">
              <div className="flex-1 flex items-center px-4 gap-3 min-h-[48px]">
                <FaSearch className="text-slate-400 w-5 h-5 shrink-0" />
                <input
                  type="text"
                  placeholder="Search courses, subjects, or eBooks..."
                  className="w-full border-none focus:ring-0 bg-transparent text-slate-900 placeholder-slate-400 text-sm sm:text-base"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-1 p-1 bg-slate-50 rounded-xl overflow-x-auto whitespace-nowrap shrink-0">
                {CATEGORY_PILLS.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      selectedCategory === cat.id
                        ? "bg-indigo-600 text-white shadow-md"
                        : "bg-transparent text-slate-600 hover:bg-white hover:shadow-sm"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Results + grid — no duplicate category bar */}
        <section className="px-0 sm:px-0 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-2">
              <FaFilter className="text-indigo-600 w-4 h-4 shrink-0" />
              <h2 className="text-lg font-bold text-slate-900">
                Showing {filteredProducts.length} results
              </h2>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Sorted by:</span>
              <button type="button" className="font-semibold text-slate-900 flex items-center gap-1">
                Best selling
                <span className="text-slate-400">▾</span>
              </button>
            </div>
          </div>

          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 sm:p-16 text-center shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <FaSearch className="text-gray-400 w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">No products found</h3>
              <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
                Try different keywords or choose a category above.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                {STORE_CATEGORIES.filter((c) => c.id !== "all").map((cat) => (
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
          )}

          {/* CTA section — after card container, reference style */}
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
                className="inline-block bg-white text-indigo-600 px-8 py-3.5 rounded-full font-bold text-sm shadow-xl hover:scale-105 transition-transform"
              >
                Get personalized guidance
              </Link>
            </div>
          </section>
        </section>
      </div>
    </>
  );
}
