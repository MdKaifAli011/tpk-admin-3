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


