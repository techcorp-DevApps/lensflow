import React from "react";
import { format } from "date-fns";
import { MapPin, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const statusStyles = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  confirmed: "bg-green-100 text-green-800 border-green-200",
  contract_sent: "bg-blue-100 text-blue-800 border-blue-200",
  contract_signed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  completed: "bg-gray-100 text-gray-600 border-gray-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const sessionTypeLabels = {
  portrait: "Portrait",
  wedding: "Wedding",
  family: "Family",
  newborn: "Newborn",
  maternity: "Maternity",
  event: "Event",
  commercial: "Commercial",
  headshot: "Headshot",
};

export default function UpcomingShootCard({ booking }) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
      <div className="w-14 h-14 rounded-lg bg-accent/10 flex flex-col items-center justify-center shrink-0">
        <span className="text-xs font-medium text-accent uppercase">
          {format(new Date(booking.session_date), "MMM")}
        </span>
        <span className="text-lg font-heading font-bold text-foreground leading-none">
          {format(new Date(booking.session_date), "dd")}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-foreground truncate">{booking.client_name}</p>
          <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${statusStyles[booking.status] || ""}`}>
            {booking.status?.replace(/_/g, " ")}
          </Badge>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {format(new Date(booking.session_date), "h:mm a")}
          </span>
          <span className="capitalize">{sessionTypeLabels[booking.session_type] || booking.session_type}</span>
          {booking.location && (
            <span className="flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3" />
              {booking.location}
            </span>
          )}
        </div>
      </div>
      {booking.price && (
        <span className="text-sm font-semibold text-foreground shrink-0">
          ${booking.price}
        </span>
      )}
    </div>
  );
}
