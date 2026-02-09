"use client";

import React from "react";
import { FaStar, FaCartPlus, FaEye } from "react-icons/fa";
import { useStore } from "../StoreContext";
import Link from "next/link";

export default function ProductCard({ product }) {
  const { addToCart } = useStore();

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const discount =
    product.originalPrice > 0
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0;

  const categoryLabel =
    product.category === "course"
      ? "Course"
      : product.category === "ebook"
        ? "eBook"
        : "Paper";

  return (
    <article className="group flex flex-col h-full bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300">
      {/* Image */}
      <div className="relative aspect-video overflow-hidden bg-slate-100">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute top-4 left-4 flex gap-2">
          {product.badge && (
            <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
              {String(product.badge).toUpperCase()}
            </span>
          )}
        </div>
        <div className="absolute top-4 right-4">
          {discount > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
              {discount}% OFF
            </span>
          )}
        </div>
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Link
            href={`/store/${product.id}`}
            className="p-2.5 rounded-xl bg-white text-slate-800 hover:bg-indigo-600 hover:text-white transition-colors shadow-lg"
            title="View details"
          >
            <FaEye className="w-4 h-4" />
          </Link>
          <button
            type="button"
            onClick={() => addToCart(product)}
            className="p-2.5 rounded-xl bg-white text-slate-800 hover:bg-indigo-600 hover:text-white transition-colors shadow-lg"
            title="Add to cart"
          >
            <FaCartPlus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content — two-line description, premium spacing */}
      <div className="p-6 flex flex-col flex-1">
        <div className="flex gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
          <span className="text-indigo-600">{categoryLabel.toUpperCase()}</span>
          <span>•</span>
          <span>{product.subject.toUpperCase()}</span>
        </div>
        <Link href={`/store/${product.id}`} className="block mb-3">
          <h3 className="text-xl font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">
            {product.name}
          </h3>
        </Link>
        <p className="text-slate-500 text-sm line-clamp-2 leading-relaxed mb-4 flex-1 min-h-[2.5rem]">
          {product.description}
        </p>
        <div className="flex items-center gap-1.5 mb-6">
          <div className="flex text-amber-400 text-sm">
            {[1, 2, 3, 4, 5].map((i) => (
              <FaStar
                key={i}
                className={i <= Math.floor(product.rating) ? "fill-current" : "text-slate-300 fill-slate-300"}
              />
            ))}
          </div>
          <span className="text-sm font-bold text-slate-900 ml-1">{product.rating}</span>
          <span className="text-xs text-slate-400">({product.reviews.toLocaleString()})</span>
        </div>
        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {formatPrice(product.price)}
            </span>
            {product.originalPrice > product.price && (
              <span className="text-sm text-slate-400 line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => addToCart(product)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-indigo-500/25 hover:opacity-90 transition-opacity bg-gradient-to-r from-indigo-600 to-indigo-500"
          >
            <FaCartPlus className="w-4 h-4" />
            Buy Now
          </button>
        </div>
      </div>
    </article>
  );
}
