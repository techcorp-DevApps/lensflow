import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, differenceInDays, isAfter, startOfToday } from "date-fns";
import { Bell, Send, Check, Mail, MapPin, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ErrorState from "@/components/ErrorState";

export default function Reminders() {
  const [customMessage, setCustomMessage] = useState(null);
  const [currentUserEmail, setCurrentUserEmail] = useState(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    base44.auth.me().then(u => setCurrentUserEmail(u?.email)).catch(() => {});
  }, []);

  const { data: bookings = [], isLoading, error, refetch } = useQuery({
    queryKey: ["bookings"],
    queryFn: () => base44.entities.Booking.list("-session_date"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Booking.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookings"] }),
  });

  const today = startOfToday();
  const upcoming = bookings
    .filter(b => b.status !== "cancelled" && b.status !== "completed" && isAfter(new Date(b.session_date), today))
    .sort((a, b) => new Date(a.session_date) - new Date(b.session_date));

  const sendReminder = async (booking, message) => {
    const sessionDate = format(new Date(booking.session_date), "EEEE, MMMM d, yyyy 'at' h:mm a");
    const defaultBody = `Hello ${booking.client_name},\n\nThis is a friendly reminder about your upcoming photo session.\n\nDate: ${sessionDate}\nSession Type: ${booking.session_type}${booking.location ? `\nLocation: ${booking.location}` : ""}\n\nTips to prepare:\n- Get a good night's rest before the session\n- Wear comfortable, coordinated outfits\n- Arrive 10 minutes early to settle in\n- Bring any props or accessories you'd like to include\n\nLooking forward to creating beautiful images with you!\n\nLensFlow`;

    // Send to yourself (photographer) since the platform only supports emails to app users.
    // The email contains the full reminder text so you can forward it to the client.
    if (currentUserEmail) {
      await base44.integrations.Core.SendEmail({
        to: currentUserEmail,
        subject: `[Forward to client] Reminder for ${booking.client_name} — ${format(new Date(booking.session_date), "MMMM d")}`,
        body: `Please forward this reminder to your client at ${booking.client_email}:\n\n---\n\n${message || defaultBody}`,
      });
    }

    await updateMutation.mutateAsync({ id: booking.id, data: { reminder_sent: true } });
    toast({ title: `Reminder queued for ${booking.client_name}`, description: currentUserEmail ? "Check your inbox to forward it to the client." : "Status updated." });
    setCustomMessage(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Pre-Shoot Reminders</h1>
          <p className="text-muted-foreground mt-1">Send email reminders to upcoming clients</p>
        </div>
      </div>

      {/* Quick Send All */}
      {upcoming.filter(b => !b.reminder_sent).length > 0 && (
        <div className="p-4 bg-accent/5 border border-accent/20 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-accent" />
            <p className="text-sm font-medium">
              {upcoming.filter(b => !b.reminder_sent).length} upcoming sessions without reminders
            </p>
          </div>
          <Button
            size="sm"
            className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2"
            onClick={async () => {
              const unsent = upcoming.filter(b => !b.reminder_sent);
              for (const b of unsent) {
                await sendReminder(b);
              }
              toast({ title: `Sent ${unsent.length} reminders` });
            }}
          >
            <Send className="w-4 h-4" /> Send All Reminders
          </Button>
        </div>
      )}

      {error && (
        <ErrorState title="Couldn't load bookings" error={error} onRetry={() => refetch()} />
      )}

      {/* Bookings List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : upcoming.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-xl text-muted-foreground">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No upcoming sessions to remind</p>
        </div>
      ) : (
        <div className="space-y-3">
          {upcoming.map(booking => {
            const daysUntil = differenceInDays(new Date(booking.session_date), today);
            const urgencyColor = daysUntil <= 1 ? "text-destructive" : daysUntil <= 3 ? "text-yellow-600" : "text-muted-foreground";
            return (
              <div key={booking.id} className="flex items-center gap-4 p-5 bg-card border border-border rounded-xl">
                <div className="w-14 h-14 rounded-xl bg-accent/10 flex flex-col items-center justify-center shrink-0">
                  <span className="text-xs font-medium text-accent uppercase">{format(new Date(booking.session_date), "MMM")}</span>
                  <span className="text-lg font-heading font-bold text-foreground leading-none">{format(new Date(booking.session_date), "dd")}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{booking.client_name}</p>
                    {booking.reminder_sent && (
                      <Badge className="bg-green-100 text-green-700 text-[10px] gap-1">
                        <Check className="w-3 h-3" /> Sent
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {booking.client_email}
                    </span>
                    <span className="capitalize">{booking.session_type}</span>
                    {booking.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {booking.location}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-sm font-medium ${urgencyColor}`}>
                    {daysUntil === 0 ? "Today" : daysUntil === 1 ? "Tomorrow" : `${daysUntil} days`}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCustomMessage(booking)}
                      className="gap-1"
                    >
                      <Mail className="w-3 h-3" /> Custom
                    </Button>
                    <Button
                      size="sm"
                      disabled={booking.reminder_sent}
                      onClick={() => sendReminder(booking)}
                      className="bg-accent text-accent-foreground hover:bg-accent/90 gap-1"
                    >
                      <Send className="w-3 h-3" /> {booking.reminder_sent ? "Sent" : "Send"}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Custom Message Dialog */}
      <Dialog open={!!customMessage} onOpenChange={() => setCustomMessage(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sr-only"><DialogTitle>Custom Reminder</DialogTitle></DialogHeader>
          {customMessage && (
            <CustomReminderForm
              booking={customMessage}
              onSend={(msg) => sendReminder(customMessage, msg)}
              onCancel={() => setCustomMessage(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CustomReminderForm({ booking, onSend, onCancel }) {
  const [message, setMessage] = useState(
    `Hello ${booking.client_name},\n\nThis is a friendly reminder about your upcoming photo session on ${format(new Date(booking.session_date), "EEEE, MMMM d")}.\n\nPlease arrive 10 minutes early and wear comfortable, coordinated outfits.\n\nLooking forward to our session!`
  );
  const [sending, setSending] = useState(false);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-heading font-semibold">Custom Reminder</h2>
      <p className="text-sm text-muted-foreground">
        Sending to: <span className="font-medium text-foreground">{booking.client_email}</span>
      </p>
      <div className="space-y-2">
        <Label>Message</Label>
        <Textarea value={message} onChange={e => setMessage(e.target.value)} rows={8} />
      </div>
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button
          disabled={sending}
          onClick={async () => {
            setSending(true);
            await onSend(`<pre style="white-space: pre-wrap; font-family: sans-serif;">${message}</pre>`);
            setSending(false);
          }}
          className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2"
        >
          <Send className="w-4 h-4" /> {sending ? "Sending..." : "Send Reminder"}
        </Button>
      </div>
    </div>
  );
}
