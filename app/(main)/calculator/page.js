"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FaBook,
  FaFlask,
  FaCalculator,
  FaLaptopCode,
  FaLanguage,
  FaPalette,
  FaUniversity,
  FaGraduationCap,
  FaMapMarkerAlt,
  FaGlobeAmericas,
  FaUsers,
  FaChartLine,
  FaAtom,
  FaMicroscope,
  FaLeaf,
  FaRocket,
  FaCog,
  FaBrain,
  FaChartBar,
  FaCode,
  FaKeyboard,
  FaPenFancy,
  FaBookReader,
  FaFlag,
  FaMusic,
  FaPaintBrush,
  FaSearch,
  FaChevronDown,
} from "react-icons/fa";
import Collapsible from "../components/Collapsible";

// Calculator data structure with descriptions
const calculatorCategories = [
  {
    name: "Advanced Placement (AP®) Social Studies",
    slug: "ap-social-studies",
    icon: FaGlobeAmericas,
    color: "#3B82F6",
    calculators: [
      {
        name: "AP® African American Studies Score Calculator",
        slug: "ap-african-american-studies",
        icon: FaBook,
        description: "Estimate your AP African American Studies exam score",
      },
      {
        name: "AP® Comparative Government Score Calculator",
        slug: "ap-comparative-government",
        icon: FaUsers,
        description: "Calculate your AP Comparative Government score",
      },
      {
        name: "AP® European History Score Calculator",
        slug: "ap-european-history",
        icon: FaFlag,
        description: "Estimate your AP European History exam score",
      },
      {
        name: "AP® Human Geography Score Calculator",
        slug: "ap-human-geography",
        icon: FaMapMarkerAlt,
        description: "Calculate your AP Human Geography score",
      },
      {
        name: "AP® Macroeconomics Score Calculator",
        slug: "ap-macroeconomics",
        icon: FaChartLine,
        description: "Estimate your AP Macroeconomics exam score",
      },
      {
        name: "AP® Microeconomics Score Calculator",
        slug: "ap-microeconomics",
        icon: FaChartBar,
        description: "Calculate your AP Microeconomics score",
      },
      {
        name: "AP® US Government and Politics Score Calculator",
        slug: "ap-us-government-politics",
        icon: FaUsers,
        description: "Estimate your AP US Government score",
      },
      {
        name: "AP® US History Score Calculator",
        slug: "ap-us-history",
        icon: FaBook,
        description: "Calculate your AP US History exam score",
      },
      {
        name: "AP® World History Score Calculator",
        slug: "ap-world-history",
        icon: FaGlobeAmericas,
        description: "Estimate your AP World History exam score",
      },
    ],
  },
  {
    name: "Advanced Placement (AP®) Science",
    slug: "ap-science",
    icon: FaFlask,
    color: "#10B981",
    calculators: [
      {
        name: "AP® Biology Score Calculator",
        slug: "ap-biology",
        icon: FaMicroscope,
        description: "Estimate your AP Biology exam score",
      },
      {
        name: "AP® Chemistry Score Calculator",
        slug: "ap-chemistry",
        icon: FaFlask,
        description: "Calculate your AP Chemistry score",
      },
      {
        name: "AP® Environmental Science Score Calculator",
        slug: "ap-environmental-science",
        icon: FaLeaf,
        description: "Estimate your AP Environmental Science score",
      },
      {
        name: "AP® Physics 1 Score Calculator",
        slug: "ap-physics-1",
        icon: FaAtom,
        description: "Calculate your AP Physics 1 exam score",
      },
      {
        name: "AP® Physics 2 Score Calculator",
        slug: "ap-physics-2",
        icon: FaRocket,
        description: "Estimate your AP Physics 2 score",
      },
      {
        name: "AP® Physics C: E & M Score Calculator",
        slug: "ap-physics-c-em",
        icon: FaCog,
        description: "Calculate your AP Physics C E&M score",
      },
      {
        name: "AP® Physics C: Mechanics Score Calculator",
        slug: "ap-physics-c-mechanics",
        icon: FaCog,
        description: "Estimate your AP Physics C Mechanics score",
      },
      {
        name: "AP® Psychology Score Calculator",
        slug: "ap-psychology",
        icon: FaBrain,
        description: "Calculate your AP Psychology exam score",
      },
    ],
  },
  {
    name: "Advanced Placement (AP®) Math",
    slug: "ap-math",
    icon: FaCalculator,
    color: "#8B5CF6",
    calculators: [
      {
        name: "AP® Calculus AB Score Calculator",
        slug: "ap-calculus-ab",
        icon: FaCalculator,
        description: "Estimate your AP Calculus AB exam score",
      },
      {
        name: "AP® Calculus BC Score Calculator",
        slug: "ap-calculus-bc",
        icon: FaCalculator,
        description: "Calculate your AP Calculus BC score",
      },
      {
        name: "AP® Precalculus Score Calculator",
        slug: "ap-precalculus",
        icon: FaCalculator,
        description: "Estimate your AP Precalculus exam score",
      },
      {
        name: "AP® Statistics Score Calculator",
        slug: "ap-statistics",
        icon: FaChartBar,
        description: "Calculate your AP Statistics exam score",
      },
    ],
  },
  {
    name: "Advanced Placement (AP®) Computer Science",
    slug: "ap-computer-science",
    icon: FaLaptopCode,
    color: "#6366F1",
    calculators: [
      {
        name: "AP® Computer Science A Score Calculator",
        slug: "ap-computer-science-a",
        icon: FaCode,
        description: "Estimate your AP Computer Science A score",
      },
      {
        name: "AP® Computer Science Principles Score Calculator",
        slug: "ap-computer-science-principles",
        icon: FaKeyboard,
        description: "Calculate your AP CSP exam score",
      },
    ],
  },
  {
    name: "Advanced Placement (AP®) English",
    slug: "ap-english",
    icon: FaBookReader,
    color: "#EC4899",
    calculators: [
      {
        name: "AP® English Language Score Calculator",
        slug: "ap-english-language",
        icon: FaPenFancy,
        description: "Estimate your AP English Language score",
      },
      {
        name: "AP® English Literature Score Calculator",
        slug: "ap-english-literature",
        icon: FaBookReader,
        description: "Calculate your AP English Literature score",
      },
    ],
  },
  {
    name: "Advanced Placement (AP®) World Language",
    slug: "ap-world-language",
    icon: FaLanguage,
    color: "#F59E0B",
    calculators: [
      {
        name: "AP® French Language Score Calculator",
        slug: "ap-french-language",
        icon: FaLanguage,
        description: "Estimate your AP French Language score",
      },
      {
        name: "AP® German Language Score Calculator",
        slug: "ap-german-language",
        icon: FaLanguage,
        description: "Calculate your AP German Language score",
      },
      {
        name: "AP® Latin Score Calculator",
        slug: "ap-latin",
        icon: FaLanguage,
        description: "Estimate your AP Latin exam score",
      },
      {
        name: "AP® Spanish Language Score Calculator",
        slug: "ap-spanish-language",
        icon: FaLanguage,
        description: "Calculate your AP Spanish Language score",
      },
      {
        name: "AP® Spanish Literature Score Calculator",
        slug: "ap-spanish-literature",
        icon: FaBook,
        description: "Estimate your AP Spanish Literature score",
      },
    ],
  },
  {
    name: "Advanced Placement (AP®) Arts",
    slug: "ap-arts",
    icon: FaPalette,
    color: "#EF4444",
    calculators: [
      {
        name: "AP® Art History Score Calculator",
        slug: "ap-art-history",
        icon: FaPaintBrush,
        description: "Calculate your AP Art History exam score",
      },
      {
        name: "AP® Music Theory Score Calculator",
        slug: "ap-music-theory",
        icon: FaMusic,
        description: "Estimate your AP Music Theory score",
      },
    ],
  },
  {
    name: "SAT® and PSAT®",
    slug: "sat-psat",
    icon: FaUniversity,
    color: "#2563EB",
    calculators: [
      {
        name: "SAT® Score Calculator",
        slug: "sat-score-calculator",
        icon: FaUniversity,
        description: "Estimate your SAT exam score",
      },
      {
        name: "PSAT® Score Calculator",
        slug: "psat-score-calculator",
        icon: FaGraduationCap,
        description: "Calculate your PSAT exam score",
      },
    ],
  },
  {
    name: "ACT® and PreACT®",
    slug: "act-preact",
    icon: FaGraduationCap,
    color: "#F97316",
    calculators: [
      {
        name: "ACT® Score Calculator",
        slug: "act-score-calculator",
        icon: FaGraduationCap,
        description: "Estimate your ACT exam score",
      },
      {
        name: "PreACT® Score Calculator",
        slug: "preact-score-calculator",
        icon: FaGraduationCap,
        description: "Calculate your PreACT exam score",
      },
    ],
  },
  {
    name: "State Exams",
    slug: "state-exams",
    icon: FaMapMarkerAlt,
    color: "#14B8A6",
    calculators: [
      {
        name: "State Exam Score Calculator",
        slug: "state-exam-calculator",
        icon: FaMapMarkerAlt,
        description: "Estimate your state exam score",
      },
    ],
  },
];

