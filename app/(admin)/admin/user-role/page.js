"use client";
import React, { useState, useEffect } from "react";
import {
  FaUsers,
  FaShieldAlt,
  FaCheck,
  FaTimes,
  FaEdit,
  FaTrash,
  FaUserShield,
  FaUserEdit,
  FaUserCheck,
  FaEye,
  FaLock,
  FaUserPlus,
  FaEnvelope,
  FaKey,
} from "react-icons/fa";
import api from "@/lib/api";
import { usePermissions, getPermissionMessage } from "../../hooks/usePermissions";
import { PermissionButton } from "../../components/common/PermissionButton";

const UserRolePage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [showPermissionMatrix, setShowPermissionMatrix] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "viewer",
  });
  const [creating, setCreating] = useState(false);
  const [createdUser, setCreatedUser] = useState(null);
  const [showCredentials, setShowCredentials] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
      icon: FaEye,
      colorClass: "text-gray-600",
      bgClass: "bg-gray-50",
    },
  ];

  // Permission matrix
  const permissionMatrix = [
    {
      action: "GET (List/Detail)",
      description: "View and list resources",
      roles: ["admin", "super_moderator", "moderator", "editor", "viewer"],
    },
    {
      action: "POST (Create)",
      description: "Create new resources",
      roles: ["admin", "super_moderator", "moderator"],
    },
    {
      action: "PUT/PATCH (Update)",
      description: "Update and reorder resources",
      roles: ["admin", "super_moderator", "moderator", "editor"],
    },
    {
      action: "DELETE",
      description: "Delete resources",
      roles: ["admin", "super_moderator"],
    },
    {
      action: "User/Role Management",
      description: "Manage users and roles",
      roles: ["admin"],
    },
  ];

  // Fetch users from API
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await api.get("/user");
        if (response.data.success) {
          setUsers(response.data.data || []);
        } else {
          setError(response.data.message || "Failed to load users");
        }
      } catch (err) {
        console.error("Error fetching users:", err);
        setError(err.response?.data?.message || "Failed to load users");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Handle role update
  const handleRoleUpdate = async (userId, newRole) => {
    try {
      const response = await api.put(`/user/${userId}`, { role: newRole });

      if (response.data.success) {
        // Update local state
        setUsers((prev) =>
          prev.map((user) =>
            user._id === userId ? { ...user, role: newRole } : user
          )
        );

        setEditingUser(null);
        setSelectedRole("");
        setError(null);
      } else {
        setError(response.data.message || "Failed to update user role");
      }
    } catch (err) {
      console.error("Error updating role:", err);
      setError(err.response?.data?.message || "Failed to update user role");
    }
  };

  // Handle delete user
  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setDeleting(true);
      setError(null);

      const response = await api.delete(`/user/${userToDelete._id}`);

      if (response.data.success) {
        // Remove user from list
        setUsers((prev) =>
          prev.filter((user) => user._id !== userToDelete._id)
        );
        setUserToDelete(null);
        setShowDeleteConfirm(false);
        setError(null);
      } else {
        setError(response.data.message || "Failed to delete user");
      }
    } catch (err) {
      console.error("Error deleting user:", err);
      setError(err.response?.data?.message || "Failed to delete user");
    } finally {
      setDeleting(false);
    }
  };

  // Handle create user form change
  const handleCreateFormChange = (e) => {
    setCreateFormData({
      ...createFormData,
      [e.target.name]: e.target.value,
    });
    setError(null);
  };

  // Handle create user
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError(null);

    // Validation
    if (createFormData.password !== createFormData.confirmPassword) {
      setError("Passwords do not match");
      setCreating(false);
      return;
    }

    if (createFormData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      setCreating(false);
      return;
    }

    try {
      const response = await api.post("/user", {
        name: createFormData.name,
        email: createFormData.email,
        password: createFormData.password,
        role: createFormData.role,
      });

      if (response.data.success) {
        // Store created user credentials
        const newUser = response.data.data;
        setCreatedUser({
          email: createFormData.email,
          password: createFormData.password,
          role: createFormData.role,
          name: createFormData.name,
        });
        setShowCredentials(true);

        // Add new user to list
        setUsers((prev) => [newUser, ...prev]);

        // Reset form
        setCreateFormData({
          name: "",
          email: "",
          password: "",
          confirmPassword: "",
          role: "viewer",
        });
        setShowCreateForm(false);
        setError(null);
      } else {
        setError(response.data.message || "Failed to create user");
      }
    } catch (err) {
      console.error("Error creating user:", err);
      setError(err.response?.data?.message || "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  // Get role info
  const getRoleInfo = (roleValue) => {
    return roles.find((r) => r.value === roleValue) || roles[4]; // Default to viewer
  };

  // Check if action is allowed for role
  const hasPermission = (action, role) => {
    const matrixItem = permissionMatrix.find((m) => m.action === action);
    return matrixItem?.roles.includes(role) || false;
  };

  const { canManageUsers, role: currentRole } = usePermissions();

  return (
    <div className="space-y-6">
        {/* Page Header */}
        <div className="bg-linear-to-r from-blue-50 via-indigo-50 to-purple-50 border border-gray-200 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <FaUsers className="text-blue-600" />
                User Role Management
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage user roles and permissions
              </p>
            </div>
            <button
              onClick={() => setShowPermissionMatrix(!showPermissionMatrix)}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
            >
              {showPermissionMatrix ? "Hide" : "Show"} Permission Matrix
            </button>
          </div>
        </div>

        {/* Permission Matrix */}
        {showPermissionMatrix && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FaLock className="text-gray-600" />
                Permission Matrix
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Overview of permissions for each role
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Description
                    </th>
                    {roles.map((role) => (
                      <th
                        key={role.value}
                        className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider"
                      >
                        <div className="flex flex-col items-center gap-1">
                          <role.icon
                            className={`${role.colorClass} text-base`}
                          />
                          <span className="text-[10px]">{role.label}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {permissionMatrix.map((item, index) => (
                    <tr
                      key={index}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {item.action}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600">
                          {item.description}
                        </div>
                      </td>
                      {roles.map((role) => {
                        const hasAccess = hasPermission(
                          item.action,
                          role.value
                        );
                        return (
                          <td
                            key={role.value}
                            className="px-4 py-4 text-center"
                          >
                            {hasAccess ? (
                              <div className="flex justify-center">
                                <div className="p-1.5 bg-green-100 rounded-full">
                                  <FaCheck className="text-green-600 text-xs" />
                                </div>
                              </div>
                            ) : (
                              <div className="flex justify-center">
                                <div className="p-1.5 bg-gray-100 rounded-full">
                                  <FaTimes className="text-gray-400 text-xs" />
                                </div>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Credentials Display Modal */}
        {showCredentials && createdUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center px-4">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  User Created Successfully
                </h3>
                <button
                  onClick={() => {
                    setShowCredentials(false);
                    setCreatedUser(null);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FaTimes className="text-sm" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-yellow-800 mb-2">
                    ⚠️ Please save these credentials. They will not be shown
                    again.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-900">
                      {createdUser.name}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Email (User ID)
                    </label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono text-gray-900">
                      {createdUser.email}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono text-gray-900">
                      {createdUser.password}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Role
                    </label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-900">
                      {roles.find((r) => r.value === createdUser.role)?.label ||
                        createdUser.role}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setShowCredentials(false);
                      setCreatedUser(null);
                    }}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && userToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center px-4">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Delete User
                </h3>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setUserToDelete(null);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FaTimes className="text-sm" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-red-800 mb-2">
                    ⚠️ This action cannot be undone.
                  </p>
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-gray-700">
                    Are you sure you want to delete this user?
                  </p>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                    <div>
                      <span className="text-xs font-medium text-gray-600">
                        Name:
                      </span>
                      <span className="ml-2 text-sm font-medium text-gray-900">
                        {userToDelete.name}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-600">
                        Email:
                      </span>
                      <span className="ml-2 text-sm text-gray-900">
                        {userToDelete.email}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-600">
                        Role:
                      </span>
                      <span className="ml-2 text-sm text-gray-900">
                        {roles.find((r) => r.value === userToDelete.role)
                          ?.label || userToDelete.role}
                      </span>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setUserToDelete(null);
                      setError(null);
                    }}
                    disabled={deleting}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <PermissionButton
                    action="delete"
                    onClick={handleDeleteUser}
                    disabled={!canManageUsers || deleting}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    title={getPermissionMessage("delete", currentRole)}
                  >
                    {deleting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <FaTrash className="text-sm" />
                        <span>Delete User</span>
                      </>
                    )}
                  </PermissionButton>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create User Form */}
        {showCreateForm && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FaUserPlus className="text-blue-600" />
                  Create New User
                </h2>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setCreateFormData({
                      name: "",
                      email: "",
                      password: "",
                      confirmPassword: "",
                      role: "viewer",
                    });
                    setError(null);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Close"
                >
                  <FaTimes className="text-sm" />
                </button>
              </div>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label
                    htmlFor="create-name"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaUsers className="text-gray-400 text-sm" />
                    </div>
                    <input
                      type="text"
                      id="create-name"
                      name="name"
                      value={createFormData.name}
                      onChange={handleCreateFormChange}
                      required
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="John Doe"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label
                    htmlFor="create-email"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaEnvelope className="text-gray-400 text-sm" />
                    </div>
                    <input
                      type="email"
                      id="create-email"
                      name="email"
                      value={createFormData.email}
                      onChange={handleCreateFormChange}
                      required
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="user@example.com"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="create-password"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaKey className="text-gray-400 text-sm" />
                    </div>
                    <input
                      type="password"
                      id="create-password"
                      name="password"
                      value={createFormData.password}
                      onChange={handleCreateFormChange}
                      required
                      minLength={6}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="At least 6 characters"
                    />
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label
                    htmlFor="create-confirm-password"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaKey className="text-gray-400 text-sm" />
                    </div>
                    <input
                      type="password"
                      id="create-confirm-password"
                      name="confirmPassword"
                      value={createFormData.confirmPassword}
                      onChange={handleCreateFormChange}
                      required
                      minLength={6}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="Confirm password"
                    />
                  </div>
                </div>

                {/* Role */}
                <div>
                  <label
                    htmlFor="create-role"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Role
                  </label>
                  <select
                    id="create-role"
                    name="role"
                    value={createFormData.role}
                    onChange={handleCreateFormChange}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    {roles.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setCreateFormData({
                      name: "",
                      email: "",
                      password: "",
                      confirmPassword: "",
                      role: "viewer",
                    });
                    setError(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#0056FF] rounded-lg hover:bg-[#0044CC] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {creating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <FaUserPlus className="text-sm" />
                      <span>Create User</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Users List */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FaUsers className="text-gray-600" />
                  Users ({users.length})
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Manage user roles and permissions
                </p>
              </div>
              <PermissionButton
                action="create"
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="px-4 py-2 bg-[#0056FF] text-white rounded-lg text-sm font-medium hover:bg-[#0044CC] transition-colors shadow-sm flex items-center gap-2"
                title={getPermissionMessage("create", currentRole)}
                disabled={!canManageUsers}
              >
                <FaUserPlus className="text-sm" />
                {showCreateForm ? "Cancel" : "Create User"}
              </PermissionButton>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
              <p className="text-sm text-gray-600 mt-4">Loading users...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center">
              <FaUsers className="text-gray-400 text-4xl mx-auto mb-4" />
              <p className="text-sm text-gray-600">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => {
                    const roleInfo = getRoleInfo(user.role);
                    const RoleIcon = roleInfo.icon;
                    const isEditing = editingUser === user._id;

                    return (
                      <tr
                        key={user._id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {user.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">
                            {user.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isEditing ? (
                            <select
                              value={selectedRole || user.role}
                              onChange={(e) => setSelectedRole(e.target.value)}
                              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              {roles.map((role) => (
                                <option key={role.value} value={role.value}>
                                  {role.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="flex items-center gap-2">
                              <RoleIcon
                                className={`${roleInfo.colorClass} text-base`}
                              />
                              <span className="text-sm font-medium text-gray-900">
                                {roleInfo.label}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-2">
                              <PermissionButton
                                action="edit"
                                onClick={() => {
                                  handleRoleUpdate(
                                    user._id,
                                    selectedRole || user.role
                                  );
                                }}
                                className="p-2 bg-green-50 text-green-600 rounded-lg transition-colors hover:bg-green-100"
                                title={getPermissionMessage("edit", currentRole)}
                                disabled={!canManageUsers}
                              >
                                <FaCheck className="text-sm" />
                              </PermissionButton>
                              <button
                                onClick={() => {
                                  setEditingUser(null);
                                  setSelectedRole("");
                                }}
                                className="p-2 bg-gray-50 text-gray-600 rounded-lg transition-colors hover:bg-gray-100"
                                title="Cancel"
                              >
                                <FaTimes className="text-sm" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <PermissionButton
                                action="edit"
                                onClick={() => {
                                  setEditingUser(user._id);
                                  setSelectedRole(user.role);
                                }}
                                className="p-2 bg-blue-50 text-blue-600 rounded-lg transition-colors hover:bg-blue-100"
                                title={getPermissionMessage("edit", currentRole)}
                                disabled={!canManageUsers}
                              >
                                <FaEdit className="text-sm" />
                              </PermissionButton>
                              <PermissionButton
                                action="delete"
                                onClick={() => {
                                  setUserToDelete(user);
                                  setShowDeleteConfirm(true);
                                }}
                                className="p-2 bg-red-50 text-red-600 rounded-lg transition-colors hover:bg-red-100"
                                title={getPermissionMessage("delete", currentRole)}
                                disabled={!canManageUsers}
                              >
                                <FaTrash className="text-sm" />
                              </PermissionButton>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Role Descriptions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => {
            const RoleIcon = role.icon;
            const permissions = permissionMatrix.filter((p) =>
              p.roles.includes(role.value)
            );

            return (
              <div
                key={role.value}
                className="bg-white border border-gray-200 rounded-lg shadow-sm p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 ${role.bgClass} rounded-lg`}>
                    <RoleIcon className={`${role.colorClass} text-lg`} />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">
                    {role.label}
                  </h3>
                </div>
                <div className="space-y-2">
                  {permissions.map((perm, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-sm text-gray-600"
                    >
                      <FaCheck className="text-green-600 text-xs" />
                      <span>{perm.action}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
  );
};

export default UserRolePage;
