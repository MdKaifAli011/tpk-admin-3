
"use client";
import React, { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { STORE_PRODUCTS } from "../storeData";
import { FaStar, FaCartPlus, FaCheckCircle, FaArrowLeft, FaShieldAlt, FaUndoAlt, FaTruck } from "react-icons/fa";
import { useStore } from "../StoreContext";
import CartSlideOver from "../components/CartSlideOver";
import Link from "next/link";

export default function ProductDetailPage() {
    const { productId } = useParams();
    const router = useRouter();
    const { addToCart } = useStore();

    const product = useMemo(() => {
        return STORE_PRODUCTS.find((p) => p.id === productId);
    }, [productId]);

    if (!product) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <h1 className="text-4xl font-black text-gray-900 mb-4">Product Not Found</h1>
                <p className="text-gray-500 mb-8">The learning resource you are looking for doesn't exist or has been moved.</p>
                <Link href="/store" className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold">
                    Back to Store
                </Link>
            </div>
        );
    }

    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(price);
    };

    const discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);

    return (
        <div className="bg-white min-h-screen">
            <CartSlideOver />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                {/* Breadcrumbs */}
                <nav className="flex mb-8 items-center gap-2 text-sm">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 font-medium transition-colors"
                    >
                        <FaArrowLeft className="text-xs" />
                        Back
                    </button>
                    <span className="text-gray-300">/</span>
                    <Link href="/store" className="text-gray-500 hover:text-indigo-600 font-medium">Store</Link>
                    <span className="text-gray-300">/</span>
                    <span className="text-gray-900 font-bold">{product.name}</span>
                </nav>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
                    {/* Product Image Gallery */}
                    <div className="space-y-6">
                        <div className="aspect-square rounded-[2.5rem] overflow-hidden border border-gray-100 bg-gray-50 shadow-2xl shadow-indigo-100/50 group">
                            <img
                                src={product.image}
                                alt={product.name}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                        </div>

                        <div className="grid grid-cols-4 gap-4">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="aspect-square rounded-2xl overflow-hidden border border-gray-100 h-20 bg-gray-50 cursor-pointer hover:border-indigo-600 transition-all opacity-60 hover:opacity-100">
                                    <img src={product.image} className="w-full h-full object-cover" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Product Info Table */}
                    <div className="flex flex-col">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black uppercase tracking-widest leading-none">
                                {product.category}
                            </span>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                {product.subject}
                            </span>
                        </div>

                        <h1 className="text-3xl md:text-5xl font-black text-gray-900 leading-tight mb-4">
                            {product.name}
                        </h1>

                        <div className="flex items-center gap-4 mb-8">
                            <div className="flex text-yellow-400 text-sm">
                                {[...Array(5)].map((_, i) => (
                                    <FaStar key={i} className={i < Math.floor(product.rating) ? "fill-current" : "text-gray-200"} />
                                ))}
                            </div>
                            <span className="text-sm font-black text-gray-900">{product.rating} / 5</span>
                            <span className="text-gray-100">|</span>
                            <span className="text-sm font-bold text-gray-500">
                                {product.reviews.toLocaleString()} Student Reviews
                            </span>
                        </div>

                        <div className="p-8 bg-gray-50 rounded-[2rem] border border-gray-100 mb-10">
                            <div className="flex items-baseline gap-4 mb-2">
                                <span className="text-5xl font-black text-gray-900 tracking-tight">
                                    {formatPrice(product.price)}
                                </span>
                                {product.originalPrice > product.price && (
                                    <span className="text-xl text-gray-400 line-through font-medium">
                                        {formatPrice(product.originalPrice)}
                                    </span>
                                )}
                                {discount > 0 && (
                                    <span className="text-sm font-black text-green-600 bg-green-50 px-3 py-1 rounded-full">
                                        SAVE {discount}%
                                    </span>
                                )}
                            </div>
                            <p className="text-gray-500 text-sm font-medium">Prices are inclusive of all taxes.</p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                                <button
                                    onClick={() => addToCart(product)}
                                    className="bg-indigo-600 text-white px-8 py-5 rounded-2xl text-lg font-black hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-indigo-200 active:scale-[0.98]"
                                >
                                    <FaCartPlus />
                                    Add to Cart
                                </button>
                                <button className="bg-white text-gray-900 border-2 border-gray-900 px-8 py-5 rounded-2xl text-lg font-black hover:bg-gray-900 hover:text-white transition-all">
                                    Buy it Now
                                </button>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h3 className="text-xl font-black text-gray-900">What's Included?</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                                {product.features?.map((feature, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <FaCheckCircle className="text-indigo-600 text-lg flex-shrink-0" />
                                        <span className="text-gray-700 font-medium">{feature}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-12 pt-10 border-t border-gray-100 grid grid-cols-3 gap-6">
                            <div className="flex flex-col items-center text-center gap-3">
                                <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 text-xl">
                                    <FaShieldAlt />
                                </div>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Secured<br />Payment</span>
                            </div>
                            <div className="flex flex-col items-center text-center gap-3">
                                <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 text-xl">
                                    <FaUndoAlt />
                                </div>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">7 Days<br />Refund</span>
                            </div>
                            <div className="flex flex-col items-center text-center gap-3">
                                <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 text-xl">
                                    <FaTruck />
                                </div>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Instant<br />Delivery</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Detailed Description */}
                <div className="mt-20 lg:mt-32 max-w-4xl">
                    <div className="border-b border-gray-200 mb-10">
                        <button className="px-6 py-4 text-indigo-600 border-b-4 border-indigo-600 font-black text-lg">
                            Full Description
                        </button>
                    </div>

                    <div className="prose prose-indigo max-w-none">
                        <h2 className="text-3xl font-black text-gray-900 mb-6 tracking-tight">Elevate Your Preparation to the Next Level</h2>
                        <p className="text-gray-600 text-lg leading-relaxed mb-6">
                            TestPrepKart presents the most comprehensive learning resource designed by industry experts with
                            decades of experience in competitive exam preparation. This program has been meticulously crafted
                            to bridge the gap between theoretical knowledge and practical application.
                        </p>
                        <div className="bg-indigo-50 p-8 rounded-3xl border border-indigo-100 mb-10">
                            <h4 className="text-indigo-900 font-black mb-4">Why choose this {product.category}?</h4>
                            <ul className="space-y-4">
                                <li className="flex items-start gap-3">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-2 flex-shrink-0" />
                                    <span className="text-indigo-800 font-medium">Updated 2024 Exam Pattern: Stay ahead with content aligned to the latest syllabus changes.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-2 flex-shrink-0" />
                                    <span className="text-indigo-800 font-medium">Expert Curation: Created by alumni of top institutes (IITs, AIIMS).</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-2 flex-shrink-0" />
                                    <span className="text-indigo-800 font-medium">Interactive Learning: Don't just read, practice with real-time feedback.</span>
                                </li>
                            </ul>
                        </div>
                        <p className="text-gray-600 text-lg leading-relaxed">
                            Whether you are aiming for a top rank in NEET or securing a seat in an Engineering college through JEE,
                            this {product.category} provides the clarity and confidence required to master complex concepts.
                            Our approach focuses on conceptual understanding rather than rote memorization.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
