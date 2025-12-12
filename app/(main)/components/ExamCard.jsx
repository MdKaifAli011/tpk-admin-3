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

const getExamIcon = (examName) => {
  const name = examName?.toUpperCase() || "";
  if (name.includes("JEE")) {
    return <FaCog className="text-4xl md:text-5xl text-gray-700" />;
  }
  if (name.includes("NEET")) {
    return <FaSyringe className="text-4xl md:text-5xl text-white" />;
  }
  if (name.includes("SAT")) {
    return <FaUniversity className="text-4xl md:text-5xl text-gray-700" />;
  }
  if (name.includes("IB")) {
    return <FaLightbulb className="text-4xl md:text-5xl text-yellow-400" />;
  }
  return <FaBook className="text-4xl md:text-5xl text-gray-700" />;
};

const getExamStyle = (examName) => {
  const name = examName?.toUpperCase() || "";
  if (name.includes("JEE")) {
    return {
      bgColor: "bg-yellow-400",
      gradient: "from-yellow-400 to-yellow-500",
    };
  }
  if (name.includes("NEET")) {
    return {
      bgColor: "bg-purple-300",
      gradient: "from-purple-300 to-purple-400",
    };
  }
  if (name.includes("SAT")) {
    return {
      bgColor: "bg-pink-200",
      gradient: "from-pink-200 to-pink-300",
    };
  }
  if (name.includes("IB")) {
    return {
      bgColor: "bg-blue-300",
      gradient: "from-blue-300 to-blue-400",
    };
  }
  return {
    bgColor: "bg-gray-300",
    gradient: "from-gray-300 to-gray-400",
  };
};

const getDefaultServices = (examName) => {
  const name = examName?.toUpperCase() || "";
  if (name.includes("JEE")) {
    return [
      "JEE Prep Courses",
      "NRIs Admission & Help",
      "NRI Quota Application",
      "JEE Prep Resources",
      "JEE Analysis Session",
    ];
  }
  if (name.includes("NEET")) {
    return [
      "NEET Prep Courses",
      "NRIs Admission & Help",
      "NRI Quota Application",
      "NEET Prep Resources",
      "NEET Analysis Session",
    ];
  }
  if (name.includes("SAT")) {
    return [
      "SAT Prep Courses",
      "College Shortlisting",
      "Scholarship Help",
      "Rush Reports",
      "SAT Analysis Session",
    ];
  }
  if (name.includes("IB")) {
    return [
      "IB Prep Courses",
      "MYP & DP Courses",
      "Exam Compatibility",
      "IB Prep Resources",
      "IB Analysis Session",
    ];
  }
  return ["Exam Prep Courses", "Study Materials", "Practice Tests"];
};

const ExamCard = memo(({ exam }) => {
  const style = useMemo(() => getExamStyle(exam.name), [exam.name]);
  const services = useMemo(() => getDefaultServices(exam.name), [exam.name]);
  const examSlug = useMemo(() => createSlug(exam.name), [exam.name]);

  return (
    <div
      className={`bg-gradient-to-br ${style.gradient} rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1`}
    >
      {/* Image Section */}
      <div
        className={`${style.bgColor} h-40 sm:h-44 md:h-48 flex items-center justify-center relative`}
      >
        <div className="absolute inset-0 bg-white/20"></div>
        <div className="relative z-10">{getExamIcon(exam.name)}</div>
      </div>

      {/* Content Section */}
      <div className="p-5 sm:p-6 bg-white">
        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
          {exam.name} Exam Preparation
        </h3>

        {/* Services List */}
        <ul className="space-y-2 sm:space-y-2.5 mb-4">
          {services.map((service, serviceIndex) => (
            <li
              key={serviceIndex}
              className="flex items-start gap-2 text-sm sm:text-sm text-gray-700"
            >
              <FaFlag className="text-purple-600 text-xs mt-1 shrink-0" />
              <span>{service}</span>
            </li>
          ))}
        </ul>

        {/* Visit Website Link */}
        <Link
          href={`/${examSlug}`}
          className="flex items-center justify-end gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors mt-6"
        >
          <span>Visit Website</span>
          <FaArrowRight className="text-xs" />
        </Link>
      </div>
    </div>
  );
});

ExamCard.displayName = "ExamCard";

ExamCard.propTypes = {
  exam: examPropType.isRequired,
};

export default ExamCard;
