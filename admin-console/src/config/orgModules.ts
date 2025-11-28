export type OrgType = "school" | "factory" | "office" | "hospital" | "gov" | "other";

export type ModuleId =
  | "attendance"
  | "sessions"
  | "quizzes"
  | "exams"
  | "shifts"
  | "workzones"
  | "safety"
  | "access_control"
  | "analytics"
  | "hps_insights"
  | "developer_api"
  | "logs"
  | "audit_trail";

export const MODULE_NAV_ITEMS: Record<
  ModuleId,
  { label: string; route: string; requiredRole?: string | string[]; requiredPermission?: string }
> = {
  attendance: { label: "Attendance", route: "/attendance" },
  sessions: { label: "Sessions", route: "/sessions" },
  quizzes: { label: "Quizzes", route: "/quizzes" },
  exams: { label: "Exams", route: "/exams" },
  shifts: { label: "Shifts", route: "/shifts" },
  workzones: { label: "Workzones", route: "/workzones" },
  safety: { label: "Safety", route: "/safety", requiredRole: ["admin", "security", "owner"] },
  access_control: { label: "Access Control", route: "/access", requiredRole: ["admin", "security", "owner"] },
  analytics: { label: "Analytics", route: "/analytics" },
  hps_insights: { label: "HPS Insights", route: "/hps" },
  developer_api: { label: "Developer API", route: "/developer-api", requiredRole: ["admin", "owner"] },
  logs: { label: "Logs", route: "/logs", requiredRole: ["admin", "owner", "auditor"] },
  audit_trail: { label: "Audit Trail", route: "/audit-trail", requiredRole: ["admin", "owner", "auditor", "security"] },
};

export const ROUTE_TO_MODULE: Record<string, ModuleId | undefined> = Object.values(MODULE_NAV_ITEMS).reduce(
  (acc, item) => {
    acc[item.route] = Object.entries(MODULE_NAV_ITEMS).find(([, v]) => v.route === item.route)?.[0] as ModuleId;
    return acc;
  },
  {} as Record<string, ModuleId | undefined>,
);

export type SidebarItem = {
  label: string;
  route: string;
  requiredRole?: string | string[];
  requiredPermission?: string;
};
export type SidebarSection = { title: string; items: SidebarItem[] };

export function buildSidebarConfig(
  orgType: OrgType,
  enabledModules: ModuleId[]
): SidebarSection[] {
  const baseMonitor: SidebarSection = {
    title: "Monitor",
    items: [
      { label: "Overview", route: "/overview" },
      { label: "Live Presence", route: "/live" },
      { label: "Incidents", route: "/incidents" },
    ],
  };

  const systemBase: SidebarSection = {
    title: "System",
    items: [
      { label: "Org Profile", route: "/org-profile" },
      { label: "Audit Trail", route: "/audit-trail", requiredRole: ["admin", "owner", "auditor", "security"] },
      { label: "Settings", route: "/settings", requiredRole: ["admin", "owner"] },
    ],
  };

  const sections: SidebarSection[] = [baseMonitor];

  const has = (m: ModuleId) => enabledModules.includes(m);

  if (orgType === "school") {
    const teaching: SidebarItem[] = [];
    if (has("sessions")) teaching.push(MODULE_NAV_ITEMS.sessions);
    if (has("quizzes")) teaching.push(MODULE_NAV_ITEMS.quizzes);
    if (has("exams")) teaching.push(MODULE_NAV_ITEMS.exams);
    if (teaching.length) sections.push({ title: "Teaching", items: teaching });

    const people: SidebarItem[] = [];
    if (has("attendance")) people.push(MODULE_NAV_ITEMS.attendance);
    people.push({ label: "Users", route: "/users" });
    people.push({ label: "Groups", route: "/groups" });
    if (people.length) sections.push({ title: "People", items: people });

    const analytics: SidebarItem[] = [];
    if (has("analytics")) analytics.push(MODULE_NAV_ITEMS.analytics);
    if (has("hps_insights")) analytics.push(MODULE_NAV_ITEMS.hps_insights);
    if (analytics.length) sections.push({ title: "Analytics", items: analytics });
  } else if (orgType === "factory") {
    const workforce: SidebarItem[] = [];
    if (has("attendance")) workforce.push(MODULE_NAV_ITEMS.attendance);
    if (has("shifts")) workforce.push(MODULE_NAV_ITEMS.shifts);
    if (has("safety")) workforce.push(MODULE_NAV_ITEMS.safety);
    if (workforce.length) sections.push({ title: "Workforce", items: workforce });

    const spaces: SidebarItem[] = [];
    if (has("workzones")) spaces.push(MODULE_NAV_ITEMS.workzones);
    spaces.push({ label: "Receivers", route: "/receivers" });
    spaces.push({ label: "Locations", route: "/locations" });
    if (spaces.length) sections.push({ title: "Spaces", items: spaces });

    const system: SidebarItem[] = [];
    if (has("logs")) system.push(MODULE_NAV_ITEMS.logs);
    if (has("audit_trail")) system.push(MODULE_NAV_ITEMS.audit_trail);
    if (has("access_control")) system.push(MODULE_NAV_ITEMS.access_control);
    if (has("analytics")) system.push(MODULE_NAV_ITEMS.analytics);
    if (has("hps_insights")) system.push(MODULE_NAV_ITEMS.hps_insights);
    if (has("developer_api")) system.push(MODULE_NAV_ITEMS.developer_api);
    if (system.length) sections.push({ title: "System", items: system });
  } else {
    // default/office/other
    const people: SidebarItem[] = [];
    if (has("attendance")) people.push(MODULE_NAV_ITEMS.attendance);
    people.push({ label: "Users", route: "/users" });
    if (people.length) sections.push({ title: "People", items: people });

    const ops: SidebarItem[] = [];
    if (has("shifts")) ops.push(MODULE_NAV_ITEMS.shifts);
    if (has("workzones")) ops.push(MODULE_NAV_ITEMS.workzones);
    if (has("safety")) ops.push(MODULE_NAV_ITEMS.safety);
    if (ops.length) sections.push({ title: "Operations", items: ops });

    const system: SidebarItem[] = [...systemBase.items];
    if (has("logs")) system.push(MODULE_NAV_ITEMS.logs);
    if (has("audit_trail")) system.push(MODULE_NAV_ITEMS.audit_trail);
    if (has("access_control")) system.push(MODULE_NAV_ITEMS.access_control);
    if (has("analytics")) system.push(MODULE_NAV_ITEMS.analytics);
    if (has("hps_insights")) system.push(MODULE_NAV_ITEMS.hps_insights);
    if (has("developer_api")) system.push(MODULE_NAV_ITEMS.developer_api);
    if (system.length) sections.push({ title: "System", items: system });
  }

  // Always include system base if not already added
  const hasSystem = sections.find((s) => s.title === "System");
  if (!hasSystem) sections.push(systemBase);

  return sections;
}
