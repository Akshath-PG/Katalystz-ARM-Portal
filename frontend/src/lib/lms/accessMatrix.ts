// Single source of truth for LMS role permissions and data-usage restrictions.
// The /lms pages render from this file, and server code should call `can()`
// before reading or writing LMS data. Edit the matrix here, not in the UI.

export const ROLES = [
  "KATALYST_ADMIN",
  "PRINCIPAL",
  "ACADEMIC_COORDINATOR",
  "HOD",
  "TEACHER",
] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  KATALYST_ADMIN: "Katalystz Admin",
  PRINCIPAL: "Principal",
  ACADEMIC_COORDINATOR: "Academic Coordinator",
  HOD: "HOD",
  TEACHER: "Teacher",
};

export type Action = "view" | "create" | "edit" | "approve" | "delete" | "export";

// Access levels, ordered from least to most privileged.
export const ACCESS_LEVELS = ["none", "view", "contribute", "edit", "approve", "manage"] as const;
export type AccessLevel = (typeof ACCESS_LEVELS)[number];

export const LEVEL_ACTIONS: Record<AccessLevel, Action[]> = {
  none: [],
  view: ["view"],
  contribute: ["view", "create", "edit"], // own records only
  edit: ["view", "create", "edit"],
  approve: ["view", "create", "edit", "approve"],
  manage: ["view", "create", "edit", "approve", "delete", "export"],
};

export const LEVEL_LABELS: Record<AccessLevel, string> = {
  none: "No access",
  view: "View",
  contribute: "Contribute",
  edit: "Edit",
  approve: "Approve",
  manage: "Manage",
};

export const LEVEL_DESCRIPTIONS: Record<AccessLevel, string> = {
  none: "Module hidden; data not returned by any query.",
  view: "Read-only access to records within scope.",
  contribute: "Create and edit only records the user owns.",
  edit: "Create and edit any record within scope.",
  approve: "Edit plus sign-off / audit of records within scope.",
  manage: "Full control including delete and export.",
};

// How far a role's access reaches.
export type Scope = "global" | "school" | "department" | "class" | "self" | "aggregate";

export const SCOPE_LABELS: Record<Scope, string> = {
  global: "All schools",
  school: "Own school",
  department: "Own department",
  class: "Assigned classes",
  self: "Own records",
  aggregate: "Aggregated only",
};

export const SCOPE_DESCRIPTIONS: Record<Scope, string> = {
  global: "Every school in the group.",
  school: "Only the school on the user's account (User.schoolId).",
  department: "Subjects and teachers in the HOD's department.",
  class: "Classes and subjects the teacher is assigned to.",
  self: "Records the user created or that are about the user.",
  aggregate: "Totals and averages only, no student-level rows.",
};

export type Grant = { level: AccessLevel; scope?: Scope };

export type LmsModule = {
  key: string;
  name: string;
  description: string;
  // Prisma models this module reads/writes.
  models: string[];
  // Whether the module exposes student personal data.
  containsStudentPii: boolean;
  access: Record<Role, Grant>;
};

