import React, { useState } from "react";
import { motion } from "framer-motion";
import { Check, Star, Zap, Shield, Crown, Building2, CreditCard } from "lucide-react";
import { Button, Badge } from "../components/ui";
import { useTranslation } from "react-i18next";
import { useSubscriptionStatus, useCheckoutMutation } from "../queries/useSubscriptionQueries";
import { toast } from "sonner";
import { useAuthStore } from "../store/stores";
import { SubscriptionTier } from "../types";

export default function PricingPage() {
  const { t } = useTranslation();
  const [isAnnual, setIsAnnual] = useState(false);
  const { data: statusData, isLoading: loadingStatus } = useSubscriptionStatus();
  const checkoutMutation = useCheckoutMutation();
  const user = useAuthStore((s) => s.user);

  const currentTier = statusData?.data?.tier || user?.subscriptionTier || "Free";

  const handleUpgrade = async (tier: SubscriptionTier) => {
    if (tier === currentTier) return;
    
    // Disable downgrade or same tier logic is handled by backend, but we can prevent it here too
    if (currentTier === "Enterprise" || (currentTier === "Pro" && tier === "Free")) {
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

  const plans = [
    {
      name: "Free",
      tier: "Free" as SubscriptionTier,
      icon: Star,
      description: "Perfect for getting started and exploring SessionFlow.",
      priceMonthly: "EGP 0",
      priceAnnual: "EGP 0",
      features: [
        "Up to 2 Active Groups",
        "Basic Session Scheduling",
        "Standard Chat Access",
        "Community Support",
      ],
      color: "from-slate-400 to-slate-600",
      bgClass: "bg-white/[0.02] hover:bg-white/[0.05]",
      borderClass: "border-white/10",
      buttonText: "Current Plan",
      buttonVariant: "outline" as const,
    },
    {
      name: "Pro",
      tier: "Pro" as SubscriptionTier,
      icon: Zap,
      description: "For professional engineers who need power and scale.",
      priceMonthly: "EGP 299",
      priceAnnual: "EGP 2,990",
      popular: true,
      features: [
        "Unlimited Active Groups",
        "Advanced Analytics & Insights",
        "Premium Badges & Themes",
        "Priority Email Support",
        "Data Export (CSV/PDF)",
      ],
      color: "from-[var(--ui-accent)] to-purple-500",
      bgClass: "bg-[var(--ui-accent)]/5 hover:bg-[var(--ui-accent)]/10",
      borderClass: "border-[var(--ui-accent)]/30",
      buttonText: "Upgrade to Pro",
      buttonVariant: "primary" as const,
    },
    {
      name: "Enterprise",
      tier: "Enterprise" as SubscriptionTier,
      icon: Crown,
      description: "White-glove service for large educational institutions.",
      priceMonthly: "EGP 999",
      priceAnnual: "EGP 9,990",
      features: [
        "Everything in Pro",
        "Admin Portal Access",
        "Custom Feature Development",
        "Dedicated Account Manager",
        "White-labeled Reports",
      ],
      color: "from-amber-400 to-orange-500",
      bgClass: "bg-amber-500/5 hover:bg-amber-500/10",
      borderClass: "border-amber-500/30",
      buttonText: "Contact Sales",
      buttonVariant: "outline" as const,
    }
  ];

  if (loadingStatus) {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--ui-bg)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--ui-accent)]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[var(--ui-bg)] text-white overflow-y-auto custom-scrollbar relative pb-20">
      {/* Background Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[var(--ui-accent)]/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-24">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-in">
          <Badge variant="glow" className="mb-6 mx-auto bg-[var(--ui-accent)]/10 text-[var(--ui-accent)] border-[var(--ui-accent)]/20 px-4 py-1.5 text-xs font-black tracking-widest uppercase">
            Zenith Pricing
          </Badge>
          <h1 className="text-4xl md:text-5xl font-black mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/50">
            Scale Your Teaching Empire
          </h1>
          <p className="text-slate-400 text-sm md:text-base font-medium max-w-2xl mx-auto leading-relaxed">
            Choose the perfect plan to streamline your sessions, engage your students, and unlock advanced analytics. Upgrade anytime.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mt-10">
            <span className={`text-xs font-bold uppercase tracking-wider ${!isAnnual ? "text-white" : "text-slate-500"}`}>Monthly</span>
            <button 
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative w-14 h-7 rounded-full bg-white/10 border border-white/20 p-1 transition-colors hover:bg-white/20"
            >
              <motion.div 
                animate={{ x: isAnnual ? 28 : 0 }}
                className="w-5 h-5 bg-[var(--ui-accent)] rounded-full shadow-glow"
              />
            </button>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase tracking-wider ${isAnnual ? "text-white" : "text-slate-500"}`}>Annually</span>
              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">Save 20%</span>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, i) => {
            const isCurrent = currentTier === plan.tier;
            const Icon = plan.icon;
            
            return (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                key={plan.name}
                className={`relative rounded-3xl border backdrop-blur-xl p-8 flex flex-col transition-all duration-500 group ${plan.bgClass} ${plan.borderClass}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="px-4 py-1 rounded-full bg-gradient-to-r from-[var(--ui-accent)] to-purple-500 text-white text-[10px] font-black uppercase tracking-widest shadow-glow">
                      Most Popular
                    </div>
                  </div>
                )}

                {isCurrent && (
                  <div className="absolute top-4 right-4">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
                  </div>
                )}

                <div className="mb-8">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br ${plan.color} shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white uppercase tracking-wider mb-2">{plan.name}</h3>
                  <p className="text-xs text-slate-400 font-medium h-10">{plan.description}</p>
                </div>

                <div className="mb-8">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-black text-white">{isAnnual ? plan.priceAnnual : plan.priceMonthly}</span>
                    <span className="text-xs font-bold text-slate-500 uppercase">/{isAnnual ? 'yr' : 'mo'}</span>
                  </div>
                </div>

                <div className="flex-1 space-y-4 mb-8">
                  {plan.features.map((feature, j) => (
                    <div key={j} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-[var(--ui-accent)]" />
                      </div>
                      <span className="text-sm font-medium text-slate-300">{feature}</span>
                    </div>
                  ))}
                </div>

                <Button
                  variant={isCurrent ? "outline" : plan.buttonVariant}
                  className={`w-full h-12 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${
                    isCurrent ? "opacity-50 cursor-not-allowed" : "group-hover:shadow-glow"
                  }`}
                  disabled={isCurrent || checkoutMutation.isPending}
                  isLoading={checkoutMutation.isPending && checkoutMutation.variables?.tier === plan.tier}
                  onClick={() => handleUpgrade(plan.tier)}
                >
                  {isCurrent ? "Current Plan" : plan.buttonText}
                </Button>
              </motion.div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
