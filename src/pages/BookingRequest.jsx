import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { bookingApi } from "@/api/bookingApi";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, CheckCircle2, Sparkles } from "lucide-react";

const SESSION_TYPES = [
  { value: "portrait", label: "Portrait", desc: "Individual or couple portraits" },
  { value: "wedding", label: "Wedding", desc: "Full wedding day coverage" },
  { value: "family", label: "Family", desc: "Family sessions of all sizes" },
  { value: "newborn", label: "Newborn", desc: "Precious first weeks" },
  { value: "maternity", label: "Maternity", desc: "Celebrating new life" },
  { value: "event", label: "Event", desc: "Birthdays, parties & more" },
  { value: "commercial", label: "Commercial", desc: "Business & brand photography" },
  { value: "headshot", label: "Headshot", desc: "Professional headshots" },
];

const EMPTY_FORM = {
  client_name: "",
  client_email: "",
  client_phone: "",
  session_type: "",
  preferred_date: "",
  location: "",
  notes: "",
};

export default function BookingRequest() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const update = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const e = {};
    if (!form.client_name.trim()) e.client_name = "Name is required";
    if (!form.client_email.trim()) e.client_email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.client_email)) e.client_email = "Invalid email";
    if (!form.session_type) e.session_type = "Please select a session type";
    if (!form.preferred_date) e.preferred_date = "Please select a preferred date";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSubmitting(true);
    const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    const booking = await bookingApi.create({
      client_name: form.client_name.trim(),
      client_email: form.client_email.trim(),
      client_phone: form.client_phone.trim() || undefined,
      session_type: form.session_type,
      session_date: new Date(form.preferred_date).toISOString(),
      location: form.location.trim() || undefined,
      notes: form.notes.trim() || undefined,
      status: "pending",
      deposit_paid: false,
      reminder_sent: false,
      access_token: token,
    });

    // Notify photographer
    try {
      const me = await base44.auth.me();
      if (me?.email) {
        await base44.integrations.Core.SendEmail({
          to: me.email,
          subject: `New session request from ${form.client_name}`,
          body: `You have a new booking request!\n\nClient: ${form.client_name}\nEmail: ${form.client_email}${form.client_phone ? `\nPhone: ${form.client_phone}` : ""}\nSession Type: ${form.session_type}\nPreferred Date: ${new Date(form.preferred_date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}${form.location ? `\nLocation: ${form.location}` : ""}${form.notes ? `\nNotes: ${form.notes}` : ""}\n\nClient portal link: ${window.location.origin}/booking-status?token=${token}\n\nLog in to LensFlow to confirm or update this booking.`,
        });
      }
    } catch (_) {}

    setSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) return <SuccessScreen name={form.client_name} />;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-primary text-primary-foreground px-6 py-16 text-center">
        <div className="max-w-xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-primary-foreground/10 rounded-full px-4 py-1.5 text-sm text-primary-foreground/80 mb-6">
            <Sparkles className="w-3.5 h-3.5" /> Now booking new sessions
          </div>
          <h1 className="text-4xl md:text-5xl font-heading font-bold mb-4">Book Your Session</h1>
          <p className="text-primary-foreground/70 text-lg max-w-md mx-auto">
            Fill out the form below and we'll get back to you within 24 hours to confirm your session.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-6 py-12">
        <form onSubmit={handleSubmit} className="space-y-8">

          {/* Contact Info */}
          <Section title="Your Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Full Name" required error={errors.client_name}>
                <Input
                  value={form.client_name}
                  onChange={e => update("client_name", e.target.value)}
                  placeholder="Jane Doe"
                  className={errors.client_name ? "border-destructive" : ""}
                />
              </Field>
              <Field label="Email Address" required error={errors.client_email}>
                <Input
                  type="email"
                  value={form.client_email}
                  onChange={e => update("client_email", e.target.value)}
                  placeholder="jane@email.com"
                  className={errors.client_email ? "border-destructive" : ""}
                />
              </Field>
              <Field label="Phone Number (optional)">
                <Input
                  value={form.client_phone}
                  onChange={e => update("client_phone", e.target.value)}
                  placeholder="+1 (555) 000-0000"
                />
              </Field>
            </div>
          </Section>

          {/* Session Type */}
          <Section title="Session Type" required error={errors.session_type}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {SESSION_TYPES.map(t => (
                <button
                  type="button"
                  key={t.value}
                  onClick={() => update("session_type", t.value)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    form.session_type === t.value
                      ? "border-accent bg-accent/10"
                      : "border-border hover:border-muted-foreground/40"
                  }`}
                >
                  <p className="font-medium text-sm text-foreground">{t.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
            {errors.session_type && <p className="text-xs text-destructive mt-1">{errors.session_type}</p>}
          </Section>

          {/* Date & Location */}
          <Section title="Details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Preferred Date & Time" required error={errors.preferred_date}>
                <Input
                  type="datetime-local"
                  value={form.preferred_date}
                  onChange={e => update("preferred_date", e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className={errors.preferred_date ? "border-destructive" : ""}
                />
              </Field>
              <Field label="Preferred Location (optional)">
                <Input
                  value={form.location}
                  onChange={e => update("location", e.target.value)}
                  placeholder="Studio, park, home address…"
                />
              </Field>
            </div>
            <Field label="Tell us more (optional)">
              <Textarea
                value={form.notes}
                onChange={e => update("notes", e.target.value)}
                placeholder="Special requests, number of people, outfit ideas, anything else we should know…"
                rows={4}
              />
            </Field>
          </Section>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90 h-12 text-base font-medium"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
                Sending Request…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Camera className="w-4 h-4" /> Request Session
              </span>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            We'll review your request and confirm within 24 hours.
          </p>
        </form>
      </div>
    </div>
  );
}

function Section({ title, children, required, error }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="font-heading font-semibold text-foreground text-lg">{title}{required && <span className="text-destructive ml-0.5">*</span>}</h2>
        <div className="flex-1 h-px bg-border" />
      </div>
      {children}
    </div>
  );
}

function Field({ label, required, error, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function SuccessScreen({ name }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-3xl font-heading font-bold text-foreground mb-3">Request Received!</h1>
        <p className="text-muted-foreground text-lg mb-2">Thank you, {name}!</p>
        <p className="text-muted-foreground">
          Your session request has been submitted. We'll review it and get back to you within 24 hours to confirm your booking.
        </p>
      </div>
    </div>
  );
}
