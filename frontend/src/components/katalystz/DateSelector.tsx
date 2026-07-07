"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";

export default function DateSelector() {
  const [selectedMonth, setSelectedMonth] = useState("2024-10");

  return (
    <div className="flex items-center gap-4 bg-white/70 backdrop-blur-md p-4 rounded-xl shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] border border-white/40">
      <div className="flex items-center gap-2 text-gray-500">
        <Calendar className="w-5 h-5" />
        <span className="font-medium text-sm">Monthly Custom Date Selection:</span>
      </div>
      <input
        type="month"
        value={selectedMonth}
        onChange={(e) => setSelectedMonth(e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
    </div>
  );
}
