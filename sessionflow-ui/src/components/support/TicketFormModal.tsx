import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { useMutation } from "@tanstack/react-query";
import { fetchWithAuth } from "../../api/client";
import { Loader2, Headset } from "lucide-react";
import { toast } from "sonner";

interface TicketFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TicketFormModal({ isOpen, onClose }: TicketFormModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState("General");

  const submitTicket = useMutation({
    mutationFn: async () => {
      return fetchWithAuth("/api/support/tickets", {
        method: "POST",
        body: JSON.stringify({ title, description, department }),
      });
    },
    onSuccess: () => {
      toast.success("Support ticket submitted successfully. We will get back to you soon!");
      setTitle("");
      setDescription("");
      setDepartment("General");
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to submit ticket.");
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-ui-bg border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Headset className="w-5 h-5 text-ui-accent" />
            Customer Support
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Submit a request and our team will investigate it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <select
              id="department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="flex h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-ui-accent"
            >
              <option value="General">General Question</option>
              <option value="Technical">Technical Issue</option>
              <option value="Reports">Report User/Bug</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Summary</Label>
            <Input
              id="title"
              placeholder="Brief summary of your issue..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-black/20 border-white/10 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Details</Label>
            <Textarea
              id="description"
              placeholder="Please describe your issue in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-black/20 border-white/10 text-white min-h-[120px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={submitTicket.isPending}>
            Cancel
          </Button>
          <Button 
            onClick={() => submitTicket.mutate()} 
            disabled={!title.trim() || !description.trim() || submitTicket.isPending}
            className="bg-ui-accent text-white hover:bg-ui-accent/90"
          >
            {submitTicket.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Submit Ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
