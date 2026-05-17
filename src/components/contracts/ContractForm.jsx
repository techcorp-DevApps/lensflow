import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

const CONTRACT_TEMPLATES = {
  service_contract: `PHOTOGRAPHY SERVICE AGREEMENT

This Photography Service Agreement ("Agreement") is entered into between the Photographer and the Client identified below.

1. SERVICES: The Photographer agrees to provide photography services as described in the booking details.

2. PAYMENT: The Client agrees to pay the agreed-upon fee. A non-refundable deposit of 50% is due upon signing.

3. CANCELLATION: Cancellations made less than 48 hours before the session will forfeit the deposit.

4. COPYRIGHT: All images are copyrighted by the Photographer. The Client receives a personal use license.

5. MODEL RELEASE: The Client grants the Photographer permission to use images for portfolio and marketing purposes.

6. LIABILITY: The Photographer's liability is limited to the total amount paid for services.

By signing below, both parties agree to the terms outlined in this Agreement.`,

  model_release: `MODEL RELEASE FORM

I hereby grant the Photographer the irrevocable right to use my likeness in photographs taken during our session for any lawful purpose including, but not limited to, advertising, portfolio display, and editorial use.

I understand that my image may be altered or modified. I waive any right to inspect or approve the finished images.

I release the Photographer from any claims arising from the use of my likeness.`,

  liability_waiver: `LIABILITY WAIVER AND RELEASE

I acknowledge that participation in this photography session may involve physical activity and/or visiting locations that may present certain risks.

I voluntarily assume all risks associated with the session and release the Photographer from any liability for injuries, damages, or losses.

I confirm that I am in good health and capable of participating in the session activities.`,

  print_release: `PRINT RELEASE AUTHORIZATION

This Print Release grants the Client permission to reproduce and print the delivered digital images for personal use only.

The images may be printed at any lab or printing service of the Client's choosing.

Commercial use, stock photography submission, or resale of images is strictly prohibited without written consent from the Photographer.`,
};

export default function ContractForm({ bookings = [], onSubmit, onCancel, isSubmitting }) {
  const [form, setForm] = useState({
    booking_id: "",
    type: "service_contract",
    client_name: "",
    client_email: "",
    content: CONTRACT_TEMPLATES.service_contract,
  });

  const handleBookingSelect = (bookingId) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (booking) {
      setForm(prev => ({
        ...prev,
        booking_id: bookingId,
        client_name: booking.client_name,
        client_email: booking.client_email,
      }));
    }
  };

  const handleTypeChange = (type) => {
    setForm(prev => ({
      ...prev,
      type,
      content: CONTRACT_TEMPLATES[type] || "",
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-heading font-semibold">New Contract / Waiver</h2>
        <button type="button" onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Document Type</Label>
          <Select value={form.type} onValueChange={handleTypeChange}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="service_contract">Service Contract</SelectItem>
              <SelectItem value="model_release">Model Release</SelectItem>
              <SelectItem value="liability_waiver">Liability Waiver</SelectItem>
              <SelectItem value="print_release">Print Release</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
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
        <div className="space-y-2">
          <Label>Client Name *</Label>
          <Input value={form.client_name} onChange={e => update("client_name", e.target.value)} required placeholder="Client name" />
        </div>
        <div className="space-y-2">
          <Label>Client Email *</Label>
          <Input type="email" value={form.client_email} onChange={e => update("client_email", e.target.value)} required placeholder="client@email.com" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Contract Content</Label>
        <Textarea value={form.content} onChange={e => update("content", e.target.value)} rows={12} className="font-mono text-sm" />
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting} className="bg-accent text-accent-foreground hover:bg-accent/90">
          {isSubmitting ? "Creating..." : "Create Document"}
        </Button>
      </div>
    </form>
  );
}
