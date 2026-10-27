import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import productApi from "../../products/api/productApi";
import { formatPrice } from "../../../../shared/utils/formatters";

const CART_KEY = "getsukaCart";
const MAX_CART_QUANTITY = 5;

const CartPage = () => {
  const navigate = useNavigate();
  const syncSeqRef = useRef(0);

  const [cartItems, setCartItems] = useState([]);
  const [allRelatedProducts, setAllRelatedProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [stockSyncing, setStockSyncing] = useState(false);
  const [relatedLoading, setRelatedLoading] = useState(true);

  const [coupon, setCoupon] = useState("");
  const [notification, setNotification] = useState(null);

  const [confirmModal, setConfirmModal] = useState({
    open: false,
    type: "",
    index: null,
    itemName: "",
  });

  const loadCart = () => {
    try {
      const savedCart = localStorage.getItem(CART_KEY);
      const parsedCart = savedCart ? JSON.parse(savedCart) : [];
      const items = Array.isArray(parsedCart) ? parsedCart : [];

      setCartItems(items);

      if (items.length > 0) {
        syncCartStock(items);
      }
    } catch (error) {
      console.error("CART LOAD ERROR:", error);
      setCartItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCart();
  }, []);

  const normalizeValue = (value) => {
    if (value === undefined || value === null) {
      return "";
    }
    return String(value).trim().toLowerCase();
  };

  const findMatchingVariant = (variants, item) => {
    if (!Array.isArray(variants) || !item) {
      return null;
    }

    if (item.variantId) {
      const byId = variants.find(
        (variant) => String(variant?._id) === String(item.variantId)
      );
      if (byId) return byId;
    }

    if (item.sku) {
      const itemSku = normalizeValue(item.sku);
      const bySku = variants.find(
        (variant) => normalizeValue(variant?.sku) === itemSku
      );
      if (bySku) return bySku;
    }

    const itemSize = normalizeValue(item.size);
    const itemColor = normalizeValue(item.color);

    if (itemSize && itemColor) {
      const bySizeAndColor = variants.find(
        (variant) =>
          normalizeValue(variant?.size) === itemSize &&
          normalizeValue(variant?.color) === itemColor
      );
      if (bySizeAndColor) return bySizeAndColor;
    }

    return null;
  };

  const createSyncedItem = (item, product, selectedVariant) => {
    const currentStock = Math.max(
      0,
      Number(selectedVariant?.stock || 0)
    );
    const currentQuantity = Math.max(1, Number(item?.quantity || 1));

    const correctedQuantity =
      currentStock > 0
        ? Math.min(currentQuantity, currentStock, MAX_CART_QUANTITY)
        : currentQuantity;

    return {
      ...item,
      productId: item.productId || product?._id,
      name: product?.name ?? item.name,
      anime: product?.anime ?? item.anime,
      image: item.image || product?.images?.[0] || "",
      price:
        product?.salePrice !== null && product?.salePrice !== undefined
          ? Number(product.salePrice)
          : Number(product?.price ?? item.price ?? 0),
      variantId: selectedVariant?._id ?? item.variantId,
      color: selectedVariant?.color ?? item.color,
      size: selectedVariant?.size ?? item.size,
      sku: selectedVariant?.sku ?? item.sku,
      maxStock: currentStock,
      quantity: correctedQuantity,
      isAvailable: currentStock > 0,
      available: currentStock > 0,
      isOutOfStock: currentStock <= 0,
      stockSyncFailed: false,
    };
  };

  async function syncCartStock(items) {
    if (!Array.isArray(items) || items.length === 0) {
      return;
    }

    const currentSeq = ++syncSeqRef.current;
    setStockSyncing(true);

    try {
      const uniqueProductIds = [
        ...new Set(items.map((item) => item?.productId).filter(Boolean)),
      ];

      const productMap = new Map();

      try {
        const bulkResponse = await productApi.getProductsBulk(uniqueProductIds);
        if (bulkResponse?.success && Array.isArray(bulkResponse.products)) {
          bulkResponse.products.forEach((product) => {
            if (product?._id) {
              productMap.set(String(product._id), product);
            }
          });
        }
      } catch (bulkErr) {
        console.error("BULK STOCK SYNC FAILED, USING FALLBACK:", bulkErr);
      }

      const syncedItems = await Promise.all(
        items.map(async (item) => {
          try {
            if (!item?.productId) {
              return {
                ...item,
                isAvailable: false,
                available: false,
                isOutOfStock: true,
                maxStock: 0,
              };
            }

            let product = productMap.get(String(item.productId));

            if (!product) {
              try {
                const response = await productApi.getProductById(item.productId);
                product = response?.product;
              } catch (err) {
                console.error(
                  `FALLBACK STOCK CHECK ERROR FOR ${item.productId}:`,
                  err
                );
                return {
                  ...item,
                  stockSyncFailed: true,
                };
              }
            }

            if (!product) {
              return {
                ...item,
                isAvailable: false,
                available: false,
                isOutOfStock: true,
                maxStock: 0,
              };
            }

            const variants = Array.isArray(product.variants)
              ? product.variants
              : [];
            const selectedVariant = findMatchingVariant(variants, item);

            if (!selectedVariant) {
              return {
                ...item,
                isAvailable: false,
                available: false,
                isOutOfStock: true,
                maxStock: 0,
                stockSyncFailed: false,
              };
            }

            return createSyncedItem(item, product, selectedVariant);
          } catch (error) {
            console.error(
              `STOCK SYNC ERROR FOR PRODUCT ${item?.productId}:`,
              error
            );
            return {
              ...item,
              stockSyncFailed: true,
            };
          }
        })
      );

      if (currentSeq !== syncSeqRef.current) {
        return;
      }

      setCartItems(syncedItems);
      localStorage.setItem(CART_KEY, JSON.stringify(syncedItems));
      window.dispatchEvent(new Event("cartUpdated"));

      const stockChanged = syncedItems.some((item, index) => {
        const oldItem = items[index];
        return (
          Number(oldItem?.maxStock ?? -1) !== Number(item?.maxStock ?? -1) ||
          Number(oldItem?.quantity ?? 0) !== Number(item?.quantity ?? 0) ||
          Boolean(oldItem?.isAvailable) !== Boolean(item?.isAvailable)
        );
      });

      const nowUnavailable = syncedItems.some(
        (item) => item?.isOutOfStock === true || Number(item?.maxStock ?? 0) <= 0
      );

      if (stockChanged && nowUnavailable) {
        showNotification(
          "STOCK UPDATED",
          "One or more products in your cart are no longer available in the requested quantity.",
          "error"
        );
      }
    } catch (error) {
      console.error("CART STOCK SYNC ERROR:", error);
    } finally {
      if (currentSeq === syncSeqRef.current) {
        setStockSyncing(false);
      }
    }
  }

  const showNotification = (title, message, type = "success") => {
    setNotification({
      title,
      message,
      type,
    });

    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  const saveCart = (items) => {
    setCartItems(items);
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event("cartUpdated"));
  };

  const totalItems = useMemo(() => {
    return cartItems.reduce(
      (total, item) => total + Number(item.quantity || 0),
      0
    );
  }, [cartItems]);

  const isCartItemUnavailable = (item) => {
    if (!item) return true;
    if (item.stockSyncFailed === true) return true;
    if (
      item.isAvailable === false ||
      item.available === false ||
      item.isOutOfStock === true
    ) {
      return true;
    }
    const maxStock =
      item.maxStock !== undefined && item.maxStock !== null
        ? Number(item.maxStock)
        : 0;
    if (maxStock <= 0) return true;
    if (Number(item.quantity || 0) > maxStock) return true;
    return false;
  };

  const unavailableCartItems = useMemo(() => {
    return cartItems.filter((item) => isCartItemUnavailable(item));
  }, [cartItems]);

  const canProceedToCheckout =
    cartItems.length > 0 &&
    !stockSyncing &&
    unavailableCartItems.length === 0;

  const subtotal = useMemo(() => {
    return cartItems.reduce(
      (total, item) =>
        total + Number(item.price || 0) * Number(item.quantity || 0),
      0
    );
  }, [cartItems]);

  const shipping = 0;
  const total = subtotal + shipping;

  const increaseQuantity = async (index) => {
    const item = cartItems[index];
    if (!item) return;

    try {
      if (!item.productId) {
        showNotification(
          "PRODUCT UNAVAILABLE",
          "This product could not be verified.",
          "error"
        );
        return;
      }

      const response = await productApi.getProductById(item.productId);
      const product = response?.product;
      const variants = Array.isArray(product?.variants) ? product.variants : [];
      const selectedVariant = findMatchingVariant(variants, item);

      if (!selectedVariant) {
        const updatedCart = [...cartItems];
        updatedCart[index] = {
          ...item,
          maxStock: 0,
          isAvailable: false,
          available: false,
          isOutOfStock: true,
        };
        saveCart(updatedCart);
        showNotification(
          "OUT OF STOCK",
          "This selected variant is no longer available.",
          "error"
        );
        return;
      }

      const currentStock = Math.max(0, Number(selectedVariant.stock || 0));
      const currentQuantity = Number(item.quantity || 1);
      const updatedItem = createSyncedItem(item, product, selectedVariant);

      if (currentStock <= 0) {
        const updatedCart = [...cartItems];
        updatedCart[index] = {
          ...updatedItem,
          quantity: currentQuantity,
        };
        saveCart(updatedCart);
        showNotification(
          "OUT OF STOCK",
          "This selected variant is currently out of stock.",
          "error"
        );
        return;
      }

      if (currentQuantity >= MAX_CART_QUANTITY) {
        const updatedCart = [...cartItems];
        updatedCart[index] = {
          ...updatedItem,
          quantity: MAX_CART_QUANTITY,
        };
        saveCart(updatedCart);
        showNotification(
          "MAXIMUM QUANTITY REACHED",
          `You can add a maximum of ${MAX_CART_QUANTITY} items of the same variant to your cart.`,
          "error"
        );
        return;
      }

      if (currentQuantity >= currentStock) {
        const updatedCart = [...cartItems];
        updatedCart[index] = {
          ...updatedItem,
          quantity: currentStock,
        };
        saveCart(updatedCart);
        showNotification(
          "STOCK LIMIT REACHED",
          `Only ${currentStock} item${currentStock > 1 ? "s" : ""} available for this variant.`,
          "error"
        );
        return;
      }

      const updatedCart = [...cartItems];
      updatedCart[index] = {
        ...updatedItem,
        quantity: currentQuantity + 1,
      };
      saveCart(updatedCart);
    } catch (error) {
      console.error("INCREASE QUANTITY STOCK CHECK ERROR:", error);
      showNotification(
        "STOCK CHECK FAILED",
        "Unable to verify the latest stock. Please try again.",
        "error"
      );
    }
  };

  const decreaseQuantity = (index) => {
    const updatedCart = [...cartItems];
    const item = updatedCart[index];
    if (!item) return;

    const currentQuantity = Number(item.quantity || 1);
    if (currentQuantity <= 1) return;

    updatedCart[index] = {
      ...item,
      quantity: currentQuantity - 1,
    };
    saveCart(updatedCart);
  };

  const openRemoveModal = (index) => {
    const item = cartItems[index];
    setConfirmModal({
      open: true,
      type: "remove",
      index,
      itemName: item?.name || "this product",
    });
  };

  const openClearCartModal = () => {
    if (cartItems.length === 0) return;
    setConfirmModal({
      open: true,
      type: "clear",
      index: null,
      itemName: "",
    });
  };

  const closeConfirmModal = () => {
    setConfirmModal({
      open: false,
      type: "",
      index: null,
      itemName: "",
    });
  };

  useEffect(() => {
    if (!confirmModal.open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        closeConfirmModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [confirmModal.open]);

  const confirmAction = () => {
    if (confirmModal.type === "remove") {
      const index = confirmModal.index;
      const item = cartItems[index];
      const updatedCart = cartItems.filter((_, itemIndex) => itemIndex !== index);
      saveCart(updatedCart);
      showNotification(
        "REMOVED FROM CART",
        `${item?.name || "Item"} has been removed from your cart.`,
        "success"
      );
    }

    if (confirmModal.type === "clear") {
      saveCart([]);
      showNotification(
        "CART CLEARED",
        "All products have been removed from your cart.",
        "success"
      );
    }

    closeConfirmModal();
  };

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
      "COUPONS ARE AVAILABLE AT CHECKOUT",
      "Apply your GETSUKA coupon during checkout.",
      "info"
    );
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    setStockSyncing(true);

    try {
      const uniqueProductIds = [
        ...new Set(cartItems.map((item) => item?.productId).filter(Boolean)),
      ];

      const productMap = new Map();

      try {
        const bulkResponse = await productApi.getProductsBulk(uniqueProductIds);
        if (bulkResponse?.success && Array.isArray(bulkResponse.products)) {
          bulkResponse.products.forEach((product) => {
            if (product?._id) {
              productMap.set(String(product._id), product);
            }
          });
        }
      } catch (bulkErr) {
        console.error(
          "CHECKOUT BULK STOCK CHECK FAILED, USING FALLBACK:",
          bulkErr
        );
      }

      const latestItems = await Promise.all(
        cartItems.map(async (item) => {
          try {
            if (!item?.productId) {
              return {
                ...item,
                maxStock: 0,
                isAvailable: false,
                available: false,
                isOutOfStock: true,
              };
            }

            let product = productMap.get(String(item.productId));

            if (!product) {
              try {
                const response = await productApi.getProductById(item.productId);
                product = response?.product;
              } catch (err) {
                console.error(
                  `CHECKOUT FALLBACK ERROR FOR ${item.productId}:`,
                  err
                );
                return {
                  ...item,
                  stockSyncFailed: true,
                };
              }
            }

            if (!product) {
              return {
                ...item,
                maxStock: 0,
                isAvailable: false,
                available: false,
                isOutOfStock: true,
              };
            }

            const variants = Array.isArray(product.variants)
              ? product.variants
              : [];
            const variant = findMatchingVariant(variants, item);

            if (!variant) {
              return {
                ...item,
                maxStock: 0,
                isAvailable: false,
                available: false,
                isOutOfStock: true,
              };
            }

            return createSyncedItem(item, product, variant);
          } catch (error) {
            console.error("FINAL STOCK CHECK ERROR:", error);
            return {
              ...item,
              stockSyncFailed: true,
            };
          }
        })
      );

      setCartItems(latestItems);
      localStorage.setItem(CART_KEY, JSON.stringify(latestItems));
      window.dispatchEvent(new Event("cartUpdated"));

      const invalidItems = latestItems.filter(
        (item) =>
          item?.stockSyncFailed === true ||
          Number(item?.maxStock || 0) <= 0 ||
          Number(item?.quantity || 0) > Number(item?.maxStock || 0) ||
          item?.isAvailable === false ||
          item?.isOutOfStock === true
      );

      if (invalidItems.length > 0) {
        showNotification(
          "CHECKOUT UNAVAILABLE",
          "Stock changed for one or more products. Please review your cart before continuing.",
          "error"
        );
        return;
      }

      navigate("/checkout");
    } catch (error) {
      console.error("CHECKOUT STOCK VALIDATION ERROR:", error);
      showNotification(
        "CHECKOUT UNAVAILABLE",
        "Unable to verify product availability. Please try again.",
        "error"
      );
    } finally {
      setStockSyncing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadRelatedProducts = async () => {
      try {
        setRelatedLoading(true);
        const response = await productApi.getProducts({
          page: 1,
          limit: 8,
          sort: "newest",
        });

        if (isMounted) {
          const products = Array.isArray(response?.products)
            ? response.products
            : [];
          setAllRelatedProducts(products);
        }
      } catch (error) {
        console.error("RELATED PRODUCTS ERROR:", error);
        if (isMounted) {
          setAllRelatedProducts([]);
        }
      } finally {
        if (isMounted) {
          setRelatedLoading(false);
        }
      }
    };

    loadRelatedProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  const relatedProducts = useMemo(() => {
    const cartProductIds = new Set(
      cartItems.map((item) => String(item.productId || ""))
    );

    return allRelatedProducts
      .filter((product) => !cartProductIds.has(String(product._id)))
      .slice(0, 4);
  }, [allRelatedProducts, cartItems]);

  const openProduct = (productId) => {
    navigate(`/products/${productId}`);
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#FAF9F7] text-[#252321]">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#E5E4E2] border-t-[#6F4E37]" />
          <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#716C67]">
            Loading your bag...
          </p>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-[#FAF9F7] text-[#252321]">
        <main className="mx-auto max-w-[1440px] px-5 pb-24 pt-12 md:px-10 lg:px-14 lg:pt-16">
          <div className="flex items-end justify-between border-b border-[#E5E4E2] pb-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#6F4E37]">
                GETSUKA ARCHIVE / BAG
              </p>
              <h1 className="mt-2 text-3xl font-serif font-medium tracking-tight text-[#252321] md:text-5xl">
                Shopping Bag
              </h1>
            </div>
            <p className="pb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#716C67]">
              00 ITEMS
            </p>
          </div>

          <div className="relative flex min-h-[500px] flex-col items-center justify-center overflow-hidden text-center">
            <div className="relative z-10 max-w-md">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#E6E0F0]/50 border border-[#E5E4E2] text-[#6F4E37]">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M6 7h12l1 13H5L6 7Z" />
                  <path d="M9 7a3 3 0 0 1 6 0" />
                </svg>
              </div>

              <span className="mt-6 inline-block text-[10px] font-bold uppercase tracking-[0.25em] text-[#6F4E37]">
                EMPTY BAG
              </span>

              <h2 className="mt-2 text-2xl font-serif font-medium text-[#252321]">
                Your bag is currently empty
              </h2>

              <p className="mx-auto mt-3 text-xs leading-6 text-[#716C67]">
                Curate your anime-luxury wardrobe with limited drops, custom silhouettes, and editorial pieces crafted with premium weight fabrics.
              </p>

              <button
                type="button"
                onClick={() => navigate("/shop")}
                className="group mt-8 inline-flex items-center gap-4 bg-[#6F4E37] px-8 py-3.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white transition hover:bg-[#211B18]"
              >
                DISCOVER THE COLLECTION
                <span className="transition-transform group-hover:translate-x-1.5">
                  →
                </span>
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F7] text-[#252321]">
      {/* NOTIFICATION */}
      {notification && (
        <div
          role={notification.type === "error" ? "alert" : "status"}
          aria-live="polite"
          className="fixed right-5 top-5 z-[100] w-[380px] max-w-[calc(100vw-40px)]"
        >
          <div
            className={`border bg-white p-5 shadow-[0_20px_50px_rgba(0,0,0,0.08)] ${
              notification.type === "error"
                ? "border-[#6F4E37]"
                : notification.type === "info"
                ? "border-[#E6E0F0]"
                : "border-[#E5E4E2]"
            }`}
          >
            <div className="flex gap-4">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center border text-xs font-bold ${
                  notification.type === "error"
                    ? "border-[#6F4E37] text-[#6F4E37] bg-[#FAF9F7]"
                    : "border-[#E6E0F0] text-[#6F4E37] bg-[#E6E0F0]/40"
                }`}
              >
                {notification.type === "error" ? "!" : "✓"}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6F4E37]">
                  {notification.title}
                </p>
                <p className="mt-1 text-xs leading-5 text-[#716C67]">
                  {notification.message}
                </p>
              </div>

              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => setNotification(null)}
                className="text-lg leading-none text-[#716C67] transition hover:text-[#252321]"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL */}
      {confirmModal.open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cart-confirm-modal-title"
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 px-5 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeConfirmModal();
            }
          }}
        >
          <div className="w-full max-w-[430px] border border-[#E5E4E2] bg-white p-8 shadow-[0_30px_70px_rgba(33,27,24,0.15)]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#6F4E37]">
                  GETSUKA BAG
                </p>
                <h2
                  id="cart-confirm-modal-title"
                  className="mt-2 text-xl font-serif font-medium text-[#252321]"
                >
                  {confirmModal.type === "clear"
                    ? "Clear Entire Bag?"
                    : "Remove Item?"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeConfirmModal}
                aria-label="Close confirmation dialog"
                className="text-2xl leading-none text-[#716C67] transition hover:text-[#252321]"
              >
                ×
              </button>
            </div>

            <div className="mt-6 border-l-2 border-[#6F4E37] bg-[#FAF9F7] px-4 py-3.5">
              <p className="text-xs leading-5 text-[#716C67]">
                {confirmModal.type === "clear"
                  ? "This will remove every piece currently in your bag."
                  : `Are you sure you want to remove "${confirmModal.itemName}" from your bag?`}
              </p>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={closeConfirmModal}
                className="h-11 border border-[#E5E4E2] text-[10px] font-bold uppercase tracking-[0.15em] text-[#252321] transition hover:bg-[#FAF9F7]"
              >
                CANCEL
              </button>

              <button
                type="button"
                onClick={confirmAction}
                className="h-11 bg-[#6F4E37] text-[10px] font-bold uppercase tracking-[0.15em] text-white transition hover:bg-[#211B18]"
              >
                {confirmModal.type === "clear" ? "CLEAR BAG" : "REMOVE"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <main className="mx-auto max-w-[1440px] px-5 pb-24 pt-10 md:px-10 lg:px-14 lg:pt-14">
        {/* HEADER */}
        <header className="border-b border-[#E5E4E2] pb-6">
          <div className="flex items-end justify-between gap-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#6F4E37]">
                GETSUKA ARCHIVE / BAG
              </p>
              <h1 className="mt-2 text-3xl font-serif font-medium tracking-tight text-[#252321] md:text-5xl">
                Shopping Bag
              </h1>
            </div>

            <div className="pb-1 text-right">
              <span className="inline-flex items-center gap-2 bg-[#E6E0F0] px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-[#6F4E37]">
                <span>{String(totalItems).padStart(2, "0")}</span>
                <span>{totalItems === 1 ? "PIECE" : "PIECES"}</span>
              </span>
            </div>
          </div>
        </header>

        {/* UNAVAILABLE WARNING */}
        {!canProceedToCheckout && !stockSyncing && (
          <div className="mt-6 border border-[#E5E4E2] bg-[#FAF9F7] px-6 py-4">
            <div className="flex items-start gap-4">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center bg-[#6F4E37] text-xs font-bold text-white">
                !
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6F4E37]">
                  ITEM AVAILABILITY NOTICE
                </p>
                <p className="mt-1 text-xs leading-5 text-[#716C67]">
                  One or more items in your bag are currently out of stock or sold out. Please remove the unavailable pieces to proceed with checkout.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* CART GRID */}
        <div className="mt-8 grid grid-cols-1 gap-10 xl:grid-cols-[1fr_390px]">
          {/* LEFT LIST */}
          <section>
            <div className="hidden grid-cols-[1fr_130px_110px_110px] gap-5 border-b border-[#E5E4E2] pb-3 text-[9px] font-bold uppercase tracking-[0.2em] text-[#716C67] md:grid">
              <span>PRODUCT</span>
              <span className="text-center">QUANTITY</span>
              <span className="text-right">PRICE</span>
              <span className="text-right">TOTAL</span>
            </div>

            <div className="divide-y divide-[#E5E4E2]">
              {cartItems.map((item, index) => {
                const quantity = Number(item.quantity || 1);
                const price = Number(item.price || 0);
                const itemTotal = price * quantity;
                const maxStock = Number(item.maxStock ?? 0);
                const itemUnavailable = isCartItemUnavailable(item);
                const canIncrease =
                  !itemUnavailable &&
                  !stockSyncing &&
                  maxStock > 0 &&
                  quantity < maxStock &&
                  quantity < MAX_CART_QUANTITY;

                return (
                  <article
                    key={`${item.productId}-${item.variantId}-${index}`}
                    className={`group py-6 transition ${
                      itemUnavailable ? "opacity-60 bg-[#FAF9F7]" : ""
                    }`}
                  >
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_130px_110px_110px] md:items-center md:gap-5">
                      {/* PRODUCT INFO */}
                      <div className="flex min-w-0 gap-5">
                        {/* IMAGE */}
                        <button
                          type="button"
                          aria-label={`View ${item.name}`}
                          onClick={() => openProduct(item.productId)}
                          className="relative h-36 w-28 shrink-0 overflow-hidden bg-white border border-[#E5E4E2] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#6F4E37]"
                        >
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className={`h-full w-full object-cover transition duration-500 ${
                                itemUnavailable
                                  ? "grayscale"
                                  : "group-hover:scale-105"
                              }`}
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[8px] font-bold uppercase text-[#716C67]">
                              NO IMAGE
                            </div>
                          )}

                          {itemUnavailable && (
                            <div className="absolute inset-0 flex items-center justify-center bg-[#211B18]/60">
                              <span className="bg-[#6F4E37] px-2.5 py-1 text-[7px] font-bold uppercase tracking-[0.15em] text-white">
                                OUT OF STOCK
                              </span>
                            </div>
                          )}
                        </button>

                        {/* META */}
                        <div className="min-w-0 pt-0.5">
                          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#6F4E37]">
                            {item.anime}
                          </p>

                          <button
                            type="button"
                            onClick={() => openProduct(item.productId)}
                            className="mt-1 block max-w-[280px] text-left text-sm font-serif font-medium text-[#252321] transition hover:text-[#6F4E37] truncate"
                          >
                            {item.name}
                          </button>

                          <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-[#716C67]">
                            <span className="bg-[#FAF9F7] px-2 py-0.5 border border-[#E5E4E2]">
                              Size: <strong className="text-[#252321]">{item.size}</strong>
                            </span>
                            <span className="bg-[#FAF9F7] px-2 py-0.5 border border-[#E5E4E2]">
                              Color: <strong className="text-[#252321]">{item.color}</strong>
                            </span>
                          </div>

                          {itemUnavailable && (
                            <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.15em] text-[#6F4E37]">
                              CURRENTLY UNAVAILABLE
                            </p>
                          )}

                          <button
                            type="button"
                            aria-label={`Remove ${item.name} from bag`}
                            onClick={() => openRemoveModal(index)}
                            className="mt-4 text-[9px] font-bold uppercase tracking-[0.16em] text-[#716C67] underline decoration-[#E5E4E2] underline-offset-4 transition hover:text-[#6F4E37] hover:decoration-[#6F4E37]"
                          >
                            REMOVE PIECE
                          </button>
                        </div>
                      </div>

                      {/* QUANTITY CONTROLS */}
                      <div className="flex flex-col md:items-center">
                        <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-[#716C67] md:hidden">
                          QUANTITY
                        </p>

                        <div className="flex w-fit items-center border border-[#E5E4E2] bg-white">
                          <button
                            type="button"
                            disabled={quantity <= 1}
                            aria-label={`Decrease quantity of ${item.name}`}
                            onClick={() => decreaseQuantity(index)}
                            className="flex h-9 w-9 items-center justify-center text-sm text-[#252321] transition hover:bg-[#FAF9F7] disabled:cursor-not-allowed disabled:text-[#D8D3CF]"
                          >
                            −
                          </button>

                          <span
                            aria-label={`Current quantity: ${quantity}`}
                            className="flex h-9 w-10 items-center justify-center border-x border-[#E5E4E2] text-xs font-semibold text-[#252321]"
                          >
                            {quantity}
                          </span>

                          <button
                            type="button"
                            disabled={!canIncrease}
                            aria-label={`Increase quantity of ${item.name}`}
                            onClick={() => increaseQuantity(index)}
                            className="flex h-9 w-9 items-center justify-center text-sm text-[#252321] transition hover:bg-[#FAF9F7] disabled:cursor-not-allowed disabled:text-[#D8D3CF]"
                          >
                            +
                          </button>
                        </div>

                        {maxStock > 0 && !itemUnavailable && (
                          <p className="mt-1.5 text-[8px] font-medium uppercase tracking-[0.05em] text-[#716C67]">
                            {maxStock} in stock
                          </p>
                        )}
                      </div>

                      {/* PRICE */}
                      <div className="md:text-right">
                        <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.18em] text-[#716C67] md:hidden">
                          UNIT PRICE
                        </p>
                        <p className="text-xs font-semibold text-[#252321]">
                          {formatPrice(price)}
                        </p>
                      </div>

                      {/* TOTAL */}
                      <div className="md:text-right">
                        <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.18em] text-[#716C67] md:hidden">
                          TOTAL
                        </p>
                        <p className="text-sm font-bold text-[#252321]">
                          {formatPrice(itemTotal)}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* ACTIONS */}
            <div className="flex flex-col justify-between gap-4 border-t border-[#E5E4E2] py-6 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => navigate("/shop")}
                className="group flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#716C67] transition hover:text-[#6F4E37]"
              >
                <span className="transition-transform group-hover:-translate-x-1">
                  ←
                </span>
                CONTINUE SHOPPING
              </button>

              <button
                type="button"
                onClick={openClearCartModal}
                className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#716C67] transition hover:text-[#6F4E37]"
              >
                CLEAR BAG
              </button>
            </div>
          </section>

          {/* RIGHT SUMMARY ASIDE */}
          <aside className="h-fit xl:sticky xl:top-24">
            <div className="border border-[#E5E4E2] bg-white p-7 shadow-sm">
              <div className="border-b border-[#E5E4E2] pb-5">
                <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#6F4E37]">
                  SUMMARY
                </span>
                <h2 className="mt-1 text-xl font-serif font-medium text-[#252321]">
                  Order Overview
                </h2>
              </div>

              <div className="py-5 space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#716C67]">Subtotal</span>
                  <span className="font-semibold text-[#252321]">
                    {formatPrice(subtotal)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#716C67]">Shipping</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F4E37]">
                    Calculated next
                  </span>
                </div>

                <div className="border-t border-[#E5E4E2] pt-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#252321]">
                        ESTIMATED TOTAL
                      </p>
                      <p className="text-[9px] text-[#716C67]">
                        All duties & taxes included
                      </p>
                    </div>
                    <span className="text-xl font-serif font-bold text-[#252321]">
                      {formatPrice(total)}
                    </span>
                  </div>
                </div>

                {/* CHECKOUT BUTTON */}
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={!canProceedToCheckout}
                  className={`group mt-6 flex h-13 w-full items-center justify-between px-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white transition ${
                    canProceedToCheckout
                      ? "bg-[#6F4E37] hover:bg-[#211B18]"
                      : "cursor-not-allowed bg-[#D8D3CF] text-white"
                  }`}
                >
                  <span>
                    {stockSyncing
                      ? "VERIFYING STOCK..."
                      : canProceedToCheckout
                      ? "PROCEED TO CHECKOUT"
                      : "CHECKOUT UNAVAILABLE"}
                  </span>
                  <span
                    className={
                      canProceedToCheckout
                        ? "transition-transform group-hover:translate-x-1.5"
                        : ""
                    }
                  >
                    →
                  </span>
                </button>

                {!canProceedToCheckout && !stockSyncing && (
                  <p className="mt-2 text-center text-[9px] font-bold uppercase tracking-wide text-[#6F4E37]">
                    Please remove unavailable pieces to continue
                  </p>
                )}

                {/* PROMO CODE */}
                <div className="mt-7 border-t border-[#E5E4E2] pt-6">
                  <label
                    htmlFor="cart-coupon-input"
                    className="block text-[9px] font-bold uppercase tracking-[0.18em] text-[#716C67]"
                  >
                    HAVE A PROMOTIONAL CODE?
                  </label>
                  <div className="mt-2 flex">
                    <input
                      id="cart-coupon-input"
                      type="text"
                      value={coupon}
                      onChange={(e) => setCoupon(e.target.value)}
                      placeholder="ENTER CODE"
                      className="min-w-0 flex-1 border border-[#E5E4E2] bg-[#FAF9F7] px-4 py-2.5 text-[10px] uppercase font-semibold text-[#252321] outline-none placeholder:text-[#D8D3CF] focus:border-[#6F4E37]"
                    />
                    <button
                      type="button"
                      onClick={applyCoupon}
                      className="border border-l-0 border-[#E5E4E2] bg-white px-5 text-[9px] font-bold uppercase tracking-[0.15em] text-[#6F4E37] transition hover:bg-[#FAF9F7]"
                    >
                      APPLY
                    </button>
                  </div>
                </div>

                {/* SECURE GUARANTEE */}
                <div className="mt-6 flex items-center justify-center gap-2 border-t border-[#E5E4E2] pt-5 text-[9px] font-semibold uppercase tracking-[0.15em] text-[#716C67]">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <rect x="5" y="11" width="14" height="10" rx="1" />
                    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                  </svg>
                  <span>COMPLIMENTARY SHIPPING OVER ₹1,999</span>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* RELATED SECTION */}
        <section className="mt-24 border-t border-[#E5E4E2] pt-14">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#6F4E37]">
                CURATED COMPLEMENTS
              </p>
              <h2 className="mt-2 text-2xl font-serif font-medium text-[#252321] md:text-3xl">
                Pieces You May Love
              </h2>
            </div>
            <button
              type="button"
              onClick={() => navigate("/shop")}
              className="group flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#716C67] transition hover:text-[#6F4E37]"
            >
              VIEW COLLECTION
              <span className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </button>
          </div>

          {relatedLoading ? (
            <div className="mt-8 flex h-60 items-center justify-center border border-[#E5E4E2] bg-white">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#E5E4E2] border-t-[#6F4E37]" />
            </div>
          ) : relatedProducts.length > 0 ? (
            <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4">
              {relatedProducts.map((item) => {
                const finalPrice = item.salePrice ?? item.price;
                const hasSale =
                  item.salePrice &&
                  Number(item.salePrice) < Number(item.price);

                return (
                  <button
                    key={item._id}
                    type="button"
                    onClick={() => openProduct(item._id)}
                    className="group text-left"
                  >
                    <div className="relative aspect-[0.8] overflow-hidden bg-white border border-[#E5E4E2]">
                      {item.images?.[0] ? (
                        <img
                          src={item.images[0]}
                          alt={item.name}
                          className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[9px] font-semibold uppercase text-[#716C67]">
                          NO IMAGE
                        </div>
                      )}

                      {hasSale && (
                        <span className="absolute left-3 top-3 bg-[#E6E0F0] px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.15em] text-[#6F4E37]">
                          SPECIAL OFFER
                        </span>
                      )}

                      <div className="absolute bottom-0 inset-x-0 translate-y-full bg-white/95 backdrop-blur-sm border-t border-[#E5E4E2] px-4 py-2.5 transition-transform duration-300 group-hover:translate-y-0">
                        <p className="text-center text-[9px] font-bold uppercase tracking-[0.15em] text-[#6F4E37]">
                          VIEW PIECE →
                        </p>
                      </div>
                    </div>

                    <div className="pt-3">
                      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#6F4E37]">
                        {item.anime}
                      </p>
                      <h3 className="mt-1 truncate text-xs font-serif font-medium text-[#252321]">
                        {item.name}
                      </h3>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="text-xs font-bold text-[#252321]">
                          {formatPrice(finalPrice)}
                        </span>
                        {hasSale && (
                          <span className="text-[10px] text-[#716C67] line-through">
                            {formatPrice(item.price)}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-8 border border-[#E5E4E2] bg-white p-10 text-center">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#716C67]">
                MORE PIECES COMING SOON
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default CartPage;