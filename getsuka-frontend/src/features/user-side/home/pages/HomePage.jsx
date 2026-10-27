import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import heroImage from "../../../../assets/home/heroImage.jpg";

import onePiece from "../../../../assets/home/onePiece.jpg";
import naruto from "../../../../assets/home/naruto.jpg";
import jjk from "../../../../assets/home/jjk.jpg";
import demonSlayer from "../../../../assets/home/demonSlayer.jpg";
import aot from "../../../../assets/home/aot.jpg";
import tshirt1 from "../../../../assets/home/tshirt1.jpg";
import tshirt2 from "../../../../assets/home/tshirt2.jpg";

import productApi from "../../products/api/productApi";

const animeCollections = [
  {
    name: "ONE PIECE",
    image: onePiece,
  },
  {
    name: "NARUTO",
    image: naruto,
  },
  {
    name: "JUJUTSU KAISEN",
    image: jjk,
  },
  {
    name: "DEMON SLAYER",
    image: demonSlayer,
  },
  {
    name: "ATTACK ON TITAN",
    image: aot,
  },
];

const HomeProductCard = ({ product, badgeLabel = "NEW", theme = "light" }) => {
  const navigate = useNavigate();

  const primaryImage =
    Array.isArray(product?.images) && product.images.length > 0
      ? product.images[0]
      : null;

  const alternateImage =
    Array.isArray(product?.images) && product.images.length > 1
      ? product.images[1]
      : null;

  const finalPrice =
    product?.finalPrice ?? product?.salePrice ?? product?.price ?? 0;

  const isDark = theme === "dark";

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`View ${product?.name || "Product"}, ₹${Number(finalPrice).toLocaleString("en-IN")}`}
      className={`group cursor-pointer rounded-[20px] border border-transparent p-3 transition-all duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 ${
        isDark
          ? "bg-[#29221F] hover:border-[#6F4E37]/50 hover:shadow-[0_16px_35px_rgba(0,0,0,0.4)] focus-visible:ring-[#E6E0F0]"
          : "bg-white hover:border-[#E5E4E2] hover:shadow-[0_16px_35px_rgba(111,78,55,0.08)] focus-visible:ring-[#6F4E37]"
      }`}
      onClick={() => navigate(`/products/${product?._id}`)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          navigate(`/products/${product?._id}`);
        }
      }}
    >
      <div
        className={`relative aspect-[3/4] overflow-hidden rounded-[16px] ${
          isDark ? "bg-[#1B1513]" : "bg-[#F4F0F7]"
        }`}
      >
        {primaryImage ? (
          <>
            <img
              src={primaryImage}
              alt={product?.name || "Product"}
              loading="lazy"
              decoding="async"
              className={`h-full w-full object-cover transition-all duration-500 ease-out ${
                alternateImage ? "group-hover:opacity-0" : "group-hover:scale-105"
              }`}
            />
            {alternateImage && (
              <img
                src={alternateImage}
                alt={`${product?.name || "Product"} alternate view`}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover opacity-0 transition-all duration-500 ease-out group-hover:opacity-100 group-hover:scale-105"
              />
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-xs font-semibold uppercase text-[#716C67]">
            No Image
          </div>
        )}

        {badgeLabel && (
          <div
            className={`absolute top-2.5 left-2.5 rounded-full px-2.5 py-0.5 text-[8px] font-bold tracking-widest shadow-xs ${
              isDark
                ? "bg-[#6F4E37] text-white"
                : "border border-[#CDC4DF] bg-[#E6E0F0] text-[#6F4E37]"
            }`}
          >
            {badgeLabel}
          </div>
        )}

        {/* FLOATING VIEW DETAILS PILL ON HOVER */}
        <div className="pointer-events-none absolute inset-x-3 bottom-3 flex justify-center opacity-0 transition-all duration-300 transform translate-y-2 group-hover:opacity-100 group-hover:translate-y-0">
          <span className={`w-full text-center rounded-full py-2 px-4 text-[10px] font-bold tracking-[0.16em] uppercase shadow-md ${
            isDark ? "bg-[#211B18]/95 text-white" : "bg-white/95 text-[#252321]"
          }`}>
            VIEW DETAILS
          </span>
        </div>
      </div>

      <div className="pt-3 px-1 pb-1">
        <p
          className={`text-[9px] font-semibold tracking-[0.2em] uppercase ${
            isDark ? "text-[#CDC4DF]" : "text-[#716C67]"
          }`}
        >
          {product?.anime || "GETSUKA ATELIER"}
        </p>

        <h3
          className={`mt-1 text-xs font-semibold truncate transition ${
            isDark
              ? "text-white group-hover:text-[#E6E0F0]"
              : "text-[#252321] group-hover:text-[#6F4E37]"
          }`}
        >
          {product?.name}
        </h3>

        <div className="mt-2 flex items-center gap-2">
          <p
            className={`text-xs font-bold ${
              isDark ? "text-[#E6E0F0]" : "text-[#6F4E37]"
            }`}
          >
            ₹{Number(finalPrice).toLocaleString("en-IN")}
          </p>
          {product?.salePrice &&
            Number(product.salePrice) < Number(product.price) && (
              <span
                className={`text-[9px] line-through ${
                  isDark ? "text-[#E5E4E2]/50" : "text-[#716C67]"
                }`}
              >
                ₹{Number(product.price).toLocaleString("en-IN")}
              </span>
            )}
        </div>
      </div>
    </div>
  );
};

const HomePage = () => {
  const navigate = useNavigate();

  const [newArrivals, setNewArrivals] = useState([]);
  const [loadingNewArrivals, setLoadingNewArrivals] = useState(true);

  const [trendingProducts, setTrendingProducts] = useState([]);
  const [loadingTrending, setLoadingTrending] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadLiveMerchandising = async () => {
      // 1. Load genuine New Arrivals (sorted by newest created date, published only)
      try {
        setLoadingNewArrivals(true);
        const arrivalsResponse = await productApi.getProducts({
          sort: "newest",
          limit: 4,
        });

        if (isMounted && arrivalsResponse?.success) {
          setNewArrivals(
            Array.isArray(arrivalsResponse.products)
              ? arrivalsResponse.products
              : []
          );
        }
      } catch (err) {
        console.error("Failed to load live New Arrivals:", err);
      } finally {
        if (isMounted) setLoadingNewArrivals(false);
      }

      // 2. Load admin-controlled Trending products (isTrending: true, published only)
      try {
        setLoadingTrending(true);
        const trendingResponse = await productApi.getProducts({
          trending: true,
          limit: 8,
        });

        if (isMounted && trendingResponse?.success) {
          setTrendingProducts(
            Array.isArray(trendingResponse.products)
              ? trendingResponse.products
              : []
          );
        }
      } catch (err) {
        console.error("Failed to load live Trending products:", err);
      } finally {
        if (isMounted) setLoadingTrending(false);
      }
    };

    loadLiveMerchandising();

    return () => {
      isMounted = false;
    };
  }, []);

  const location = useLocation();

  useEffect(() => {
    if (location.hash === "#philosophy") {
      const el = document.getElementById("philosophy");
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth" });
        }, 150);
      }
    }
  }, [location.hash]);

  return (
    <div className="min-h-screen bg-[#F4F0F7] text-[#252321]">
      {/* ============================================
          LIVE MARQUEE ANIMATION
      ============================================ */}
      <style>{`
        @keyframes getsukaMarquee {
          0% {
            transform: translateX(0);
          }

          100% {
            transform: translateX(-100%);
          }
        }

        .getsuka-marquee {
          animation: getsukaMarquee 26s linear infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .getsuka-marquee {
            animation: none;
          }
        }
      `}</style>

      {/* ============================================
          HERO
      ============================================ */}
      <section className="relative min-h-[620px] sm:min-h-[680px] lg:h-[calc(100vh-76px)] lg:min-h-[620px] overflow-hidden bg-[#211B18]">
        <img
          src={heroImage}
          alt="GETSUKA anime fashion"
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover opacity-75"
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#211B18]/90 via-[#211B18]/65 to-transparent" />

        <div className="relative z-10 min-h-[620px] sm:min-h-[680px] lg:h-full max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12 flex items-center">
          <div className="max-w-[560px] text-white">
            <div className="inline-flex items-center gap-2 rounded border border-[#E6E0F0]/30 bg-[#E6E0F0]/15 px-3 py-1 backdrop-blur-md mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-[#E6E0F0]" />
              <p className="text-[10px] font-bold tracking-[0.35em] text-[#E6E0F0] uppercase">
                GETSUKA / EDITORIAL DROP
              </p>
            </div>

            <h1 className="text-[44px] sm:text-6xl md:text-7xl font-light leading-[1.02] tracking-tight font-serif">
              WEAR YOUR
              <br />
              <span className="font-semibold italic text-[#E6E0F0] font-serif">
                FAVORITE WORLD
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-[#E5E4E2]/85 mt-6 max-w-[440px] leading-relaxed">
              Curated luxury anime streetwear crafted with heavyweight fabrics,
              subtle Japanese typography, and tailored silhouettes.
            </p>

            <div className="flex flex-col xs:flex-row gap-3.5 mt-9">
              <button
                type="button"
                onClick={() => navigate("/shop")}
                className="w-full xs:w-auto rounded bg-[#6F4E37] text-white px-8 py-3.5 text-[10px] font-bold tracking-[0.2em] uppercase shadow-md transition hover:bg-[#5B3F2C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                SHOP COLLECTION
              </button>

              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById("philosophy");
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth" });
                  } else {
                    navigate("/#philosophy");
                  }
                }}
                className="w-full xs:w-auto rounded border border-[#E5E4E2] bg-white/10 backdrop-blur-sm text-[#E5E4E2] px-8 py-3.5 text-[10px] font-bold tracking-[0.2em] uppercase transition hover:bg-white hover:text-[#252321] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                OUR PHILOSOPHY
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          NEW ARRIVALS (REAL DATABASE PRODUCTS)
      ============================================ */}
      <section className="py-20 px-6 sm:px-8 lg:px-12 bg-[#F4F0F7]">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10 pb-4 border-b border-[#E5E4E2]">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#6F4E37]">
                SEASONAL DROP
              </p>

              <h2 className="text-2xl md:text-4xl font-normal font-serif text-[#252321] mt-2">
                NEW ARRIVALS
              </h2>
            </div>

            <button
              type="button"
              onClick={() => navigate("/shop")}
              className="group inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#6F4E37] transition hover:text-[#5B3F2C]"
            >
              <span>VIEW FULL CATALOG</span>
              <span className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </button>
          </div>

          {loadingNewArrivals ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="animate-pulse rounded-md border border-[#E5E4E2] bg-white p-2.5"
                >
                  <div className="aspect-[3/4] bg-[#E5E4E2]/50 rounded" />
                  <div className="mt-3 h-3 w-16 bg-[#E5E4E2]/60 rounded" />
                  <div className="mt-2 h-4 w-32 bg-[#E5E4E2]/60 rounded" />
                  <div className="mt-2 h-3 w-12 bg-[#E5E4E2]/60 rounded" />
                </div>
              ))}
            </div>
          ) : newArrivals.length === 0 ? (
            <div className="rounded-md border border-[#E5E4E2] bg-white p-12 text-center">
              <p className="font-serif text-lg text-[#252321]">
                New Seasonal Drops Arriving Soon
              </p>
              <p className="mt-2 text-xs text-[#716C67]">
                Explore our full catalog to discover all active atelier releases.
              </p>
              <button
                type="button"
                onClick={() => navigate("/shop")}
                className="mt-6 rounded bg-[#6F4E37] px-6 py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white transition hover:bg-[#5B3F2C]"
              >
                DISCOVER CATALOG
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {newArrivals.map((product) => (
                <HomeProductCard
                  key={product._id}
                  product={product}
                  badgeLabel="NEW"
                  theme="light"
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ============================================
          TRENDING (DARK LUXURY - ADMIN CONTROLLED)
      ============================================ */}
      <section className="bg-[#211B18] text-white py-24 px-6 sm:px-8 lg:px-12 border-y border-[#6F4E37]/20">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10 pb-4 border-b border-[#E5E4E2]/15">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#E6E0F0]">
                MOST WANTED
              </p>

              <h2 className="text-2xl md:text-4xl font-normal font-serif text-white mt-2">
                TRENDING NOW
              </h2>
            </div>

            <button
              type="button"
              onClick={() => navigate("/shop")}
              className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#E6E0F0] border-b border-[#E6E0F0] pb-1 transition hover:text-white hover:border-white"
            >
              SHOP ALL TRENDING
            </button>
          </div>

          {loadingTrending ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 md:gap-6">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="animate-pulse rounded-md border border-[#6F4E37]/30 bg-[#29221F] p-2.5"
                >
                  <div className="aspect-[3/4] bg-white/10 rounded" />
                  <div className="mt-3 h-3 w-16 bg-white/10 rounded" />
                  <div className="mt-2 h-4 w-32 bg-white/10 rounded" />
                  <div className="mt-2 h-3 w-12 bg-white/10 rounded" />
                </div>
              ))}
            </div>
          ) : trendingProducts.length === 0 ? (
            <div className="rounded-md border border-[#6F4E37]/30 bg-[#29221F] p-12 text-center">
              <p className="font-serif text-lg text-white">
                Curating the Next Seasonal Spotlight
              </p>
              <p className="mt-2 text-xs text-[#E5E4E2]/70">
                Admins select trending items in real-time. Explore all current designs in our shop.
              </p>
              <button
                type="button"
                onClick={() => navigate("/shop")}
                className="mt-6 rounded bg-[#6F4E37] px-6 py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white transition hover:bg-[#5B3F2C]"
              >
                BROWSE ALL PIECES
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {trendingProducts.map((product) => (
                <HomeProductCard
                  key={product._id}
                  product={product}
                  badgeLabel="TRENDING"
                  theme="dark"
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ============================================
          OUR PHILOSOPHY (ANIME-INSPIRED HAUTE COUTURE)
      ============================================ */}
      <section id="philosophy" className="py-24 px-6 sm:px-8 lg:px-12 bg-[#F4F0F7] border-y border-[#E5E4E2]/60 overflow-hidden">
        <div className="max-w-[1400px] mx-auto">
          {/* ANIME UNIVERSE BADGE RIBBON */}
          <div className="mb-12 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
            {[
              "ONE PIECE",
              "JUJUTSU KAISEN",
              "DEMON SLAYER",
              "ATTACK ON TITAN",
              "NARUTO",
              "BLEACH",
              "BERSERK",
              "EVANGELION",
            ].map((universe, idx) => (
              <span
                key={universe}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#6F4E37]/20 bg-white/70 px-3.5 py-1 text-[9px] font-bold tracking-[0.2em] text-[#6F4E37] shadow-xs backdrop-blur-xs transition hover:border-[#6F4E37] hover:bg-white"
              >
                <span className="h-1 w-1 rounded-full bg-[#6F4E37]/60" />
                {universe}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* LEFT EDITORIAL COLUMN */}
            <div className="lg:col-span-6">
              <div className="inline-flex items-center gap-2 rounded border border-[#6F4E37]/20 bg-[#6F4E37]/10 px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#6F4E37]" />
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#6F4E37]">
                  THE GETSUKA ETHOS / ANIME-INSPIRED ATELIER
                </p>
              </div>

              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-normal font-serif text-[#252321] mt-4 tracking-tight leading-[1.08]">
                Where Anime Lore Meets <span className="italic font-serif">Haute Streetwear</span>
              </h2>

              <p className="mt-6 text-sm sm:text-base leading-relaxed text-[#716C67] max-w-[560px]">
                GETSUKA was forged from a singular conviction: anime narratives carry the emotional depth and philosophical resonance of modern mythology. From the unbreakable wills of the Grand Line to the harrowing sacrifices of Jujutsu sorcery, these stories define generations. We reject cheap, disposable screen prints in favor of disciplined Japanese atelier craftsmanship.
              </p>

              <blockquote className="my-7 pl-5 border-l-2 border-[#6F4E37] font-serif italic text-base sm:text-lg text-[#252321] max-w-[520px]">
                &ldquo;You do not simply wear merchandise; you inhabit the conviction, lore, and aesthetic universe of the stories that shaped you.&rdquo;
              </blockquote>

              <p className="text-sm sm:text-base leading-relaxed text-[#716C67] max-w-[560px]">
                Every silhouette is an exploration of form, subtle typography, and architectural geometry. We weave character convictions into high-density 280+ GSM combed cotton, pairing minimalist katakana embroidery with archival palette choices that whisper character lore to those who recognize it.
              </p>

              {/* 4 CORE DESIGN PILLARS */}
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-[560px]">
                <div className="rounded-lg border border-[#E5E4E2] bg-white/80 p-4 shadow-xs backdrop-blur-xs">
                  <span className="text-[10px] font-bold tracking-[0.2em] text-[#6F4E37] uppercase">01 / NARRATIVE COUTURE</span>
                  <p className="mt-1 text-xs text-[#716C67]">
                    Translating anime arcs into wearable high-fashion without loud, garish prints.
                  </p>
                </div>
                <div className="rounded-lg border border-[#E5E4E2] bg-white/80 p-4 shadow-xs backdrop-blur-xs">
                  <span className="text-[10px] font-bold tracking-[0.2em] text-[#6F4E37] uppercase">02 / TOKYO TAILORING</span>
                  <p className="mt-1 text-xs text-[#716C67]">
                    Sculptural drop-shoulder silhouettes cut from premium 280+ GSM combed terry.
                  </p>
                </div>
                <div className="rounded-lg border border-[#E5E4E2] bg-white/80 p-4 shadow-xs backdrop-blur-xs">
                  <span className="text-[10px] font-bold tracking-[0.2em] text-[#6F4E37] uppercase">03 / UNIVERSE PALETTE</span>
                  <p className="mt-1 text-xs text-[#716C67]">
                    Moonlit lavender, rich mocha earth, and brushed platinum tones.
                  </p>
                </div>
                <div className="rounded-lg border border-[#E5E4E2] bg-white/80 p-4 shadow-xs backdrop-blur-xs">
                  <span className="text-[10px] font-bold tracking-[0.2em] text-[#6F4E37] uppercase">04 / SUBTLE EMBROIDERY</span>
                  <p className="mt-1 text-xs text-[#716C67]">
                    Hidden manga coordinates, tonal kanji crests, and archival emblems.
                  </p>
                </div>
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-5">
                <button
                  type="button"
                  onClick={() => navigate("/shop")}
                  className="group inline-flex items-center gap-2 rounded bg-[#6F4E37] px-6 py-3 text-[10px] font-bold uppercase tracking-[0.22em] text-white shadow-md transition hover:bg-[#5B3F2C]"
                >
                  <span>EXPLORE ANIME ARCHIVES</span>
                  <span className="transition-transform group-hover:translate-x-1.5">→</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/philosophy")}
                  className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#6F4E37] transition hover:text-[#5B3F2C]"
                >
                  <span className="border-b border-[#6F4E37] pb-1">READ FULL MANIFESTO</span>
                </button>
              </div>
            </div>

            {/* RIGHT OVERLAPPING TILTED EDITORIAL CARDS */}
            <div className="lg:col-span-6 relative flex items-center justify-center min-h-[460px] sm:min-h-[520px]">
              {/* BACK TILTED CARD */}
              <div className="absolute w-[240px] sm:w-[300px] aspect-[3/4] rounded-[24px] overflow-hidden shadow-xl -rotate-6 transform -translate-x-12 -translate-y-4 border-4 border-white transition-transform duration-500 hover:-rotate-3 bg-white">
                <img
                  src={tshirt1}
                  alt="GETSUKA anime-inspired tailoring"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* FRONT TILTED CARD */}
              <div className="relative z-10 w-[240px] sm:w-[300px] aspect-[3/4] rounded-[24px] overflow-hidden shadow-2xl rotate-3 transform translate-x-10 translate-y-4 border-4 border-white transition-transform duration-500 hover:rotate-1 bg-white">
                <img
                  src={tshirt2}
                  alt="GETSUKA luxury anime silhouettes"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />

                {/* FLOATING PILL BADGE MATCHING REFERENCE */}
                <div className="absolute bottom-5 -left-4 z-20">
                  <span className="rounded-full bg-white/95 backdrop-blur-md px-5 py-2.5 text-[9px] font-bold uppercase tracking-[0.2em] text-[#252321] shadow-lg border border-[#E5E4E2]">
                    EST. 2026 — TOKYO ATELIER EDITION
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          SHOP BY ANIME (EDITORIAL COLLECTIONS)
      ============================================ */}
      <section className="py-24 px-6 sm:px-8 lg:px-12 bg-[#F4F0F7]">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center max-w-[620px] mx-auto mb-16">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#6F4E37]">
              ICONIC ARCHIVES
            </p>

            <h2 className="text-3xl md:text-5xl font-normal font-serif text-[#252321] mt-2">
              SHOP BY UNIVERSE
            </h2>

            <p className="text-xs text-[#716C67] mt-3">
              Curated silhouettes honoring landmark anime narratives, character
              arcs, and philosophical journeys.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {animeCollections.map((anime, index) => {
              const animeFilterMap = {
                "ONE PIECE": "One Piece",
                "NARUTO": "Naruto",
                "JUJUTSU KAISEN": "Jujutsu Kaisen",
                "DEMON SLAYER": "Demon Slayer",
                "ATTACK ON TITAN": "Attack on Titan",
              };
              const targetAnime = animeFilterMap[anime.name] || anime.name;

              return (
                <div
                  key={anime.name}
                  className={`group relative overflow-hidden rounded-[20px] border border-transparent bg-white cursor-pointer shadow-xs transition-all duration-300 hover:border-[#E5E4E2] hover:shadow-[0_16px_35px_rgba(111,78,55,0.12)] hover:-translate-y-1 ${
                    index === 0 ? "sm:col-span-2 lg:col-span-1" : ""
                  }`}
                  onClick={() => navigate(`/shop?anime=${encodeURIComponent(targetAnime)}`)}
                >
                  <div className="aspect-[4/5] sm:aspect-[16/11] lg:aspect-[4/5] relative overflow-hidden rounded-[20px]">
                    <img
                      src={anime.image}
                      alt={anime.name}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-[#211B18]/85 via-[#211B18]/30 to-transparent transition-opacity group-hover:opacity-90" />

                    <div className="absolute inset-0 flex items-end p-6">
                      <div>
                        <span className="inline-block rounded-full bg-[#E6E0F0] px-3 py-1 text-[8px] font-bold tracking-[0.25em] text-[#6F4E37] uppercase mb-2">
                          COLLECTION
                        </span>

                        <h3 className="text-lg md:text-2xl font-serif text-white font-medium">
                          {anime.name}
                        </h3>

                        <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.18em] text-[#E5E4E2] opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                          EXPLORE PIECES →
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================
          LUXURY MARQUEE RIBBON
      ============================================ */}
      <section className="bg-[#6F4E37] text-[#FAF9F7] py-4 overflow-hidden border-y border-[#5B3F2C]">
        <div className="flex whitespace-nowrap">
          {/* FIRST TRACK */}
          <div className="flex shrink-0 getsuka-marquee items-center">
            <p className="text-[10px] md:text-xs tracking-[0.35em] font-bold uppercase px-8 flex items-center gap-3">
              <span>✦</span> WEAR THE WORLD YOU LOVE <span>✦</span> GETSUKA EDITORIAL APPAREL
            </p>

            <p className="text-[10px] md:text-xs tracking-[0.35em] font-bold uppercase px-8 flex items-center gap-3 text-[#E6E0F0]">
              <span>✦</span> PREMIUM STREETWEAR SILHOUETTES <span>✦</span> LIMITED CAPSULES
            </p>

            <p className="text-[10px] md:text-xs tracking-[0.35em] font-bold uppercase px-8 flex items-center gap-3">
              <span>✦</span> WEAR THE WORLD YOU LOVE <span>✦</span> GETSUKA EDITORIAL APPAREL
            </p>

            <p className="text-[10px] md:text-xs tracking-[0.35em] font-bold uppercase px-8 flex items-center gap-3 text-[#E6E0F0]">
              <span>✦</span> PREMIUM STREETWEAR SILHOUETTES <span>✦</span> LIMITED CAPSULES
            </p>
          </div>

          {/* SECOND TRACK */}
          <div
            className="flex shrink-0 getsuka-marquee items-center"
            aria-hidden="true"
          >
            <p className="text-[10px] md:text-xs tracking-[0.35em] font-bold uppercase px-8 flex items-center gap-3">
              <span>✦</span> WEAR THE WORLD YOU LOVE <span>✦</span> GETSUKA EDITORIAL APPAREL
            </p>

            <p className="text-[10px] md:text-xs tracking-[0.35em] font-bold uppercase px-8 flex items-center gap-3 text-[#E6E0F0]">
              <span>✦</span> PREMIUM STREETWEAR SILHOUETTES <span>✦</span> LIMITED CAPSULES
            </p>

            <p className="text-[10px] md:text-xs tracking-[0.35em] font-bold uppercase px-8 flex items-center gap-3">
              <span>✦</span> WEAR THE WORLD YOU LOVE <span>✦</span> GETSUKA EDITORIAL APPAREL
            </p>

            <p className="text-[10px] md:text-xs tracking-[0.35em] font-bold uppercase px-8 flex items-center gap-3 text-[#E6E0F0]">
              <span>✦</span> PREMIUM STREETWEAR SILHOUETTES <span>✦</span> LIMITED CAPSULES
            </p>
          </div>
        </div>
      </section>

      {/* ============================================
          BOTTOM FOOTER
      ============================================ */}
      <footer className="bg-[#211B18] text-[#E5E4E2] py-12 px-6 sm:px-8 border-t border-[#6F4E37]/30">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <span className="text-xl font-bold tracking-[0.25em] text-white">
              GETSUKA
            </span>
            <p className="text-[10px] text-[#716C67] mt-1">
              © 2026 GETSUKA LUXURY APPAREL. ALL RIGHTS RESERVED.
            </p>
          </div>

          <div className="flex items-center gap-8 text-[10px] font-semibold tracking-[0.2em] text-[#E5E4E2]/80 uppercase">
            <button
              type="button"
              onClick={() => navigate("/shop")}
              className="hover:text-[#E6E0F0] transition"
            >
              Shop
            </button>
            <button
              type="button"
              onClick={() => navigate("/philosophy")}
              className="hover:text-[#E6E0F0] transition"
            >
              Philosophy
            </button>
            <button
              type="button"
              onClick={() => navigate("/wishlist")}
              className="hover:text-[#E6E0F0] transition"
            >
              Wishlist
            </button>
            <button
              type="button"
              onClick={() => navigate("/account")}
              className="hover:text-[#E6E0F0] transition"
            >
              Account
            </button>
          </div>

          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#E6E0F0]">
            ANIME / FASHION / ARCHIVE
          </p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;