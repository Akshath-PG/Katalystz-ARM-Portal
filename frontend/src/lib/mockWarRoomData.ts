export enum TrafficLight {
  GREEN = "GREEN",
  AMBER = "AMBER",
  RED = "RED",
}

export type WarRoomKPI = {
  id: string;
  metricName: string;
  automatedScore: number;
  hodScore: number | null;
  finalScore: number;
  targetScore: number;
  status: TrafficLight;
  schoolName: string;
  gradeName: string;
};

export type NotificationEvent = {
  id: string;
  type: "RED_ALERT" | "OVERDUE_ACTION" | "TREND_DETERIORATION" | "GENERAL";
  message: string;
  date: string;
  isRead: boolean;
  schoolName: string;
  gradeName: string;
};

export type CorrectiveAction = {
  id: string;
  description: string;
  assignedTo: string;
  dueDate: string;
  status: "PENDING" | "RESOLVED";
  isOverdue: boolean;
  schoolName: string;
  gradeName: string;
};

// ---------------------------------------------------------
// MOCK DATA
// ---------------------------------------------------------

export const mockKPIs: WarRoomKPI[] = [
  // Katalystz Academy - Grade 9
  {
    id: "kpi-1",
    metricName: "Weekly Syllabus Completion (Sci)",
    automatedScore: 88,
    hodScore: 10,
    finalScore: 98,
    targetScore: 100,
    status: TrafficLight.GREEN,
    schoolName: "Katalystz Academy",
    gradeName: "Grade 9"
  },
  {
    id: "kpi-2",
    metricName: "Lesson Plan Quality Average",
    automatedScore: 70,
    hodScore: 12,
    finalScore: 82,
    targetScore: 100,
    status: TrafficLight.AMBER,
    schoolName: "Katalystz Academy",
    gradeName: "Grade 9"
  },
  {
    id: "kpi-3",
    metricName: "Formative Assessment Pass Rate (Math)",
    automatedScore: 45,
    hodScore: null,
    finalScore: 45,
    targetScore: 80,
    status: TrafficLight.RED,
    schoolName: "Katalystz Academy",
    gradeName: "Grade 9"
  },
  
  // Katalystz Academy - Grade 10
  {
    id: "kpi-4",
    metricName: "Weekly Syllabus Completion (Math)",
    automatedScore: 95,
    hodScore: 4,
    finalScore: 99,
    targetScore: 100,
    status: TrafficLight.GREEN,
    schoolName: "Katalystz Academy",
    gradeName: "Grade 10"
  },
  {
    id: "kpi-5",
    metricName: "Teacher Daily Attendance Logs",
    automatedScore: 100,
    hodScore: null,
    finalScore: 100,
    targetScore: 100,
    status: TrafficLight.GREEN,
    schoolName: "Katalystz Academy",
    gradeName: "Grade 10"
  },

  // Future Ready High - Grade 9
  {
    id: "kpi-6",
    metricName: "Weekly Syllabus Completion (All)",
    automatedScore: 55,
    hodScore: null,
    finalScore: 55,
    targetScore: 100,
    status: TrafficLight.RED,
    schoolName: "Future Ready High",
    gradeName: "Grade 9"
  },
  {
    id: "kpi-7",
    metricName: "Lesson Plan Quality Average",
    automatedScore: 65,
    hodScore: 5,
    finalScore: 70,
    targetScore: 100,
    status: TrafficLight.AMBER,
    schoolName: "Future Ready High",
    gradeName: "Grade 9"
  },
];

export const mockNotifications: NotificationEvent[] = [
  {
    id: "notif-1",
    type: "RED_ALERT",
    message: "CRITICAL: Grade 9 Math Formative Assessment Pass Rate has fallen below 60%. Same-day action required.",
    date: new Date().toISOString(),
    isRead: false,
    schoolName: "Katalystz Academy",
    gradeName: "Grade 9"
  },
  {
    id: "notif-2",
    type: "OVERDUE_ACTION",
    message: "ACTION OVERDUE: Mr. Davis (HOD Science) has not submitted the RCA for Week 11 deviations (Overdue by 3 days).",
    date: new Date(Date.now() - 86400000).toISOString(),
    isRead: false,
    schoolName: "Katalystz Academy",
    gradeName: "Grade 9"
  },
  {
    id: "notif-3",
    type: "RED_ALERT",
    message: "SYSTEM FAILURE: Weekly syllabus completion across all subjects is in critical RED territory (55%).",
    date: new Date().toISOString(),
    isRead: false,
    schoolName: "Future Ready High",
    gradeName: "Grade 9"
  },
];

export const mockActions: CorrectiveAction[] = [
  {
    id: "act-1",
    description: "Submit Root Cause Analysis (RCA) for Math underperformance.",
    assignedTo: "Mrs. Smith (HOD Math)",
    dueDate: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    status: "PENDING",
    isOverdue: true,
    schoolName: "Katalystz Academy",
    gradeName: "Grade 9"
  },
  {
    id: "act-2",
    description: "Review Lesson Plan differentiation strategies with Junior Teachers.",
    assignedTo: "Mr. Johnson (Academic Coordinator)",
    dueDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    status: "PENDING",
    isOverdue: false,
    schoolName: "Katalystz Academy",
    gradeName: "Grade 9"
  },
  {
    id: "act-3",
    description: "Emergency Staff Meeting: Address systemic syllabus delays.",
    assignedTo: "Principal Office",
    dueDate: new Date().toISOString(),
    status: "PENDING",
    isOverdue: true,
    schoolName: "Future Ready High",
    gradeName: "Grade 9"
  },
];
