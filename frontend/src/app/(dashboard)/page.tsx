"use client";

import { useState } from "react";
import { Building, GraduationCap, Users } from "lucide-react";
import DateSelector from "@/components/katalystz/DateSelector";
import BurnChart from "@/components/katalystz/BurnChart";
import { mockSchoolsData } from "@/components/katalystz/mockData";

// War Room Components
import AlertBanner from "@/components/war-room/AlertBanner";
import TrafficLightCard from "@/components/war-room/TrafficLightCard";
import ActionTracker from "@/components/war-room/ActionTracker";
import { mockKPIs, mockNotifications, mockActions } from "@/lib/mockWarRoomData";

export default function Dashboard() {
  const [selectedSchool, setSelectedSchool] = useState(mockSchoolsData[0].schoolName);
  const currentSchool = mockSchoolsData.find(s => s.schoolName === selectedSchool) || mockSchoolsData[0];
  
  const [selectedGrade, setSelectedGrade] = useState(currentSchool.grades[0].gradeName);
  const currentGrade = currentSchool.grades.find(g => g.gradeName === selectedGrade) || currentSchool.grades[0];

  const [selectedSection, setSelectedSection] = useState(currentGrade.sections[0].sectionName);
  const currentSection = currentGrade.sections.find(s => s.sectionName === selectedSection) || currentGrade.sections[0];

  // --- REACTIVE FILTERING ---
  // Filter Alerts and KPIs to only show those belonging to the currently selected school and grade
  const filteredAlerts = mockNotifications.filter(
    n => n.schoolName === selectedSchool && n.gradeName === selectedGrade
  );
  const filteredKPIs = mockKPIs.filter(
    k => k.schoolName === selectedSchool && k.gradeName === selectedGrade
  );
  const filteredActions = mockActions.filter(
    a => a.schoolName === selectedSchool && a.gradeName === selectedGrade
  );

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 font-heading">KATALYSTZ Admin Dashboard</h1>
      </div>

      {/* ROW 1: CONTEXT FILTERS (TOP OF PAGE) */}
      <div className="flex flex-wrap gap-4 items-center mb-6">
        <div className="flex items-center gap-2 bg-white/70 backdrop-blur-md p-3 rounded-xl shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] border border-white/40 transition-colors focus-within:border-blue-300">
           <Building className="w-5 h-5 text-gray-500" />
           <select 
             value={selectedSchool}
             onChange={(e) => {
               setSelectedSchool(e.target.value);
               const newSchool = mockSchoolsData.find(s => s.schoolName === e.target.value);
               if (newSchool) {
                 setSelectedGrade(newSchool.grades[0].gradeName);
                 setSelectedSection(newSchool.grades[0].sections[0].sectionName);
               }
             }}
             className="bg-transparent border-none text-gray-700 font-medium focus:ring-0 cursor-pointer outline-none"
           >
             {mockSchoolsData.map(school => (
               <option key={school.schoolName} value={school.schoolName}>{school.schoolName}</option>
             ))}
           </select>
        </div>

        <div className="flex items-center gap-2 bg-white/70 backdrop-blur-md p-3 rounded-xl shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] border border-white/40 transition-colors focus-within:border-blue-300">
           <GraduationCap className="w-5 h-5 text-gray-500" />
           <select 
             value={selectedGrade}
             onChange={(e) => {
               setSelectedGrade(e.target.value);
               const newGrade = currentSchool.grades.find(g => g.gradeName === e.target.value);
               if (newGrade) {
                 setSelectedSection(newGrade.sections[0].sectionName);
               }
             }}
             className="bg-transparent border-none text-gray-700 font-medium focus:ring-0 cursor-pointer outline-none"
           >
             {currentSchool.grades.map(grade => (
               <option key={grade.gradeName} value={grade.gradeName}>{grade.gradeName}</option>
             ))}
           </select>
        </div>

        <div className="flex items-center gap-2 bg-white/70 backdrop-blur-md p-3 rounded-xl shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] border border-white/40 transition-colors focus-within:border-blue-300">
           <Users className="w-5 h-5 text-gray-500" />
           <select 
             value={selectedSection}
             onChange={(e) => setSelectedSection(e.target.value)}
             className="bg-transparent border-none text-gray-700 font-medium focus:ring-0 cursor-pointer outline-none"
           >
             {currentGrade.sections.map(section => (
               <option key={section.sectionName} value={section.sectionName}>Section {section.sectionName}</option>
             ))}
           </select>
        </div>
        
        <DateSelector />
      </div>

      {/* ROW 2: BURN CHART & ACTION TRACKER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2">
          <BurnChart data={currentSection.subjects} />
        </div>
        <div className="lg:col-span-1">
          <ActionTracker actions={filteredActions} />
        </div>
      </div>

      {/* SECTION HEADER: WAR ROOM */}
      <div className="mb-6 mt-12">
        <h2 className="text-2xl font-bold text-gray-900 font-heading">Principal War Room Dashboard</h2>
        <p className="text-gray-500 mt-1">Real-time tracking of Master Academic & Operations parameters.</p>
      </div>

      {/* ROW 3: CRITICAL SYSTEM ALERTS */}
      <AlertBanner notifications={filteredAlerts} />

      {/* ROW 4: REACTIVE KPIs */}
      {filteredKPIs.length > 0 ? (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4 font-heading">
            Key Performance Indicators ({selectedSchool} - {selectedGrade})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredKPIs.map(kpi => (
              <TrafficLightCard key={kpi.id} kpi={kpi} />
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center p-8 bg-white/40 rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-500 font-medium">No KPI data available for this selection.</p>
        </div>
      )}

    </div>
  );
}
