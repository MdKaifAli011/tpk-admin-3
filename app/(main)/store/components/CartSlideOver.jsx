
"use client";
import React from "react";
import { FaTimes, FaTrash, FaPlus, FaMinus, FaShoppingBag } from "react-icons/fa";
import { useStore } from "../StoreContext";
import Link from "next/link";

export default function CartSlideOver() {
    const { cart, removeFromCart, updateQuantity, cartTotal, isCartOpen, setIsCartOpen } = useStore();

    if (!isCartOpen) return null;

    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(price);
    };

    return (
        <div className="fixed inset-0 z-[100] overflow-hidden">
            <div
                className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
                onClick={() => setIsCartOpen(false)}
            />

            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
                <div className="pointer-events-auto w-screen max-w-md">
                    <div className="flex h-full flex-col bg-white shadow-2xl">
                        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 scrollbar-hide">
                            <div className="flex items-start justify-between border-b border-gray-100 pb-6">
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <FaShoppingBag className="text-indigo-600" />
                                    Your Shopping Cart
                                </h2>
                                <div className="ml-3 flex h-7 items-center">
                                    <button
                                        type="button"
                                        className="relative -m-2 p-2 text-gray-400 hover:text-gray-500 rounded-full hover:bg-gray-100 transition-all"
                                        onClick={() => setIsCartOpen(false)}
                                    >
                                        <span className="sr-only">Close panel</span>
                                        <FaTimes className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="mt-8">
                                {cart.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-center">
                                        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                                            <FaShoppingBag className="text-indigo-600 text-3xl opacity-20" />
                                        </div>
                                        <p className="text-gray-500 font-medium text-lg">Your cart is empty</p>
                                        <p className="text-gray-400 text-sm mt-1">Start adding some amazing study material!</p>
                                        <button
                                            onClick={() => setIsCartOpen(false)}
                                            className="mt-6 text-indigo-600 font-bold hover:text-indigo-700 underline underline-offset-4"
                                        >
                                            Browse Store
                                        </button>
                                    </div>
                                ) : (
                                    <ul className="-my-6 divide-y divide-gray-100">
                                        {cart.map((product) => (
                                            <li key={product.id} className="flex py-6 transition-all hover:bg-gray-50 -mx-4 px-4 rounded-xl">
                                                <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
                                                    <img
                                                        src={product.image}
                                                        alt={product.name}
                                                        className="h-full w-full object-cover object-center"
                                                    />
                                                </div>

                                                <div className="ml-4 flex flex-1 flex-col">
                                                    <div>
                                                        <div className="flex justify-between text-base font-bold text-gray-900">
                                                            <h3 className="line-clamp-1">
                                                                <Link href={`/store/${product.id}`}>{product.name}</Link>
                                                            </h3>
                                                            <p className="ml-4 font-black">{formatPrice(product.price * product.quantity)}</p>
                                                        </div>
                                                        <p className="mt-1 text-xs text-indigo-600 font-bold uppercase tracking-wider">{product.category}</p>
                                                    </div>
                                                    <div className="flex flex-1 items-end justify-between text-sm">
                                                        <div className="flex items-center gap-3 border border-gray-200 rounded-lg px-2 py-1">
                                                            <button
                                                                onClick={() => updateQuantity(product.id, -1)}
                                                                className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                                                            >
                                                                <FaMinus className="w-3 h-3" />
                                                            </button>
                                                            <span className="font-bold text-gray-900 min-w-[20px] text-center">{product.quantity}</span>
                                                            <button
                                                                onClick={() => updateQuantity(product.id, 1)}
                                                                className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                                                            >
                                                                <FaPlus className="w-3 h-3" />
                                                            </button>
                                                        </div>

                                                        <div className="flex">
                                                            <button
                                                                type="button"
                                                                onClick={() => removeFromCart(product.id)}
                                                                className="font-medium text-red-500 hover:text-red-600 flex items-center gap-1 group transition-all"
                                                            >
                                                                <FaTrash className="w-3 h-3 group-hover:scale-110 transition-transform" />
                                                                <span className="text-xs">Remove</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        {cart.length > 0 && (
                            <div className="border-t border-gray-100 px-4 py-6 sm:px-6 bg-gray-50/50">
                                <div className="flex justify-between text-base font-bold text-gray-900">
                                    <p>Subtotal</p>
                                    <p className="text-xl font-black">{formatPrice(cartTotal)}</p>
                                </div>
                                <p className="mt-0.5 text-sm text-gray-500">Shipping and taxes calculated at checkout.</p>
                                <div className="mt-6">
                                    <Link
                                        href="/store/checkout"
                                        onClick={() => setIsCartOpen(false)}
                                        className="flex items-center justify-center rounded-2xl bg-indigo-600 px-6 py-4 text-lg font-bold text-white shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all duration-300"
                                    >
                                        Proceed to Checkout
                                    </Link>
                                </div>
                                <div className="mt-6 flex justify-center text-center text-sm text-gray-500">
                                    <p>
                                        or{" "}
                                        <button
                                            type="button"
                                            className="font-bold text-indigo-600 hover:text-indigo-700"
                                            onClick={() => setIsCartOpen(false)}
                                        >
                                            Continue Shopping
                                            <span aria-hidden="true"> &rarr;</span>
                                        </button>
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
