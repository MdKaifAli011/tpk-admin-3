"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const LogoutPage = () => {
  const router = useRouter();

  useEffect(() => {
    // Clear localStorage
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("student_token");
    }

    // Redirect to root route
    // NOTE: Next.js basePath is applied automatically for internal navigation.
    router.push("/");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="text-center bg-white/70 backdrop-blur-xl rounded-2xl shadow-2xl p-12 border border-blue-100 animate-fadeInUp">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-4"></div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Logging out...</h3>
        <p className="text-sm text-gray-500">
          Please wait while we log you out.
        </p>
      </div>
    </div>
  );
};

export default LogoutPage;
