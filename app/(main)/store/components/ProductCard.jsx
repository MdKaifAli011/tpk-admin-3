
"use client";
import React from "react";
import { FaStar, FaCartPlus, FaEye } from "react-icons/fa";
import { useStore } from "../StoreContext";
import Link from "next/link";

export default function ProductCard({ product }) {
    const { addToCart } = useStore();

    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(price);
    };

    const discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);

    return (
        <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col h-full">
            {/* Image Section */}
            <div className="relative aspect-video overflow-hidden pt-4 px-4 pb-0">
                <div className="w-full h-full rounded-xl overflow-hidden relative group-hover:scale-105 transition-transform duration-500">
                    <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                    />
                    {product.badge && (
                        <div className="absolute top-3 left-3 bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg uppercase tracking-wider">
                            {product.badge}
                        </div>
                    )}
                    {discount > 0 && (
                        <div className="absolute top-3 right-3 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg uppercase tracking-wider">
                            {discount}% OFF
                        </div>
                    )}

                    {/* Overlay Actions */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                        <Link
                            href={`/store/${product.id}`}
                            className="w-10 h-10 rounded-full bg-white text-gray-900 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-colors duration-300"
                            title="View Details"
                        >
                            <FaEye />
                        </Link>
                        <button
                            onClick={() => addToCart(product)}
                            className="w-10 h-10 rounded-full bg-white text-gray-900 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-colors duration-300"
                            title="Add to Cart"
                        >
                            <FaCartPlus />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="p-5 flex flex-col flex-1">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest px-2 py-0.5 bg-indigo-50 rounded">
                        {product.category}
                    </span>
                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">
                        {product.subject}
                    </span>
                </div>

                <Link href={`/store/${product.id}`} className="block">
                    <h3 className="text-gray-900 font-bold text-lg mb-2 line-clamp-2 hover:text-indigo-600 transition-colors">
                        {product.name}
                    </h3>
                </Link>

                <p className="text-gray-500 text-sm line-clamp-2 mb-4 flex-1">
                    {product.description}
                </p>

                <div className="flex items-center gap-2 mb-4">
                    <div className="flex text-yellow-400 text-xs">
                        {[...Array(5)].map((_, i) => (
                            <FaStar key={i} className={i < Math.floor(product.rating) ? "fill-current" : "text-gray-200"} />
                        ))}
                    </div>
                    <span className="text-xs font-semibold text-gray-700">{product.rating}</span>
                    <span className="text-xs text-gray-400">({product.reviews})</span>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-auto">
                    <div className="flex flex-col">
                        <span className="text-2xl font-black text-gray-900 leading-none">
                            {formatPrice(product.price)}
                        </span>
                        {product.originalPrice > product.price && (
                            <span className="text-xs text-gray-400 line-through mt-1">
                                {formatPrice(product.originalPrice)}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={() => addToCart(product)}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-lg shadow-indigo-200"
                    >
                        <FaCartPlus className="text-xs" />
                        Buy Now
                    </button>
                </div>
            </div>
        </div>
    );
}
