"use client";

import React, { useEffect, useState } from "react";
import UnitsListClient from "./UnitsListClient";

const UnitsSectionClient = ({
  units,
  subjectId,
  examSlug,
  subjectSlug,
  examName,
  subjectName,
}) => {
  const [unitIds, setUnitIds] = useState([]);

  useEffect(() => {
    if (units && units.length > 0) {
      setUnitIds(units.map((unit) => unit._id));
    }
  }, [units]);

  return (
    <section className="bg-transparent">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100  bg-gradient-to-br from-indigo-50 via-white to-purple-50">
          <div className="flex items-start gap-2 ">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                {examName} &gt; {subjectName} Units
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-gray-600">
                Review each unit, its weightage, and completion progress.
                Progress is calculated from chapters within each unit.
              </p>
            </div>
          </div>
          <div className="mt-3 hidden sm:grid sm:grid-cols-[minmax(0,1fr)_140px_180px] gap-6 text-xs font-semibold uppercase tracking-wide text-gray-400">
            <span className="text-left">Unit</span>
            <span className="text-center">Status</span>
            <span className="text-center">Progress</span>
          </div>
        </div>

        <div className="relative group cursor-help">
          {/* Tooltip */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 ease-in-out z-10 pointer-events-none">
            <div className="bg-gray-900 text-white text-xs rounded-lg py-2.5 px-4 shadow-xl max-w-xs text-center">
              <p className="font-semibold mb-1.5 text-indigo-300">
                Units Overview
              </p>
              <p className="text-gray-300 leading-relaxed">
                Click on any unit to view its chapters and topics. Progress is
                automatically calculated from your chapter completion status.
              </p>
              {/* Tooltip arrow */}
              <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-gray-900"></div>
            </div>
          </div>

          <UnitsListClient
            units={units}
            subjectId={subjectId}
            examSlug={examSlug}
            subjectSlug={subjectSlug}
          />
        </div>
      </div>
    </section>
  );
};

export default UnitsSectionClient;
