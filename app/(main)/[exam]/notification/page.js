import React from "react";
import { notFound } from "next/navigation";
import NotificationListClient from "../../components/NotificationListClient";
import { fetchExamById } from "../../lib/api";
import { createSlug } from "@/utils/slug";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { exam: examSlug } = await params;
  const exam = await fetchExamById(examSlug).catch(() => null);
  if (!exam) return { title: "Notifications | Testprepkart" };
  const name = exam.name || examSlug;
  return {
    title: `${name} Notifications | Testprepkart`,
    description: `View notifications and updates for ${name}.`,
  };
}

export default async function ExamNotificationPage({ params }) {
  const { exam: examSlug } = await params;
  const exam = await fetchExamById(examSlug).catch(() => null);
  if (!exam) notFound();
  const examName = exam.name || examSlug;
  const slug = exam.slug || createSlug(examName);

  return (
    <div className="py-6 px-4 max-w-7xl mx-auto">
      <section className="hero-section" aria-labelledby="notification-title">
        <h1 id="notification-title" className="text-2xl font-bold text-gray-900 mb-2">
          {examName} Notifications
        </h1>
        <p className="text-gray-600 text-sm mb-6">
          Notifications and updates for {examName}. Only this exam&apos;s notifications are shown here.
        </p>
      </section>
      <NotificationListClient examSlug={slug} />
    </div>
  );
}
