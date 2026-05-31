/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PresetTag {
  name: string;
  color: string;
  icon: string;
}

export const PROFESSION_PRESETS: Record<string, PresetTag[]> = {
  "Web Developer": [
    { name: "CODE", color: "#6366f1", icon: "💻" },
    { name: "IDEA", color: "#eab308", icon: "💡" },
    { name: "APIs", color: "#06b6d4", icon: "🔌" },
    { name: "DEBUG", color: "#ef4444", icon: "🪲" },
    { name: "PROJECT", color: "#10b981", icon: "🚀" }
  ],
  "Student": [
    { name: "LECTURE", color: "#3b82f6", icon: "🎓" },
    { name: "ASSIGNMENT", color: "#f97316", icon: "📝" },
    { name: "EXAM", color: "#ef4444", icon: "⏱️" },
    { name: "NOTES", color: "#64748b", icon: "📓" },
    { name: "RESEARCH", color: "#0d9488", icon: "🔬" }
  ],
  "Writer": [
    { name: "DRAFT", color: "#f59e0b", icon: "✍️" },
    { name: "PLOT", color: "#8b5cf6", icon: "🗺️" },
    { name: "CHARACTER", color: "#3b82f6", icon: "👤" },
    { name: "EDIT", color: "#ef4444", icon: "✂️" },
    { name: "PUBLISH", color: "#10b981", icon: "📖" }
  ],
  "Social Media Manager": [
    { name: "POST", color: "#3b82f6", icon: "📱" },
    { name: "CAMPAIGN", color: "#8b5cf6", icon: "📣" },
    { name: "INSIGHTS", color: "#10b981", icon: "📈" },
    { name: "ENGAGEMENT", color: "#ec4899", icon: "❤️" },
    { name: "ADS", color: "#f97316", icon: "🎯" }
  ],
  "SEO Manager": [
    { name: "KEYWORDS", color: "#eab308", icon: "🔑" },
    { name: "BACKLINKS", color: "#06b6d4", icon: "🔗" },
    { name: "AUDIT", color: "#8b5cf6", icon: "🔍" },
    { name: "CONTENT", color: "#10b981", icon: "✍️" },
    { name: "RANKING", color: "#3b82f6", icon: "🏆" }
  ],
  "Project Manager": [
    { name: "TASKS", color: "#3b82f6", icon: "📋" },
    { name: "TIMELINE", color: "#f59e0b", icon: "📅" },
    { name: "BUDGET", color: "#10b981", icon: "💵" },
    { name: "MILESTONE", color: "#8b5cf6", icon: "🏁" },
    { name: "MEETING", color: "#64748b", icon: "👥" }
  ],
  "Designer": [
    { name: "MOODBOARD", color: "#ec4899", icon: "🎨" },
    { name: "WIREFRAME", color: "#06b6d4", icon: "📐" },
    { name: "ASSETS", color: "#f59e0b", icon: "📦" },
    { name: "FEEDBACK", color: "#8b5cf6", icon: "💬" },
    { name: "FINAL", color: "#10b981", icon: "🎯" }
  ],
  "Data Analyst": [
    { name: "DATASET", color: "#06b6d4", icon: "📊" },
    { name: "CLEANING", color: "#64748b", icon: "🧹" },
    { name: "QUERY", color: "#8b5cf6", icon: "🖥️" },
    { name: "METRIC", color: "#10b981", icon: "📈" },
    { name: "REPORT", color: "#3b82f6", icon: "📄" }
  ],
  "Software Architect": [
    { name: "DIAGRAM", color: "#8b5cf6", icon: "📐" },
    { name: "SERVICE", color: "#06b6d4", icon: "⚙️" },
    { name: "DATABASE", color: "#f59e0b", icon: "🗄️" },
    { name: "SECURITY", color: "#ef4444", icon: "🔒" },
    { name: "SCALE", color: "#10b981", icon: "⚖️" }
  ],
  "Product Manager": [
    { name: "ROADMAP", color: "#8b5cf6", icon: "🗺️" },
    { name: "FEEDBACK", color: "#ec4899", icon: "🗣️" },
    { name: "SPECS", color: "#3b82f6", icon: "📄" },
    { name: "PRIORITY", color: "#ef4444", icon: "⚡" },
    { name: "RELEASE", color: "#10b981", icon: "📦" }
  ],
  "Content Creator": [
    { name: "SCRIPT", color: "#f59e0b", icon: "📜" },
    { name: "VIDEO", color: "#ef4444", icon: "🎥" },
    { name: "AUDIO", color: "#8b5cf6", icon: "🎙️" },
    { name: "THUMBNAIL", color: "#ec4899", icon: "🖼️" },
    { name: "SPONSOR", color: "#10b981", icon: "🤝" }
  ],
  "Teacher": [
    { name: "LESSON", color: "#3b82f6", icon: "🏫" },
    { name: "GRADE", color: "#ef4444", icon: "💯" },
    { name: "PARENT", color: "#8b5cf6", icon: "👪" },
    { name: "RESOURCE", color: "#f59e0b", icon: "📚" },
    { name: "SCHEDULE", color: "#64748b", icon: "⏰" }
  ],
  "Marketer": [
    { name: "LEADS", color: "#3b82f6", icon: "🎯" },
    { name: "EMAIL", color: "#06b6d4", icon: "✉️" },
    { name: "COPY", color: "#f59e0b", icon: "✍️" },
    { name: "STRATEGY", color: "#8b5cf6", icon: "🧠" },
    { name: "ROI", color: "#10b981", icon: "📊" }
  ],
  "Sales Rep": [
    { name: "PROSPECT", color: "#3b82f6", icon: "👥" },
    { name: "PITCH", color: "#8b5cf6", icon: "🗣️" },
    { name: "DEAL", color: "#10b981", icon: "🤝" },
    { name: "FOLLOWUP", color: "#f59e0b", icon: "📞" },
    { name: "TARGET", color: "#ef4444", icon: "🎯" }
  ],
  "HR Specialist": [
    { name: "RECRUIT", color: "#3b82f6", icon: "🔍" },
    { name: "INTERVIEW", color: "#8b5cf6", icon: "👥" },
    { name: "ONBOARD", color: "#10b981", icon: "👋" },
    { name: "REVIEW", color: "#f59e0b", icon: "📝" },
    { name: "PAYROLL", color: "#64748b", icon: "💳" }
  ],
  "Financial Analyst": [
    { name: "PORTFOLIO", color: "#3b82f6", icon: "💼" },
    { name: "STOCK", color: "#10b981", icon: "📈" },
    { name: "RISK", color: "#ef4444", icon: "⚠️" },
    { name: "VALUATION", color: "#8b5cf6", icon: "📊" },
    { name: "FORECAST", color: "#f59e0b", icon: "🔮" }
  ],
  "Researcher": [
    { name: "HYPOTHESIS", color: "#8b5cf6", icon: "💡" },
    { name: "DATA", color: "#06b6d4", icon: "📊" },
    { name: "SOURCES", color: "#64748b", icon: "📚" },
    { name: "PAPER", color: "#3b82f6", icon: "📝" },
    { name: "COLLAB", color: "#10b981", icon: "👥" }
  ],
  "Lawyer": [
    { name: "CASE", color: "#3b82f6", icon: "💼" },
    { name: "BRIEF", color: "#64748b", icon: "📄" },
    { name: "STATUTE", color: "#8b5cf6", icon: "📜" },
    { name: "CLIENT", color: "#10b981", icon: "🤝" },
    { name: "COURT", color: "#ef4444", icon: "🏛️" }
  ],
  "Healthcare Worker": [
    { name: "PATIENT", color: "#3b82f6", icon: "👤" },
    { name: "CHART", color: "#06b6d4", icon: "📋" },
    { name: "LABS", color: "#8b5cf6", icon: "🧪" },
    { name: "MEDS", color: "#ef4444", icon: "💊" },
    { name: "FOLLOWUP", color: "#f59e0b", icon: "📅" }
  ],
  "Consultant": [
    { name: "SLIDES", color: "#3b82f6", icon: "📊" },
    { name: "ANALYSIS", color: "#06b6d4", icon: "📈" },
    { name: "CLIENT", color: "#8b5cf6", icon: "🤝" },
    { name: "ADVICE", color: "#10b981", icon: "💡" },
    { name: "ACTION", color: "#ef4444", icon: "⚡" }
  ],
  "Entrepreneur": [
    { name: "PITCH", color: "#8b5cf6", icon: "📢" },
    { name: "FUNDING", color: "#10b981", icon: "💰" },
    { name: "MVP", color: "#06b6d4", icon: "🛠️" },
    { name: "GROWTH", color: "#ec4899", icon: "📈" },
    { name: "LEGAL", color: "#64748b", icon: "⚖️" }
  ]
};
