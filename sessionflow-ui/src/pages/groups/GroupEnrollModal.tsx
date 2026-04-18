import React from "react";
import { Modal, Button, Input } from "../../components/ui";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Group } from "../../types";

interface GroupEnrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedGroup: Group | null;
  newStudentName: string;
  onNameChange: (val: string) => void;
  onEnroll: () => Promise<void>;
  submitting: boolean;
}

export const GroupEnrollModal: React.FC<GroupEnrollModalProps> = ({
  isOpen,
  onClose,
  selectedGroup,
  newStudentName,
  onNameChange,
  onEnroll,
  submitting
}) => {
  const { t } = useTranslation();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("groups.modal.enrollment")}>
      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ms-1">{t("groups.enroll.name")}</label>
          <Input 
            value={newStudentName}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder={t("groups.enroll.placeholder")}
            className="h-11 shadow-inner focus:scale-[1.01] transition-transform"
            autoFocus
          />
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest ms-1">{t("groups.enroll.enrolling_in", { name: selectedGroup?.name })}</p>
        </div>
        <div className="flex gap-3">
           <Button variant="ghost" className="flex-1" onClick={onClose}>{t("groups.enroll.abort")}</Button>
           <Button disabled={submitting || !newStudentName.trim()} className="flex-1 h-12" onClick={onEnroll}>
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : t("groups.enroll.submit")}
           </Button>
        </div>
      </div>
    </Modal>
  );
};
