// inferred too narrowly from this JS source. Runtime behavior is exercised by unit
import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, Search, Calendar, MoreHorizontal, Pencil, Trash2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import BookingForm from "@/components/bookings/BookingForm";
import ErrorState from "@/components/ErrorState";

const statusStyles = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-green-100 text-green-800",
  contract_sent: "bg-blue-100 text-blue-800",
  contract_signed: "bg-emerald-100 text-emerald-800",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-800",
};

export default function Bookings() {
  const [showForm, setShowForm] = useState(false);
  const [editBooking, setEditBooking] = useState(null);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const currentUserEmailRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(u => { currentUserEmailRef.current = u?.email; }).catch(() => {});
  }, []);

  // Check for ?new=true query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") === "true") {
      setShowForm(true);
      window.history.replaceState({}, "", "/bookings");
    }
  }, []);

  const { data: bookings = [], isLoading, error, refetch } = useQuery({
    queryKey: ["bookings"],
    queryFn: () => base44.entities.Booking.list("-session_date"),
  });

  const createMutation = useMutation({
    mutationFn: (/** @type {any} */ data) => base44.entities.Booking.create(data),
    onSuccess: async (created) => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      setShowForm(false);
      // Notify photographer so they can follow up with the client
      if (currentUserEmailRef.current) {
        const sessionDate = created.session_date
          ? format(new Date(created.session_date), "EEEE, MMMM d, yyyy 'at' h:mm a")
          : "TBD";
        await base44.integrations.Core.SendEmail({
          to: currentUserEmailRef.current,
          subject: `New booking request from ${created.client_name}`,
          body: `A new booking request has been created.\n\nClient: ${created.client_name}\nEmail: ${created.client_email}\nSession Type: ${created.session_type}\nDate: ${sessionDate}\nLocation: ${created.location || "Not specified"}\n${created.notes ? `Notes: ${created.notes}` : ""}`,
        });
      }
      toast({ title: "Booking created" });
    },
  });

  const sendConfirmationEmail = async (booking) => {
    if (!currentUserEmailRef.current) return;
    const sessionDate = booking.session_date
      ? format(new Date(booking.session_date), "EEEE, MMMM d, yyyy 'at' h:mm a")
      : "TBD";
    const clientEmail = `Hi ${booking.client_name},\n\nGreat news! Your photography session has been confirmed. Here's a summary:\n\n📸 Session Type: ${booking.session_type?.charAt(0).toUpperCase() + booking.session_type?.slice(1)}\n📅 Date & Time: ${sessionDate}\n📍 Location: ${booking.location || "To be confirmed"}\n💰 Price: ${booking.price ? `$${booking.price}` : "To be discussed"}\n\n${booking.notes ? `Notes: ${booking.notes}\n\n` : ""}What to expect next:\n- You'll receive a contract to review and sign shortly.\n- We'll send a reminder 48 hours before your session.\n- Feel free to reply to this email with any questions.\n\nWe're looking forward to working with you!\n\nWarm regards,\nThe LensFlow Team`;
    await base44.integrations.Core.SendEmail({
      to: currentUserEmailRef.current,
      subject: `[Forward to client] Confirmation for ${booking.client_name} — ${booking.session_type} session`,
      body: `Please forward this confirmation to your client at ${booking.client_email}:\n\n---\n\n${clientEmail}`,
    });
  };

  const updateMutation = useMutation({
    mutationFn: (/** @type {{ id: string, data: any }} */ { id, data }) => base44.entities.Booking.update(id, data),
    onSuccess: async (_, { data }) => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      if (data.status === "confirmed" && editBooking?.status !== "confirmed") {
        await sendConfirmationEmail({ ...editBooking, ...data });
        toast({ title: "Booking confirmed", description: "Confirmation email sent to client." });
      } else {
        toast({ title: "Booking updated" });
      }
      setEditBooking(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (/** @type {string} */ id) => base44.entities.Booking.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast({ title: "Booking deleted" });
    },
  });

  const copyClientLink = async (booking) => {
    let token = booking.access_token;
    if (!token) {
      token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      await base44.entities.Booking.update(booking.id, { access_token: token });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    }
    const url = `${window.location.origin}/booking-status?token=${token}`;
    await navigator.clipboard.writeText(url);
    toast({ title: "Client link copied!", description: "Share this link with your client." });
  };

  const filtered = bookings.filter(b =>
    b.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.client_email?.toLowerCase().includes(search.toLowerCase()) ||
    b.session_type?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Bookings</h1>
          <p className="text-muted-foreground mt-1">Manage your photo sessions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={async () => {
            await navigator.clipboard.writeText(`${window.location.origin}/request`);
            toast({ title: "Intake form link copied!", description: "Share this with potential clients." });
          }}>
            <Link2 className="w-4 h-4" /> Share Intake Form
          </Button>
          <Button onClick={() => setShowForm(true)} className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
            <Plus className="w-4 h-4" /> New Booking
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search bookings..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {error && (
        <ErrorState title="Couldn't load bookings" error={error} onRetry={() => refetch()} />
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">Client</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">Session</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">Date</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">Price</th>
                <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}><td colSpan={6} className="px-6 py-4"><Skeleton className="h-8 w-full" /></td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-muted-foreground">
                    <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>No bookings found</p>
                  </td>
                </tr>
              ) : (
                filtered.map(booking => (
                  <tr key={booking.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-foreground">{booking.client_name}</p>
                      <p className="text-xs text-muted-foreground">{booking.client_email}</p>
                    </td>
                    <td className="px-6 py-4 capitalize text-sm">{booking.session_type}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {format(new Date(booking.session_date), "MMM d, yyyy 'at' h:mm a")}
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={`${statusStyles[booking.status] || ""} text-[11px]`}>
                        {booking.status?.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">{booking.price ? `$${booking.price}` : "—"}</td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditBooking(booking)}>
                                             <Pencil className="w-4 h-4 mr-2" /> Edit
                                           </DropdownMenuItem>
                                           <DropdownMenuItem onClick={() => copyClientLink(booking)}>
                                             <Link2 className="w-4 h-4 mr-2" /> Copy Client Link
                                           </DropdownMenuItem>
                                           <DropdownMenuItem onClick={() => deleteMutation.mutate(booking.id)} className="text-destructive">
                                             <Trash2 className="w-4 h-4 mr-2" /> Delete
                                           </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sr-only"><DialogTitle>New Booking</DialogTitle></DialogHeader>
          <BookingForm
            onSubmit={(data) => createMutation.mutate(data)}
            onCancel={() => setShowForm(false)}
            isSubmitting={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editBooking} onOpenChange={() => setEditBooking(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sr-only"><DialogTitle>Edit Booking</DialogTitle></DialogHeader>
          {editBooking && (
            <BookingForm
              booking={editBooking}
              onSubmit={(data) => updateMutation.mutate({ id: editBooking.id, data })}
              onCancel={() => setEditBooking(null)}
              isSubmitting={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
