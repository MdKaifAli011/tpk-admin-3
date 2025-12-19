"use client";

import React from "react";
import { FaWhatsapp } from "react-icons/fa";

/**
 * WhatsApp Floating Button Component
 * Displays a floating WhatsApp button in the bottom-right corner
 * Opens WhatsApp chat with the specified phone number
 */
const WhatsAppFloatButton = () => {
  const whatsappNumber = "15107069331";
  const whatsappUrl = `https://api.whatsapp.com/send?phone=${whatsappNumber}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-[100] group"
      aria-label="Contact us on WhatsApp"
    >
      <div className="relative">
        {/* Pulse animation ring */}
        <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75"></div>

        {/* Main button */}
        <div className="relative w-14 h-14 sm:w-16 sm:h-16 bg-green-500 hover:bg-green-600 rounded-full shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-300 transform hover:scale-110 active:scale-95">
          <FaWhatsapp className="text-white text-2xl sm:text-3xl" />
        </div>
      </div>
    </a>
  );
};

export default WhatsAppFloatButton;
