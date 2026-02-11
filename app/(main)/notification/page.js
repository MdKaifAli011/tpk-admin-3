import React from "react";
import NotificationListClient from "../components/NotificationListClient";

export const metadata = {
  title: "Notifications | TestPrepKart",
  description: "View all your notifications and updates.",
};

export default function NotificationListPage() {
  return (
    <div className="py-6 px-4 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Notifications</h1>
      <p className="text-gray-600 text-sm mb-6">All your notifications in one place.</p>
      <NotificationListClient />
    </div>
  );
}
