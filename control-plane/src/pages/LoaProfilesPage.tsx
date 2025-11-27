import React from "react";

const profiles = [
  { id: "LoA1", name: "LoA1", requirements: "Device only (low assurance)" },
  { id: "LoA2", name: "LoA2", requirements: "Device + HPS verification (medium assurance)" },
  { id: "LoA3", name: "LoA3", requirements: "Device + HPS + OS biometric (high assurance)" },
];

const LoaProfilesPage: React.FC = () => {
  return (
    <div className="space-y-4 text-slate-100">
      <h1 className="text-2xl font-semibold">LoA Profiles</h1>
      <p className="text-slate-400 text-sm">
        Presence Passport assurance levels. These profiles will be assignable to orgs or specific modules.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {profiles.map((p) => (
          <div key={p.id} className="rounded-lg border border-slate-800 bg-slate-900 p-4 space-y-2">
            <div className="text-lg font-semibold text-slate-100">{p.name}</div>
            <div className="text-slate-400 text-sm">{p.requirements}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LoaProfilesPage;
