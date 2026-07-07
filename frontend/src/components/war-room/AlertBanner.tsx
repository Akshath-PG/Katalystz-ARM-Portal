import { AlertTriangle, Clock } from "lucide-react";
import { NotificationEvent } from "@/lib/mockWarRoomData";

export default function AlertBanner({ notifications }: { notifications: NotificationEvent[] }) {
  if (notifications.length === 0) return null;

  return (
    <div className="space-y-3 mb-8">
      {notifications.map((notif) => {
        const isRedAlert = notif.type === "RED_ALERT";
        return (
          <div 
            key={notif.id}
            className={`flex items-start gap-4 p-4 rounded-xl border backdrop-blur-md shadow-sm ${
              isRedAlert 
                ? "bg-red-50/90 border-red-200" 
                : "bg-orange-50/90 border-orange-200"
            }`}
          >
            <div className={`p-2 rounded-full ${isRedAlert ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600"}`}>
              {isRedAlert ? <AlertTriangle className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
            </div>
            <div>
              <h4 className={`font-bold ${isRedAlert ? "text-red-800" : "text-orange-800"}`}>
                {isRedAlert ? "CRITICAL SYSTEM ALERT" : "ACTION REQUIRED"}
              </h4>
              <p className={isRedAlert ? "text-red-700 font-medium mt-1" : "text-orange-700 font-medium mt-1"}>
                {notif.message}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
