import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const OrderPlacedPage = () => {
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [showFireworks, setShowFireworks] = useState(true);

  useEffect(() => {
    try {
      const savedOrder =
        sessionStorage.getItem("getsukaOrder");

      if (savedOrder) {
        const parsedOrder =
          JSON.parse(savedOrder);

        setOrder(parsedOrder);
      }
    } catch (error) {
      console.error(
        "Order Data Error:",
        error
      );
    }

    // Keep the fireworks short and subtle.
    const timer = setTimeout(() => {
      setShowFireworks(false);
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  // =========================================================
  // HELPERS
  // =========================================================

  const formatPrice = (value) => {
    return `₹${Number(
      value || 0
    ).toLocaleString("en-IN")}`;
  };

  const orderNumber =
    order?.orderNumber ||
    order?.order?.orderNumber ||
    order?._id ||
    order?.order?.orderNumber ||
    "GETSUKA ORDER";

  const totalAmount =
    order?.totalAmount ??
    order?.order?.totalAmount ??
    0;

  const paymentMethod =
    order?.paymentMethod ||
    order?.order?.paymentMethod ||
    "COD";

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <div className="min-h-screen bg-black text-white">

      {/* =====================================================
          SUCCESS FIREWORKS
      ===================================================== */}

      {showFireworks && (
        <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">

          {/* Dark transition layer */}

          <div className="absolute inset-0 bg-black/55 animate-[fadeOut_2.2s_ease-out_forwards]" />

          {/* =================================================
              FIREWORK 1
          ================================================= */}

          <div className="absolute left-[18%] top-[28%] h-[8px] w-[8px] rounded-full bg-red-500 shadow-[0_0_18px_6px_rgba(239,68,68,0.5)] animate-[firework_1.5s_ease-out_forwards]" />

          <div className="absolute left-[18%] top-[28%] h-[90px] w-[90px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-red-500/50 animate-[burst_1.5s_ease-out_forwards]" />

          <div className="absolute left-[18%] top-[28%] h-[120px] w-[120px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 animate-[burst_1.8s_ease-out_forwards]" />

          {/* =================================================
              FIREWORK 2
          ================================================= */}

          <div className="absolute right-[20%] top-[23%] h-[8px] w-[8px] rounded-full bg-white shadow-[0_0_18px_6px_rgba(255,255,255,0.45)] animate-[firework_1.7s_0.25s_ease-out_forwards]" />

          <div className="absolute right-[20%] top-[23%] h-[110px] w-[110px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40 animate-[burst_1.7s_0.25s_ease-out_forwards]" />

          <div className="absolute right-[20%] top-[23%] h-[145px] w-[145px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-red-500/30 animate-[burst_2s_0.25s_ease-out_forwards]" />

          {/* =================================================
              FIREWORK 3
          ================================================= */}

          <div className="absolute left-[50%] top-[18%] h-[8px] w-[8px] -translate-x-1/2 rounded-full bg-red-500 shadow-[0_0_20px_7px_rgba(239,68,68,0.5)] animate-[firework_1.6s_0.45s_ease-out_forwards]" />

          <div className="absolute left-[50%] top-[18%] h-[130px] w-[130px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-red-500/40 animate-[burst_1.8s_0.45s_ease-out_forwards]" />

          {/* =================================================
              SMALL PARTICLES
          ================================================= */}

          <span className="absolute left-[30%] top-[38%] h-[4px] w-[4px] rounded-full bg-white animate-[particle_1.5s_ease-out_forwards]" />

          <span className="absolute left-[38%] top-[24%] h-[3px] w-[3px] rounded-full bg-red-500 animate-[particle_1.7s_0.2s_ease-out_forwards]" />

          <span className="absolute left-[63%] top-[35%] h-[4px] w-[4px] rounded-full bg-white animate-[particle_1.6s_0.3s_ease-out_forwards]" />

          <span className="absolute left-[72%] top-[30%] h-[3px] w-[3px] rounded-full bg-red-500 animate-[particle_1.8s_0.4s_ease-out_forwards]" />

          <span className="absolute left-[25%] top-[48%] h-[3px] w-[3px] rounded-full bg-white animate-[particle_1.5s_0.15s_ease-out_forwards]" />

          <span className="absolute left-[78%] top-[45%] h-[4px] w-[4px] rounded-full bg-white animate-[particle_1.6s_0.25s_ease-out_forwards]" />

          {/* =================================================
              SUCCESS MESSAGE
          ================================================= */}

          <div className="absolute inset-0 flex items-center justify-center">

            <div className="text-center animate-[successMessage_1.8s_ease-out_forwards]">

              <div className="mx-auto flex h-[76px] w-[76px] items-center justify-center rounded-full border border-red-500 bg-black/90 shadow-[0_0_40px_rgba(239,68,68,0.3)]">

                <span className="text-[32px] font-light text-red-500">
                  ✓
                </span>

              </div>

              <p className="mt-[24px] text-[9px] tracking-[0.4em] text-red-500">
                PAYMENT SUCCESSFUL
              </p>

              <h2 className="mt-[10px] text-[28px] font-light tracking-[0.15em]">
                ORDER PLACED
              </h2>

            </div>

          </div>

        </div>
      )}

      {/* =====================================================
          CHECKOUT STEPS
      ===================================================== */}

      <div className="border-b border-white/10">
        <div className="mx-auto max-w-[1500px] px-[32px] py-[24px]">

          <div className="flex items-center gap-4 text-[9px] tracking-[0.22em]">

            <span className="text-white/30">
              CART
            </span>

            <span className="text-white/20">
              /
            </span>

            <span className="text-white/30">
              SHIPPING
            </span>

            <span className="text-white/20">
              /
            </span>

            <span className="text-white/30">
              REVIEW
            </span>

            <span className="text-white/20">
              /
            </span>

            <span className="text-white/30">
              PAYMENT
            </span>

            <span className="text-white/20">
              /
            </span>

            <span className="text-red-500">
              ORDER PLACED
            </span>

          </div>

        </div>
      </div>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="flex min-h-[calc(100vh-75px)] items-center justify-center bg-black px-[32px] py-[70px]">

        <div className="w-full max-w-[700px] text-center">

          {/* CHECK ICON */}

          <div className="mx-auto flex h-[70px] w-[70px] items-center justify-center border border-red-500">

            <span className="text-[28px] text-red-500">
              ✓
            </span>

          </div>

          {/* TITLE */}

          <p className="mt-[35px] text-[9px] tracking-[0.35em] text-white/35">
            GETSUKA CHECKOUT
          </p>

          <h1 className="mt-[14px] text-[32px] font-light tracking-[0.12em]">
            ORDER PLACED
          </h1>

          <p className="mx-auto mt-[16px] max-w-[480px] text-[11px] leading-[1.8] text-white/40">
            Thank you for shopping with GETSUKA.
            Your order has been placed successfully.
          </p>

          {/* =================================================
              ORDER INFORMATION
          ================================================= */}

          <div className="mt-[45px] border border-white/10">

            <div className="border-b border-white/10 px-[28px] py-[22px]">

              <p className="text-[8px] tracking-[0.25em] text-white/30">
                ORDER NUMBER
              </p>

              <p className="mt-[10px] text-[12px] tracking-[0.12em]">
                {orderNumber}
              </p>

            </div>

            <div className="grid grid-cols-2">

              <div className="border-r border-white/10 px-[28px] py-[22px]">

                <p className="text-[8px] tracking-[0.25em] text-white/30">
                  PAYMENT
                </p>

                <p className="mt-[10px] text-[10px] uppercase tracking-[0.1em]">
                  {paymentMethod}
                </p>

              </div>

              <div className="px-[28px] py-[22px]">

                <p className="text-[8px] tracking-[0.25em] text-white/30">
                  TOTAL
                </p>

                <p className="mt-[10px] text-[13px]">
                  {formatPrice(totalAmount)}
                </p>

              </div>

            </div>

          </div>

          {/* =================================================
              BUTTONS
          ================================================= */}

          <div className="mt-[35px] flex flex-col gap-[12px] sm:flex-row">

            <button
              type="button"
              onClick={() =>
                navigate("/shop")
              }
              className="flex h-[48px] flex-1 items-center justify-center border border-white/20 text-[9px] tracking-[0.2em] transition hover:border-white hover:bg-white hover:text-black"
            >
              CONTINUE SHOPPING
            </button>

            <button
              type="button"
              onClick={() =>
                navigate("/account/orders")
              }
              className="flex h-[48px] flex-1 items-center justify-center bg-white text-[9px] tracking-[0.2em] text-black transition hover:bg-red-500 hover:text-white"
            >
              VIEW MY ORDERS
            </button>

          </div>

        </div>

      </main>

      {/* =====================================================
          TAILWIND KEYFRAMES
      ===================================================== */}

      <style>
        {`
          @keyframes fadeOut {
            0% {
              opacity: 1;
            }

            70% {
              opacity: 0.85;
            }

            100% {
              opacity: 0;
            }
          }

          @keyframes firework {
            0% {
              transform: scale(0);
              opacity: 0;
            }

            20% {
              transform: scale(1);
              opacity: 1;
            }

            45% {
              transform: scale(1.5);
              opacity: 1;
            }

            100% {
              transform: scale(0.2);
              opacity: 0;
            }
          }

          @keyframes burst {
            0% {
              transform: translate(-50%, -50%) scale(0);
              opacity: 0;
            }

            25% {
              opacity: 0.8;
            }

            65% {
              transform: translate(-50%, -50%) scale(1);
              opacity: 0.45;
            }

            100% {
              transform: translate(-50%, -50%) scale(1.7);
              opacity: 0;
            }
          }

          @keyframes particle {
            0% {
              transform: scale(0) translateY(0);
              opacity: 0;
            }

            30% {
              transform: scale(1) translateY(-10px);
              opacity: 1;
            }

            100% {
              transform: scale(0.2) translateY(80px);
              opacity: 0;
            }
          }

          @keyframes successMessage {
            0% {
              transform: scale(0.75);
              opacity: 0;
            }

            20% {
              transform: scale(1.05);
              opacity: 1;
            }

            35% {
              transform: scale(1);
              opacity: 1;
            }

            80% {
              transform: scale(1);
              opacity: 1;
            }

            100% {
              transform: scale(0.98);
              opacity: 0;
            }
          }
        `}
      </style>

    </div>
  );
};

export default OrderPlacedPage;