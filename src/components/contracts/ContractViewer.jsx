import React, { useState } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, User, Mail, Calendar, CheckCircle, Copy, Check, ExternalLink } from "lucide-react";

const typeLabels = {
  service_contract: "Service Contract",
  model_release: "Model Release",
  liability_waiver: "Liability Waiver",
  print_release: "Print Release",
};

const statusConfig = {
  draft: { color: "bg-gray-100 text-gray-700", label: "Draft" },
  sent: { color: "bg-blue-100 text-blue-700", label: "Sent" },
  viewed: { color: "bg-yellow-100 text-yellow-700", label: "Viewed" },
  signed: { color: "bg-green-100 text-green-700", label: "Signed" },
};

export default function ContractViewer({ contract, onClose }) {
  const config = statusConfig[contract.status] || statusConfig.draft;
  const [copied, setCopied] = useState(false);
  const signingLink = `${window.location.origin}/sign/${contract.id}`;

  const copyLink = () => {
    navigator.clipboard.writeText(signingLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h2 className="text-xl font-heading font-semibold">{typeLabels[contract.type] || contract.type}</h2>
            <Badge className={`${config.color} mt-1`}>{config.label}</Badge>
          </div>
        </div>
        {contract.status !== "signed" && (
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={copyLink} className="gap-1">
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied" : "Copy Link"}
            </Button>
            <a href={signingLink} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm" className="gap-1">
                <ExternalLink className="w-3 h-3" /> Open
              </Button>
            </a>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2 text-sm">
          <User className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">Client:</span>
          <span className="font-medium">{contract.client_name}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Mail className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">Email:</span>
          <span className="font-medium">{contract.client_email}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">Created:</span>
          <span className="font-medium">{format(new Date(contract.created_date), "MMM d, yyyy")}</span>
        </div>
        {contract.signed_date && (
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-muted-foreground">Signed:</span>
            <span className="font-medium">{format(new Date(contract.signed_date), "MMM d, yyyy")}</span>
          </div>
        )}
      </div>

      <div className="p-5 bg-card border border-border rounded-lg max-h-64 overflow-y-auto">
        <pre className="whitespace-pre-wrap text-sm font-body text-foreground leading-relaxed">
          {contract.content}
        </pre>
      </div>

      {contract.signature && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-xs text-green-700 mb-1">Signed by:</p>
          <p className="text-lg font-heading italic text-green-900">{contract.signature}</p>
        </div>
      )}
    </div>
  );
}
