import React from "react";

const PoliciesPage: React.FC = () => {
  return (
    <div className="space-y-4 text-slate-100">
      <h1 className="text-2xl font-semibold">Policies</h1>
      <p className="text-slate-400 text-sm">
        Presence Passport policies will allow assigning different LoA requirements per org or module.
      </p>
      <div className="space-y-3 text-sm text-slate-200 bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="font-semibold text-slate-100">Examples</div>
        <ul className="list-disc list-inside space-y-1 text-slate-300">
          <li>Schools: LoA2 for attendance, LoA3 for exams.</li>
          <li>Factories: LoA2 for normal shifts, LoA3 for restricted access zones.</li>
        </ul>
        <p className="text-slate-400">
          Future updates will allow assigning LoA per module and per location/zone.
        </p>
      </div>
    </div>
  );
};

export default PoliciesPage;
