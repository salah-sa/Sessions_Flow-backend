import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWithAuth } from "../../api/client";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { Loader2, Headset, RefreshCw, Send, Radio } from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../lib/utils";
import { format } from "date-fns";

export default function SupportAdminPanel() {
  const queryClient = useQueryClient();
  const [updateVersion, setUpdateVersion] = useState("1.1.0");
  const [updateNotes, setUpdateNotes] = useState("Bug fixes and performance improvements.\\nNew features added.");

  const { data: ticketsData, isLoading } = useQuery({
    queryKey: ["supportTickets"],
    queryFn: () => fetchWithAuth("/api/support/tickets?pageSize=50").then(res => res.data)
  });

  const updateTicketStatus = useMutation({
    mutationFn: (args: { id: string, status: string }) => 
      fetchWithAuth(`/api/support/tickets/${args.id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: args.status })
      }),
    onSuccess: () => {
      toast.success("Ticket status updated");
      queryClient.invalidateQueries({ queryKey: ["supportTickets"] });
    },
    onError: () => toast.error("Failed to update status")
  });

  const broadcastUpdate = useMutation({
    mutationFn: () => {
      const notesArray = updateNotes.split("\\n").filter(n => n.trim().length > 0);
      return fetchWithAuth("/api/system/broadcast-update", {
        method: "POST",
        body: JSON.stringify({ version: updateVersion, notes: notesArray })
      });
    },
    onSuccess: () => {
      toast.success("System update broadcasted to all connected users!");
      setUpdateNotes("");
    },
    onError: () => toast.error("Failed to broadcast update")
  });

  return (
    <div className="space-y-12">
      {/* Broadcast Section */}
      <section>
        <div className="mb-6">
          <h2 className="text-xl font-bold font-sora text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-ui-accent" />
            System Update Broadcast
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Force all connected users to refresh their applications with a mandatory system update popup.
          </p>
        </div>

        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Version Number</Label>
              <Input 
                value={updateVersion} 
                onChange={e => setUpdateVersion(e.target.value)} 
                className="bg-black/20"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Release Notes (One per line)</Label>
            <Textarea 
              value={updateNotes} 
              onChange={e => setUpdateNotes(e.target.value)} 
              className="min-h-[100px] bg-black/20"
              placeholder="Added new chat ordering...\nFixed group visibility bug..."
            />
          </div>
          <Button 
            onClick={() => broadcastUpdate.mutate()}
            disabled={broadcastUpdate.isPending || !updateNotes.trim()}
            className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
          >
            {broadcastUpdate.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Broadcast Mandatory Update
          </Button>
        </div>
      </section>

      {/* Tickets Section */}
      <section>
        <div className="mb-6">
          <h2 className="text-xl font-bold font-sora text-white flex items-center gap-2">
            <Headset className="w-5 h-5 text-ui-accent" />
            Support Tickets
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Manage incoming support requests from users.
          </p>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-ui-accent" /></div>
          ) : ticketsData?.items?.length === 0 ? (
            <div className="text-center p-12 border border-white/5 rounded-2xl bg-white/[0.02]">
              <p className="text-slate-400">No support tickets found.</p>
            </div>
          ) : (
            ticketsData?.items?.map((ticket: any) => (
              <div key={ticket.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row gap-6">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold px-2 py-1 rounded bg-white/10 text-white uppercase tracking-widest">{ticket.department}</span>
                    <span className={cn("text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest", 
                      ticket.status === "Open" ? "bg-amber-500/20 text-amber-400" :
                      ticket.status === "InProgress" ? "bg-blue-500/20 text-blue-400" :
                      ticket.status === "Resolved" ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-500/20 text-slate-400"
                    )}>
                      {ticket.status}
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-lg">{ticket.title}</h3>
                  <p className="text-sm text-slate-300">{ticket.description}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest pt-2">
                    By {ticket.createdByUserName} ({ticket.createdByUserRole}) • {format(new Date(ticket.createdAt), "MMM d, h:mm a")}
                  </p>
                </div>
                
                <div className="flex flex-col gap-2 shrink-0 md:w-48">
                  <Label className="text-xs">Update Status</Label>
                  <select 
                    value={ticket.status}
                    onChange={(e) => updateTicketStatus.mutate({ id: ticket.id, status: e.target.value })}
                    className="flex h-10 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-ui-accent"
                  >
                    <option value="Open">Open</option>
                    <option value="InProgress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
