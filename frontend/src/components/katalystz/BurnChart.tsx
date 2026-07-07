"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { SubjectData } from "./mockData";

interface BurnChartProps {
  data: SubjectData[];
}

export default function BurnChart({ data }: BurnChartProps) {
  return (
    <div className="bg-white/70 backdrop-blur-md p-6 rounded-xl shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] border border-white/40">
      <h3 className="text-lg font-bold text-gray-800 mb-6">Subject-wise Syllabus Burn Chart</h3>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dx={-10} />
            <Tooltip
              cursor={{ fill: '#f3f4f6' }}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Bar dataKey="expected" name="Expected %" fill="#93c5fd" radius={[4, 4, 0, 0]} barSize={30} />
            <Bar dataKey="completed" name="Completed %" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={30} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
