"use client";

import AuthGuard from "../../components/auth/AuthGuard";
import StoreManagement from "../../components/features/StoreManagement";

export default function StorePage() {
  return (
    <AuthGuard>
      <StoreManagement />
    </AuthGuard>
  );
}
