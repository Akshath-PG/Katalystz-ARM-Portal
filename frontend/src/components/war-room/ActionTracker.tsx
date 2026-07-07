import { CorrectiveAction } from "@/lib/mockWarRoomData";
import { Calendar, CheckCircle2, Circle } from "lucide-react";

export default function ActionTracker({ actions }: { actions: CorrectiveAction[] }) {
  return (
    <div className="bg-white/70 backdrop-blur-md p-6 rounded-xl shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] border border-white/40">
      <h3 className="text-lg font-bold text-gray-800 mb-6 font-heading">Decision & Corrective Action Tracker</h3>
      
      <div className="space-y-4">
        {actions.map((action) => {
          const dateObj = new Date(action.dueDate);
          const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          
          return (
            <div 
              key={action.id} 
              className={`flex gap-4 p-4 rounded-lg border ${
                action.isOverdue 
                  ? "bg-red-50/50 border-red-100" 
                  : "bg-gray-50/50 border-gray-100"
              }`}
            >
              <div className="mt-1">
                {action.status === "RESOLVED" ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-300" />
                )}
              </div>
              
              <div className="flex-1">
                <p className="font-semibold text-gray-800">{action.description}</p>
                
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span className="bg-white px-2 py-1 rounded-md border border-gray-200 shadow-sm">
                    {action.assignedTo}
                  </span>
                  
                  <span className={`flex items-center gap-1 font-medium ${action.isOverdue ? 'text-red-600' : ''}`}>
                    <Calendar className="w-4 h-4" />
                    Due: {formattedDate}
                    {action.isOverdue && " (OVERDUE)"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
