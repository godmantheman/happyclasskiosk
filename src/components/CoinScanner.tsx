import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Coins, Info, CheckCircle, AlertCircle, Trash2, ArrowLeftRight, RotateCcw, Sparkles } from "lucide-react";
import { DetectedCoin } from "../types";

interface CoinScannerProps {
  totalToPay: number;
  currentPaid: number;
  onCoinsDetected: (amount: number, explanation: string, detectedList: DetectedCoin[]) => void;
  onClose: () => void;
}

interface WalletItem {
  id: string;
  name: string;
  value: number;
  type: "coin" | "bill";
  bgColor: string;
  borderColor: string;
  textColor: string;
  emoji: string;
  glowColor: string;
}

const CASH_ITEMS: WalletItem[] = [
  { id: "b50000", name: "50,000원 지폐", value: 50000, type: "bill", bgColor: "bg-amber-500/10 hover:bg-amber-500/20", borderColor: "border-amber-500/40 hover:border-amber-500", textColor: "text-amber-400", emoji: "💵", glowColor: "shadow-amber-500/20" },
  { id: "b10000", name: "10,000원 지폐", value: 10000, type: "bill", bgColor: "bg-emerald-500/10 hover:bg-emerald-500/20", borderColor: "border-emerald-500/40 hover:border-emerald-500", textColor: "text-emerald-400", emoji: "💵", glowColor: "shadow-emerald-500/20" },
  { id: "b5000", name: "5,000원 지폐", value: 5000, type: "bill", bgColor: "bg-orange-500/10 hover:bg-orange-500/20", borderColor: "border-orange-500/40 hover:border-orange-500", textColor: "text-orange-400", emoji: "💵", glowColor: "shadow-orange-500/20" },
  { id: "b1000", name: "1,000원 지폐", value: 1000, type: "bill", bgColor: "bg-sky-500/10 hover:bg-sky-500/20", borderColor: "border-sky-500/40 hover:border-sky-500", textColor: "text-sky-400", emoji: "💵", glowColor: "shadow-sky-500/20" },
  { id: "c500", name: "500원 동전", value: 500, type: "coin", bgColor: "bg-zinc-300/10 hover:bg-zinc-300/20", borderColor: "border-zinc-300/40 hover:border-zinc-300", textColor: "text-zinc-200", emoji: "🪙", glowColor: "shadow-zinc-300/20" },
  { id: "c100", name: "100원 동전", value: 100, type: "coin", bgColor: "bg-slate-400/10 hover:bg-slate-400/20", borderColor: "border-slate-400/40 hover:border-slate-400", textColor: "text-slate-300", emoji: "🪙", glowColor: "shadow-slate-400/20" },
];

