import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { X, Eye, EyeOff } from "lucide-react";

export default function GalleryForm({ bookings = [], onSubmit, onCancel, isSubmitting }) {
  const [form, setForm] = useState({
    title: "",
    booking_id: "",
    client_name: "",
    client_email: "",
    password: "",
    status: "preparing",
    selections_enabled: true,
    download_enabled: false,
    expiry_date: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleBookingSelect = (bookingId) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (booking) {
      setForm(prev => ({
        ...prev,
        booking_id: bookingId,
        client_name: booking.client_name,
        client_email: booking.client_email,
        title: `${booking.client_name} — ${booking.session_type} session`,
      }));
    }
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let pw = "";
    for (let i = 0; i < 8; i++) pw += chars.charAt(Math.floor(Math.random() * chars.length));
    setForm(prev => ({ ...prev, password: pw }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-heading font-semibold">Create Gallery</h2>
        <button type="button" onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2 md:col-span-2">
          <Label>Link to Booking</Label>
          <Select value={form.booking_id} onValueChange={handleBookingSelect}>
            <SelectTrigger><SelectValue placeholder="Select booking (optional)" /></SelectTrigger>
            <SelectContent>
              {bookings.map(b => (
                <SelectItem key={b.id} value={b.id}>{b.client_name} — {b.session_type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Gallery Title *</Label>
          <Input value={form.title} onChange={e => update("title", e.target.value)} required placeholder="Session title" />
        </div>
        <div className="space-y-2">
          <Label>Client Name</Label>
          <Input value={form.client_name} onChange={e => update("client_name", e.target.value)} placeholder="Client name" />
        </div>
        <div className="space-y-2">
          <Label>Client Email</Label>
          <Input type="email" value={form.client_email} onChange={e => update("client_email", e.target.value)} placeholder="client@email.com" />
        </div>
        <div className="space-y-2">
          <Label>Gallery Password *</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={e => update("password", e.target.value)}
                required
                placeholder="Enter password"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button type="button" variant="outline" onClick={generatePassword} className="shrink-0">
              Generate
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Expiry Date</Label>
          <Input type="date" value={form.expiry_date} onChange={e => update("expiry_date", e.target.value)} />
        </div>
      </div>

      <div className="flex items-center gap-6 p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2">
          <Switch checked={form.selections_enabled} onCheckedChange={v => update("selections_enabled", v)} />
          <Label className="text-sm">Allow selections</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={form.download_enabled} onCheckedChange={v => update("download_enabled", v)} />
          <Label className="text-sm">Allow downloads</Label>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting} className="bg-accent text-accent-foreground hover:bg-accent/90">
          {isSubmitting ? "Creating..." : "Create Gallery"}
        </Button>
      </div>
    </form>
  );
}
