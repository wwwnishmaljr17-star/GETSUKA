import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const OrderPlacedPage = () => {
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);

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

    </div>
  );
};

export default OrderPlacedPage;