export const LMS_MODULES: LmsModule[] = [
  {
    key: "users",
    name: "Users & Accounts",
    description: "Create accounts, assign roles and schools.",
    models: ["User"],
    containsStudentPii: false,
    access: {
      KATALYST_ADMIN: { level: "manage", scope: "global" },
      PRINCIPAL: { level: "view", scope: "school" },
      ACADEMIC_COORDINATOR: { level: "none" },
      HOD: { level: "none" },
      TEACHER: { level: "none" },
    },
  },
  {
    key: "classes",
    name: "Schools & Classes",
    description: "School profile, classes, sections and class teachers.",
    models: ["School", "Class", "Student"],
    containsStudentPii: true,
    access: {
      KATALYST_ADMIN: { level: "manage", scope: "global" },
      PRINCIPAL: { level: "edit", scope: "school" },
      ACADEMIC_COORDINATOR: { level: "view", scope: "school" },
      HOD: { level: "view", scope: "department" },
      TEACHER: { level: "view", scope: "class" },
    },
  },
  {
    key: "curriculum",
    name: "Subjects & Curriculum",
    description: "Subjects per class and the curriculum map.",
    models: ["Subject"],
    containsStudentPii: false,
    access: {
      KATALYST_ADMIN: { level: "manage", scope: "global" },
      PRINCIPAL: { level: "view", scope: "school" },
      ACADEMIC_COORDINATOR: { level: "manage", scope: "school" },
      HOD: { level: "edit", scope: "department" },
      TEACHER: { level: "view", scope: "class" },
    },
  },
  {
    key: "lesson-plans",
    name: "Lesson Plans",
    description: "Daily plans, completion status, reflections and audits.",
    models: ["LessonPlan"],
    containsStudentPii: false,
    access: {
      KATALYST_ADMIN: { level: "view", scope: "global" },
      PRINCIPAL: { level: "view", scope: "school" },
      ACADEMIC_COORDINATOR: { level: "approve", scope: "school" },
      HOD: { level: "approve", scope: "department" },
      TEACHER: { level: "contribute", scope: "self" },
    },
  },
  {
    key: "attendance",
    name: "Attendance",
    description: "Daily class attendance counts.",
    models: ["AttendanceLog"],
    containsStudentPii: false,
    access: {
      KATALYST_ADMIN: { level: "view", scope: "aggregate" },
      PRINCIPAL: { level: "view", scope: "school" },
      ACADEMIC_COORDINATOR: { level: "view", scope: "school" },
      HOD: { level: "view", scope: "department" },
      TEACHER: { level: "contribute", scope: "class" },
    },
  },
  {
    key: "assessments",
    name: "Assessments & Scores",
    description: "Assessments, student scores and grade comparisons.",
    models: ["Assessment", "AssessmentScore"],
    containsStudentPii: true,
    access: {
      KATALYST_ADMIN: { level: "view", scope: "aggregate" },
      PRINCIPAL: { level: "view", scope: "school" },
      ACADEMIC_COORDINATOR: { level: "edit", scope: "school" },
      HOD: { level: "edit", scope: "department" },
      TEACHER: { level: "contribute", scope: "class" },
    },
  },
  {
    key: "remedial",
    name: "Remedial Support",
    description: "Remedial sessions logged per student.",
    models: ["RemedialLog"],
    containsStudentPii: true,
    access: {
      KATALYST_ADMIN: { level: "view", scope: "aggregate" },
      PRINCIPAL: { level: "view", scope: "school" },
      ACADEMIC_COORDINATOR: { level: "view", scope: "school" },
      HOD: { level: "edit", scope: "department" },
      TEACHER: { level: "contribute", scope: "class" },
    },
  },
  {
    key: "observations",
    name: "Classroom Observations",
    description: "Observation notes on teachers.",
    models: ["ObservationNote"],
    containsStudentPii: false,
    access: {
      KATALYST_ADMIN: { level: "view", scope: "global" },
      PRINCIPAL: { level: "manage", scope: "school" },
      ACADEMIC_COORDINATOR: { level: "contribute", scope: "school" },
      HOD: { level: "contribute", scope: "department" },
      TEACHER: { level: "view", scope: "self" },
    },
  },
  {
    key: "substitutions",
    name: "Substitutions",
    description: "Cover arrangements for absent teachers.",
    models: ["SubstitutionLog"],
    containsStudentPii: false,
    access: {
      KATALYST_ADMIN: { level: "view", scope: "aggregate" },
      PRINCIPAL: { level: "approve", scope: "school" },
      ACADEMIC_COORDINATOR: { level: "manage", scope: "school" },
      HOD: { level: "view", scope: "department" },
      TEACHER: { level: "view", scope: "self" },
    },
  },
  {
    key: "meetings",
    name: "Meeting Minutes",
    description: "Staff and review meeting records.",
    models: ["MeetingMinute"],
    containsStudentPii: false,
    access: {
      KATALYST_ADMIN: { level: "view", scope: "global" },
      PRINCIPAL: { level: "manage", scope: "school" },
      ACADEMIC_COORDINATOR: { level: "edit", scope: "school" },
      HOD: { level: "view", scope: "school" },
      TEACHER: { level: "view", scope: "school" },
    },
  },
  {
    key: "kpi",
    name: "KPI Dashboards",
    description: "Monthly school KPIs and principal sign-off.",
    models: ["KpiDashboard"],
    containsStudentPii: false,
    access: {
      KATALYST_ADMIN: { level: "manage", scope: "global" },
      PRINCIPAL: { level: "approve", scope: "school" },
      ACADEMIC_COORDINATOR: { level: "view", scope: "school" },
      HOD: { level: "view", scope: "department" },
      TEACHER: { level: "none" },
    },
  },
  {
    key: "analytics",
    name: "Cross-School Analytics",
    description: "Group-wide comparisons across schools.",
    models: [],
    containsStudentPii: false,
    access: {
      KATALYST_ADMIN: { level: "view", scope: "global" },
      PRINCIPAL: { level: "none" },
      ACADEMIC_COORDINATOR: { level: "none" },
      HOD: { level: "none" },
      TEACHER: { level: "none" },
    },
  },
  {
    key: "audit-logs",
    name: "Audit Logs",
    description: "Who viewed, changed or exported what.",
    models: [],
    containsStudentPii: false,
    access: {
      KATALYST_ADMIN: { level: "view", scope: "global" },
      PRINCIPAL: { level: "view", scope: "school" },
      ACADEMIC_COORDINATOR: { level: "none" },
      HOD: { level: "none" },
      TEACHER: { level: "none" },
    },
  },
];

// Rules that apply on top of the matrix, regardless of access level.
export const DATA_USAGE_RULES: { title: string; detail: string }[] = [
  {
    title: "School isolation",
    detail:
      "Every role except Katalystz Admin is limited to the school on their account. Queries must filter by schoolId server-side, never only in the UI.",
  },
  {
    title: "Student data stays in scope",
    detail:
      "Student names and scores are only shown within the user's school, department or classes. Katalystz Admin sees student data as aggregates only.",
  },
  {
    title: "Export is restricted",
    detail:
      "Only roles with Manage access can export, and every export is written to the audit log.",
  },
  {
    title: "Observations are confidential",
    detail:
      "Teachers see only observations about themselves. Notes are never shared with other teachers.",
  },
  {
    title: "Approved records are locked",
    detail:
      "Audited lesson plans and approved KPI dashboards can no longer be edited by contributors; changes need a re-approval.",
  },
  {
    title: "No deletion without Manage",
    detail:
      "Contributors and editors cannot delete records. Corrections are made by editing, so history is preserved.",
  },
];

export function isRole(value: string | null | undefined): value is Role {
  return !!value && (ROLES as readonly string[]).includes(value);
}

export function getModule(key: string): LmsModule | undefined {
  return LMS_MODULES.find((m) => m.key === key);
}

export function getGrant(role: string, moduleKey: string): Grant {
  const mod = getModule(moduleKey);
  if (!mod || !isRole(role)) return { level: "none" };
  return mod.access[role];
}

export function can(role: string, moduleKey: string, action: Action): boolean {
  return LEVEL_ACTIONS[getGrant(role, moduleKey).level].includes(action);
}

export function modulesForRole(role: string): LmsModule[] {
  return LMS_MODULES.filter((m) => can(role, m.key, "view"));
}
