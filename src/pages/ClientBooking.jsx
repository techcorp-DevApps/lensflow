import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { galleriesApi } from "@/api/galleries";
import { format } from "date-fns";
import { Calendar, MapPin, Camera, Clock, FileText, CheckCircle2, DollarSign, AlertCircle, XCircle, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const statusConfig = {
  pending: { label: "Pending Review", icon: Clock, color: "bg-yellow-100 text-yellow-800", desc: "Your booking request has been received and is awaiting confirmation." },
  confirmed: { label: "Confirmed", icon: CheckCircle2, color: "bg-green-100 text-green-800", desc: "Your session is confirmed! We'll be in touch with next steps." },
  contract_sent: { label: "Contract Sent", icon: FileText, color: "bg-blue-100 text-blue-800", desc: "A contract has been sent to you. Please review and sign it." },
  contract_signed: { label: "Contract Signed", icon: CheckCircle2, color: "bg-emerald-100 text-emerald-800", desc: "Contract signed. You're all set for your session!" },
  completed: { label: "Completed", icon: CheckCircle2, color: "bg-gray-100 text-gray-600", desc: "Your session has been completed. Thank you!" },
  cancelled: { label: "Cancelled", icon: XCircle, color: "bg-red-100 text-red-800", desc: "This booking has been cancelled." },
};

const sessionTypeLabels = {
  portrait: "Portrait", wedding: "Wedding", family: "Family", newborn: "Newborn",
  maternity: "Maternity", event: "Event", commercial: "Commercial", headshot: "Headshot",
};

const steps = ["pending", "confirmed", "contract_sent", "contract_signed", "completed"];

export default function ClientBooking() {
  const [booking, setBooking] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [gallery, setGallery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const params = useParams();
  // Canonical route is /client-booking/:id where :id is the booking access token.
  // Legacy /booking-status?token=... links are still supported.
  const token =
    params.id ||
    new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").get("token");

  useEffect(() => {
    if (!token) { setError("Invalid link. No access token provided."); setLoading(false); return; }
    loadData();
  }, [token]);

  const loadData = async () => {
    try {
      const results = await base44.entities.Booking.filter({ access_token: token });
      if (!results || results.length === 0) {
        setError("Booking not found. Please check your link or contact your photographer.");
        setLoading(false);
        return;
      }
      const b = results[0];
      setBooking(b);

      const [contractResults, galleryResults] = await Promise.all([
        base44.entities.Contract.filter({ booking_id: b.id }).catch(() => []),
        b.gallery_id ? galleriesApi.filter({ id: b.gallery_id }).catch(() => []) : Promise.resolve([]),
      ]);
      setContracts(contractResults || []);
      if (galleryResults?.length > 0) setGallery(galleryResults[0]);
    } catch (err) {
      setError(err?.message || "We couldn't load your booking. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-border border-t-accent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-heading font-semibold mb-2">Link Error</h2>
        <p className="text-muted-foreground">{error}</p>
      </div>
    </div>
  );

  const status = statusConfig[booking.status] || statusConfig.pending;
  const StatusIcon = status.icon;
  const currentStepIdx = steps.indexOf(booking.status);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <p className="text-primary-foreground/60 text-sm font-body uppercase tracking-widest mb-1">LensFlow</p>
          <h1 className="text-3xl font-heading font-bold">Your Booking</h1>
          <p className="text-primary-foreground/70 mt-1">Hello, {booking.client_name}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">

        {/* Status Card */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full ${status.color}`}>
              <StatusIcon className="w-5 h-5" />
            </div>
            <div>
              <Badge className={`${status.color} mb-2`}>{status.label}</Badge>
              <p className="text-muted-foreground text-sm">{status.desc}</p>
            </div>
          </div>

          {/* Progress Steps */}
          {booking.status !== "cancelled" && (
            <div className="mt-6 flex items-center gap-1">
              {steps.map((step, idx) => (
                <React.Fragment key={step}>
                  <div className={`flex-1 h-1.5 rounded-full transition-colors ${idx <= currentStepIdx ? "bg-accent" : "bg-border"}`} />
                  {idx < steps.length - 1 && null}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* Session Details */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-heading font-semibold text-foreground text-lg">Session Details</h2>
          <div className="grid gap-3">
            <DetailRow icon={Camera} label="Session Type" value={sessionTypeLabels[booking.session_type] || booking.session_type} />
            <DetailRow
              icon={Calendar}
              label="Date & Time"
              value={format(new Date(booking.session_date), "EEEE, MMMM d, yyyy 'at' h:mm a")}
            />
            {booking.location && <DetailRow icon={MapPin} label="Location" value={booking.location} />}
            {booking.price && <DetailRow icon={DollarSign} label="Session Price" value={`$${booking.price}`} />}
            {booking.deposit_paid && (
              <DetailRow icon={CheckCircle2} label="Deposit" value="Paid" valueClass="text-green-600 font-medium" />
            )}
          </div>
          {booking.notes && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
              <p className="text-sm text-foreground">{booking.notes}</p>
            </div>
          )}
        </div>

        {/* Contracts */}
        {contracts.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-6 space-y-3">
            <h2 className="font-heading font-semibold text-foreground text-lg">Documents</h2>
            {contracts.map(c => (
              <ContractRow key={c.id} contract={c} />
            ))}
          </div>
        )}

        {/* Gallery */}
        {gallery && gallery.status === "published" && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="font-heading font-semibold text-foreground text-lg mb-3">Your Gallery</h2>
            <p className="text-sm text-muted-foreground mb-4">Your photos are ready to view!</p>
            <a
              href={`/gallery/${gallery.id}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
            >
              <ExternalLink className="w-4 h-4" /> View Gallery
            </a>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground pb-4">
          Questions? Contact your photographer directly.
        </p>
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value, valueClass = "" }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1 flex items-center justify-between gap-4">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={`text-sm font-medium text-foreground text-right ${valueClass}`}>{value}</span>
      </div>
    </div>
  );
}

const contractStatusStyles = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-800",
  viewed: "bg-purple-100 text-purple-800",
  signed: "bg-green-100 text-green-800",
};

const contractTypeLabels = {
  service_contract: "Service Contract",
  model_release: "Model Release",
  liability_waiver: "Liability Waiver",
  print_release: "Print Release",
};

function ContractRow({ contract }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        <FileText className="w-4 h-4 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium text-foreground">{contractTypeLabels[contract.type] || contract.type}</p>
          <Badge className={`${contractStatusStyles[contract.status]} text-[10px] mt-0.5`}>{contract.status}</Badge>
        </div>
      </div>
      {contract.status !== "signed" && (
        <a
          href={`/sign/${contract.id}`}
          className="text-xs text-accent font-medium hover:underline flex items-center gap-1"
        >
          Review & Sign <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}
