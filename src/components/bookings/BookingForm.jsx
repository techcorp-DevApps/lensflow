import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { X } from "lucide-react";

const SESSION_TYPES = [
  { value: "portrait", label: "Portrait" },
  { value: "wedding", label: "Wedding" },
  { value: "family", label: "Family" },
  { value: "newborn", label: "Newborn" },
  { value: "maternity", label: "Maternity" },
  { value: "event", label: "Event" },
  { value: "commercial", label: "Commercial" },
  { value: "headshot", label: "Headshot" },
];

export default function BookingForm({ booking = null, onSubmit, onCancel, isSubmitting }) {
  const [form, setForm] = useState({
    client_name: booking?.client_name || "",
    client_email: booking?.client_email || "",
    client_phone: booking?.client_phone || "",
    session_type: booking?.session_type || "portrait",
    session_date: booking?.session_date ? new Date(booking.session_date).toISOString().slice(0, 16) : "",
    location: booking?.location || "",
    notes: booking?.notes || "",
    price: booking?.price || "",
    status: booking?.status || "pending",
    deposit_paid: booking?.deposit_paid ?? false,
    reminder_sent: booking?.reminder_sent ?? false,
    gallery_id: booking?.gallery_id || "",
    access_token: booking?.access_token || "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      price: form.price ? Number(form.price) : undefined,
      client_phone: form.client_phone || undefined,
      location: form.location || undefined,
      notes: form.notes || undefined,
      gallery_id: form.gallery_id || undefined,
      access_token: form.access_token || undefined,
      session_date: new Date(form.session_date).toISOString(),
    });
  };

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-heading font-semibold">{booking ? "Edit Booking" : "New Booking"}</h2>
        <button type="button" onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Client Name *</Label>
          <Input value={form.client_name} onChange={e => update("client_name", e.target.value)} required placeholder="Jane Doe" />
        </div>
        <div className="space-y-2">
          <Label>Client Email *</Label>
          <Input type="email" value={form.client_email} onChange={e => update("client_email", e.target.value)} required placeholder="jane@email.com" />
        </div>
        <div className="space-y-2">
          <Label>Phone Number</Label>
          <Input value={form.client_phone} onChange={e => update("client_phone", e.target.value)} placeholder="+1 (555) 000-0000" />
        </div>
        <div className="space-y-2">
          <Label>Session Type *</Label>
          <Select value={form.session_type} onValueChange={v => update("session_type", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SESSION_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Session Date & Time *</Label>
          <Input type="datetime-local" value={form.session_date} onChange={e => update("session_date", e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Location</Label>
          <Input value={form.location} onChange={e => update("location", e.target.value)} placeholder="Studio or address" />
        </div>
        <div className="space-y-2">
          <Label>Price ($)</Label>
          <Input type="number" value={form.price} onChange={e => update("price", e.target.value)} placeholder="500" />
        </div>
        <div className="space-y-2">
          <Label>Gallery ID</Label>
          <Input value={form.gallery_id} onChange={e => update("gallery_id", e.target.value)} placeholder="Optional linked gallery" />
        </div>
        <div className="space-y-2">
          <Label>Access Token</Label>
          <Input value={form.access_token} onChange={e => update("access_token", e.target.value)} placeholder="Optional client portal token" />
        </div>
        {booking && (
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => update("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="contract_sent">Contract Sent</SelectItem>
                <SelectItem value="contract_signed">Contract Signed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center space-x-2">
          <Checkbox id="deposit_paid" checked={form.deposit_paid} onCheckedChange={v => update("deposit_paid", Boolean(v))} />
          <Label htmlFor="deposit_paid">Deposit paid</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="reminder_sent" checked={form.reminder_sent} onCheckedChange={v => update("reminder_sent", Boolean(v))} />
          <Label htmlFor="reminder_sent">Reminder sent</Label>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={e => update("notes", e.target.value)} placeholder="Special requests, outfit changes, etc." rows={3} />
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting} className="bg-accent text-accent-foreground hover:bg-accent/90">
          {isSubmitting ? "Saving..." : booking ? "Update Booking" : "Create Booking"}
        </Button>
      </div>
    </form>
  );
}
