import React, { useState } from "react";
import { motion } from "framer-motion";
import { Check, Star, Zap, Shield, Crown, Building2, CreditCard, Sparkles } from "lucide-react";
import { Button, Badge, Skeleton } from "../components/ui";
import { useTranslation } from "react-i18next";
import { useSubscriptionStatus, useCheckoutMutation, useSubscriptionPlans } from "../queries/useSubscriptionQueries";
import { toast } from "sonner";
import { useAuthStore } from "../store/stores";
import { SubscriptionTier } from "../types";
import { cn } from "../lib/utils";

export default function PricingPage() {
  const { t } = useTranslation();
  const [isAnnual, setIsAnnual] = useState(false);
  const { data: statusData, isLoading: loadingStatus } = useSubscriptionStatus();
  const { data: plansData, isLoading: loadingPlans } = useSubscriptionPlans();
  const checkoutMutation = useCheckoutMutation();
  const user = useAuthStore((s) => s.user);

  const currentTier = statusData?.data?.tier || user?.subscriptionTier || "Free";

  const handleUpgrade = async (tier: SubscriptionTier) => {
    if (tier === currentTier) return;
    
    // Hierarchy: Free < Pro < Ultra < Enterprise
    const tierOrder: Record<string, number> = { Free: 0, Pro: 1, Ultra: 2, Enterprise: 3 };
    if ((tierOrder[currentTier] ?? 0) >= (tierOrder[tier] ?? 0)) {
        toast.error("You cannot downgrade from this screen.");
        return;
    }

    try {
      const res = await checkoutMutation.mutateAsync({
        tier,
        isAnnual,
        paymentMethod: "Card"
      });
      
      if (res?.data?.iframeUrl) {
        window.location.href = res.data.iframeUrl;
      } else {
        toast.error("Could not initiate checkout. Please try again.");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Payment initiation failed.");
    }
  };

  // Fallback static plans if backend doesn't provide them yet (backward compatibility)
  const staticPlans = [
    {
      name: "Free",
      tier: "Free" as SubscriptionTier,
      icon: Star,
      description: "Perfect for getting started and exploring SessionFlow.",
      priceMonthly: "EGP 0",
      priceAnnual: "EGP 0",
      features: ["Up to 10 Groups", "15 Daily Messages", "1 Daily Image", "Basic Attendance", "Community Support"],
      color: "from-slate-400 to-slate-600",
      bgClass: "bg-white/[0.02] hover:bg-white/[0.05]",
      borderClass: "border-white/10",
      buttonText: "Current Plan",
    },
    {
      name: "Pro",
      tier: "Pro" as SubscriptionTier,
      icon: Zap,
      description: "For professional engineers who need power and scale.",
      priceMonthly: "EGP 50",
      priceAnnual: "EGP 528",
      popular: true,
      features: ["15 Groups", "Unlimited Messages", "4 Daily Images", "Voice Calls", "Priority Support", "Data Export"],
      color: "from-[var(--ui-accent)] to-purple-500",
      bgClass: "bg-[var(--ui-accent)]/5 hover:bg-[var(--ui-accent)]/10",
      borderClass: "border-[var(--ui-accent)]/30",
      buttonText: "Upgrade to Pro",
    },
    {
      name: "Ultra",
      tier: "Ultra" as SubscriptionTier,
      icon: Sparkles,
      description: "Maximum power for high-volume educators.",
      priceMonthly: "EGP 100",
      priceAnnual: "EGP 1,056",
      features: ["30 Groups", "12 Daily Images", "5 Daily Videos", "10 Daily Files", "AI Summaries", "Advanced Analytics"],
      color: "from-purple-500 to-pink-500",
      bgClass: "bg-purple-500/5 hover:bg-purple-500/10",
      borderClass: "border-purple-500/30",
      buttonText: "Upgrade to Ultra",
    },
    {
      name: "Enterprise",
      tier: "Enterprise" as SubscriptionTier,
      icon: Crown,
      description: "White-glove service for large educational institutions.",
      priceMonthly: "EGP 130",
      priceAnnual: "EGP 1,380",
      features: ["Everything in Ultra", "Admin Portal Access", "Custom Features", "Dedicated Account Manager", "White-labeled Reports"],
      color: "from-amber-400 to-orange-500",
      bgClass: "bg-amber-500/5 hover:bg-amber-500/10",
      borderClass: "border-amber-500/30",
      buttonText: "Contact Sales",
    }
  ];

  const plans = plansData?.data || staticPlans;

  if (loadingStatus || loadingPlans) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[var(--ui-bg)] p-8">
        <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-[500px] rounded-3xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-[var(--ui-bg)] text-white overflow-y-auto custom-scrollbar relative pb-10 md:pb-20 selection:bg-[var(--ui-accent)]/30">
      {/* Background Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[var(--ui-accent)]/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 md:pt-12 pb-10 md:pb-24 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-8 md:mb-20 animate-fade-in">
          <Badge variant="glow" className="mb-4 md:mb-6 mx-auto bg-[var(--ui-accent)]/10 text-[var(--ui-accent)] border-[var(--ui-accent)]/20 px-4 md:px-5 py-1.5 md:py-2 text-[8px] md:text-[10px] font-black tracking-[0.2em] uppercase">
            SessionFlow Pricing Architecture
          </Badge>
          <h1 className="text-[clamp(2rem,7vw,4.5rem)] font-black mb-6 md:mb-8 tracking-tighter leading-[0.95] md:leading-[0.9] bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/20">
            Scale Your Teaching Empire
          </h1>
          <p className="text-slate-400 text-xs md:text-lg font-medium max-w-2xl mx-auto leading-relaxed px-4 md:px-0">
            Choose the perfect plan to streamline your sessions, engage your students, and unlock advanced analytics. Upgrade anytime.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 md:gap-6 mt-6 md:mt-12 bg-white/[0.02] border border-white/5 w-fit mx-auto px-5 md:px-6 py-2.5 md:py-3 rounded-2xl backdrop-blur-md">
            <span className={cn("text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-colors", !isAnnual ? "text-[var(--ui-accent)]" : "text-slate-500")}>Monthly</span>
            <button 
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative w-12 h-6 md:w-14 md:h-7 rounded-full bg-white/5 border border-white/10 p-1 transition-all hover:border-white/20"
            >
              <motion.div 
                animate={{ x: isAnnual ? 24 : 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="w-4 h-4 md:w-5 md:h-5 bg-[var(--ui-accent)] rounded-full shadow-[0_0_15px_rgba(var(--ui-accent-rgb),0.5)]"
              />
            </button>
            <div className="flex items-center gap-2 md:gap-3">
              <span className={cn("text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-colors", isAnnual ? "text-[var(--ui-accent)]" : "text-slate-500")}>Annually</span>
              <span className="px-1.5 md:px-2 py-0.5 rounded-md text-[7px] md:text-[8px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-glow shadow-emerald-500/5">Save 12%</span>
            </div>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
          {plans.map((plan: any, i: number) => {
            const isCurrent = currentTier === plan.tier;
            const tierIcons = [Star, Zap, Sparkles, Crown];
            const Icon = plan.icon || tierIcons[i] || Star;
            
            return (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                key={plan.name}
                className={cn(
                  "relative rounded-3xl sm:rounded-[2.5rem] border backdrop-blur-2xl p-5 sm:p-8 lg:p-10 flex flex-col transition-all duration-500 group",
                  plan.bgClass || (i === 1 ? "bg-[var(--ui-accent)]/[0.03]" : "bg-white/[0.01]"),
                  plan.borderClass || (i === 1 ? "border-[var(--ui-accent)]/20" : "border-white/5"),
                  "hover:translate-y-[-8px] hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)]"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                    <div className="px-5 py-1.5 rounded-full bg-gradient-to-r from-[var(--ui-accent)] to-purple-500 text-white text-[9px] font-black uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(var(--ui-accent-rgb),0.4)] flex items-center gap-2">
                      <Sparkles className="w-3 h-3" /> Most Popular
                    </div>
                  </div>
                )}

                {isCurrent && (
                  <div className="absolute top-8 end-8">
                    <Badge variant="success" className="bg-emerald-500/10 text-emerald-400 border-none text-[9px] font-black tracking-widest uppercase py-1">Active</Badge>
                  </div>
                )}

                <div className="mb-6 md:mb-10">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center mb-8 bg-gradient-to-br shadow-2xl transition-transform duration-500 group-hover:scale-110",
                    plan.color || (i === 0 ? "from-slate-500 to-slate-700" : i === 1 ? "from-[var(--ui-accent)] to-purple-600" : "from-amber-400 to-orange-500")
                  )}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-3 group-hover:text-[var(--ui-accent)] transition-colors">{plan.name}</h3>
                  <p className="text-xs text-slate-500 font-bold leading-relaxed line-clamp-2 uppercase tracking-wide">{plan.description}</p>
                </div>

                <div className="mb-6 md:mb-10">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[clamp(1.8rem,4vw,3.5rem)] font-black text-white tracking-tighter">
                        {isAnnual ? plan.priceAnnual : plan.priceMonthly}
                    </span>
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">/{isAnnual ? 'yr' : 'mo'}</span>
                  </div>
                </div>

                <div className="flex-1 space-y-3 md:space-y-5 mb-6 md:mb-12">
                  {plan.features.map((feature: string, j: number) => (
                    <div key={j} className="flex items-center gap-4 group/item">
                      <div className="w-6 h-6 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-center shrink-0 transition-colors group-hover/item:border-[var(--ui-accent)]/30 group-hover/item:bg-[var(--ui-accent)]/5">
                        <Check className="w-3.5 h-3.5 text-[var(--ui-accent)] transition-transform group-hover/item:scale-125" />
                      </div>
                      <span className="text-[13px] font-semibold text-slate-400 group-hover/item:text-white transition-colors">{feature}</span>
                    </div>
                  ))}
                </div>

                <Button
                  variant={isCurrent ? "outline" : (plan.buttonVariant || (i === 1 ? "primary" : "outline"))}
                  className={cn(
                    "w-full h-14 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all relative overflow-hidden",
                    isCurrent ? "opacity-50 cursor-not-allowed border-white/10" : "hover:shadow-[0_0_30px_rgba(var(--ui-accent-rgb),0.3)]"
                  )}
                  disabled={isCurrent || checkoutMutation.isPending}
                  isLoading={checkoutMutation.isPending && checkoutMutation.variables?.tier === plan.tier}
                  onClick={() => handleUpgrade(plan.tier)}
                >
                  <span className="relative z-10">{isCurrent ? "Current Plan" : plan.buttonText}</span>
                  {i === 1 && !isCurrent && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />}
                </Button>
              </motion.div>
            );
          })}
        </div>

        {/* Dynamic Footer Info */}
        <div className="mt-12 md:mt-24 text-center">
            <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-4">
                <Building2 className="w-4 h-4 opacity-30" /> Secure Enterprise Protocol Active <CreditCard className="w-4 h-4 opacity-30" />
            </p>
        </div>

      </div>
    </div>
  );
}
