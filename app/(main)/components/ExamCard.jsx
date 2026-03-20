"use client";
import React, { useMemo, memo } from "react";
import Link from "next/link";
import PropTypes from "prop-types";
import {
  FaBook,
  FaFlag,
  FaArrowRight,
  FaCog,
  FaSyringe,
  FaUniversity,
  FaLightbulb,
} from "react-icons/fa";
import { createSlug } from "../lib/api";
import { examPropType } from "./PropTypes";

/* ---------------------------------------------
   ICON LOGIC
---------------------------------------------- */
const getExamIcon = (examName) => {
  const name = examName?.toUpperCase() || "";

  if (name.includes("JEE"))
    return <FaCog className="text-5xl text-gray-800" />;

  if (name.includes("NEET"))
    return <FaSyringe className="text-5xl text-white" />;

  if (name.includes("SAT"))
    return <FaUniversity className="text-5xl text-gray-800" />;

  if (name.includes("IB"))
    return <FaLightbulb className="text-5xl text-yellow-400" />;

  return <FaBook className="text-5xl text-gray-800" />;
};

/* ---------------------------------------------
   COLOR / STYLE LOGIC
---------------------------------------------- */
const getExamStyle = (examName) => {
  const name = examName?.toUpperCase() || "";

  if (name.includes("JEE"))
    return { bg: "bg-yellow-400", gradient: "from-yellow-400 to-yellow-500" };

  if (name.includes("NEET"))
    return { bg: "bg-purple-400", gradient: "from-purple-400 to-purple-500" };

  if (name.includes("SAT"))
    return { bg: "bg-pink-300", gradient: "from-pink-300 to-pink-400" };

  if (name.includes("IB"))
    return { bg: "bg-blue-400", gradient: "from-blue-400 to-blue-500" };

  return { bg: "bg-gray-300", gradient: "from-gray-300 to-gray-400" };
};

/* ---------------------------------------------
   DEFAULT SERVICES
---------------------------------------------- */
const getDefaultServices = (examName) => {
  const name = examName?.toUpperCase() || "";

  if (name.includes("JEE"))
    return [
      "JEE Prep Courses",
      "NRI Admission Guidance",
      "NRI Quota Application",
      "Advanced Practice Tests",
    ];

  if (name.includes("NEET"))
    return [
      "NEET Prep Courses",
      "Medical Admission Support",
      "NRI Quota Application",
      "Performance Analysis",
    ];

  if (name.includes("SAT"))
    return [
      "SAT Prep Courses",
      "College Shortlisting",
      "Scholarship Guidance",
      "Score Analysis",
    ];

  if (name.includes("IB"))
    return [
      "IB MYP & DP Courses",
      "Curriculum Mapping",
      "Exam Readiness",
      "Expert Mentorship",
    ];

  return ["Exam Preparation", "Study Materials", "Mock Tests"];
};

/* ---------------------------------------------
   CARD COMPONENT
---------------------------------------------- */
const ExamCard = memo(({ exam }) => {
  const style = useMemo(() => getExamStyle(exam.name), [exam.name]);

  const services = useMemo(
    () =>
      exam.description?.length
        ? exam.description
        : getDefaultServices(exam.name),
    [exam.name, exam.description]
  );

  const examSlug = useMemo(() => createSlug(exam.name), [exam.name]);

  return (
    <Link
      href={`/${examSlug}`}
      className={`group block rounded-xl overflow-hidden 
      bg-gradient-to-br ${style.gradient}
      shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer`}
      aria-label={`Go to ${exam.name} exam preparation`}
    >
      {/* ---------------- HEADER ---------------- */}
      <div
        className={`${style.bg} h-52 flex items-center justify-center relative overflow-hidden`}
      >
        <div className="absolute inset-0 bg-white/20" />

        {exam.image ? (
          <img
            src={exam.image}
            alt={exam.name}
            className="w-full h-full object-cover 
            transition-transform duration-500 group-hover:scale-105"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        ) : (
          <div className="relative z-10">{getExamIcon(exam.name)}</div>
        )}
      </div>

      {/* ---------------- CONTENT ---------------- */}
      <div className="bg-white p-4 flex flex-col min-h-[250px]">
        <h3 className="text-xl font-bold text-gray-900 mb-4 leading-snug line-clamp-2">
          {exam.name} Exam Preparation
        </h3>

        <ul className="space-y-2 flex-1">
          {services.slice(0, 4).map((service, index) => (
            <li
              key={index}
              className="flex items-start gap-2 text-sm text-gray-700"
            >
              {/* <FaFlag className="text-purple-600 mt-1 shrink-0" /> */}
              <span className="line-clamp-2">{service}</span>
            </li>
          ))}
        </ul>

        {/* ---------------- CTA (Visual only, Link is outer) ---------------- */}
        <div
          className="mt-6 inline-flex items-center justify-between
          rounded-lg bg-blue-600 px-4 py-2
          text-sm font-semibold text-white
          group-hover:bg-blue-700 transition-colors"
        >
          Visit Website
          <FaArrowRight className="text-xs" />
        </div>
      </div>
    </Link>
  );
});

ExamCard.displayName = "ExamCard";

ExamCard.propTypes = {
  exam: examPropType.isRequired,
};

export default ExamCard;
