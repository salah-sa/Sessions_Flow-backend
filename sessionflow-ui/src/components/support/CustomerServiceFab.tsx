import { useState } from "react";
import { Headset } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TicketFormModal } from "./TicketFormModal";

export function CustomerServiceFab() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <AnimatePresence>
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full bg-ui-accent text-white flex items-center justify-center shadow-[0_0_20px_rgba(var(--ui-accent-rgb),0.5)] border border-white/20 hover:shadow-[0_0_30px_rgba(var(--ui-accent-rgb),0.8)] transition-all"
        >
          <Headset className="w-6 h-6" />
        </motion.button>
      </AnimatePresence>

      <TicketFormModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
