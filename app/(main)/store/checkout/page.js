
"use client";

import React, { useState } from "react";
import { useStore } from "../StoreContext";
import { FaCheckCircle, FaLock, FaCreditCard, FaPaypal, FaUniversity, FaArrowLeft } from "react-icons/fa";
import Link from "next/link";
import Card from "../../components/Card";

export default function CheckoutPage() {
  const { cart, cartTotal } = useStore();
  const [isOrdered, setIsOrdered] = useState(false);
  const [email, setEmail] = useState("");

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleOrder = (e) => {
    e.preventDefault();
    setIsOrdered(true);
  };

  if (isOrdered) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mb-6">
          <FaCheckCircle className="text-green-600 w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Order successful</h1>
        <p className="text-sm text-gray-500 mb-6">
          A confirmation will be sent to <span className="font-semibold text-gray-900">{email || "your email"}</span>. Resources will appear in your dashboard shortly.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/store"
            className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            Back to store
          </Link>
          <Link
            href="/"
            className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 flex flex-col items-center text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Your cart is empty</h1>
        <p className="text-sm text-gray-500 mb-6">Add resources from the store before checkout.</p>
        <Link
          href="/store"
          className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
        >
          Start shopping
        </Link>
      </div>
    );
  }

  const inputClass = "w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder-gray-400";
  const labelClass = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/store"
          className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:text-indigo-600 transition-colors"
        >
          <FaArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Checkout</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <Card variant="standard" hover={false} className="p-5 sm:p-6 shadow-sm border-gray-200/80">
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">1</span>
              Contact information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Full name</label>
                <input type="text" className={inputClass} placeholder="John Doe" required />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  className={inputClass}
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
          </Card>

          <Card variant="standard" hover={false} className="p-5 sm:p-6 shadow-sm border-gray-200/80">
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">2</span>
              Payment method
            </h2>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <button type="button" className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-indigo-600 bg-indigo-50/50 text-indigo-600">
                <FaCreditCard className="w-5 h-5" />
                <span className="text-xs font-semibold">Card</span>
              </button>
              <button type="button" className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-200 hover:border-indigo-200 text-gray-400">
                <FaPaypal className="w-5 h-5" />
                <span className="text-xs font-semibold">PayPal</span>
              </button>
              <button type="button" className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-200 hover:border-indigo-200 text-gray-400">
                <FaUniversity className="w-5 h-5" />
                <span className="text-xs font-semibold">UPI</span>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Card number</label>
                <div className="relative">
                  <FaCreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input type="text" className={`${inputClass} pl-10`} placeholder="0000 0000 0000 0000" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Expiry</label>
                  <input type="text" className={inputClass} placeholder="MM/YY" />
                </div>
                <div>
                  <label className={labelClass}>CVV</label>
                  <div className="relative">
                    <FaLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input type="text" className={`${inputClass} pl-10`} placeholder="123" />
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-4 flex items-center gap-2 text-xs text-gray-500">
              <FaLock className="w-3 h-3" />
              Secured with 256-bit encryption
            </p>
          </Card>
        </div>

        <div className="lg:col-span-4">
          <Card variant="standard" hover={false} className="p-5 sm:p-6 sticky top-24 shadow-sm border-gray-200/80">
            <h2 className="text-base font-bold text-gray-900 mb-4 pb-4 border-b border-gray-100">Order summary</h2>
            <div className="space-y-4 mb-6 max-h-48 overflow-y-auto">
              {cart.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden shrink-0 border border-gray-200">
                    <img src={item.image} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-gray-900 line-clamp-1">{item.name}</h4>
                    <div className="flex justify-between items-center mt-0.5">
                      <span className="text-xs text-gray-500">Qty: {item.quantity}</span>
                      <span className="text-sm font-bold text-gray-900">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-2 pt-4 border-t border-gray-100 mb-6">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span className="font-semibold text-gray-900">{formatPrice(cartTotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Taxes</span>
                <span className="font-semibold text-gray-900">{formatPrice(0)}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                <span className="text-sm font-bold text-gray-900">Total</span>
                <span className="text-lg font-bold text-indigo-600">{formatPrice(cartTotal)}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleOrder}
              className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              Complete purchase
            </button>
            <div className="mt-4 p-3 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center gap-2">
              <FaCheckCircle className="text-indigo-600 w-4 h-4 shrink-0" />
              <p className="text-xs font-semibold text-indigo-800">7-day money-back guarantee</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
