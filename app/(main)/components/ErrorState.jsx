"use client";
import React from "react";
import MainLayout from "../layout/MainLayout";
import { FaExclamationTriangle } from "react-icons/fa";
import Card from "./Card";

const ErrorState = ({ message, errorMessage }) => {
  const displayMessage = message || errorMessage || "An error occurred";

  return (
    <MainLayout>
      <div className="px-4 sm:px-6 py-8 sm:py-12">
        <Card variant="standard" className="p-6 sm:p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-red-100 rounded-full mb-4 sm:mb-6">
            <FaExclamationTriangle className="text-red-600 text-2xl sm:text-3xl" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
            Error
          </h2>
          <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
            {displayMessage}
          </p>
        </Card>
      </div>
    </MainLayout>
  );
};

export default ErrorState;

