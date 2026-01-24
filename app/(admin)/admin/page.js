"use client";
import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  FaClipboardList,
  FaBook,
  FaLayerGroup,
  FaRegFolderOpen,
  FaUserTag,
  FaChartLine,
  FaUsers,
  FaCheckCircle,
  FaTimesCircle,
  FaArrowRight,
  FaClock,
  FaTrophy,
  FaGraduationCap,
} from "react-icons/fa";
import { LoadingSpinner } from "../components/ui/SkeletonLoader";
import api from "@/lib/api";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    exams: 0,
    subjects: 0,
    units: 0,
    chapters: 0,
    topics: 0,
    subtopics: 0,
    active: 0,
    inactive: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);

  // Fetch all stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch all data in parallel
        const [
          examsRes,
          subjectsRes,
          unitsRes,
          chaptersRes,
          topicsRes,
          subtopicsRes,
        ] = await Promise.all([
          api
            .get("/exam?limit=1000&status=all")
            .catch(() => ({ data: { data: [] } })),
          api
            .get("/subject?limit=1000&status=all")
            .catch(() => ({ data: { data: [] } })),
          api
            .get("/unit?limit=1000&status=all")
            .catch(() => ({ data: { data: [] } })),
          api
            .get("/chapter?limit=1000&status=all")
            .catch(() => ({ data: { data: [] } })),
          api
            .get("/topic?limit=1000&status=all")
            .catch(() => ({ data: { data: [] } })),
          api
            .get("/subtopic?limit=1000&status=all")
            .catch(() => ({ data: { data: [] } })),
        ]);

        const exams = examsRes.data?.data || [];
        const subjects = subjectsRes.data?.data || [];
        const units = unitsRes.data?.data || [];
        const chapters = chaptersRes.data?.data || [];
        const topics = topicsRes.data?.data || [];
        const subtopics = subtopicsRes.data?.data || [];

        const activeExams = exams.filter((e) => e.status === "active").length;
        const activeSubjects = subjects.filter(
          (s) => s.status === "active"
        ).length;
        const activeUnits = units.filter((u) => u.status === "active").length;
        const activeChapters = chapters.filter(
          (c) => c.status === "active"
        ).length;
        const activeTopics = topics.filter((t) => t.status === "active").length;
        const activeSubtopics = subtopics.filter(
          (st) => st.status === "active"
        ).length;

        const totalActive =
          activeExams +
          activeSubjects +
          activeUnits +
          activeChapters +
          activeTopics +
          activeSubtopics;
        const totalInactive =
          exams.length +
          subjects.length +
          units.length +
          chapters.length +
          topics.length +
          subtopics.length -
          totalActive;

        setStats({
          exams: exams.length,
          subjects: subjects.length,
          units: units.length,
          chapters: chapters.length,
          topics: topics.length,
          subtopics: subtopics.length,
          active: totalActive,
          inactive: totalInactive,
        });

        // Generate recent activity (mock data for now)
        setRecentActivity([
          {
            type: "exam",
            action: "created",
            name: exams[0]?.name || "New Exam",
            time: "2 hours ago",
          },
          {
            type: "subject",
            action: "updated",
            name: subjects[0]?.name || "Updated Subject",
            time: "5 hours ago",
          },
          {
            type: "unit",
            action: "created",
            name: units[0]?.name || "New Unit",
            time: "1 day ago",
          },
        ]);
      } catch (err) {
        console.error("Error fetching stats:", err);
        setError("Failed to load dashboard data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Quick links menu items
  const quickLinks = useMemo(
    () => [
      {
        name: "Exam Management",
        href: "/admin/exam",
        icon: FaClipboardList,
        color: "from-blue-500 to-blue-600",
        bgColor: "bg-blue-50",
        textColor: "text-blue-600",
        count: stats.exams,
      },
      {
        name: "Subject Management",
        href: "/admin/subject",
        icon: FaBook,
        color: "from-purple-500 to-purple-600",
        bgColor: "bg-purple-50",
        textColor: "text-purple-600",
        count: stats.subjects,
      },
      {
        name: "Unit Management",
        href: "/admin/unit",
        icon: FaLayerGroup,
        color: "from-indigo-500 to-indigo-600",
        bgColor: "bg-indigo-50",
        textColor: "text-indigo-600",
        count: stats.units,
      },
      {
        name: "Chapter Management",
        href: "/admin/chapter",
        icon: FaRegFolderOpen,
        color: "from-green-500 to-green-600",
        bgColor: "bg-green-50",
        textColor: "text-green-600",
        count: stats.chapters,
      },
      {
        name: "Topic Management",
        href: "/admin/topic",
        icon: FaRegFolderOpen,
        color: "from-yellow-500 to-yellow-600",
        bgColor: "bg-yellow-50",
        textColor: "text-yellow-600",
        count: stats.topics,
      },
      {
        name: "Sub Topic Management",
        href: "/admin/sub-topic",
        icon: FaRegFolderOpen,
        color: "from-pink-500 to-pink-600",
        bgColor: "bg-pink-50",
        textColor: "text-pink-600",
        count: stats.subtopics,
      },
      {
        name: "Discussion Management",
        href: "/admin/discussion",
        icon: FaClipboardList,
        color: "from-blue-500 to-blue-600",
        bgColor: "bg-blue-50",
        textColor: "text-blue-600",
        count: 0, // We can add discussion stats later
      },
      {
        name: "Banner Upload",
        href: "/admin/discussion/banner",
        icon: FaClipboardList,
        color: "from-purple-500 to-purple-600",
        bgColor: "bg-purple-50",
        textColor: "text-purple-600",
        count: 0, // We can add banner stats later
      },
    ],
    [stats]
  );

  // Stats cards data
  const statsCards = useMemo(
    () => [
      {
        title: "Total Exams",
        value: stats.exams,
        icon: FaGraduationCap,
        color: "from-blue-500 to-blue-600",
        bgColor: "bg-blue-50",
        textColor: "text-blue-600",
      },
      {
        title: "Total Subjects",
        value: stats.subjects,
        icon: FaBook,
        color: "from-purple-500 to-purple-600",
        bgColor: "bg-purple-50",
        textColor: "text-purple-600",
      },
      {
        title: "Active Content",
        value: stats.active,
        icon: FaCheckCircle,
        color: "from-green-500 to-green-600",
        bgColor: "bg-green-50",
        textColor: "text-green-600",
      },
      {
        title: "Inactive Content",
        value: stats.inactive,
        icon: FaTimesCircle,
        color: "from-red-500 to-red-600",
        bgColor: "bg-red-50",
        textColor: "text-red-600",
      },
    ],
    [stats]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-sm">
        {error}
      </div>
    );
  }

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-2">
                Welcome to Admin Dashboard
              </h1>
              <p className="text-sm text-gray-600">
                Manage your content, track statistics, and oversee your learning
                portal
              </p>
            </div>
            <div className="hidden md:flex items-center gap-3 bg-white rounded-lg px-4 py-3 shadow-sm border border-gray-200">
              <FaChartLine className="text-2xl text-blue-600" />
              <div>
                <div className="text-xs text-gray-500">Total Content Items</div>
                <div className="text-xl font-semibold text-gray-900">
                  {stats.active + stats.inactive}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg ${card.bgColor}`}>
                    <Icon className={`text-xl ${card.textColor}`} />
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-semibold text-gray-900">
                      {card.value}
                    </div>
                    <div className="text-sm text-gray-600">{card.title}</div>
                  </div>
                </div>
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${card.color} rounded-full transition-all duration-500`}
                    style={{
                      width: `${Math.min((card.value / 100) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Quick Access
              </h2>
              <p className="text-sm text-gray-600 mt-1">Manage your content</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickLinks.map((link, index) => {
              const Icon = link.icon;
              return (
                <Link
                  key={index}
                  href={link.href}
                  className="group relative bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md hover:border-blue-300 transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className={`p-3 rounded-lg ${link.bgColor} transition-colors`}
                    >
                      <Icon className={`text-xl ${link.textColor}`} />
                    </div>
                    <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
                      {link.count}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {link.name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600 group-hover:text-blue-600 transition-colors">
                    <span>Manage</span>
                    <FaArrowRight className="text-xs group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Activity & Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Recent Activity
              </h2>
              <FaClock className="text-gray-400" />
            </div>
            <div className="space-y-3">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <FaCheckCircle className="text-blue-600 text-sm" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {activity.name} {activity.action}
                      </div>
                      <div className="text-xs text-gray-500">
                        {activity.time}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FaClock className="text-4xl mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No recent activity</p>
                </div>
              )}
            </div>
          </div>

          {/* Content Summary */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Content Summary
              </h2>
              <FaTrophy className="text-gray-400" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-center gap-3">
                  <FaGraduationCap className="text-blue-600" />
                  <span className="text-sm font-medium text-gray-900">
                    Exams
                  </span>
                </div>
                <span className="text-lg font-semibold text-blue-600">
                  {stats.exams}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-100">
                <div className="flex items-center gap-3">
                  <FaBook className="text-purple-600" />
                  <span className="text-sm font-medium text-gray-900">
                    Subjects
                  </span>
                </div>
                <span className="text-lg font-semibold text-purple-600">
                  {stats.subjects}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                <div className="flex items-center gap-3">
                  <FaLayerGroup className="text-indigo-600" />
                  <span className="text-sm font-medium text-gray-900">
                    Units
                  </span>
                </div>
                <span className="text-lg font-semibold text-indigo-600">
                  {stats.units}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                <div className="flex items-center gap-3">
                  <FaRegFolderOpen className="text-green-600" />
                  <span className="text-sm font-medium text-gray-900">
                    Chapters
                  </span>
                </div>
                <span className="text-lg font-semibold text-green-600">
                  {stats.chapters}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                <div className="flex items-center gap-3">
                  <FaRegFolderOpen className="text-yellow-600" />
                  <span className="text-sm font-medium text-gray-900">
                    Topics
                  </span>
                </div>
                <span className="text-lg font-semibold text-yellow-600">
                  {stats.topics}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-pink-50 rounded-lg border border-pink-100">
                <div className="flex items-center gap-3">
                  <FaRegFolderOpen className="text-pink-600" />
                  <span className="text-sm font-medium text-gray-900">
                    Sub Topics
                  </span>
                </div>
                <span className="text-lg font-semibold text-pink-600">
                  {stats.subtopics}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};

export default AdminDashboard;
