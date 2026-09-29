import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import productApi from "../../products/api/productApi";

const CART_KEY = "getsukaCart";

const CartPage = () => {
  const navigate = useNavigate();

  const [cartItems, setCartItems] = useState([]);
  const [relatedProducts, setRelatedProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [relatedLoading, setRelatedLoading] = useState(true);

  const [coupon, setCoupon] = useState("");

  /* =========================================================
     CUSTOM UI STATES
  ========================================================= */

  const [notification, setNotification] =
    useState(null);

  const [confirmModal, setConfirmModal] =
    useState({
      open: false,
      type: "",
      index: null,
      itemName: "",
    });

  /* =========================================================
     LOAD CART
  ========================================================= */

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = () => {
    try {
      const savedCart =
        localStorage.getItem(CART_KEY);

      const parsedCart = savedCart
        ? JSON.parse(savedCart)
        : [];

      setCartItems(
        Array.isArray(parsedCart)
          ? parsedCart
          : []
      );
    } catch (error) {
      console.error(
        "CART LOAD ERROR:",
        error
      );

      setCartItems([]);
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     NOTIFICATION
  ========================================================= */

  const showNotification = (
    title,
    message,
    type = "success"
  ) => {
    setNotification({
      title,
      message,
      type,
    });

    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  /* =========================================================
     SAVE CART
  ========================================================= */

  const saveCart = (items) => {
    setCartItems(items);

    localStorage.setItem(
      CART_KEY,
      JSON.stringify(items)
    );

    window.dispatchEvent(
      new Event("cartUpdated")
    );
  };

  /* =========================================================
     CART COUNT
  ========================================================= */

  const totalItems = useMemo(() => {
    return cartItems.reduce(
      (total, item) =>
        total +
        Number(item.quantity || 0),
      0
    );
  }, [cartItems]);

  /* =========================================================
     SUBTOTAL
  ========================================================= */

  const subtotal = useMemo(() => {
    return cartItems.reduce(
      (total, item) =>
        total +
        Number(item.price || 0) *
          Number(item.quantity || 0),
      0
    );
  }, [cartItems]);

  /* =========================================================
     SHIPPING
  ========================================================= */

  const shipping = 0;

  /* =========================================================
     TOTAL
  ========================================================= */

  const total = subtotal + shipping;

  /* =========================================================
     FORMAT PRICE
  ========================================================= */

  const formatPrice = (price) => {
    return `₹${Number(
      price || 0
    ).toLocaleString("en-IN")}`;
  };

  /* =========================================================
     INCREASE QUANTITY
  ========================================================= */

  const increaseQuantity = (index) => {
    const updatedCart = [
      ...cartItems,
    ];

    const item =
      updatedCart[index];

    const currentQuantity =
      Number(item.quantity || 0);

    const maxStock =
      Number(
        item.maxStock ?? 0
      );

    if (
      maxStock > 0 &&
      currentQuantity >=
        maxStock
    ) {
      showNotification(
        "STOCK LIMIT REACHED",
        `Only ${maxStock} item${
          maxStock > 1
            ? "s"
            : ""
        } available for this variant.`,
        "error"
      );

      return;
    }

    updatedCart[index] = {
      ...item,
      quantity:
        currentQuantity + 1,
    };

    saveCart(updatedCart);
  };

  /* =========================================================
     DECREASE QUANTITY
  ========================================================= */

  const decreaseQuantity = (index) => {
    const updatedCart = [
      ...cartItems,
    ];

    const item =
      updatedCart[index];

    const currentQuantity =
      Number(item.quantity || 1);

    if (currentQuantity <= 1) {
      return;
    }

    updatedCart[index] = {
      ...item,
      quantity:
        currentQuantity - 1,
    };

    saveCart(updatedCart);
  };

  /* =========================================================
     REMOVE MODAL
  ========================================================= */

  const openRemoveModal = (index) => {
    const item =
      cartItems[index];

    setConfirmModal({
      open: true,
      type: "remove",
      index,
      itemName:
        item?.name ||
        "this product",
    });
  };

  /* =========================================================
     CLEAR CART MODAL
  ========================================================= */

  const openClearCartModal = () => {
    if (
      cartItems.length === 0
    ) {
      return;
    }

    setConfirmModal({
      open: true,
      type: "clear",
      index: null,
      itemName: "",
    });
  };

  /* =========================================================
     CLOSE MODAL
  ========================================================= */

  const closeConfirmModal = () => {
    setConfirmModal({
      open: false,
      type: "",
      index: null,
      itemName: "",
    });
  };

  /* =========================================================
     CONFIRM ACTION
  ========================================================= */

  const confirmAction = () => {
    if (
      confirmModal.type ===
      "remove"
    ) {
      const index =
        confirmModal.index;

      const item =
        cartItems[index];

      const updatedCart =
        cartItems.filter(
          (_, itemIndex) =>
            itemIndex !== index
        );

      saveCart(updatedCart);

      showNotification(
        "REMOVED FROM CART",
        `${item?.name || "Item"} has been removed from your cart.`,
        "success"
      );
    }

    if (
      confirmModal.type ===
      "clear"
    ) {
      saveCart([]);

      showNotification(
        "CART CLEARED",
        "All products have been removed from your cart.",
        "success"
      );
    }

    closeConfirmModal();
  };

  /* =========================================================
     COUPON
  ========================================================= */

  const applyCoupon = () => {
    if (!coupon.trim()) {
      showNotification(
        "COUPON CODE REQUIRED",
        "Enter a coupon code before applying.",
        "error"
      );

      return;
    }

    showNotification(
      "COUPON SYSTEM",
      "Coupon validation will be connected when the coupon system is implemented.",
      "info"
    );
  };

  /* =========================================================
     CHECKOUT
  ========================================================= */

  const handleCheckout = () => {
    if (
      cartItems.length === 0
    ) {
      return;
    }

    navigate("/checkout");
  };

  /* =========================================================
     LOAD RELATED PRODUCTS
  ========================================================= */

  useEffect(() => {
    const loadRelatedProducts =
      async () => {
        try {
          setRelatedLoading(true);

          const response =
            await productApi.getProducts(
              {
                page: 1,
                limit: 8,
                sort: "newest",
              }
            );

          const products =
            Array.isArray(
              response?.products
            )
              ? response.products
              : [];

          const cartProductIds =
            cartItems.map(
              (item) =>
                item.productId
            );

          const filtered =
            products
              .filter(
                (product) =>
                  !cartProductIds.includes(
                    product._id
                  )
              )
              .slice(0, 4);

          setRelatedProducts(
            filtered
          );
        } catch (error) {
          console.error(
            "RELATED PRODUCTS ERROR:",
            error
          );

          setRelatedProducts([]);
        } finally {
          setRelatedLoading(false);
        }
      };

    loadRelatedProducts();
  }, [cartItems]);

  /* =========================================================
     OPEN PRODUCT
  ========================================================= */

  const openProduct = (
    productId
  ) => {
    navigate(
      `/products/${productId}`
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-black">

        <div className="text-center">

          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-[2px] border-[#e5e5e5] border-t-black" />

          <p className="mt-5 text-[9px] font-bold uppercase tracking-[0.25em] text-[#777]">
            Loading your cart
          </p>

        </div>

      </div>
    );
  }

  /* =========================================================
     EMPTY CART
  ========================================================= */

  if (
    cartItems.length === 0
  ) {
    return (
      <div className="min-h-screen bg-white text-black">

        <main className="mx-auto max-w-[1440px] px-5 pb-20 pt-12 md:px-10 lg:px-14 lg:pt-16">

          {/* HEADER */}

          <div className="flex items-end justify-between border-b border-black pb-7">

            <div>

              <p className="text-[9px] font-bold uppercase tracking-[0.35em] text-[#999]">
                GETSUKA / SHOPPING
              </p>

              <h1 className="mt-4 text-4xl font-black uppercase tracking-[-0.06em] md:text-6xl">
                YOUR CART
              </h1>

            </div>

            <p className="pb-1 text-[9px] font-bold uppercase tracking-[0.18em] text-[#777]">
              00 ITEMS
            </p>

          </div>

          {/* EMPTY */}

          <div className="relative flex min-h-[560px] flex-col items-center justify-center overflow-hidden text-center">

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">

              <span className="select-none text-[180px] font-black tracking-[-0.12em] text-[#f5f5f5] md:text-[280px]">
                00
              </span>

            </div>

            <div className="relative z-10">

              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#ddd]">

                <svg
                  width="30"
                  height="30"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M6 7h12l1 13H5L6 7Z" />
                  <path d="M9 7a3 3 0 0 1 6 0" />
                </svg>

              </div>

              <p className="mt-8 text-[9px] font-bold uppercase tracking-[0.3em] text-[#e9002d]">
                NOTHING HERE YET
              </p>

              <h2 className="mt-3 text-2xl font-black uppercase tracking-[-0.03em] md:text-3xl">
                YOUR CART IS EMPTY
              </h2>

              <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-[#777]">
                Your next anime fit is waiting.
                Explore the GETSUKA collection
                and find something worthy of
                your wardrobe.
              </p>

              <button
                type="button"
                onClick={() =>
                  navigate("/shop")
                }
                className="group mt-9 inline-flex items-center gap-5 bg-black px-8 py-4 text-[9px] font-bold uppercase tracking-[0.2em] text-white transition hover:bg-[#e9002d]"
              >
                CONTINUE SHOPPING

                <span className="transition-transform group-hover:translate-x-2">
                  →
                </span>

              </button>

            </div>

          </div>

        </main>

      </div>
    );
  }

  /* =========================================================
     MAIN CART
  ========================================================= */

  return (
    <div className="min-h-screen bg-white text-black">

      {/* =====================================================
          TOP NOTIFICATION
      ===================================================== */}

      {notification && (
        <div className="fixed right-5 top-5 z-[100] w-[380px] max-w-[calc(100vw-40px)]">

          <div
            className={`border bg-black p-5 text-white shadow-[0_20px_60px_rgba(0,0,0,0.2)] ${
              notification.type ===
              "error"
                ? "border-[#e9002d]"
                : notification.type ===
                  "info"
                ? "border-[#555]"
                : "border-[#222]"
            }`}
          >

            <div className="flex gap-4">

              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center border ${
                  notification.type ===
                  "error"
                    ? "border-[#e9002d] text-[#e9002d]"
                    : "border-[#444] text-white"
                }`}
              >

                {notification.type ===
                "error" ? (
                  <span className="text-sm font-bold">
                    !
                  </span>
                ) : (
                  <span className="text-sm">
                    ✓
                  </span>
                )}

              </div>

              <div className="min-w-0 flex-1">

                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#e9002d]">
                  {notification.title}
                </p>

                <p className="mt-2 text-xs leading-5 text-[#bbb]">
                  {
                    notification.message
                  }
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setNotification(
                    null
                  )
                }
                className="text-lg leading-none text-[#555] transition hover:text-white"
              >
                ×
              </button>

            </div>

          </div>

        </div>
      )}

      {/* =====================================================
          CONFIRM MODAL
      ===================================================== */}

      {confirmModal.open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 px-5 backdrop-blur-sm">

          <div className="w-full max-w-[430px] border border-[#222] bg-white p-7 shadow-[0_30px_100px_rgba(0,0,0,0.35)] md:p-9">

            <div className="flex items-start justify-between">

              <div>

                <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#e9002d]">
                  GETSUKA
                </p>

                <h2 className="mt-3 text-2xl font-black uppercase tracking-[-0.04em]">
                  {confirmModal.type ===
                  "clear"
                    ? "CLEAR CART?"
                    : "REMOVE ITEM?"}
                </h2>

              </div>

              <button
                type="button"
                onClick={
                  closeConfirmModal
                }
                className="text-2xl leading-none text-[#999] transition hover:text-black"
              >
                ×
              </button>

            </div>

            <div className="mt-7 border-l-2 border-[#e9002d] bg-[#f7f7f7] px-4 py-4">

              <p className="text-xs leading-6 text-[#555]">

                {confirmModal.type ===
                "clear"
                  ? "This will remove every product currently in your cart."
                  : `Remove "${confirmModal.itemName}" from your cart?`}

              </p>

            </div>

            <div className="mt-8 grid grid-cols-2 gap-3">

              <button
                type="button"
                onClick={
                  closeConfirmModal
                }
                className="h-12 border border-black text-[9px] font-bold uppercase tracking-[0.15em] transition hover:bg-black hover:text-white"
              >
                CANCEL
              </button>

              <button
                type="button"
                onClick={
                  confirmAction
                }
                className="h-12 bg-[#e9002d] text-[9px] font-bold uppercase tracking-[0.15em] text-white transition hover:bg-black"
              >
                {confirmModal.type ===
                "clear"
                  ? "CLEAR CART"
                  : "REMOVE"}
              </button>

            </div>

          </div>

        </div>
      )}

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="mx-auto max-w-[1440px] px-5 pb-20 pt-10 md:px-10 lg:px-14 lg:pt-14">

        {/* ===================================================
            HEADER
        =================================================== */}

        <header className="border-b border-black pb-7">

          <div className="flex items-end justify-between gap-5">

            <div>

              <p className="text-[9px] font-bold uppercase tracking-[0.35em] text-[#999]">
                GETSUKA / SHOPPING BAG
              </p>

              <h1 className="mt-4 text-4xl font-black uppercase tracking-[-0.06em] md:text-6xl">
                YOUR CART
              </h1>

            </div>

            <div className="pb-1 text-right">

              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#999]">
                CART
              </p>

              <p className="mt-1 text-sm font-black uppercase">
                {String(
                  totalItems
                ).padStart(
                  2,
                  "0"
                )}{" "}
                {totalItems === 1
                  ? "ITEM"
                  : "ITEMS"}
              </p>

            </div>

          </div>

        </header>

        {/* ===================================================
            CART GRID
        =================================================== */}

        <div className="mt-9 grid grid-cols-1 gap-10 xl:grid-cols-[1fr_380px]">

          {/* =================================================
              LEFT
          ================================================= */}

          <section>

            {/* COLUMN LABELS */}

            <div className="hidden grid-cols-[1fr_130px_100px_110px] gap-5 border-b border-[#ddd] pb-4 text-[8px] font-bold uppercase tracking-[0.2em] text-[#999] md:grid">

              <span>
                PRODUCT
              </span>

              <span>
                QUANTITY
              </span>

              <span>
                PRICE
              </span>

              <span className="text-right">
                TOTAL
              </span>

            </div>

            {/* CART ITEMS */}

            <div>

              {cartItems.map(
                (
                  item,
                  index
                ) => {

                  const quantity =
                    Number(
                      item.quantity ||
                        1
                    );

                  const price =
                    Number(
                      item.price || 0
                    );

                  const itemTotal =
                    price *
                    quantity;

                  const maxStock =
                    Number(
                      item.maxStock ??
                        0
                    );

                  return (
                    <article
                      key={`${item.productId}-${item.variantId}-${index}`}
                      className="group relative border-b border-[#ddd] py-7"
                    >

                      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_130px_100px_110px] md:items-center md:gap-5">

                        {/* PRODUCT */}

                        <div className="flex min-w-0 gap-5">

                          {/* IMAGE */}

                          <button
                            type="button"
                            onClick={() =>
                              openProduct(
                                item.productId
                              )
                            }
                            className="relative h-40 w-28 shrink-0 overflow-hidden bg-[#f2f2f2] md:h-44 md:w-32"
                          >

                            {item.image ? (
                              <img
                                src={
                                  item.image
                                }
                                alt={
                                  item.name
                                }
                                className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-[8px] font-bold uppercase text-[#aaa]">
                                NO IMAGE
                              </div>
                            )}

                            <div className="absolute inset-x-0 bottom-0 bg-black/80 px-3 py-2 text-left opacity-0 transition group-hover:opacity-100">

                              <span className="text-[7px] font-bold uppercase tracking-[0.15em] text-white">
                                VIEW PRODUCT →
                              </span>

                            </div>

                          </button>

                          {/* INFO */}

                          <div className="min-w-0 pt-1">

                            <p className="text-[8px] font-bold uppercase tracking-[0.22em] text-[#e9002d]">
                              {
                                item.anime
                              }
                            </p>

                            <button
                              type="button"
                              onClick={() =>
                                openProduct(
                                  item.productId
                                )
                              }
                              className="mt-2 block max-w-[300px] text-left text-base font-black uppercase leading-5 tracking-[-0.02em] transition hover:text-[#e9002d]"
                            >
                              {
                                item.name
                              }
                            </button>

                            <div className="mt-4 space-y-1.5">

                              <p className="text-[9px] uppercase tracking-[0.08em] text-[#999]">
                                SIZE
                                <span className="ml-2 font-bold text-black">
                                  {
                                    item.size
                                  }
                                </span>
                              </p>

                              <p className="text-[9px] uppercase tracking-[0.08em] text-[#999]">
                                COLOR
                                <span className="ml-2 font-bold text-black">
                                  {
                                    item.color
                                  }
                                </span>
                              </p>

                              {item.sku && (
                                <p className="text-[9px] uppercase tracking-[0.08em] text-[#999]">
                                  SKU
                                  <span className="ml-2 font-bold text-black">
                                    {
                                      item.sku
                                    }
                                  </span>
                                </p>
                              )}

                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                openRemoveModal(
                                  index
                                )
                              }
                              className="mt-5 text-[8px] font-bold uppercase tracking-[0.18em] text-[#e9002d] transition hover:text-black"
                            >
                              REMOVE ITEM
                            </button>

                          </div>

                        </div>

                        {/* QUANTITY */}

                        <div>

                          <p className="mb-2 text-[8px] font-bold uppercase tracking-[0.18em] text-[#999] md:hidden">
                            QUANTITY
                          </p>

                          <div className="flex w-fit items-center border border-[#222]">

                            <button
                              type="button"
                              disabled={
                                quantity <=
                                1
                              }
                              onClick={() =>
                                decreaseQuantity(
                                  index
                                )
                              }
                              className="flex h-10 w-10 items-center justify-center text-lg transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:text-[#ccc]"
                            >
                              −
                            </button>

                            <span className="flex h-10 w-11 items-center justify-center border-x border-[#222] text-xs font-bold">
                              {
                                quantity
                              }
                            </span>

                            <button
                              type="button"
                              disabled={
                                maxStock >
                                  0 &&
                                quantity >=
                                  maxStock
                              }
                              onClick={() =>
                                increaseQuantity(
                                  index
                                )
                              }
                              className="flex h-10 w-10 items-center justify-center text-lg transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:text-[#ccc]"
                            >
                              +
                            </button>

                          </div>

                          {maxStock >
                            0 && (
                            <p className="mt-2 text-[8px] font-semibold uppercase tracking-[0.08em] text-[#999]">
                              {maxStock}{" "}
                              available
                            </p>
                          )}

                        </div>

                        {/* PRICE */}

                        <div>

                          <p className="mb-2 text-[8px] font-bold uppercase tracking-[0.18em] text-[#999] md:hidden">
                            PRICE
                          </p>

                          <p className="text-sm font-semibold">
                            {formatPrice(
                              price
                            )}
                          </p>

                        </div>

                        {/* TOTAL */}

                        <div className="md:text-right">

                          <p className="mb-2 text-[8px] font-bold uppercase tracking-[0.18em] text-[#999] md:hidden">
                            TOTAL
                          </p>

                          <p className="text-sm font-black">
                            {formatPrice(
                              itemTotal
                            )}
                          </p>

                        </div>

                      </div>

                    </article>
                  );
                }
              )}

            </div>

            {/* =================================================
                CART ACTIONS
            ================================================= */}

            <div className="flex flex-col justify-between gap-5 border-b border-[#ddd] py-6 sm:flex-row sm:items-center">

              <button
                type="button"
                onClick={() =>
                  navigate("/shop")
                }
                className="group flex items-center gap-3 text-[9px] font-bold uppercase tracking-[0.18em] text-[#555] transition hover:text-black"
              >
                <span className="transition-transform group-hover:-translate-x-1">
                  ←
                </span>

                CONTINUE SHOPPING
              </button>

              <button
                type="button"
                onClick={
                  openClearCartModal
                }
                className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#e9002d] transition hover:text-black"
              >
                CLEAR CART
              </button>

            </div>

          </section>

          {/* =================================================
              SUMMARY
          ================================================= */}

          <aside className="h-fit xl:sticky xl:top-8">

            <div className="border border-[#222] bg-[#fafafa]">

              {/* SUMMARY HEADER */}

              <div className="flex items-center justify-between border-b border-[#ddd] px-7 py-6">

                <div>

                  <p className="text-[8px] font-bold uppercase tracking-[0.25em] text-[#999]">
                    GETSUKA
                  </p>

                  <h2 className="mt-2 text-xl font-black uppercase tracking-[-0.03em]">
                    ORDER SUMMARY
                  </h2>

                </div>

                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white">
                  {totalItems}
                </span>

              </div>

              <div className="px-7 py-7">

                {/* SUBTOTAL */}

                <div className="flex items-center justify-between">

                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#777]">
                    SUBTOTAL
                  </span>

                  <span className="text-sm font-bold">
                    {formatPrice(
                      subtotal
                    )}
                  </span>

                </div>

                {/* SHIPPING */}

                <div className="mt-5 flex items-start justify-between">

                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#777]">
                    SHIPPING
                  </span>

                  <span className="max-w-[140px] text-right text-[8px] font-semibold uppercase leading-4 text-[#999]">
                    Calculated at
                    checkout
                  </span>

                </div>

                <div className="my-7 border-t border-[#ddd]" />

                {/* TOTAL */}

                <div className="flex items-end justify-between">

                  <div>

                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#777]">
                      TOTAL
                    </p>

                    <p className="mt-1 text-[8px] uppercase tracking-[0.08em] text-[#aaa]">
                      Taxes calculated at
                      checkout
                    </p>

                  </div>

                  <span className="text-2xl font-black tracking-[-0.04em]">
                    {formatPrice(
                      total
                    )}
                  </span>

                </div>

                {/* CHECKOUT */}

                <button
                  type="button"
                  onClick={
                    handleCheckout
                  }
                  className="group mt-7 flex h-14 w-full items-center justify-between bg-[#e9002d] px-5 text-[9px] font-bold uppercase tracking-[0.18em] text-white transition hover:bg-black"
                >

                  <span>
                    PROCEED TO CHECKOUT
                  </span>

                  <span className="text-base transition-transform group-hover:translate-x-1">
                    →
                  </span>

                </button>

                {/* COUPON */}

                <div className="mt-8">

                  <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-[#555]">
                    HAVE A PROMO CODE?
                  </p>

                  <div className="mt-3 flex">

                    <input
                      type="text"
                      value={
                        coupon
                      }
                      onChange={(
                        event
                      ) =>
                        setCoupon(
                          event.target
                            .value
                        )
                      }
                      placeholder="ENTER CODE"
                      className="min-w-0 flex-1 border border-[#ccc] bg-white px-4 py-3 text-[9px] font-semibold uppercase tracking-[0.08em] outline-none placeholder:text-[#aaa] focus:border-black"
                    />

                    <button
                      type="button"
                      onClick={
                        applyCoupon
                      }
                      className="border border-l-0 border-black bg-white px-5 text-[8px] font-bold uppercase tracking-[0.12em] transition hover:bg-black hover:text-white"
                    >
                      APPLY
                    </button>

                  </div>

                </div>

                {/* SECURITY */}

                <div className="mt-8 flex items-center justify-center gap-2 border-t border-[#ddd] pt-5">

                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  >
                    <rect
                      x="5"
                      y="10"
                      width="14"
                      height="10"
                      rx="1"
                    />

                    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                  </svg>

                  <span className="text-[8px] font-bold uppercase tracking-[0.15em] text-[#999]">
                    SECURE CHECKOUT
                  </span>

                </div>

              </div>

            </div>

          </aside>

        </div>

        {/* ===================================================
            DISCOVER MORE
        =================================================== */}

        <section className="mt-20 border-t border-black pt-12">

          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">

            <div>

              <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-[#e9002d]">
                KEEP EXPLORING
              </p>

              <h2 className="mt-3 text-2xl font-black uppercase tracking-[-0.04em] md:text-3xl">
                ITEMS YOU MAY HAVE MISSED
              </h2>

            </div>

            <button
              type="button"
              onClick={() =>
                navigate("/shop")
              }
              className="group flex items-center gap-3 text-[9px] font-bold uppercase tracking-[0.18em] text-[#555] transition hover:text-black"
            >
              VIEW ALL

              <span className="transition-transform group-hover:translate-x-1">
                →
              </span>

            </button>

          </div>

          {/* RELATED LOADING */}

          {relatedLoading ? (
            <div className="mt-9 flex h-64 items-center justify-center border border-[#eee]">

              <div className="text-center">

                <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-[#ddd] border-t-black" />

                <p className="mt-4 text-[8px] font-bold uppercase tracking-[0.2em] text-[#999]">
                  Loading collection
                </p>

              </div>

            </div>
          ) : relatedProducts.length >
            0 ? (
            <div className="mt-9 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4">

              {relatedProducts.map(
                (item) => {

                  const finalPrice =
                    item.salePrice ??
                    item.price;

                  const hasSale =
                    item.salePrice &&
                    Number(
                      item.salePrice
                    ) <
                      Number(
                        item.price
                      );

                  return (
                    <button
                      key={
                        item._id
                      }
                      type="button"
                      onClick={() =>
                        openProduct(
                          item._id
                        )
                      }
                      className="group text-left"
                    >

                      {/* IMAGE */}

                      <div className="relative aspect-[0.8] overflow-hidden bg-[#f3f3f3]">

                        {item.images?.[0] ? (
                          <img
                            src={
                              item.images[0]
                            }
                            alt={
                              item.name
                            }
                            className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[8px] font-bold uppercase text-[#aaa]">
                            NO IMAGE
                          </div>
                        )}

                        {hasSale && (
                          <span className="absolute left-3 top-3 bg-[#e9002d] px-3 py-2 text-[7px] font-bold uppercase tracking-[0.12em] text-white">
                            SALE
                          </span>
                        )}

                        <div className="absolute bottom-0 left-0 right-0 translate-y-full bg-black px-4 py-3 transition-transform duration-300 group-hover:translate-y-0">

                          <p className="text-center text-[8px] font-bold uppercase tracking-[0.15em] text-white">
                            VIEW PRODUCT →
                          </p>

                        </div>

                      </div>

                      {/* INFO */}

                      <div className="pt-4">

                        <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-[#e9002d]">
                          {
                            item.anime
                          }
                        </p>

                        <h3 className="mt-2 truncate text-[11px] font-black uppercase tracking-[-0.01em]">
                          {
                            item.name
                          }
                        </h3>

                        <div className="mt-2 flex items-center gap-2">

                          <span className="text-[11px] font-bold">
                            {formatPrice(
                              finalPrice
                            )}
                          </span>

                          {hasSale && (
                            <span className="text-[9px] text-[#999] line-through">
                              {formatPrice(
                                item.price
                              )}
                            </span>
                          )}

                        </div>

                      </div>

                    </button>
                  );
                }
              )}

            </div>
          ) : (
            <div className="mt-9 border border-[#eee] p-14 text-center">

              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#999]">
                MORE PRODUCTS COMING SOON
              </p>

            </div>
          )}

        </section>

      </main>

    </div>
  );
};

export default CartPage;