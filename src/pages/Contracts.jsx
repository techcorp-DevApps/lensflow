import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, FileText, Send, Eye, CheckCircle, Clock, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import ContractForm from "@/components/contracts/ContractForm";
import ContractViewer from "@/components/contracts/ContractViewer";

const statusConfig = {
  draft: { icon: Clock, color: "bg-gray-100 text-gray-700", label: "Draft" },
  sent: { icon: Send, color: "bg-blue-100 text-blue-700", label: "Sent" },
  viewed: { icon: Eye, color: "bg-yellow-100 text-yellow-700", label: "Viewed" },
  signed: { icon: CheckCircle, color: "bg-green-100 text-green-700", label: "Signed" },
};

const typeLabels = {
  service_contract: "Service Contract",
  model_release: "Model Release",
  liability_waiver: "Liability Waiver",
  print_release: "Print Release",
};

export default function Contracts() {
  const [showForm, setShowForm] = useState(false);
  const [viewContract, setViewContract] = useState(null);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["contracts"],
    queryFn: () => base44.entities.Contract.list("-created_date"),
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ["bookings"],
    queryFn: () => base44.entities.Booking.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Contract.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      setShowForm(false);
      toast({ title: "Contract created" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Contract.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast({ title: "Contract updated" });
    },
  });

  const sendContract = async (contract) => {
    const signingLink = `${window.location.origin}/sign/${contract.id}`;
    await base44.integrations.Core.SendEmail({
      to: contract.client_email,
      subject: `${typeLabels[contract.type] || "Contract"} - Please Review & Sign`,
      body: `
        <h2>Hello ${contract.client_name},</h2>
        <p>Please review and sign the following ${typeLabels[contract.type]?.toLowerCase() || "document"}.</p>
        <p><a href="${signingLink}" style="background:#c8882a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;margin:12px 0;">Review &amp; Sign Document</a></p>
        <p>Or copy this link: <a href="${signingLink}">${signingLink}</a></p>
        <br/>
        <p>Thank you!</p>
      `,
    });
    await updateMutation.mutateAsync({ id: contract.id, data: { status: "sent" } });
    toast({ title: "Contract sent to client" });
  };

  const filtered = contracts.filter(c =>
    c.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.type?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Contracts & Waivers</h1>
          <p className="text-muted-foreground mt-1">Create, send, and track documents</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
          <Plus className="w-4 h-4" /> New Document
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search contracts..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Contract Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground bg-card border border-border rounded-xl">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No contracts found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(contract => {
            const config = statusConfig[contract.status] || statusConfig.draft;
            const StatusIcon = config.icon;
            return (
              <div
                key={contract.id}
                onClick={() => setViewContract(contract)}
                className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-accent" />
                  </div>
                  <Badge className={`${config.color} text-[10px]`}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {config.label}
                  </Badge>
                </div>
                <h3 className="font-medium text-foreground group-hover:text-accent transition-colors">
                  {typeLabels[contract.type] || contract.type}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">{contract.client_name}</p>
                <p className="text-xs text-muted-foreground mt-3">
                  {format(new Date(contract.created_date), "MMM d, yyyy")}
                </p>
                {contract.status === "draft" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 w-full gap-2"
                    onClick={(e) => { e.stopPropagation(); sendContract(contract); }}
                  >
                    <Send className="w-3 h-3" /> Send to Client
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sr-only"><DialogTitle>New Contract</DialogTitle></DialogHeader>
          <ContractForm
            bookings={bookings}
            onSubmit={(data) => createMutation.mutate(data)}
            onCancel={() => setShowForm(false)}
            isSubmitting={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewContract} onOpenChange={() => setViewContract(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="sr-only"><DialogTitle>Contract Details</DialogTitle></DialogHeader>
          {viewContract && <ContractViewer contract={viewContract} onClose={() => setViewContract(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
