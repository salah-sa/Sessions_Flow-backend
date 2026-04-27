import React, { useState } from 'react';
import { useTranslation } from "react-i18next";
import { useSubscriptionStatus, useCheckoutMutation } from '../../queries/useSubscriptionQueries';
import { Loader2, Crown, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

const BillingPanel: React.FC = () => {
  const { t } = useTranslation();
  const { data: status, isLoading } = useSubscriptionStatus();
  const checkout = useCheckoutMutation();
  const [loadingIframe, setLoadingIframe] = useState<string | null>(null);

  const handleUpgrade = async (tier: string) => {
    setLoadingIframe(tier);
    try {
      const res = await checkout.mutateAsync({ tier, isAnnual: false, paymentMethod: "Card" });
      if (res.iframeUrl) {
        window.location.href = res.iframeUrl;
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingIframe(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--ui-accent)]" />
      </div>
    );
  }

  const currentTier = status?.tier || 'Free';
  const isActive = status?.status === "Active";

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-[var(--ui-sidebar-bg)] border border-white/5 p-8 rounded-3xl shadow-xl flex items-center justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center shadow-glow shadow-purple-500/20 border border-purple-500/30">
             <Crown className="w-8 h-8 text-purple-400" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Current Subscription</p>
            <h2 className="text-3xl font-sora font-semibold text-white tracking-tighter">
              {currentTier} Plan
            </h2>
            <div className="flex items-center gap-2 mt-2">
               {isActive ? (
                  <div className="flex items-center gap-1 text-emerald-400 text-xs font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                     <CheckCircle2 className="w-3 h-3" /> Active
                  </div>
               ) : (
                  <div className="flex items-center gap-1 text-amber-400 text-xs font-semibold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                     <AlertCircle className="w-3 h-3" /> Basic Access
                  </div>
               )}
            </div>
          </div>
        </div>
      </div>

      {status?.canUpgrade && (
        <div className="grid md:grid-cols-2 gap-6">
           {/* PRO TIER */}
           {currentTier === 'Free' && (
              <motion.div 
                whileHover={{ y: -4 }}
                className="bg-[var(--ui-bg)] border border-white/10 p-8 rounded-3xl shadow-2xl relative overflow-hidden group"
              >
                 <div className="absolute top-0 right-0 p-4">
                    <Crown className="w-12 h-12 text-blue-500/10 group-hover:text-blue-500/20 transition-colors" />
                 </div>
                 <h3 className="text-xl font-sora font-bold text-white mb-2">Pro</h3>
                 <p className="text-3xl font-black text-white tracking-tighter mb-6">
                    149 <span className="text-sm text-slate-500 font-semibold tracking-normal">EGP/mo</span>
                 </p>
                 <ul className="space-y-3 mb-8">
                    <li className="flex items-center gap-3 text-sm text-slate-300 font-medium">
                       <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Up to 15 Groups
                    </li>
                    <li className="flex items-center gap-3 text-sm text-slate-300 font-medium">
                       <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Detailed Attendance
                    </li>
                    <li className="flex items-center gap-3 text-sm text-slate-300 font-medium">
                       <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Student Map View
                    </li>
                 </ul>
                 <Button 
                   onClick={() => handleUpgrade('Pro')} 
                   disabled={loadingIframe !== null}
                   className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-glow shadow-blue-500/20"
                 >
                   {loadingIframe === 'Pro' ? <Loader2 className="w-5 h-5 animate-spin" /> : "Upgrade to Pro"}
                 </Button>
              </motion.div>
           )}

           {/* ENTERPRISE TIER */}
           <motion.div 
             whileHover={{ y: -4 }}
             className={cn(
               "bg-[var(--ui-bg)] border p-8 rounded-3xl shadow-2xl relative overflow-hidden group",
               currentTier === 'Pro' ? "border-purple-500/50 md:col-span-2 max-w-xl mx-auto" : "border-purple-500/30"
             )}
           >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none" />
              <div className="absolute top-0 right-0 p-4">
                 <Crown className="w-12 h-12 text-purple-500/20 group-hover:text-purple-500/40 transition-colors" />
              </div>
              <h3 className="text-xl font-sora font-bold text-white mb-2 flex items-center gap-2">
                 Ultra <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[10px] uppercase tracking-widest border border-purple-500/30">Ultimate</span>
              </h3>
              <p className="text-3xl font-black text-white tracking-tighter mb-6">
                 499 <span className="text-sm text-slate-500 font-semibold tracking-normal">EGP/mo</span>
              </p>
              <ul className="space-y-3 mb-8">
                 <li className="flex items-center gap-3 text-sm text-slate-300 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-purple-400" /> Unlimited Groups & Sessions
                 </li>
                 <li className="flex items-center gap-3 text-sm text-slate-300 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-purple-400" /> AI Meeting Summaries
                 </li>
                 <li className="flex items-center gap-3 text-sm text-slate-300 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-purple-400" /> White Label Portal
                 </li>
              </ul>
              <Button 
                onClick={() => handleUpgrade('Ultra')} 
                disabled={loadingIframe !== null}
                className="w-full h-12 bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-glow shadow-purple-500/30"
              >
                {loadingIframe === 'Ultra' ? <Loader2 className="w-5 h-5 animate-spin" /> : "Upgrade to Ultra"}
              </Button>
           </motion.div>
        </div>
      )}
    </div>
  );
};

export default BillingPanel;
