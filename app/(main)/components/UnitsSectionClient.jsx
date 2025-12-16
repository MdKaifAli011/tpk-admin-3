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
              <p className="mt-1 text-xs sm:text-sm text-gray-500">
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

        <UnitsListClient
          units={units}
          subjectId={subjectId}
          examSlug={examSlug}
          subjectSlug={subjectSlug}
        />
      </div>
    </section>
  );
};

export default UnitsSectionClient;
