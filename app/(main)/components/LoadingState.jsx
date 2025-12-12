"use client";
import React from "react";
import MainLayout from "../layout/MainLayout";
import { FaSpinner } from "react-icons/fa";
import { PLACEHOLDERS } from "@/constants";
import Card from "./Card";

const LoadingState = () => {
  return (
    <MainLayout>
      <div className="px-4 sm:px-6 py-8 sm:py-12">
        <Card variant="standard" className="p-6 sm:p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 mb-4 sm:mb-6">
            <FaSpinner className="text-indigo-600 text-4xl sm:text-5xl animate-spin" />
          </div>
          <p className="text-sm sm:text-base font-medium text-gray-600">
            {PLACEHOLDERS.LOADING || "Loading..."}
          </p>
        </Card>
      </div>
    </MainLayout>
  );
};

export default LoadingState;
