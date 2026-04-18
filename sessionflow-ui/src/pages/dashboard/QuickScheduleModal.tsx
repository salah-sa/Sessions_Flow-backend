import React from "react";
import { Modal, Button, Input } from "../../components/ui";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface QuickScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  newSession: { name: string; time: string };
  onSessionChange: (session: { name: string; time: string }) => void;
  onSchedule: () => Promise<void>;
  submitting: boolean;
}

export const QuickScheduleModal: React.FC<QuickScheduleModalProps> = ({
  isOpen,
  onClose,
  newSession,
  onSessionChange,
  onSchedule,
  submitting
}) => {
  const { t } = useTranslation();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("dashboard.schedule.quick_title")}>
      <div className="space-y-6">
        <div className="space-y-4">
          <Input 
            placeholder={t("dashboard.schedule.session_name")} 
            value={newSession.name} 
            onChange={(e) => onSessionChange({ ...newSession, name: e.target.value })}
            className="h-12 bg-black/20 border-white/5 active:scale-[1.01] transition-transform"
          />
          <Input 
            type="datetime-local" 
            value={newSession.time} 
            onChange={(e) => onSessionChange({ ...newSession, time: e.target.value })}
            className="h-12 bg-black/20 border-white/5"
          />
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1 h-12" onClick={onClose}>{t("common.cancel")}</Button>
          <Button disabled={submitting || !newSession.name || !newSession.time} className="flex-1 h-12 shadow-glow shadow-[var(--ui-accent)]/20" onClick={onSchedule}>
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : t("dashboard.schedule.action_confirm")}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
