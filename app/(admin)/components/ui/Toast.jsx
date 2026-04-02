"use client";

import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  FaCheckCircle,
  FaExclamationCircle,
  FaInfoCircle,
  FaTimes,
} from "react-icons/fa";

/* -------------------------------------------------------------------------- */
/*                                    Toast                                   */
/* -------------------------------------------------------------------------- */

const Toast = ({ message, type, duration, onClose }) => {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(100);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (hovered) return;

    const start = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const percent = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(percent);
    }, 30);

    const timeout = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, duration);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [duration, hovered, onClose]);

  const styles = {
    success: {
      bg: "from-emerald-500/90 to-green-600/90",
      icon: <FaCheckCircle />,
    },
    error: {
      bg: "from-red-500/90 to-rose-600/90",
      icon: <FaExclamationCircle />,
    },
    info: {
      bg: "from-blue-500/90 to-indigo-600/90",
      icon: <FaInfoCircle />,
    },
  };

  const current = styles[type] || styles.success;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`transform transition-all duration-300 ${
        visible
          ? "translate-y-0 opacity-100 scale-100"
          : "translate-y-full opacity-0 scale-95"
      }`}
    >
      <div
        className={`relative overflow-hidden rounded-2xl border border-white/20 
        bg-gradient-to-br ${current.bg}
        backdrop-blur-xl shadow-2xl px-5 py-4 text-white`}
      >
        {/* Progress bar */}
        <div
          className="absolute bottom-0 left-0 h-[3px] bg-white/70 transition-all"
          style={{ width: `${progress}%` }}
        />

        <div className="flex items-start gap-4">
          <div className="text-xl mt-0.5 opacity-90">
            {current.icon}
          </div>

          <div className="flex-1">
            <p className="text-sm font-medium leading-relaxed">
              {message}
            </p>
          </div>

          <button
            onClick={() => {
              setVisible(false);
              setTimeout(onClose, 300);
            }}
            className="opacity-70 hover:opacity-100 transition"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                               Toast Container                              */
/* -------------------------------------------------------------------------- */

export const ToastContainer = ({ toasts, removeToast }) => {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed bottom-6 left-6 z-[999999] w-full max-w-sm space-y-3">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>,
    document.body
  );
};

/* -------------------------------------------------------------------------- */
/*                                  useToast                                  */
/* -------------------------------------------------------------------------- */

export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "success", duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [
      ...prev,
      { id, message, type, duration },
    ]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((msg, d) => addToast(msg, "success", d), [addToast]);
  const error = useCallback((msg, d) => addToast(msg, "error", d), [addToast]);
  const info = useCallback((msg, d) => addToast(msg, "info", d), [addToast]);

  return {
    toasts,
    removeToast,
    success,
    error,
    info,
  };
};

export default Toast;
