
"use client";

import React from "react";
import { FaTimes, FaTrash, FaPlus, FaMinus, FaShoppingBag } from "react-icons/fa";
import { useStore } from "../StoreContext";
import Link from "next/link";

export default function CartSlideOver() {
  const { cart, removeFromCart, updateQuantity, cartTotal, isCartOpen, setIsCartOpen } = useStore();

  if (!isCartOpen) return null;

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden" role="dialog" aria-modal="true" aria-label="Shopping cart">
      <div
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
        onClick={() => setIsCartOpen(false)}
        aria-hidden="true"
      />

      <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-8">
        <div className="pointer-events-auto w-full max-w-sm sm:max-w-md">
          <div className="flex h-full flex-col bg-white shadow-xl border-l border-gray-200">
            <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-5">
              <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <FaShoppingBag className="text-indigo-600 w-4 h-4" />
                  Your cart
                </h2>
                <button
                  type="button"
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  onClick={() => setIsCartOpen(false)}
                  aria-label="Close cart"
                >
                  <FaTimes className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-6">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-14 h-14 bg-indigo-50 rounded-xl flex items-center justify-center mb-4">
                      <FaShoppingBag className="text-indigo-500 w-7 h-7 opacity-60" />
                    </div>
                    <p className="text-sm font-medium text-gray-700">Your cart is empty</p>
                    <p className="text-xs text-gray-500 mt-1">Add study material from the store.</p>
                    <button
                      type="button"
                      onClick={() => setIsCartOpen(false)}
                      className="mt-4 text-sm font-semibold text-indigo-600 hover:text-indigo-700 underline-offset-2"
                    >
                      Browse store
                    </button>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {cart.map((product) => (
                      <li
                        key={product.id}
                        className="flex py-4 gap-3 hover:bg-gray-50/80 -mx-2 px-2 rounded-xl transition-colors"
                      >
                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                          <img
                            src={product.image}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between gap-2">
                            <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">
                              <Link href={`/store/${product.id}`} onClick={() => setIsCartOpen(false)}>
                                {product.name}
                              </Link>
                            </h3>
                            <span className="text-sm font-bold text-gray-900 shrink-0">
                              {formatPrice(product.price * product.quantity)}
                            </span>
                          </div>
                          <p className="text-[10px] font-medium text-indigo-600 uppercase tracking-wide mt-0.5">
                            {product.category}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center border border-gray-200 rounded-lg">
                              <button
                                type="button"
                                onClick={() => updateQuantity(product.id, -1)}
                                className="p-1.5 text-gray-500 hover:text-indigo-600 transition-colors"
                                aria-label="Decrease quantity"
                              >
                                <FaMinus className="w-3 h-3" />
                              </button>
                              <span className="text-sm font-semibold text-gray-900 min-w-[22px] text-center">
                                {product.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(product.id, 1)}
                                className="p-1.5 text-gray-500 hover:text-indigo-600 transition-colors"
                                aria-label="Increase quantity"
                              >
                                <FaPlus className="w-3 h-3" />
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFromCart(product.id)}
                              className="text-xs font-medium text-red-600 hover:text-red-700 flex items-center gap-1"
                            >
                              <FaTrash className="w-3 h-3" />
                              Remove
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {cart.length > 0 && (
              <div className="border-t border-gray-200 px-4 py-5 sm:px-5 bg-gray-50/50">
                <div className="flex justify-between text-sm font-semibold text-gray-900 mb-0.5">
                  <span>Subtotal</span>
                  <span>{formatPrice(cartTotal)}</span>
                </div>
                <p className="text-xs text-gray-500 mb-4">Shipping and taxes at checkout.</p>
                <Link
                  href="/store/checkout"
                  onClick={() => setIsCartOpen(false)}
                  className="block w-full text-center py-2.5 px-4 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  Proceed to checkout
                </Link>
                <p className="mt-3 text-center text-xs text-gray-500">
                  <button
                    type="button"
                    className="font-semibold text-indigo-600 hover:text-indigo-700"
                    onClick={() => setIsCartOpen(false)}
                  >
                    Continue shopping →
                  </button>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
