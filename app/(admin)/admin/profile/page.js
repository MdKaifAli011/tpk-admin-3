"use client";
import React, { useState, useEffect } from "react";
import {
  FaUser,
  FaEnvelope,
  FaShieldAlt,
  FaSave,
  FaEye,
  FaEyeSlash,
  FaKey,
  FaUserShield,
  FaUserEdit,
  FaUserCheck,
  FaEye as FaEyeIcon,
} from "react-icons/fa";
import { ToastContainer, useToast } from "../../components/ui/Toast";
import { LoadingSpinner } from "../../components/ui/SkeletonLoader";
import api from "@/lib/api";

const ProfilePage = () => {
  const { toasts, removeToast, success, error: showError } = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  // Define roles with color classes
  const roles = [
    {
      value: "admin",
      label: "Admin",
      icon: FaShieldAlt,
      colorClass: "text-red-600",
      bgClass: "bg-red-50",
    },
    {
      value: "super_moderator",
      label: "Super Moderator",
      icon: FaUserShield,
      colorClass: "text-purple-600",
      bgClass: "bg-purple-50",
    },
    {
      value: "moderator",
      label: "Moderator",
      icon: FaUserEdit,
      colorClass: "text-blue-600",
      bgClass: "bg-blue-50",
    },
    {
      value: "editor",
      label: "Editor",
      icon: FaUserCheck,
      colorClass: "text-green-600",
      bgClass: "bg-green-50",
    },
    {
      value: "viewer",
      label: "Viewer",
      icon: FaEyeIcon,
      colorClass: "text-gray-600",
      bgClass: "bg-gray-50",
    },
  ];

  // Get role info
  const getRoleInfo = (roleValue) => {
    return roles.find((r) => r.value === roleValue) || roles[4]; // Default to viewer
  };

  // Fetch current user data from server (verifies user still exists)
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError(null);

        // CRITICAL: Verify user exists in database, not just localStorage
        // This ensures deleted users are immediately logged out
        try {
          const response = await api.get("/auth/verify");

          if (response.data.success && response.data.data) {
            // User exists and is active - update state
            const userData = response.data.data;
            setUser(userData);
            setFormData({
              name: userData.name || "",
              email: userData.email || "",
              password: "",
              confirmPassword: "",
            });
            // Update localStorage with fresh data
            localStorage.setItem("user", JSON.stringify(userData));
          } else {
            // User not found or inactive
            throw new Error("User account not found or inactive");
          }
        } catch (err) {
          // User deleted or token invalid - clear everything and redirect
          console.error("Error verifying user:", err);
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setError("Your account is no longer available. Please login again.");
          // Redirect to login after a short delay
          setTimeout(() => {
            window.location.href = "/admin/login";
          }, 2000);
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
        setError("Failed to load user data. Please login again.");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError("Name is required");
      setSaving(false);
      return;
    }

    if (!formData.email.trim()) {
      setError("Email is required");
      setSaving(false);
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      setSaving(false);
      return;
    }

    // Password validation (only if password is provided)
    if (formData.password) {
      if (formData.password.length < 6) {
        setError("Password must be at least 6 characters long");
        setSaving(false);
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match");
        setSaving(false);
        return;
      }
    }

    try {
      const updateData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
      };

      // Only include password if it's provided
      if (formData.password) {
        updateData.password = formData.password;
      }

      const response = await api.put(`/user/${user._id}`, updateData);

      if (response.data.success) {
        // Update localStorage with new user data
        const updatedUser = response.data.data;
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);
        setIsEditing(false);
        setFormData({
          name: updatedUser.name || "",
          email: updatedUser.email || "",
          password: "",
          confirmPassword: "",
        });
        success("Profile updated successfully!");
      } else {
        setError(response.data.message || "Failed to update profile");
        showError(response.data.message || "Failed to update profile");
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      const errorMessage =
        err.response?.data?.message ||
        "Failed to update profile. Please try again.";
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form to original user data
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        password: "",
        confirmPassword: "",
      });
    }
    setIsEditing(false);
    setError(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="text-sm text-gray-500 mt-4">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center bg-white rounded-lg border border-red-200 p-8 max-w-md">
          <span className="text-3xl mb-4 inline-block">⚠️</span>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Error</h3>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center bg-white rounded-lg border border-gray-200 p-8 max-w-md">
          <span className="text-3xl mb-4 inline-block">👤</span>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            No User Data
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            User data not found. Please login again.
          </p>
        </div>
      </div>
    );
  }

  const roleInfo = getRoleInfo(user.role);
  const RoleIcon = roleInfo.icon;

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="space-y-6">
        {/* Page Header */}
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <FaUser className="text-blue-600" />
                Profile Settings
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage your account information and preferences
              </p>
            </div>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-[#0056FF] hover:bg-[#0044CC] text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <FaUserEdit className="w-4 h-4" />
                Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* Profile Information */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FaUser className="text-gray-600" />
              Profile Information
            </h2>
          </div>

          <form onSubmit={handleSave} className="p-6 space-y-6">
            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
            )}

            {/* Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaUser className="text-gray-400 text-sm" />
                </div>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  disabled={!isEditing}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:bg-gray-50 disabled:cursor-not-allowed"
                  placeholder="Enter your full name"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaEnvelope className="text-gray-400 text-sm" />
                </div>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={!isEditing}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:bg-gray-50 disabled:cursor-not-allowed"
                  placeholder="Enter your email address"
                />
              </div>
            </div>

            {/* Role (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg">
                <div className={`p-2 ${roleInfo.bgClass} rounded-lg`}>
                  <RoleIcon className={`${roleInfo.colorClass} text-base`} />
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {roleInfo.label}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Role cannot be changed. Contact administrator to change your
                role.
              </p>
            </div>

            {/* Password Section (only show when editing) */}
            {isEditing && (
              <div className="pt-6 border-t border-gray-200 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">
                  Change Password (Optional)
                </h3>

                {/* Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaKey className="text-gray-400 text-sm" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      minLength={6}
                      className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="Enter new password (leave blank to keep current)"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <FaEyeSlash className="text-sm" />
                      ) : (
                        <FaEye className="text-sm" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Leave blank if you don&apos;t want to change your password
                  </p>
                </div>

                {/* Confirm Password */}
                {formData.password && (
                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaKey className="text-gray-400 text-sm" />
                      </div>
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        id="confirmPassword"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        minLength={6}
                        className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder="Confirm new password"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? (
                          <FaEyeSlash className="text-sm" />
                        ) : (
                          <FaEye className="text-sm" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Form Actions */}
            {isEditing && (
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#0056FF] rounded-lg hover:bg-[#0044CC] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <LoadingSpinner size="small" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <FaSave className="w-4 h-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Account Information (Read-only) */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FaShieldAlt className="text-gray-600" />
              Account Information
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  User ID
                </label>
                <p className="text-sm font-mono text-gray-900">{user._id}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Status
                </label>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.status === "active"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {user.status === "active" ? "Active" : "Inactive"}
                </span>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Created At
                </label>
                <p className="text-sm text-gray-900">
                  {user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "N/A"}
                </p>
              </div>
              {user.lastLogin && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Last Login
                  </label>
                  <p className="text-sm text-gray-900">
                    {new Date(user.lastLogin).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProfilePage;