// Get all calculators flattened for "All" tab
const allCalculators = calculatorCategories.flatMap((category) =>
  category.calculators.map((calc) => ({
    ...calc,
    categoryName: category.name,
    categoryColor: category.color,
  }))
);

// Compact Calculator Card - iLovePDF Style
const CalculatorCard = ({ calculator, categoryColor }) => {
  const IconComponent = calculator.icon || FaCalculator;

  return (
    <Link
      href={`/calculator/${calculator.slug}`}
      className="group block h-full"
    >
      <div className="bg-white rounded-lg border border-gray-200 p-3 hover:border-gray-300 hover:shadow-sm transition-all duration-200 h-full flex flex-col">
        {/* Icon */}
        <div className="mb-2.5">
          <div
            className="w-11 h-11 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: categoryColor }}
          >
            <IconComponent className="text-white text-base" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">
            {calculator.name}
          </h3>
          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
            {calculator.description}
          </p>
        </div>
      </div>
    </Link>
  );
};

// Accordion Category Component
const AccordionCategory = ({ category, isOpen, onToggle, searchQuery }) => {
  const CategoryIcon = category.icon || FaBook;

  // Filter calculators based on search
  const filteredCalculators = searchQuery.trim()
    ? category.calculators.filter(
        (calc) =>
          calc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          calc.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : category.calculators;

  // Don't render if no calculators match search
  if (filteredCalculators.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Accordion Header - Compact */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-2.5 bg-white hover:bg-gray-50 transition-colors duration-200 flex items-center justify-between group"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: category.color }}
          >
            <CategoryIcon className="text-white text-base" />
          </div>
          <div className="text-left">
            <h2 className="text-base font-semibold text-gray-900 group-hover:text-gray-700">
              {category.name}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {filteredCalculators.length} calculator
              {filteredCalculators.length !== 1 ? "s" : ""} available
            </p>
          </div>
        </div>

        {/* Chevron Icon - Smaller */}
        <div
          className={`transform transition-transform duration-300 shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          <FaChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
        </div>
      </button>

      {/* Accordion Content - Compact */}
      <Collapsible isOpen={isOpen}>
        <div className="px-4 py-4 border-t border-gray-100 bg-gray-50/50">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {filteredCalculators.map((calculator) => (
              <CalculatorCard
                key={calculator.slug}
                calculator={calculator}
                categoryColor={category.color}
              />
            ))}
          </div>
        </div>
      </Collapsible>
    </div>
  );
};

// Main Calculator Page - Compact iLovePDF Style with Accordions
export default function CalculatorPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [openCategories, setOpenCategories] = useState({});

  // Toggle category accordion
  const toggleCategory = (categorySlug) => {
    setOpenCategories((prev) => ({
      ...prev,
      [categorySlug]: !prev[categorySlug],
    }));
  };

  // Get categories to display based on active tab
  const getDisplayCategories = () => {
    if (activeTab === "all") {
      return calculatorCategories;
    } else {
      const category = calculatorCategories.find(
        (cat) => cat.slug === activeTab
      );
      return category ? [category] : [];
    }
  };

  // Handle accordion state when tab changes
  useEffect(() => {
    if (activeTab === "all") {
      // Expand all categories when "All" is selected
      const defaultOpen = {};
      calculatorCategories.forEach((category) => {
        defaultOpen[category.slug] = true;
      });
      setOpenCategories(defaultOpen);
    } else {
      // Expand only the selected category
      setOpenCategories((prev) => ({
        ...prev,
        [activeTab]: true,
      }));
    }
  }, [activeTab]);

  const displayCategories = getDisplayCategories();

  return (
    <div className="min-h-screen bg-white">
      {/* Compact Hero Section */}
      <section className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6">
          <div className="max-w-5xl mx-auto">
            {/* Title */}
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 text-center">
              Every tool you need to calculate exam scores in one place
            </h1>

            {/* Description */}
            <p className="text-sm sm:text-base text-gray-600 text-center mb-6 max-w-3xl mx-auto">
              Every calculator you need to estimate your exam scores, at your
              fingertips. All are 100% FREE and easy to use! Calculate AP®,
              SAT®, ACT®, and other standardized exam scores with just a few
              clicks.
            </p>

            {/* Search Bar */}
            <div className="max-w-xl mx-auto mb-6">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                <input
                  type="text"
                  placeholder="Search calculators..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeTab === "all"
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                All
              </button>
              {calculatorCategories.map((category) => (
                <button
                  key={category.slug}
                  onClick={() => setActiveTab(category.slug)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === category.slug
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Accordion Categories Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 bg-white">
        {displayCategories.length > 0 ? (
          <div className="space-y-2.5">
            {displayCategories.map((category) => (
              <AccordionCategory
                key={category.slug}
                category={category}
                isOpen={openCategories[category.slug] ?? false}
                onToggle={() => toggleCategory(category.slug)}
                searchQuery={searchQuery}
              />
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <FaSearch className="text-2xl text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                No calculators found
              </h3>
              <p className="text-gray-600 mb-4">
                Try adjusting your search terms or select a different category.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setActiveTab("all");
                }}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
              >
                Clear filters
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
