
"use client";
import React, { useState, useMemo } from "react";
import { STORE_PRODUCTS, STORE_CATEGORIES } from "./storeData";
import ProductCard from "./components/ProductCard";
import CartSlideOver from "./components/CartSlideOver";
import { FaSearch, FaFilter, FaShoppingBag } from "react-icons/fa";
import { useStore } from "./StoreContext";

export default function StorePage() {
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const { setIsCartOpen, cartCount } = useStore();

    const filteredProducts = useMemo(() => {
        return STORE_PRODUCTS.filter((product) => {
            const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
            const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                product.subject.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCategory && matchesSearch;
        });
    }, [selectedCategory, searchQuery]);

    return (
        <div className="bg-white min-h-screen">
            <CartSlideOver />

            {/* Premium Hero Section */}
            <section className="relative overflow-hidden pt-16 pb-20 px-4 md:px-0">
                <div className="absolute inset-0 bg-indigo-50/50 -z-10" />
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[500px] h-[500px] bg-indigo-100/50 rounded-full blur-3xl -z-10" />
                <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-purple-100/50 rounded-full blur-3xl -z-10" />

                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
                        <div className="max-w-2xl">
                            <h1 className="text-4xl md:text-6xl font-black text-gray-900 leading-tight mb-4 tracking-tight">
                                Premium Learning <br />
                                <span className="text-indigo-600">Resources & Materials</span>
                            </h1>
                            <p className="text-lg text-gray-500 font-medium">
                                Everything you need to excel in NEET, JEE, and SAT exams. Professional courses,
                                expertly curated eBooks, and realistic practice papers.
                            </p>
                        </div>

                        <button
                            onClick={() => setIsCartOpen(true)}
                            className="relative self-start md:self-center p-4 bg-white rounded-2xl shadow-xl shadow-indigo-100 border border-indigo-50 group hover:bg-indigo-600 transition-all duration-300"
                        >
                            <FaShoppingBag className="text-2xl text-indigo-600 group-hover:text-white transition-colors" />
                            {cartCount > 0 && (
                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[11px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white ring-2 ring-red-100">
                                    {cartCount}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Search and Filters */}
                    <div className="bg-white p-6 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100">
                        <div className="flex flex-col lg:flex-row gap-6 items-center">
                            {/* Search Bar */}
                            <div className="relative flex-1 w-full">
                                <FaSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search for courses, ebooks, or subjects..."
                                    className="w-full pl-12 pr-5 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-indigo-600 text-gray-900 font-medium placeholder-gray-400 transition-all"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            {/* Category Filter */}
                            <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 w-full lg:w-auto scrollbar-hide">
                                {STORE_CATEGORIES.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCategory(cat.id)}
                                        className={`whitespace-nowrap px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${selectedCategory === cat.id
                                                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
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

            {/* Main Products Grid */}
            <section className="max-w-7xl mx-auto py-12 px-4 md:px-0">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                        <FaFilter className="text-indigo-600 text-lg" />
                        Showing {filteredProducts.length} Results
                    </h2>
                    <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                        Sorted by Best Selling
                    </div>
                </div>

                {filteredProducts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredProducts.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                            <FaSearch className="text-gray-300 text-4xl" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No products found</h3>
                        <p className="text-gray-500">Try adjusting your search or filters to find what you're looking for.</p>
                        <button
                            onClick={() => { setSelectedCategory("all"); setSearchQuery(""); }}
                            className="mt-6 text-indigo-600 font-bold hover:underline underline-offset-4"
                        >
                            Clear all filters
                        </button>
                    </div>
                )}
            </section>

            {/* Premium CTA Section */}
            <section className="max-w-7xl mx-auto py-20 px-4 md:px-0">
                <div className="bg-indigo-600 rounded-[3rem] p-10 md:p-20 text-center relative overflow-hidden shadow-2xl shadow-indigo-200">
                    <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500 rounded-full blur-3xl opacity-50 -translate-x-1/2 -translate-y-1/2" />
                    <div className="absolute bottom-0 right-0 w-80 h-80 bg-blue-500 rounded-full blur-3xl opacity-30 translate-x-1/3 translate-y-1/3" />

                    <h2 className="text-3xl md:text-5xl font-black text-white mb-6 relative z-10">
                        Ready to Start Your Success Journey?
                    </h2>
                    <p className="text-indigo-100 text-lg md:text-xl mb-10 max-w-2xl mx-auto relative z-10">
                        Join 50,000+ students who achieved their dream scores with TestPrepKart.
                        Premium content, professional guidance.
                    </p>
                    <button className="bg-white text-indigo-600 px-10 py-4 rounded-2xl text-lg font-black hover:bg-indigo-50 transition-all duration-300 shadow-xl relative z-10">
                        Get Personalized Guidance
                    </button>
                </div>
            </section>
        </div>
    );
}
