import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const OrderPlacedPage = () => {
  const navigate = useNavigate();
  const canvasRef = useRef(null);

  const [order, setOrder] = useState(null);
  const [showNotificationToast, setShowNotificationToast] = useState(true);

  // CELEBRATORY FIREWORKS EFFECT
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const colors = ["#6F4E37", "#E6E0F0", "#E5E4E2", "#D4AF37", "#FFFFFF", "#B8977E"];
    let particles = [];

    const createFirework = (x, y) => {
      const particleCount = 45;
      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 6 + 2;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1,
          decay: Math.random() * 0.016 + 0.012,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: Math.random() * 3 + 2,
        });
      }
    };

    const bursts = [
      { delay: 100, x: width * 0.5, y: height * 0.32 },
      { delay: 400, x: width * 0.3, y: height * 0.25 },
      { delay: 750, x: width * 0.7, y: height * 0.28 },
      { delay: 1100, x: width * 0.45, y: height * 0.4 },
      { delay: 1600, x: width * 0.62, y: height * 0.26 },
      { delay: 2200, x: width * 0.38, y: height * 0.35 },
    ];

    const timeouts = bursts.map((b) =>
      setTimeout(() => createFirework(b.x, b.y), b.delay)
    );

    const startTime = Date.now();
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles = particles.filter((p) => p.alpha > 0);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.07;
        p.vx *= 0.98;
        p.alpha -= p.decay;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      if (particles.length > 0 || Date.now() < startTime + 3800) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", handleResize);
      timeouts.forEach(clearTimeout);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  useEffect(() => {
    try {
      const savedOrder = sessionStorage.getItem("getsukaOrder");
      if (savedOrder) {
        const parsedOrder = JSON.parse(savedOrder);
        setOrder(parsedOrder);
      }
    } catch (error) {
      console.error("Order Data Error:", error);
    }

    const timer = setTimeout(() => {
      setShowNotificationToast(false);
    }, 2800);

    return () => clearTimeout(timer);
  }, []);

  const formatPrice = (value) => {
    return `₹${Number(value || 0).toLocaleString("en-IN")}`;
  };

  const orderNumber =
    order?.orderNumber ||
    order?.order?.orderNumber ||
    order?._id ||
    "GETSUKA-ARCHIVE";

  const totalAmount =
    order?.totalAmount ?? order?.order?.totalAmount ?? 0;

  const paymentMethod =
    order?.paymentMethod || order?.order?.paymentMethod || "COD";

  return (
    <div className="relative min-h-screen bg-[#F6F4F9] text-[#252321] overflow-hidden">
      {/* CELEBRATORY FIREWORKS CANVAS */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-[60]"
      />
      {/* SUCCESS POPUP TOAST */}
      {showNotificationToast && (
        <div className="pointer-events-none fixed top-6 right-6 z-[100] animate-[fadeIn_0.3s_ease-out]">
          <div className="flex items-center gap-3 border border-[#E6E0F0] bg-white px-5 py-4 shadow-lg">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E6E0F0] text-xs font-bold text-[#6F4E37]">
              ✓
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#6F4E37]">
                PAYMENT CONFIRMED
              </p>
              <p className="text-xs text-[#252321]">
                Your invoice has been generated.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CHECKOUT BREADCRUMB */}
      <div className="border-b border-[#E5E4E2] bg-white">
        <div className="max-w-[1440px] mx-auto px-6 py-4">
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em]">
            <span className="text-[#716C67]">01 BAG</span>
            <span className="text-[#D8D3CF]">/</span>
            <span className="text-[#716C67]">02 SHIPPING</span>
            <span className="text-[#D8D3CF]">/</span>
            <span className="text-[#716C67]">03 REVIEW</span>
            <span className="text-[#D8D3CF]">/</span>
            <span className="text-[#716C67]">04 PAYMENT</span>
            <span className="text-[#D8D3CF]">/</span>
            <span className="text-[#6F4E37] bg-[#E6E0F0] px-2.5 py-0.5">
              05 CONFIRMED
            </span>
          </div>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <main className="flex min-h-[calc(100vh-70px)] items-center justify-center px-6 py-12 md:py-16">
        <div className="w-full max-w-[620px] rounded-[22px] border border-[#E5E4E2] bg-white p-8 sm:p-12 shadow-md text-center">
          {/* SUCCESS BADGE */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#E6E0F0]/60 border border-[#E5E4E2] text-2xl text-[#6F4E37] shadow-sm">
            ✓
          </div>

          <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.3em] text-[#6F4E37]">
            ORDER CONFIRMED
          </p>

          <h1 className="mt-2 text-3xl font-serif font-medium text-[#252321] md:text-4xl">
            Thank You For Your Order
          </h1>

          <p className="mx-auto mt-3 max-w-md text-xs leading-relaxed text-[#716C67]">
            Your pieces have been reserved and transferred to fulfillment. A tracking link will be sent to your registered phone and email once dispatched.
          </p>

          {/* ORDER DETAILS BOX */}
          <div className="mt-8 rounded-[14px] border border-[#E5E4E2] bg-[#F6F4F9] text-left overflow-hidden">
            <div className="border-b border-[#E5E4E2] px-6 py-4 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#716C67]">
                  ORDER IDENTIFIER
                </span>
                <p className="font-mono text-xs font-bold text-[#252321] mt-0.5">
                  {orderNumber}
                </p>
              </div>
              <span className="bg-[#E6E0F0] text-[#6F4E37] text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-[#CDC4DF]">
                CONFIRMED
              </span>
            </div>

            <div className="grid grid-cols-2 divide-x divide-[#E5E4E2] px-6 py-4 text-xs">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-[#716C67]">
                  PAYMENT METHOD
                </p>
                <p className="font-semibold text-[#252321] mt-0.5 uppercase">
                  {paymentMethod}
                </p>
              </div>
              <div className="pl-6">
                <p className="text-[9px] font-bold uppercase tracking-wider text-[#716C67]">
                  TOTAL CHARGED
                </p>
                <p className="font-serif font-bold text-base text-[#252321] mt-0.5">
                  {formatPrice(totalAmount)}
                </p>
              </div>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => navigate("/account/orders")}
              className="h-12 rounded-[10px] bg-[#6F4E37] text-white text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-[#211B18] transition flex items-center justify-center shadow-xs"
            >
              VIEW MY ORDERS
            </button>

            <button
              type="button"
              onClick={() => navigate("/shop")}
              className="h-12 rounded-[10px] border border-[#E5E4E2] bg-white text-[10px] font-bold uppercase tracking-[0.2em] text-[#252321] hover:bg-[#F6F4F9] transition flex items-center justify-center"
            >
              CONTINUE BROWSING
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default OrderPlacedPage;