
"use client";
import React, { useState } from "react";
import { useStore } from "../StoreContext";
import { FaCheckCircle, FaLock, FaCreditCard, FaPaypal, FaUniversity, FaArrowLeft } from "react-icons/fa";
import Link from "next/link";

export default function CheckoutPage() {
    const { cart, cartTotal, removeFromCart } = useStore();
    const [isOrdered, setIsOrdered] = useState(false);
    const [email, setEmail] = useState("");

    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(price);
    };

    const handleOrder = (e) => {
        e.preventDefault();
        setIsOrdered(true);
        // In a real app, you'd call an API here
    };

    if (isOrdered) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-8 animate-bounce">
                    <FaCheckCircle className="text-green-600 text-5xl" />
                </div>
                <h1 className="text-4xl font-black text-gray-900 mb-4">Order Successful!</h1>
                <p className="text-gray-500 text-lg mb-8 max-w-md text-center">
                    Thank you for choosing TestPrepKart. A confirmation email has been sent to
                    <span className="font-bold text-gray-900 ml-1">{email || "your email"}</span>.
                    Your resources will be available in your dashboard shortly.
                </p>
                <div className="flex gap-4">
                    <Link href="/store" className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-xl shadow-indigo-100">
                        Back to Store
                    </Link>
                    <Link href="/" className="bg-gray-100 text-gray-900 px-8 py-3 rounded-xl font-bold">
                        Go to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    if (cart.length === 0) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-4">
                <h1 className="text-3xl font-black text-gray-900 mb-4">Your Cart is Empty</h1>
                <p className="text-gray-500 mb-8">Add some resources to your cart before proceeding to checkout.</p>
                <Link href="/store" className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold">
                    Start Shopping
                </Link>
            </div>
        );
    }

    return (
        <div className="bg-gray-50/50 min-h-screen pt-10 pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center gap-4 mb-10">
                    <Link href="/store" className="p-3 bg-white rounded-xl shadow-sm hover:text-indigo-600 transition-colors">
                        <FaArrowLeft />
                    </Link>
                    <h1 className="text-3xl font-black text-gray-900">Checkout</h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* Checkout Form */}
                    <div className="lg:col-span-8 space-y-8">
                        {/* Contact Information */}
                        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                            <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold">1</span>
                                Contact Information
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Full Name</label>
                                    <input type="text" className="w-full px-5 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-indigo-600 font-medium transition-all" placeholder="John Doe" required />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Email Address</label>
                                    <input
                                        type="email"
                                        className="w-full px-5 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-indigo-600 font-medium transition-all"
                                        placeholder="john@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Payment Method */}
                        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                            <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold">2</span>
                                Payment Method
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                                <button className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-indigo-600 bg-indigo-50/50 text-indigo-600 transition-all">
                                    <FaCreditCard className="text-2xl" />
                                    <span className="font-bold text-sm">Card</span>
                                </button>
                                <button className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-gray-100 hover:border-indigo-200 transition-all text-gray-400">
                                    <FaPaypal className="text-2xl" />
                                    <span className="font-bold text-sm">PayPal</span>
                                </button>
                                <button className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-gray-100 hover:border-indigo-200 transition-all text-gray-400">
                                    <FaUniversity className="text-2xl" />
                                    <span className="font-bold text-sm">UPI/Net</span>
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Card Number</label>
                                    <div className="relative">
                                        <FaCreditCard className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type="text" className="w-full pl-12 pr-5 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-indigo-600 font-medium transition-all" placeholder="0000 0000 0000 0000" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Expiry Date</label>
                                        <input type="text" className="w-full px-5 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-indigo-600 font-medium transition-all" placeholder="MM/YY" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">CVV</label>
                                        <div className="relative">
                                            <FaLock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input type="text" className="w-full pl-12 pr-5 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-indigo-600 font-medium transition-all" placeholder="123" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 text-gray-400 text-sm font-medium px-4">
                            <FaLock className="text-xs" />
                            Your transaction is secured with 256-bit encryption
                        </div>
                    </div>

                    {/* Order Summary */}
                    <div className="lg:col-span-4">
                        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm sticky top-32">
                            <h2 className="text-xl font-black text-gray-900 mb-8 border-b border-gray-50 pb-6">Order Summary</h2>

                            <div className="space-y-6 mb-8 max-h-[300px] overflow-y-auto scrollbar-hide">
                                {cart.map((item) => (
                                    <div key={item.id} className="flex gap-4 group">
                                        <div className="w-16 h-16 rounded-xl bg-gray-50 overflow-hidden border border-gray-100 flex-shrink-0">
                                            <img src={item.image} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-bold text-gray-900 line-clamp-1 mb-1">{item.name}</h4>
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-gray-400">Qty: {item.quantity}</span>
                                                <span className="text-sm font-black text-gray-900">{formatPrice(item.price * item.quantity)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-4 pt-6 border-t border-gray-100 mb-8">
                                <div className="flex justify-between text-gray-500 font-medium">
                                    <span>Subtotal</span>
                                    <span className="font-bold text-gray-900">{formatPrice(cartTotal)}</span>
                                </div>
                                <div className="flex justify-between text-gray-500 font-medium">
                                    <span>Taxes & Fees</span>
                                    <span className="font-bold text-gray-900">{formatPrice(0)}</span>
                                </div>
                                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                                    <span className="text-lg font-black text-gray-900">Total Amount</span>
                                    <span className="text-2xl font-black text-indigo-600">{formatPrice(cartTotal)}</span>
                                </div>
                            </div>

                            <button
                                onClick={handleOrder}
                                className="w-full bg-indigo-600 text-white py-5 rounded-2xl text-lg font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3"
                            >
                                Complete Purchase
                            </button>

                            <div className="mt-6 p-4 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center gap-3">
                                <FaCheckCircle className="text-indigo-600" />
                                <p className="text-xs text-indigo-800 font-bold tracking-tight">7-Day Money Back Guarantee</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
