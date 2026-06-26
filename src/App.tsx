import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShoppingBag, 
  Trash2, 
  CreditCard, 
  Receipt, 
  Clock, 
  Calendar, 
  Coins, 
  TrendingUp, 
  HelpCircle, 
  Sparkles, 
  Plus, 
  Minus,
  CheckCircle2,
  XCircle,
  Volume2,
  VolumeX,
  Smartphone,
  Info
} from "lucide-react";
import { PRODUCTS } from "./data";
import { Product, CartItem, PaymentHistory, DetectedCoin } from "./types";
import CoinScanner from "./components/CoinScanner";

export default function App() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<"all" | "food" | "drink" | "dessert">("all");
  const [history, setHistory] = useState<PaymentHistory[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [customerName, setCustomerName] = useState("");
  
  // Payment progress states
  const [currentPaidAmount, setCurrentPaidAmount] = useState(0);
  const [scanningExplanation, setScanningExplanation] = useState<string | null>(null);
  const [detectedHistoryLog, setDetectedHistoryLog] = useState<{ value: number; type: string }[]>([]);

  // Receipt popup state
  const [showReceipt, setShowReceipt] = useState<PaymentHistory | null>(null);

  // Stats / Kiosk simulation clock
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Keyboard support: Add some quick sound feedback or log events
  const playSound = (type: "click" | "success" | "coin" | "clear") => {
    if (!isSoundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      if (type === "click") {
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.stop(audioCtx.currentTime + 0.1);
      } else if (type === "coin") {
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        osc.start();
        osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.stop(audioCtx.currentTime + 0.2);
      } else if (type === "success") {
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        osc.start();
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2); // G5
        osc.frequency.setValueAtTime(1046.50, audioCtx.currentTime + 0.3); // C6
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
        osc.stop(audioCtx.currentTime + 0.6);
      } else if (type === "clear") {
        osc.frequency.setValueAtTime(250, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
        osc.start();
        osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.stop(audioCtx.currentTime + 0.2);
      }
    } catch (e) {
      console.warn("Audio system not interactive yet:", e);
    }
  };

  // Cart operations
  const addToCart = (product: Product) => {
    playSound("click");
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    playSound("click");
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const clearCart = () => {
    playSound("clear");
    setCart([]);
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  };

  const getCartItemCount = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  };

  // Open scanning tray
  const handleOpenScanner = () => {
    if (getCartTotal() === 0) return;
    playSound("click");
    setCurrentPaidAmount(0);
    setScanningExplanation(null);
    setDetectedHistoryLog([]);
    setIsScannerOpen(true);
  };

  // Webhook for coin detection
  const handleCoinsDetected = (amount: number, explanation: string, detectedList: DetectedCoin[]) => {
    playSound("coin");
    setCurrentPaidAmount((prev) => prev + amount);
    setScanningExplanation(explanation);
    
    const newItems = detectedList.map((d) => ({ value: d.value, type: d.type }));
    setDetectedHistoryLog((prev) => [...prev, ...newItems]);
  };

  // Complete Payment Action
  const completePayment = (method: "cash" | "card") => {
    const total = getCartTotal();
    const paid = method === "card" ? total : currentPaidAmount;

    if (method === "cash" && paid < total) {
      // Not enough cash
      return;
    }

    const change = paid - total;

    const receipt: PaymentHistory = {
      id: `ORDER-${Math.floor(100000 + Math.random() * 900000)}`,
      customerName: customerName.trim() || "익명 고객",
      timestamp: new Date().toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      items: cart.map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
      })),
      totalPrice: total,
      paidAmount: paid,
      method,
      change,
    };

    playSound("success");
    setHistory((prev) => [receipt, ...prev]);
    setShowReceipt(receipt);
    
    // Reset scanner and cart and customer name
    setIsScannerOpen(false);
    setCart([]);
    setCustomerName("");
    setCurrentPaidAmount(0);
    setScanningExplanation(null);
    setDetectedHistoryLog([]);
  };

  const filteredProducts = PRODUCTS.filter((p) => {
    if (activeCategory === "all") return true;
    return p.category === activeCategory;
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between select-none p-3 sm:p-6 md:p-10 font-sans antialiased">
      {/* Absolute background layout */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.03)_0%,transparent_100%)] pointer-events-none" />

      {/* Outermost Physical Kiosk Container Mockup Frame */}
      <div className="max-w-6xl mx-auto w-full bg-zinc-900 border-[12px] border-zinc-800 rounded-[40px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col min-h-[85vh] relative" id="physical-kiosk-chassis">
        
        {/* Physical Top Notch / Camera Mockup */}
        <div className="bg-zinc-800 h-8 flex items-center justify-between px-6 border-b border-zinc-700/50">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-600 border border-zinc-500" />
            <span className="text-[10px] text-zinc-500 font-mono tracking-wider">HAPPY CLASS CASH TERMINAL</span>
          </div>
          <div className="w-16 h-3 bg-zinc-950 rounded-full border border-zinc-700 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsSoundEnabled(!isSoundEnabled)} 
              className="text-zinc-500 hover:text-zinc-300 transition"
              title={isSoundEnabled ? "음소거" : "음성 켜기"}
              id="btn-toggle-sound"
            >
              {isSoundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </button>
            <span className="text-[10px] text-zinc-500 font-mono">STATION-78</span>
          </div>
        </div>

        {/* Kiosk Screen Area */}
        <div className="flex-1 flex flex-col md:flex-row bg-zinc-950 relative overflow-hidden">
          
          {/* Main Content Area (Catalog, Headers, Filters) */}
          <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto max-h-[85vh] md:max-h-none">
            
            {/* Header Block */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-zinc-900 pb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-amber-500 text-zinc-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                    행복반
                  </span>
                  <span className="text-zinc-500 text-xs font-mono font-bold">직접 동전/지폐 투입 결제기</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white font-sans tracking-tight flex items-center gap-1.5">
                  <span className="text-amber-500">행복반</span> 키오스크
                </h1>
              </div>

              {/* Real-time details */}
              <div className="flex items-center gap-4 bg-zinc-900/60 border border-zinc-800/80 px-4 py-2.5 rounded-2xl text-xs font-mono">
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <Calendar size={13} className="text-amber-500" />
                  <span>{currentTime.toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}</span>
                </div>
                <div className="w-px h-3 bg-zinc-800" />
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <Clock size={13} className="text-amber-500" />
                  <span className="font-bold">{currentTime.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>
            </div>

            {/* Category Navigation Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none" id="kiosk-categories">
              {[
                { id: "all", name: "전체 메뉴", emoji: "🎒" },
                { id: "food", name: "맛있는 간식", emoji: "🍫" },
                { id: "drink", name: "재미있는 장난감", emoji: "🦭" },
                { id: "dessert", name: "공부와 문구", emoji: "✏️" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    playSound("click");
                    setActiveCategory(cat.id as any);
                  }}
                  className={`px-4 py-3 rounded-2xl flex items-center gap-2 text-sm font-extrabold whitespace-nowrap transition border ${
                    activeCategory === cat.id
                      ? "bg-amber-500 text-zinc-950 border-amber-400 shadow-[0_4px_20px_rgba(245,158,11,0.25)]"
                      : "bg-zinc-900/80 hover:bg-zinc-850 text-zinc-400 hover:text-white border-zinc-800/80"
                  }`}
                  id={`cat-tab-${cat.id}`}
                >
                  <span className="text-base">{cat.emoji}</span>
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>

            {/* Catalog Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" id="kiosk-product-grid">
              <AnimatePresence mode="popLayout">
                {filteredProducts.map((product) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    whileHover={{ y: -4 }}
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="group bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700/80 p-4 rounded-3xl flex flex-col justify-between gap-3 cursor-pointer transition-all shadow-md relative overflow-hidden"
                    id={`product-card-${product.id}`}
                  >
                    {/* Visual Card Accent */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

                    <div className="flex gap-3.5 items-start">
                      {/* Big Emoji Illustration */}
                      <span className="text-4xl sm:text-5xl p-2.5 bg-zinc-950 border border-zinc-800 rounded-2xl group-hover:scale-110 transition-transform select-none">
                        {product.image}
                      </span>

                      <div className="flex-1">
                        <h3 className="text-sm font-black text-white group-hover:text-amber-400 transition-colors">
                          {product.name}
                        </h3>
                        <p className="text-[11px] text-zinc-500 leading-normal line-clamp-2 mt-1 font-normal">
                          {product.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-2 pt-3 border-t border-zinc-800/40">
                      <span className="text-sm font-extrabold text-white">
                        {product.price.toLocaleString()}원
                      </span>
                      <span className="bg-zinc-950 group-hover:bg-amber-500 group-hover:text-zinc-950 text-zinc-400 text-xs px-2.5 py-1 rounded-xl transition-all border border-zinc-800 group-hover:border-amber-400 flex items-center gap-1 font-semibold">
                        담기 <Plus size={11} />
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Right Area: Cart Tray (장바구니) */}
          <div className="w-full md:w-96 bg-zinc-900 border-t md:border-t-0 md:border-l border-zinc-800/80 flex flex-col justify-between" id="kiosk-right-tray">
            
            {/* Basket Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="text-amber-500" size={18} />
                <h2 className="text-base font-black text-white">선택한 장바구니</h2>
              </div>
              <div className="flex items-center gap-2">
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-xs text-zinc-500 hover:text-rose-400 flex items-center gap-1 transition"
                    id="btn-clear-cart"
                  >
                    <Trash2 size={12} />
                    전체삭제
                  </button>
                )}
                <span className="bg-amber-500/10 text-amber-500 text-xs font-mono font-bold px-2 py-0.5 rounded-lg border border-amber-500/20">
                  {getCartItemCount()}개
                </span>
              </div>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-3 max-h-[250px] md:max-h-none">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 py-10">
                  <div className="w-14 h-14 rounded-full bg-zinc-950 flex items-center justify-center border border-zinc-800 mb-3 text-zinc-600">
                    <ShoppingBag size={22} />
                  </div>
                  <p className="text-xs font-bold text-zinc-400">담긴 상품이 없습니다.</p>
                  <p className="text-[10px] text-zinc-500 mt-1">왼쪽의 메뉴 카드를 눌러보세요.</p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {cart.map((item) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      key={item.product.id}
                      className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800/80 flex items-center justify-between gap-2 shadow-sm"
                      id={`cart-item-${item.product.id}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl p-1 bg-zinc-900 border border-zinc-800 rounded-lg select-none">
                          {item.product.image}
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-white line-clamp-1">
                            {item.product.name}
                          </h4>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {(item.product.price * item.quantity).toLocaleString()}원
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 bg-zinc-900 p-1.5 rounded-xl border border-zinc-800">
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition"
                          id={`btn-minus-${item.product.id}`}
                        >
                          <Minus size={11} />
                        </button>
                        <span className="text-xs font-bold text-white px-1.5 min-w-[16px] text-center font-mono">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => addToCart(item.product)}
                          className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition"
                          id={`btn-plus-${item.product.id}`}
                        >
                          <Plus size={11} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Total Block & Checkout Button */}
            <div className="p-4 sm:p-5 border-t border-zinc-800 bg-zinc-950/60 space-y-4">
              <div className="space-y-1.5 font-sans">
                <div className="flex justify-between items-center text-xs text-zinc-500">
                  <span>상품 합계</span>
                  <span className="font-mono text-zinc-300">{(getCartTotal() * 0.9).toLocaleString()}원</span>
                </div>
                <div className="flex justify-between items-center text-xs text-zinc-500">
                  <span>부가가치세 (10%)</span>
                  <span className="font-mono text-zinc-300">{(getCartTotal() * 0.1).toLocaleString()}원</span>
                </div>
                <div className="flex justify-between items-baseline pt-1.5 border-t border-zinc-900">
                  <span className="text-sm font-bold text-zinc-400">결제하실 금액</span>
                  <span className="text-2xl font-black text-amber-500 font-sans tracking-tight">
                    {getCartTotal().toLocaleString()}원
                  </span>
                </div>
              </div>

              {/* Customer Name Input (Mandatory for Payment) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 flex items-center gap-1">
                  <span className="text-amber-500">*</span> 주문자 이름 입력 (결제 필수)
                </label>
                <input
                  type="text"
                  placeholder="예: 홍길동 (이름 입력 시 결제 가능)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  disabled={cart.length === 0}
                  className={`w-full px-4 py-3 bg-zinc-950 border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 transition ${
                    cart.length > 0 && !customerName.trim()
                      ? "border-rose-500/60 focus:border-rose-500 text-rose-200 animate-pulse"
                      : "border-zinc-800 text-white"
                  }`}
                  id="input-customer-name"
                />
                {cart.length > 0 && !customerName.trim() && (
                  <p className="text-[10px] text-rose-400 font-semibold flex items-center gap-1 animate-pulse">
                    ⚠️ 결제를 위해 주문자 이름을 먼저 작성해 주세요.
                  </p>
                )}
              </div>

              {/* Pay Button Trigger */}
              <button
                disabled={cart.length === 0 || !customerName.trim()}
                onClick={handleOpenScanner}
                className={`w-full py-4 rounded-2xl font-extrabold text-base flex items-center justify-center gap-2 transition shadow-lg ${
                  cart.length === 0 || !customerName.trim()
                    ? "bg-zinc-800 text-zinc-600 cursor-not-allowed border border-zinc-700/50"
                    : "bg-amber-500 text-zinc-950 hover:bg-amber-400 active:scale-[0.98] shadow-amber-500/10"
                }`}
                id="btn-checkout-trigger"
              >
                <Coins size={18} />
                <span>현금/동전 직접 투입 결제</span>
              </button>
            </div>
          </div>
        </div>

        {/* Physical Kiosk Chassis Base / Bottom Ports Design */}
        <div className="bg-zinc-900 border-t border-zinc-800/80 p-5 flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* Card Reader Graphic / Receipt Output slots */}
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-1">
              <div className="w-24 h-1.5 bg-zinc-950 rounded border-t border-zinc-800 flex items-center px-0.5 justify-center">
                <div className="w-3 h-0.5 bg-blue-500" />
              </div>
              <span className="text-[8px] text-zinc-500 font-mono">IC CARD READER</span>
            </div>
            
            <div className="flex flex-col items-center gap-1">
              <div className="w-24 h-1 bg-zinc-950 rounded border-t border-zinc-800" />
              <span className="text-[8px] text-zinc-500 font-mono">RECEIPT PRINTER</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <div className="w-16 h-3 bg-zinc-950 rounded-lg border border-zinc-800 flex items-center justify-center">
                <div className="w-full h-1 bg-amber-500/20 animate-pulse" />
              </div>
              <span className="text-[8px] text-zinc-500 font-mono">COIN / BILL SLOT</span>
            </div>
          </div>

          <div className="text-zinc-500 text-[10px] font-mono tracking-widest text-center md:text-right">
            <span>행복반 직접 투입 전용 무인 키오스크</span>
          </div>
        </div>
      </div>

      {/* Payment History Tray (결제 기록 칸) */}
      <div className="max-w-6xl mx-auto w-full mt-6" id="history-container">
        <div className="bg-zinc-900 border border-zinc-800/80 rounded-3xl p-5 sm:p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4 border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Receipt className="text-amber-500" size={18} />
              <h2 className="text-base font-black text-white">최근 결제 기록 칸 (Payment History)</h2>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">LOCAL RECENTS</span>
          </div>

          {history.length === 0 ? (
            <div className="py-8 text-center text-zinc-600 text-xs">
              <p>완료된 결제 기록이 없습니다.</p>
              <p className="mt-1">상품 주문 후 이름을 입력하고 직접 투입 결제를 완료해 보세요!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 max-h-56 overflow-y-auto pr-1">
              {history.map((receipt) => (
                <div
                  key={receipt.id}
                  onClick={() => setShowReceipt(receipt)}
                  className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 hover:border-zinc-700/60 transition cursor-pointer flex flex-col justify-between gap-3 text-xs"
                  id={`history-receipt-${receipt.id}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-amber-500 font-bold">{receipt.id}</span>
                      <p className="text-xs font-bold text-zinc-300 mt-1">주문자: {receipt.customerName}</p>
                      <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{receipt.timestamp}</p>
                    </div>
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-semibold">
                      결제 완료
                    </span>
                  </div>

                  <div className="space-y-1">
                    {receipt.items.slice(0, 2).map((item, index) => (
                      <div key={index} className="flex justify-between text-zinc-400">
                        <span className="truncate max-w-[120px]">{item.name}</span>
                        <span className="font-mono text-[11px] text-zinc-500">x{item.quantity}</span>
                      </div>
                    ))}
                    {receipt.items.length > 2 && (
                      <p className="text-[9px] text-zinc-500 italic">외 {receipt.items.length - 2}개 상품</p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-zinc-900 flex justify-between items-baseline">
                    <span className="text-[10px] text-zinc-500">총 결제금액</span>
                    <span className="text-sm font-black text-white">{receipt.totalPrice.toLocaleString()}원</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI Coin scanner modal */}
      <AnimatePresence>
        {isScannerOpen && (
          <CoinScanner
            totalToPay={getCartTotal()}
            currentPaid={currentPaidAmount}
            onCoinsDetected={handleCoinsDetected}
            onClose={() => setIsScannerOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Payment Confirmation Overlay inside scanner view (triggered by '결제' or manual confirmation) */}
      <AnimatePresence>
        {isScannerOpen && currentPaidAmount >= getCartTotal() && (
          <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-700 max-w-md w-full p-6 rounded-3xl text-center shadow-2xl relative"
            >
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <CheckCircle2 size={36} />
              </div>

              <h3 className="text-xl font-black text-white mb-2">금액 투입 완료!</h3>
              <p className="text-zinc-400 text-xs mb-6 leading-relaxed">
                결제에 필요한 금액이 모두 투입되었습니다.<br />
                <strong>[결제 완료하기]</strong> 버튼을 누르시면 주문이 최종 승인됩니다.
              </p>

              <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-2 mb-6 text-sm">
                <div className="flex justify-between text-zinc-400">
                  <span>총 결제금액</span>
                  <span className="font-mono font-bold">{getCartTotal().toLocaleString()}원</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>투입된 금액</span>
                  <span className="font-mono font-bold text-emerald-400">{currentPaidAmount.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-zinc-800 font-bold">
                  <span className="text-zinc-400">반환될 거스름돈</span>
                  <span className="font-mono text-amber-500">
                    {(currentPaidAmount - getCartTotal()).toLocaleString()}원
                  </span>
                </div>
              </div>

              <div className="flex gap-2.5">
                <button
                  onClick={() => setIsScannerOpen(false)}
                  className="flex-1 py-3.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 font-bold rounded-xl text-xs transition border border-zinc-800"
                >
                  취소하고 돌아가기
                </button>
                <button
                  onClick={() => completePayment("cash")}
                  className="flex-1 py-3.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold rounded-xl text-xs transition shadow-lg"
                  id="btn-confirm-payment-complete"
                >
                  결제 완료하기
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Realistic Receipt Pop-up (영수증 출력 팝업) */}
      <AnimatePresence>
        {showReceipt && (
          <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white text-zinc-950 p-6 rounded-3xl max-w-sm w-full font-mono shadow-2xl relative flex flex-col justify-between"
              onClick={(e) => e.stopPropagation()}
              id="receipt-modal-view"
            >
              {/* Receipt teeth cutout border design */}
              <div className="absolute top-0 inset-x-0 h-2 bg-[radial-gradient(ellipse_at_top,transparent_60%,#f4f4f5_40%)] bg-[length:12px_8px] -translate-y-1 rotate-180" />

              <div>
                <div className="text-center space-y-1 mb-5">
                  <span className="text-xs bg-zinc-900 text-white font-sans px-2.5 py-0.5 rounded-full font-bold uppercase tracking-widest">
                    AI SMART KIOSK
                  </span>
                  <h3 className="text-lg font-black tracking-tight mt-1 font-sans">영 수 증 (RECEIPT)</h3>
                  <p className="text-[10px] text-zinc-500">지능형 무인 결제 단말기</p>
                </div>

                <div className="border-y border-dashed border-zinc-300 py-3 space-y-1 text-[11px] text-zinc-600">
                  <div className="flex justify-between">
                    <span>주문 번호:</span>
                    <span className="font-bold text-zinc-900">{showReceipt.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>주문자명:</span>
                    <span className="font-bold text-zinc-900">{showReceipt.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>발행 일시:</span>
                    <span>{currentTime.toLocaleDateString("ko-KR")} {showReceipt.timestamp}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>결제 수단:</span>
                    <span className="font-bold text-zinc-900">{showReceipt.method === "cash" ? "현금 직접 투입" : "신용카드"}</span>
                  </div>
                </div>

                <div className="py-4 space-y-2 border-b border-dashed border-zinc-300">
                  <p className="text-xs font-bold text-zinc-800">구매 품목</p>
                  <div className="space-y-1.5 text-xs text-zinc-700">
                    {showReceipt.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>{item.name} x{item.quantity}</span>
                        <span>{(item.price * item.quantity).toLocaleString()}원</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="py-3 space-y-1.5 text-xs text-zinc-800">
                  <div className="flex justify-between font-bold">
                    <span>합계 금액:</span>
                    <span>{showReceipt.totalPrice.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between text-zinc-600">
                    <span>투입한 현금:</span>
                    <span>{showReceipt.paidAmount.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between font-bold text-amber-600 border-t border-dotted border-zinc-200 pt-1.5">
                    <span>거스름돈 반환:</span>
                    <span>{showReceipt.change.toLocaleString()}원</span>
                  </div>
                </div>

                {/* Bottom Barcode Illustration */}
                <div className="mt-4 pt-4 border-t border-zinc-200 flex flex-col items-center">
                  <div className="w-48 h-10 bg-[repeating-linear-gradient(90deg,black,black_2px,transparent_2px,transparent_6px,black_6px,black_10px)] opacity-85" />
                  <span className="text-[9px] text-zinc-400 mt-1">{showReceipt.id}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  playSound("click");
                  setShowReceipt(null);
                }}
                className="mt-6 w-full py-3 bg-zinc-950 hover:bg-zinc-900 text-white font-bold rounded-2xl text-xs transition"
                id="btn-close-receipt"
              >
                닫 기 (CONFIRM)
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
