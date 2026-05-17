import React from "react";
import { base44 } from "@/api/base44Client";
import { galleriesApi } from "@/api/galleries";
import { contractsApi } from "@/api/contracts";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, FileText, Image, DollarSign, Camera, MessageCircle } from "lucide-react";
import { format, isAfter, startOfToday } from "date-fns";
import { motion } from "framer-motion";
import StatCard from "@/components/dashboard/StatCard";
import UpcomingShootCard from "@/components/dashboard/UpcomingShootCard";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: bookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ["bookings"],
    queryFn: () => base44.entities.Booking.list("-session_date"),
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ["contracts"],
    queryFn: () => contractsApi.list(),
  });

  const { data: galleries = [] } = useQuery({
    queryKey: ["galleries"],
    queryFn: () => galleriesApi.list(),
  });

  const today = startOfToday();
  const upcoming = bookings
    .filter(b => b.status !== "cancelled" && b.status !== "completed" && isAfter(new Date(b.session_date), today))
    .sort((a, b) => new Date(a.session_date) - new Date(b.session_date))
    .slice(0, 5);

  const pendingContracts = contracts.filter(c => c.status !== "signed").length;
  const totalRevenue = bookings
    .filter(b => b.status !== "cancelled")
    .reduce((sum, b) => sum + (b.price || 0), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/book">
            <Button variant="outline" className="gap-2">
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Client Booking Chat</span>
              <span className="sm:hidden">Book</span>
            </Button>
          </Link>
          <Link to="/bookings?new=true">
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">New Booking</span>
              <span className="sm:hidden">New</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      {loadingBookings ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard title="Total Bookings" value={bookings.length} icon={CalendarDays} subtitle="All time" />
          <StatCard title="Pending Contracts" value={pendingContracts} icon={FileText} subtitle="Awaiting signature" />
          <StatCard title="Active Galleries" value={galleries.filter(g => g.status === "published").length} icon={Image} subtitle="Published" />
          <StatCard title="Revenue" value={`$${totalRevenue.toLocaleString()}`} icon={DollarSign} subtitle="Total earned" />
        </div>
      )}

      {/* Upcoming Shoots */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="bg-card border border-border rounded-xl">
          <div className="flex items-center justify-between p-6 pb-4">
            <h2 className="text-lg font-heading font-semibold text-foreground">Upcoming Shoots</h2>
            <Link to="/bookings" className="text-xs text-accent font-medium hover:underline">View All</Link>
          </div>
          <div className="px-6 pb-6 space-y-2">
            {loadingBookings ? (
              [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)
            ) : upcoming.length > 0 ? (
              upcoming.map(b => <UpcomingShootCard key={b.id} booking={b} />)
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Camera className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No upcoming shoots scheduled</p>
                <Link to="/bookings?new=true">
                  <Button variant="outline" size="sm" className="mt-3">Create a Booking</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
