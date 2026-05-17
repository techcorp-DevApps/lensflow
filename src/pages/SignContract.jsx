import React, { useState } from "react";
import { contractsApi } from "@/api/contracts";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CheckCircle, Camera, FileText, User, Mail, Calendar, Pen, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { motion } from "framer-motion";

const typeLabels = {
  service_contract: "Service Contract",
  model_release: "Model Release",
  liability_waiver: "Liability Waiver",
  print_release: "Print Release",
};

export default function SignContract() {
  const contractId = window.location.pathname.split("/sign/")[1];
  const [signature, setSignature] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [signed, setSigned] = useState(false);

  const { data: contract, isLoading } = useQuery({
    queryKey: ["public-contract", contractId],
    queryFn: () => contractsApi.get(contractId),
    enabled: !!contractId,
  });

  const signMutation = useMutation({
    mutationFn: () =>
      contractsApi.update(contractId, {
        signature,
        signed_date: new Date().toISOString(),
        status: "signed",
      }),
    onSuccess: () => setSigned(true),
  });

  // Mark as viewed when first loaded
  useQuery({
    queryKey: ["mark-viewed", contractId],
    queryFn: async () => {
      if (contract && contract.status === "sent") {
        await contractsApi.update(contractId, { status: "viewed" });
      }
      return null;
    },
    enabled: !!contract && contract.status === "sent",
  });

  if (!contractId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background font-body">
        <p className="text-muted-foreground">Contract not found.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background font-body p-4">
        <div className="text-center">
          <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
          <h2 className="text-xl font-heading font-semibold text-foreground">Contract Not Found</h2>
          <p className="text-muted-foreground mt-2">This link may be invalid or expired.</p>
        </div>
      </div>
    );
  }

  if (signed || contract.status === "signed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background font-body p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm"
        >
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Document Signed!</h1>
          <p className="text-muted-foreground mt-2">
            Thank you, <strong>{contract.client_name}</strong>. Your signature has been recorded.
          </p>
          {contract.signed_date && (
            <p className="text-xs text-muted-foreground mt-4">
              Signed on {format(new Date(contract.signed_date), "MMMM d, yyyy 'at' h:mm a")}
            </p>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-body">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
            <Camera className="w-4 h-4 text-accent" />
          </div>
          <span className="font-heading font-semibold text-foreground">LensFlow</span>
          <span className="text-muted-foreground text-sm ml-auto">Secure Document Signing</span>
          <Lock className="w-4 h-4 text-muted-foreground" />
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Title */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-heading font-bold text-foreground">
                {typeLabels[contract.type] || contract.type}
              </h1>
              <p className="text-sm text-muted-foreground">Please read carefully and sign below</p>
            </div>
          </div>
        </motion.div>

        {/* Client Info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-muted/30 rounded-xl text-sm">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Client:</span>
            <span className="font-medium truncate">{contract.client_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Email:</span>
            <span className="font-medium truncate">{contract.client_email}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Date:</span>
            <span className="font-medium">{format(new Date(contract.created_date), "MMM d, yyyy")}</span>
          </div>
        </div>

        {/* Contract Content */}
        <div className="p-6 bg-card border border-border rounded-xl max-h-[50vh] overflow-y-auto">
          <pre className="whitespace-pre-wrap text-sm font-body text-foreground leading-relaxed">
            {contract.content || "No content available."}
          </pre>
        </div>

        {/* Signature Section */}
        <div className="p-6 bg-card border border-border rounded-xl space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Pen className="w-5 h-5 text-accent" />
            <h2 className="font-heading font-semibold text-foreground">Sign This Document</h2>
          </div>

          <div className="space-y-2">
            <Label htmlFor="signature">Type your full legal name to sign</Label>
            <Input
              id="signature"
              value={signature}
              onChange={e => setSignature(e.target.value)}
              placeholder={contract.client_name}
              className="text-lg font-heading italic"
            />
            <p className="text-xs text-muted-foreground">
              By typing your name above, you agree this constitutes your legal electronic signature.
            </p>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[hsl(var(--accent))]"
            />
            <span className="text-sm text-muted-foreground leading-relaxed">
              I have read and understand this document, and I agree to be bound by its terms and conditions.
            </span>
          </label>

          <Button
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90 gap-2 h-11"
            disabled={!signature.trim() || !agreed || signMutation.isPending}
            onClick={() => signMutation.mutate()}
          >
            <CheckCircle className="w-4 h-4" />
            {signMutation.isPending ? "Signing..." : "Sign Document"}
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground pb-8">
          This is a legally binding electronic signature. Powered by LensFlow.
        </p>
      </div>
    </div>
  );
}
