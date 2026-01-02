"use client";
import { useState, useEffect } from "react";

/**
 * Hook to check user permissions based on role
 * @returns {object} - Permission object with canCreate, canEdit, canDelete, canReorder, canManageUsers
 */
export function usePermissions() {
  const [permissions, setPermissions] = useState({
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canReorder: false,
    canManageUsers: false,
    role: null,
  });

  useEffect(() => {
    const checkPermissions = () => {
      if (typeof window === "undefined") {
        return;
      }

      const userStr = localStorage.getItem("user");
      if (!userStr) {
        setPermissions({
          canCreate: false,
          canEdit: false,
          canDelete: false,
          canReorder: false,
          canManageUsers: false,
          role: null,
        });
        return;
      }

      try {
        const user = JSON.parse(userStr);
        // Normalize role string to a canonical key
        const rawRole = user.role || "viewer";
        const role = String(rawRole)
          .toLowerCase()
          .replace(/\s+/g, "_")
          .replace(/[^a-z0-9_]/g, "");

        // Define permissions based on role
        const rolePermissions = {
          viewer: {
            canCreate: false,
            canEdit: false,
            canDelete: false,
            canReorder: false,
            canManageUsers: false,
          },
          editor: {
            canCreate: false,
            canEdit: true,
            canDelete: false,
            canReorder: true,
            canManageUsers: false,
          },
          moderator: {
            canCreate: true,
            canEdit: true,
            canDelete: false,
            canReorder: true,
            canManageUsers: false,
          },
          super_moderator: {
            canCreate: true,
            canEdit: true,
            canDelete: true,
            canReorder: true,
            canManageUsers: false,
          },
          admin: {
            canCreate: true,
            canEdit: true,
            canDelete: true,
            canReorder: true,
            canManageUsers: true,
          },
        };

        const userPermissions = rolePermissions[role] || rolePermissions.viewer;

        setPermissions({
          ...userPermissions,
          role,
        });
      } catch (error) {
        console.error("Error parsing user data:", error);
        setPermissions({
          canCreate: false,
          canEdit: false,
          canDelete: false,
          canReorder: false,
          canManageUsers: false,
          role: null,
        });
      }
    };

    checkPermissions();

    // Listen for storage changes (e.g., login/logout)
    const handleStorageChange = () => {
      checkPermissions();
    };

    window.addEventListener("storage", handleStorageChange);

    // Listen for custom permission change events
    const handlePermissionChangeEvent = () => {
      checkPermissions();
    };
    window.addEventListener("permission-change", handlePermissionChangeEvent);

    // Check permissions periodically (reduced frequency from 1s to 5s for better performance)
    // This is a fallback for when CustomEvent is not triggered
    const interval = setInterval(checkPermissions, 5000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("permission-change", handlePermissionChangeEvent);
      clearInterval(interval);
    };
  }, []);

  return permissions;
}

/**
 * Get permission message for action
 * @param {string} action - Action name (create, edit, delete, reorder)
 * @param {string} role - User role
 * @returns {string} - Permission message
 */
export function getPermissionMessage(action, role) {
  const messages = {
    create: {
      viewer: "You don't have permission to create. Viewer role is read-only.",
      editor: "You don't have permission to create. Editor role can only edit and reorder.",
      moderator: "",
      super_moderator: "",
      admin: "",
    },
    edit: {
      viewer: "You don't have permission to edit. Viewer role is read-only.",
      editor: "",
      moderator: "",
      super_moderator: "",
      admin: "",
    },
    delete: {
      viewer: "You don't have permission to delete. Viewer role is read-only.",
      editor: "You don't have permission to delete. Editor role can only edit and reorder.",
      moderator:
        "You don't have permission to delete. Moderator role can create and update, but cannot delete.",
      super_moderator: "",
      admin: "",
    },
    reorder: {
      viewer: "You don't have permission to reorder. Viewer role is read-only.",
      editor: "",
      moderator: "",
      super_moderator: "",
      admin: "",
    },
  };

  return messages[action]?.[role] || "";
}

/**
 * Get discussion-specific permissions based on role
 * @param {string} role - User role
 * @returns {object} - Discussion permissions
 */
export function getDiscussionPermissions(role) {
  const normalizedRole = String(role || "viewer")
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

  const permissions = {
    viewer: {
      canViewThreads: true,
      canApproveThreads: false,
      canDeleteThreads: false,
      canPinThreads: false,
      canLockThreads: false,
      canApproveReplies: false,
      canDeleteReplies: false,
      canMarkSolved: false,
      canViewReports: false,
      canManageReports: false,
    },
    editor: {
      canViewThreads: true,
      canApproveThreads: false,
      canDeleteThreads: false,
      canPinThreads: false,
      canLockThreads: false,
      canApproveReplies: false,
      canDeleteReplies: false,
      canMarkSolved: true,
      canViewReports: false,
      canManageReports: false,
    },
    moderator: {
      canViewThreads: true,
      canApproveThreads: true,
      canDeleteThreads: false,
      canPinThreads: true,
      canLockThreads: true,
      canApproveReplies: true,
      canDeleteReplies: false,
      canMarkSolved: true,
      canViewReports: true,
      canManageReports: false,
    },
    super_moderator: {
      canViewThreads: true,
      canApproveThreads: true,
      canDeleteThreads: true,
      canPinThreads: true,
      canLockThreads: true,
      canApproveReplies: true,
      canDeleteReplies: true,
      canMarkSolved: true,
      canViewReports: true,
      canManageReports: true,
    },
    admin: {
      canViewThreads: true,
      canApproveThreads: true,
      canDeleteThreads: true,
      canPinThreads: true,
      canLockThreads: true,
      canApproveReplies: true,
      canDeleteReplies: true,
      canMarkSolved: true,
      canViewReports: true,
      canManageReports: true,
    },
  };

  return permissions[normalizedRole] || permissions.viewer;
}

/**
 * Get discussion permission message
 * @param {string} action - Action name
 * @param {string} role - User role
 * @returns {string} - Permission message
 */
export function getDiscussionPermissionMessage(action, role) {
  const messages = {
    approveThreads: {
      viewer: "You don't have permission to approve threads. Contact a moderator.",
      editor: "You don't have permission to approve threads. Contact a moderator.",
      moderator: "",
      super_moderator: "",
      admin: "",
    },
    deleteThreads: {
      viewer: "You don't have permission to delete threads. Contact an admin.",
      editor: "You don't have permission to delete threads. Contact an admin.",
      moderator: "You don't have permission to delete threads. Contact a super moderator or admin.",
      super_moderator: "",
      admin: "",
    },
    pinThreads: {
      viewer: "You don't have permission to pin threads. Contact a moderator.",
      editor: "You don't have permission to pin threads. Contact a moderator.",
      moderator: "",
      super_moderator: "",
      admin: "",
    },
    lockThreads: {
      viewer: "You don't have permission to lock threads. Contact a moderator.",
      editor: "You don't have permission to lock threads. Contact a moderator.",
      moderator: "",
      super_moderator: "",
      admin: "",
    },
    deleteReplies: {
      viewer: "You don't have permission to delete replies. Contact a super moderator.",
      editor: "You don't have permission to delete replies. Contact a super moderator.",
      moderator: "You don't have permission to delete replies. Contact a super moderator or admin.",
      super_moderator: "",
      admin: "",
    },
  };

  const normalizedRole = String(role || "viewer")
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

  return messages[action]?.[normalizedRole] || "";
}


