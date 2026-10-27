import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import wishlistApi from "../api/wishlistApi";

const WishlistPage = () => {
  const navigate = useNavigate();

  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState(null);
  const [addingProductId, setAddingProductId] = useState(null);

  const loadWishlist = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await wishlistApi.getWishlist();

      if (!response?.success) {
        throw new Error(response?.message || "Failed to load wishlist.");
      }

      setWishlist(Array.isArray(response.wishlist) ? response.wishlist : []);
    } catch (err) {
      console.error("WISHLIST LOAD ERROR:", err);
      setWishlist([]);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load wishlist."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWishlist();
  }, []);

  const showNotification = (title, message, type = "success") => {
    setNotification({
      title,
      message,
      type,
    });

    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  const handleRemove = async (productId) => {
    if (!productId) return;

    try {
      const response = await wishlistApi.removeFromWishlist(productId);

      if (!response?.success) {
        throw new Error(
          response?.message || "Failed to remove product from wishlist."
        );
      }

      setWishlist((previous) => {
        const updated = previous.filter((item) => item.product?._id !== productId);
        window.dispatchEvent(
          new CustomEvent("wishlistUpdated", {
            detail: { count: updated.length },
          })
        );
        return updated;
      });

      showNotification("WISHLIST UPDATED", "Product removed from your wishlist.");
    } catch (err) {
      console.error("WISHLIST REMOVE ERROR:", err);
      showNotification(
        "REMOVE FAILED",
        err?.response?.data?.message ||
          err?.message ||
          "Failed to remove product.",
        "error"
      );
    }
  };

  const getProductImage = (product) => {
    if (Array.isArray(product?.images) && product.images.length > 0) {
      return product.images[0];
    }
    return "";
  };

  const getProductPrice = (product) => {
    return (
      product?.finalPrice ??
      product?.salePrice ??
      product?.price ??
      0
    );
  };

  const isOutOfStock = (product) => {
    return (
      product?.stockStatus === "OUT_OF_STOCK" ||
      product?.isListed === false ||
      product?.isDeleted === true
    );
  };

  const getAvailableVariant = (product) => {
    if (!Array.isArray(product?.variants)) {
      return null;
    }

    return (
      product.variants.find((variant) => Number(variant?.stock) > 0) || null
    );
  };

  const handleAddToCart = async (product) => {
    if (!product?._id || addingProductId) return;

    if (isOutOfStock(product)) {
      showNotification(
        "UNAVAILABLE",
        "This product is currently unavailable.",
        "error"
      );
      return;
    }

    const variant = getAvailableVariant(product);

    if (!variant) {
      showNotification(
        "OUT OF STOCK",
        "This product is currently out of stock.",
        "error"
      );
      return;
    }

    try {
      setAddingProductId(product._id);

      const savedCart = localStorage.getItem("getsukaCart");
      let currentCart = [];

      try {
        currentCart = savedCart ? JSON.parse(savedCart) : [];
      } catch {
        currentCart = [];
      }

      if (!Array.isArray(currentCart)) {
        currentCart = [];
      }

      const existingIndex = currentCart.findIndex(
        (item) =>
          item.productId === product._id && item.variantId === variant._id
      );

      if (existingIndex !== -1) {
        const existingItem = currentCart[existingIndex];
        const currentQuantity = Number(existingItem.quantity || 0);
        const stock = Number(variant.stock || 0);
        const newQuantity = currentQuantity + 1;

        if (newQuantity > stock) {
          showNotification(
            "STOCK LIMIT",
            `Only ${stock} item${stock > 1 ? "s" : ""} available in stock.`,
            "error"
          );
          return;
        }

        currentCart[existingIndex] = {
          ...existingItem,
          quantity: newQuantity,
          maxStock: stock,
        };
      } else {
        currentCart.push({
          productId: product._id,
          variantId: variant._id,
          name: product.name,
          anime: product.anime,
          image: getProductImage(product),
          price: getProductPrice(product),
          quantity: 1,
          size: variant.size,
          color: variant.color,
          sku: variant.sku,
          maxStock: Number(variant.stock || 0),
        });
      }

      localStorage.setItem("getsukaCart", JSON.stringify(currentCart));
      window.dispatchEvent(new Event("cartUpdated"));

      const response = await wishlistApi.removeFromWishlist(product._id);

      if (!response?.success) {
        throw new Error(
          response?.message ||
            "Product was added to cart but could not be removed from wishlist."
        );
      }

      setWishlist((previous) => {
        const updated = previous.filter((item) => item.product?._id !== product._id);
        window.dispatchEvent(
          new CustomEvent("wishlistUpdated", {
            detail: { count: updated.length },
          })
        );
        return updated;
      });

      showNotification(
        "ADDED TO CART",
        `${product.name} has been moved to your shopping cart.`
      );
    } catch (err) {
      console.error("WISHLIST ADD TO CART ERROR:", err);
      showNotification(
        "ADD TO CART FAILED",
        err?.response?.data?.message ||
          err?.message ||
          "Unable to add product to cart.",
        "error"
      );
    } finally {
      setAddingProductId(null);
    }
  };

  const openProduct = (productId) => {
    if (!productId) return;
    navigate(`/products/${productId}`);
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-[#FAF9F7] text-[#252321]">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-[#E5E4E2] border-t-[#6F4E37]" />
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#716C67]">
            Loading wishlist...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F7] text-[#252321]">
      {/* NOTIFICATION TOAST */}
      {notification && (
        <div className="fixed right-5 top-5 z-[100] w-[380px] max-w-[calc(100vw-40px)]">
          <div
            className={`border bg-white p-5 shadow-[0_20px_50px_rgba(33,27,24,0.08)] ${
              notification.type === "error"
                ? "border-[#6F4E37]"
                : "border-[#E5E4E2]"
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center border text-xs font-bold ${
                  notification.type === "error"
                    ? "border-[#6F4E37] text-[#6F4E37] bg-[#FAF9F7]"
                    : "border-[#E6E0F0] text-[#6F4E37] bg-[#E6E0F0]/50"
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
                onClick={() => setNotification(null)}
                className="text-lg leading-none text-[#716C67] transition hover:text-[#252321]"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDITORIAL HEADER */}
      <section className="border-b border-[#E5E4E2] bg-white">
        <div className="mx-auto max-w-[1440px] px-6 pb-12 pt-14 md:px-10 lg:px-14">
          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#6F4E37]">
              GETSUKA ARCHIVE
            </p>
            <h1 className="mt-3 text-4xl font-serif font-medium tracking-tight text-[#252321] md:text-6xl">
              Saved Pieces
            </h1>
            <p className="mx-auto mt-3 max-w-md text-xs leading-6 text-[#716C67]">
              Curate your personal collection of limited anime fashion. Pieces saved here remain monitored for live stock availability.
            </p>

            <div className="mx-auto mt-6 inline-flex items-center gap-2 border border-[#E5E4E2] bg-[#FAF9F7] px-4 py-2 text-[10px] font-bold tracking-[0.18em] text-[#6F4E37]">
              <span>{wishlist.length}</span>
              <span>{wishlist.length === 1 ? "PIECE SAVED" : "PIECES SAVED"}</span>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <main className="mx-auto max-w-[1440px] px-6 py-12 md:px-10 lg:px-14">
        {/* ERROR */}
        {error && (
          <div className="mb-8 border border-[#E5E4E2] bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#6F4E37]">
              {error}
            </p>
          </div>
        )}

        {/* EMPTY STATE */}
        {!error && wishlist.length === 0 && (
          <div className="flex min-h-[440px] items-center justify-center border border-[#E5E4E2] bg-white p-8">
            <div className="text-center max-w-md">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#E6E0F0]/50 border border-[#E5E4E2] text-2xl text-[#6F4E37]">
                ♥
              </div>

              <h2 className="mt-5 text-2xl font-serif font-medium text-[#252321]">
                Your Wishlist Is Empty
              </h2>

              <p className="mt-2 text-xs leading-6 text-[#716C67]">
                Save pieces you love while browsing to keep them easily accessible for your next outfit curation.
              </p>

              <button
                type="button"
                onClick={() => navigate("/shop")}
                className="mt-6 bg-[#6F4E37] px-8 py-3.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white transition hover:bg-[#211B18]"
              >
                EXPLORE ARCHIVE
              </button>
            </div>
          </div>
        )}

        {/* WISHLIST GRID */}
        {!error && wishlist.length > 0 && (
          <div className="grid grid-cols-2 gap-x-5 gap-y-12 md:grid-cols-3 xl:grid-cols-4">
            {wishlist.map((item) => {
              const product = item.product;
              if (!product) return null;

              const image = getProductImage(product);
              const price = getProductPrice(product);
              const unavailable = isOutOfStock(product);
              const adding = addingProductId === product._id;

              return (
                <article key={item._id} className="group">
                  {/* IMAGE */}
                  <div className="relative aspect-[0.78] overflow-hidden border border-[#E5E4E2] bg-white">
                    <button
                      type="button"
                      onClick={() => openProduct(product._id)}
                      className="absolute inset-0 z-10 cursor-pointer"
                      aria-label={`View ${product.name}`}
                    />

                    {image ? (
                      <img
                        src={image}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs font-semibold uppercase text-[#716C67]">
                        No Image
                      </div>
                    )}

                    {/* REMOVE BUTTON */}
                    <button
                      type="button"
                      aria-label="Remove from wishlist"
                      onClick={() => handleRemove(product._id)}
                      className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm border border-[#E5E4E2] text-sm text-[#6F4E37] shadow-sm transition hover:bg-[#6F4E37] hover:text-white"
                    >
                      ♥
                    </button>

                    {unavailable && (
                      <div className="absolute inset-0 z-15 flex items-center justify-center bg-[#211B18]/60">
                        <span className="bg-[#6F4E37] px-3 py-1 text-[8px] font-bold uppercase tracking-[0.15em] text-white">
                          OUT OF STOCK
                        </span>
                      </div>
                    )}
                  </div>

                  {/* DETAILS */}
                  <div className="mt-4">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#6F4E37]">
                      {product.anime}
                    </p>

                    <h3
                      onClick={() => openProduct(product._id)}
                      className="mt-1 min-h-[38px] cursor-pointer text-xs font-serif font-medium text-[#252321] transition hover:text-[#6F4E37] line-clamp-2"
                    >
                      {product.name}
                    </h3>

                    <p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-[#716C67]">
                      {product.category?.name || "Apparel"}
                    </p>

                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-sm font-bold text-[#252321]">
                        ₹{Number(price).toLocaleString("en-IN")}
                      </span>
                    </div>

                    {/* ACTIONS */}
                    <button
                      type="button"
                      disabled={unavailable || adding}
                      onClick={() => handleAddToCart(product)}
                      className="mt-4 flex h-10 w-full items-center justify-center bg-[#6F4E37] text-[9px] font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#211B18] disabled:cursor-not-allowed disabled:bg-[#D8D3CF] disabled:text-white"
                    >
                      {adding
                        ? "ADDING TO CART..."
                        : unavailable
                        ? "OUT OF STOCK"
                        : "MOVE TO CART"}
                    </button>

                    <button
                      type="button"
                      onClick={() => openProduct(product._id)}
                      className="mt-2.5 block w-full text-center text-[9px] font-bold uppercase tracking-[0.16em] text-[#716C67] transition hover:text-[#6F4E37]"
                    >
                      VIEW DETAILS →
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default WishlistPage;