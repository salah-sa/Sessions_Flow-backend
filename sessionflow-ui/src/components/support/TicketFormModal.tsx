import { useState } from "react";
import { Button, Input, Modal } from "../ui";
import { useCreateTicket } from "../../queries/useSupportQueries";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface TicketFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TicketFormModal({ isOpen, onClose }: TicketFormModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState("General");

  const createTicketMutation = useCreateTicket();

  const handleSubmit = () => {
    createTicketMutation.mutate(
      { title, description, department },
      {
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
      }
    );
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Customer Support"
      subtitle="Submit a request and our team will investigate it."
    >
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <label htmlFor="department" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-300">Department</label>
          <select
            id="department"
            value={department}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDepartment(e.target.value)}
            className="flex h-12 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-ui-accent"
          >
            <option value="General">General Question</option>
            <option value="Technical">Technical Issue</option>
            <option value="Reports">Report User/Bug</option>
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor="title" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-300">Summary</label>
          <Input
            id="title"
            placeholder="Brief summary of your issue..."
            value={title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
            className="bg-black/20 border-white/10 text-white"
          />
        </div>
        <div className="space-y-2 flex flex-col">
          <label htmlFor="description" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-300">Details</label>
          <textarea
            id="description"
            placeholder="Please describe your issue in detail..."
            value={description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
            className="flex min-h-[120px] w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-ui-accent/50 focus:bg-black/60 transition-all"
          />
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6">
        <Button variant="ghost" onClick={onClose} disabled={createTicketMutation.isPending} className="mt-2 sm:mt-0">
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={!title.trim() || !description.trim() || createTicketMutation.isPending}
          variant="primary"
        >
          {createTicketMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Submit Ticket
        </Button>
      </div>
    </Modal>
  );
}