export default function CoinScanner({ totalToPay, currentPaid, onCoinsDetected, onClose }: CoinScannerProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastInserted, setLastInserted] = useState<string | null>(null);

  // Simple physical beep synthesizer sound effect when money is inserted
  const playClinkSound = (type: "coin" | "bill" | "refund") => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === "coin") {
        // High pitched metallic coin sound
        osc.frequency.setValueAtTime(987.77, audioCtx.currentTime); // B5
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        osc.start();
        osc.frequency.exponentialRampToValueAtTime(1318.51, audioCtx.currentTime + 0.1); // E6
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.stop(audioCtx.currentTime + 0.15);
      } else if (type === "bill") {
        // Soft paper swoosh / mechanical slot sound
        osc.frequency.setValueAtTime(220, audioCtx.currentTime); // A3
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        osc.start();
        osc.frequency.linearRampToValueAtTime(110, audioCtx.currentTime + 0.25);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.stop(audioCtx.currentTime + 0.3);
      } else if (type === "refund") {
        // Multiple drop down tones
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
        osc.start();
        osc.frequency.setValueAtTime(440, audioCtx.currentTime + 0.1); // A4
        osc.frequency.setValueAtTime(349.23, audioCtx.currentTime + 0.2); // F4
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
        osc.stop(audioCtx.currentTime + 0.35);
      }
    } catch (e) {
      console.warn("Audio system not interactive yet:", e);
    }
  };

  // Direct manual insertion handler
  const handleInsertMoney = (item: WalletItem) => {
    setErrorMessage(null);
    playClinkSound(item.type);

    // Call callback to add current value in parent
    const detected: DetectedCoin = {
      type: item.type,
      value: item.value,
      orientation: "정방향 (Normal)"
    };

    const explanation = `[수동 투입] ${item.name} ${item.value.toLocaleString()}원이 결제 단말기에 직접 투입되었습니다.`;
    onCoinsDetected(item.value, explanation, [detected]);
    setLastInserted(`${item.name} (${item.value.toLocaleString()}원)`);

    // Self clear insertion animation banner
    setTimeout(() => {
      setLastInserted(null);
    }, 2500);
  };

  // Direct manual refund handler
  const handleRefund = () => {
    if (currentPaid === 0) return;
    playClinkSound("refund");
    
    // Pass negative currentPaid value to offset it to 0
    onCoinsDetected(-currentPaid, "투입되었던 현금이 모두 반환되었습니다.", []);
    setErrorMessage("투입 금액이 반환되었습니다.");
    setTimeout(() => setErrorMessage(null), 3000);
  };

  const remainingToPay = Math.max(0, totalToPay - currentPaid);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative bg-zinc-900 border border-zinc-700 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        id="manual-cash-payment-modal"
      >
        {/* Header Block */}
        <div className="p-6 border-b border-zinc-800 bg-zinc-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Coins className="text-amber-500" size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-white">현금/동전 수동 투입구</h3>
              <p className="text-[11px] text-zinc-500 font-sans">버튼을 클릭하여 키오스크에 돈을 직접 투입해 주세요.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-2xl font-black font-mono px-2 transition-colors"
            id="btn-close-cash-modal"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Amount Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-950/80 p-4 rounded-2xl border border-zinc-800 font-sans">
              <span className="text-[10px] text-zinc-500 font-bold block mb-1">결제해야 할 총 금액</span>
              <span className="text-lg font-extrabold text-amber-500">{totalToPay.toLocaleString()}원</span>
            </div>
            <div className="bg-zinc-950/80 p-4 rounded-2xl border border-zinc-800 font-sans relative overflow-hidden">
              <span className="text-[10px] text-zinc-500 font-bold block mb-1">투입 완료 금액</span>
              <span className="text-lg font-extrabold text-emerald-400">{currentPaid.toLocaleString()}원</span>
              {currentPaid >= totalToPay && (
                <div className="absolute top-1 right-1 bg-emerald-500/20 text-emerald-400 text-[8px] font-black px-1.5 py-0.5 rounded border border-emerald-500/30 uppercase tracking-widest animate-pulse">
                  OK
                </div>
              )}
            </div>
          </div>

          {/* Remaining banner */}
          <div className={`p-3.5 rounded-xl border flex justify-between items-center text-xs font-sans transition ${
            remainingToPay > 0
              ? "bg-amber-500/5 border-amber-500/20 text-amber-200"
              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
          }`}>
            <span className="font-semibold">{remainingToPay > 0 ? "결제 완료까지 남은 금액" : "투입 완료!"}</span>
            <span className="font-mono font-black text-sm">
              {remainingToPay > 0 ? `${remainingToPay.toLocaleString()}원` : "거스름돈을 반환합니다."}
            </span>
          </div>

          {/* Money Buttons Tray */}
          <div className="space-y-4">
            {/* Bill Section */}
            <div>
              <h4 className="text-xs font-bold text-zinc-400 mb-2.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                지폐 투입 (Bills)
              </h4>
              <div className="grid grid-cols-2 gap-2.5">
                {CASH_ITEMS.filter(item => item.type === "bill").map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleInsertMoney(item)}
                    className={`p-3 bg-zinc-950/60 border ${item.borderColor} ${item.bgColor} rounded-xl flex items-center justify-between text-left transition shadow-md ${item.glowColor} active:scale-95`}
                    id={`btn-insert-${item.id}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{item.emoji}</span>
                      <span className="text-xs font-bold text-zinc-300">{item.name}</span>
                    </div>
                    <span className={`text-xs font-black ${item.textColor}`}>+{item.value.toLocaleString()}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Coin Section */}
            <div>
              <h4 className="text-xs font-bold text-zinc-400 mb-2.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                동전 투입 (Coins)
              </h4>
              <div className="grid grid-cols-2 gap-2.5">
                {CASH_ITEMS.filter(item => item.type === "coin").map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleInsertMoney(item)}
                    className={`p-3 bg-zinc-950/60 border ${item.borderColor} ${item.bgColor} rounded-xl flex items-center justify-between text-left transition shadow-md ${item.glowColor} active:scale-95`}
                    id={`btn-insert-${item.id}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{item.emoji}</span>
                      <span className="text-xs font-bold text-zinc-300">{item.name}</span>
                    </div>
                    <span className={`text-xs font-black ${item.textColor}`}>+{item.value.toLocaleString()}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Event Feedback messages */}
          <AnimatePresence mode="popLayout">
            {lastInserted && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="p-3 bg-emerald-950/30 border border-emerald-800/80 rounded-xl text-emerald-300 text-xs flex items-center gap-2"
                id="last-inserted-message"
              >
                <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                <p className="font-semibold">✔️ {lastInserted} 투입 장치 인식 성공!</p>
              </motion.div>
            )}

            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-300 text-xs flex items-center gap-2"
                id="cash-status-message"
              >
                <Info size={14} className="text-amber-500 shrink-0" />
                <p className="font-semibold">{errorMessage}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer / Controls */}
        <div className="p-6 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-between gap-4">
          <button
            onClick={handleRefund}
            disabled={currentPaid === 0}
            className={`px-4 py-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition ${
              currentPaid === 0
                ? "text-zinc-600 bg-zinc-900 border border-zinc-800 cursor-not-allowed"
                : "text-rose-400 hover:text-rose-300 bg-rose-950/10 hover:bg-rose-950/20 border border-rose-900/40 active:scale-95"
            }`}
            id="btn-refund-all"
          >
            <RotateCcw size={13} />
            투입 금액 전액 반환
          </button>

          <button
            onClick={onClose}
            className="px-6 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl text-xs transition border border-zinc-700 active:scale-95"
            id="btn-close-payment"
          >
            확인 (창 닫기)
          </button>
        </div>
      </motion.div>
    </div>
  );
}
