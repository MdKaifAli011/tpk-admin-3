"use client";
import React from "react";
import { FaExclamationTriangle, FaHome, FaRedo } from "react-icons/fa";
import { ERROR_MESSAGES } from "@/constants";
import { logger } from "@/utils/logger";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error with proper logger (only in development)
    logger.error("ErrorBoundary caught an error:", {
      error: error?.toString(),
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
    });
    
    // In production, you can send to error tracking service
    // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
    
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
                <FaExclamationTriangle className="text-red-600 text-4xl" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Something went wrong
              </h1>
              <p className="text-gray-600 mb-4">
                {ERROR_MESSAGES.SOMETHING_WENT_WRONG}
              </p>
              {this.state.error && (
                <details className="text-left bg-gray-50 rounded-lg p-4 mb-4">
                  <summary className="text-sm font-medium text-gray-700 cursor-pointer mb-2">
                    Error Details
                  </summary>
                  <pre className="text-xs text-red-600 overflow-auto">
                    {this.state.error.toString()}
                  </pre>
                </details>
              )}
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <FaRedo className="text-sm" />
                Try Again
              </button>
              <a
                href={typeof window !== "undefined" ? `${process.env.NEXT_PUBLIC_BASE_PATH || "/self-study"}/` : "/"}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                <FaHome className="text-sm" />
                Go Home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;


