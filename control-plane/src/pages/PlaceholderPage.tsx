import React from "react";

const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => (
  <div className="space-y-3">
    <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
    <p className="text-slate-600 text-sm">Coming soon.</p>
  </div>
);

export default PlaceholderPage;
