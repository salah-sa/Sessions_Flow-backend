import { useState } from "react";
import { useWallet, useWalletTransactions } from "../hooks/useWallet";
import { useAuthStore } from "../store/stores";
import { 
  Button, 
  Input, 
  Card,
  Badge,
  Modal
} from "../components/ui";
import { toast } from "sonner";
import { Wallet, ArrowRight, ArrowDownLeft, ArrowUpRight, ShieldCheck, Activity } from "lucide-react";

export function WalletPage() {
  const user = useAuthStore(s => s.user);
  const { walletQuery, createWalletMutation, transferMutation, adminTopUpMutation } = useWallet();
  const { data: txData, isLoading: isLoadingTx } = useWalletTransactions(1, 50);

  const [createPhone, setCreatePhone] = useState("");
  const [createPin, setCreatePin] = useState("");

  const [transferPhone, setTransferPhone] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferPin, setTransferPin] = useState("");
  const [transferNote, setTransferNote] = useState("");
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  const [topUpPhone, setTopUpPhone] = useState("");
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpNote, setTopUpNote] = useState("");
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);

  if (walletQuery.isLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading secure wallet...</div>;
  }

  const handleCreateWallet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createPhone || !createPin) return toast.error("Phone and PIN required.");
    createWalletMutation.mutate({ phoneNumber: createPhone, pin: createPin }, {
      onSuccess: () => {
        toast.success("Wallet activated successfully.");
      },
      onError: (err: any) => {
        toast.error(err.message || "Failed to create wallet");
      }
    });
  };

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferPhone || !transferAmount || !transferPin) return toast.error("Missing fields.");
    
    transferMutation.mutate({
      toPhone: transferPhone,
      amountEgp: parseFloat(transferAmount),
      pin: transferPin,
      note: transferNote,
      idempotencyKey: crypto.randomUUID()
    }, {
      onSuccess: () => {
        toast.success("Transfer completed.");
        setIsTransferOpen(false);
        setTransferPhone("");
        setTransferAmount("");
        setTransferPin("");
        setTransferNote("");
      },
      onError: (err: any) => {
        toast.error(err.message || "Transfer failed.");
      }
    });
  };

  const handleTopUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topUpPhone || !topUpAmount) return toast.error("Missing fields.");
    
    adminTopUpMutation.mutate({
      targetPhone: topUpPhone,
      amountEgp: parseFloat(topUpAmount),
      note: topUpNote,
    }, {
      onSuccess: () => {
        toast.success("Top-up completed.");
        setIsTopUpOpen(false);
        setTopUpPhone("");
        setTopUpAmount("");
        setTopUpNote("");
      },
      onError: (err: any) => {
        toast.error(err.message || "Top-up failed.");
      }
    });
  };

  // 1. Not Created State
  if (walletQuery.isError || !walletQuery.data) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <Card className="border-primary/20 shadow-lg p-6">
          <div className="flex flex-col items-center">
            <div className="mx-auto bg-ui-accent/10 p-3 rounded-full mb-4">
              <Wallet className="w-8 h-8 text-ui-accent" />
            </div>
            <h2 className="text-center text-2xl font-bold text-white mb-2">Activate Your Wallet</h2>
            <p className="text-center text-slate-400 mb-6">Secure, zero-fee transfers.</p>
            
            <form onSubmit={handleCreateWallet} className="space-y-4 w-full">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Phone Number</label>
                <Input placeholder="01X XXXX XXXX" value={createPhone} onChange={(e: any) => setCreatePhone(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Secure PIN (6 digits)</label>
                <Input type="password" placeholder="******" maxLength={6} value={createPin} onChange={(e: any) => setCreatePin(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full mt-4" disabled={createWalletMutation.isPending}>
                {createWalletMutation.isPending ? "Activating..." : "Activate Now"}
              </Button>
            </form>
          </div>
        </Card>
      </div>
    );
  }

  const wallet = walletQuery.data;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Wallet</h1>
          <p className="text-slate-400 flex items-center gap-2 mt-1 text-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Protected by SessionFlow Security
          </p>
        </div>
        
        {user?.role === "Admin" && (
          <Button variant="outline" className="border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10" onClick={() => setIsTopUpOpen(true)}>
            Admin Top-Up
          </Button>
        )}
      </div>

      <Modal isOpen={isTopUpOpen} onClose={() => setIsTopUpOpen(false)} title="Admin Top-Up" subtitle="Mint new funds directly into a user's wallet.">
        <form onSubmit={handleTopUp} className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Target Phone</label>
            <Input value={topUpPhone} onChange={(e: any) => setTopUpPhone(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Amount (EGP)</label>
            <Input type="number" min="1" value={topUpAmount} onChange={(e: any) => setTopUpAmount(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Note (Optional)</label>
            <Input value={topUpNote} onChange={(e: any) => setTopUpNote(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="ghost" onClick={() => setIsTopUpOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={adminTopUpMutation.isPending}>
              {adminTopUpMutation.isPending ? "Processing..." : "Top Up"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isTransferOpen} onClose={() => setIsTransferOpen(false)} title="Send Money" subtitle="Instant, zero-fee transfer to any SessionFlow wallet.">
        <form onSubmit={handleTransfer} className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Recipient Phone</label>
            <Input placeholder="01X XXXX XXXX" value={transferPhone} onChange={(e: any) => setTransferPhone(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Amount (EGP)</label>
            <Input type="number" min="1" max={wallet.balanceEGP} placeholder="0.00" value={transferAmount} onChange={(e: any) => setTransferAmount(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Confirm PIN</label>
            <Input type="password" maxLength={6} placeholder="******" value={transferPin} onChange={(e: any) => setTransferPin(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Note (Optional)</label>
            <Input placeholder="e.g., Session payment" value={transferNote} onChange={(e: any) => setTransferNote(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="ghost" onClick={() => setIsTransferOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={transferMutation.isPending || !transferPhone || !transferAmount || !transferPin}>
              {transferMutation.isPending ? "Processing..." : "Send"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Balance Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2 bg-gradient-to-br from-ui-accent/10 to-transparent border-ui-accent/20 p-6">
          <div className="pb-4">
            <p className="font-medium text-ui-accent text-sm mb-2">Available Balance</p>
            <h2 className="text-5xl font-bold flex items-baseline gap-2 text-white">
              <span className="text-2xl font-normal text-slate-400">EGP</span>
              {(wallet.balanceEGP ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h2>
          </div>
          <div className="pt-4 flex flex-wrap gap-4 items-center justify-between border-t border-white/5">
            <div className="text-sm text-slate-400 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Active · {wallet.phoneNumber}
            </div>
            
            <Button className="rounded-full shadow-lg gap-2" onClick={() => setIsTransferOpen(true)}>
              Send Money <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>

        {/* Limit Card */}
        <Card className="p-6 flex flex-col justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm text-slate-400 mb-2">
              <Activity className="w-4 h-4" /> Daily Transfer Limit
            </p>
            <h3 className="text-2xl font-bold text-white">
              EGP {(wallet.dailyUsedEGP ?? 0).toLocaleString()} <span className="text-sm text-slate-500 font-normal">/ {(wallet.dailyLimitEGP ?? 0).toLocaleString()}</span>
            </h3>
          </div>
          <div className="mt-4">
            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-ui-accent h-full transition-all" 
                style={{ width: `${Math.min(100, ((wallet.dailyUsedEGP ?? 0) / (wallet.dailyLimitEGP || 1)) * 100)}%` }} 
              />
            </div>
            <p className="text-xs text-slate-500 mt-2 text-right">
              Resets at midnight.
            </p>
          </div>
        </Card>
      </div>

      {/* Transactions List */}
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">Recent Transactions</h2>
          <p className="text-sm text-slate-400">Your latest wallet activity.</p>
        </div>
        <div>
          {isLoadingTx ? (
            <div className="text-center py-8 text-slate-400">Loading history...</div>
          ) : !txData?.items?.length ? (
            <div className="text-center py-8 text-slate-500 bg-white/[0.02] rounded-xl border border-white/5 border-dashed">
              No transactions yet.
            </div>
          ) : (
            <div className="space-y-3">
              {txData.items.map((tx) => (
                <div key={tx.referenceCode} className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-black/20 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${tx.direction === "Received" ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
                      {tx.direction === "Received" ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-medium text-white">{tx.direction === "Received" ? "Received from" : "Sent to"} {tx.counterpartyPhone}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
                        <span>{new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString()}</span>
                        {tx.note && (
                          <>
                            <span>·</span>
                            <span className="italic text-slate-300">"{tx.note}"</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-lg ${tx.direction === "Received" ? "text-emerald-500" : "text-white"}`}>
                      {tx.direction === "Received" ? "+" : "-"} EGP {(tx.amountEGP ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                    <Badge variant={tx.status === "Completed" ? "success" : "outline"} className="mt-1">
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
