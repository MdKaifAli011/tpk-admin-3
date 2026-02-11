"use client";

import AuthGuard from "../../components/auth/AuthGuard";
import NotificationManagement from "../../components/features/NotificationManagement";

export default function NotificationPage() {
  return (
    <AuthGuard>
        <NotificationManagement />
    </AuthGuard>
  );
}
