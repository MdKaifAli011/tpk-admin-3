"use client";

import React from "react";

const DiscussionForumTab = ({ entityType, entityName }) => {
  const getDescription = () => {
    switch (entityType) {
      case "exam":
        return `Connect with fellow students preparing for ${entityName}. Share insights, ask questions, and learn together.`;
      case "subject":
        return `Connect with fellow students studying ${entityName}. Collaborate and enhance your understanding.`;
      case "unit":
        return `Connect with fellow students studying ${entityName}. Discuss concepts and solve problems together.`;
      case "chapter":
        return `Connect with fellow students studying ${entityName}. Share notes and clarify doubts.`;
      case "topic":
        return `Ask questions and discuss ${entityName} with fellow students. Get help and help others learn.`;
      case "subtopic":
        return `Ask questions and discuss ${entityName} with fellow students. Deep dive into concepts together.`;
      case "definition":
        return `Ask questions and discuss ${entityName} with fellow students. Master the fundamentals.`;
      default:
        return `Connect with fellow students. Share insights, ask questions, and learn together.`;
    }
  };

  return (
    <div className="space-y-4 px-3 sm:px-4 py-3 sm:py-4">
      <div>
        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
          Discussion Forum
        </h3>
        <p className="text-sm text-gray-700 leading-normal">{getDescription()}</p>
      </div>
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-200">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
            <svg
              className="w-4 h-4 text-indigo-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-700">Coming Soon</p>
        </div>
        <p className="text-xs text-gray-600 leading-normal">
          Discussion forum features will be available soon. Stay tuned for
          interactive learning!
        </p>
      </div>
    </div>
  );
};

export default DiscussionForumTab;

