import { TrafficLight, WarRoomKPI } from "@/lib/mockWarRoomData";
import { CheckCircle2, AlertTriangle, AlertOctagon } from "lucide-react";

export default function TrafficLightCard({ kpi }: { kpi: WarRoomKPI }) {
  const getLightStyles = (status: TrafficLight) => {
    switch (status) {
      case TrafficLight.GREEN:
        return {
          bg: "bg-green-50/70 border-green-200",
          text: "text-green-700",
          icon: <CheckCircle2 className="w-5 h-5 text-green-600" />
        };
      case TrafficLight.AMBER:
        return {
          bg: "bg-orange-50/70 border-orange-200",
          text: "text-orange-700",
          icon: <AlertTriangle className="w-5 h-5 text-orange-600" />
        };
      case TrafficLight.RED:
        return {
          bg: "bg-red-50/70 border-red-200",
          text: "text-red-700",
          icon: <AlertOctagon className="w-5 h-5 text-red-600" />
        };
    }
  };

  const styles = getLightStyles(kpi.status);

  return (
    <div className={`backdrop-blur-md p-6 rounded-xl shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] border transition-all hover:-translate-y-1 ${styles.bg}`}>
      <div className="flex justify-between items-start mb-4">
        <h3 className="font-semibold text-gray-800 leading-tight pr-4">{kpi.metricName}</h3>
        <div className="shrink-0 bg-white/60 p-2 rounded-full shadow-sm">
          {styles.icon}
        </div>
      </div>
      
      <div className="flex items-end gap-2">
        <span className={`text-4xl font-bold font-heading ${styles.text}`}>
          {kpi.finalScore}%
        </span>
        <span className="text-gray-500 font-medium pb-1">
          / {kpi.targetScore}%
        </span>
      </div>

      <div className="mt-4 pt-4 border-t border-black/5 flex justify-between text-sm">
        <div className="text-gray-600">
          <span className="font-semibold text-gray-800">Base:</span> {kpi.automatedScore}%
        </div>
        <div className="text-gray-600">
          <span className="font-semibold text-gray-800">HOD:</span> {kpi.hodScore ? `+${kpi.hodScore}` : "N/A"}
        </div>
      </div>
    </div>
  );
}
