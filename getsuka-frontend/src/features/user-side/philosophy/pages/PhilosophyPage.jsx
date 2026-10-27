import { useNavigate } from "react-router-dom";

import heroImage from "../../../../assets/home/heroImage.jpg";
import tshirt1 from "../../../../assets/home/tshirt1.jpg";
import tshirt3 from "../../../../assets/home/tshirt3.jpg";
import onePiece from "../../../../assets/home/onePiece.jpg";

const PhilosophyPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FAF9F7] text-[#252321]">
      {/* =====================================================
          HERO SECTION
      ===================================================== */}
      <section className="relative overflow-hidden border-b border-[#E5E4E2] bg-[#211B18] text-white">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="GETSUKA atelier background"
            className="h-full w-full object-cover opacity-40 mix-blend-luminosity"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#211B18] via-[#211B18]/70 to-transparent" />
        </div>

        <div className="relative mx-auto max-w-[1400px] px-6 py-24 sm:px-8 lg:px-12 lg:py-36">
          <div className="max-w-[760px]">
            <div className="inline-flex items-center gap-2 rounded border border-[#E6E0F0]/30 bg-[#E6E0F0]/10 px-3 py-1 backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-[#E6E0F0]" />
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#E6E0F0]">
                GETSUKA MANIFESTO
              </p>
            </div>

            <h1 className="mt-6 font-serif text-4xl font-normal leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
              THE INTERSECTION OF
              <br />
              <span className="font-serif italic text-[#E6E0F0]">
                ANIME & HAUTE STREETWEAR
              </span>
            </h1>

            <p className="mt-6 text-sm leading-relaxed text-[#E5E4E2]/85 sm:text-base">
              GETSUKA was created from a single conviction: anime narratives carry the profound emotional resonance of modern mythology, and the garments representing them should mirror that depth through uncompromising design, disciplined tailoring, and thoughtful aesthetics.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => navigate("/shop")}
                className="rounded bg-[#6F4E37] px-8 py-3.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-md transition hover:bg-[#5B3F2C]"
              >
                EXPLORE CATALOG
              </button>
              <button
                type="button"
                onClick={() => navigate("/philosophy/heritage")}
                className="rounded border border-[#E5E4E2] bg-white/10 px-8 py-3.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#E5E4E2] backdrop-blur-sm transition hover:bg-white hover:text-[#252321]"
              >
                OUR HERITAGE
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          EDITORIAL STATEMENT / THE THREE PILLARS
      ===================================================== */}
      <section className="mx-auto max-w-[1400px] px-6 py-20 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#6F4E37]">
              OUR FOUNDATION
            </p>
            <h2 className="mt-3 font-serif text-3xl font-normal leading-tight text-[#252321] sm:text-4xl">
              Subtlety Over Loudness. Substance Over Trend.
            </h2>
            <p className="mt-5 text-xs leading-relaxed text-[#716C67] sm:text-sm">
              Too often, anime merchandise prioritizes loud, low-resolution screen prints over wearable silhouettes. GETSUKA exists to invert this paradigm: every piece begins as a premium streetwear silhouette designed for daily wear, adorned with intentional typography, atmospheric compositions, and licensed motifs that whisper character lore rather than shout it.
            </p>

            <div className="mt-8 border-l-2 border-[#6F4E37] pl-4">
              <p className="font-serif text-sm italic text-[#252321]">
                &ldquo;You do not simply wear merchandise; you inhabit the spirit, conviction, and aesthetic universe of the stories that shaped you.&rdquo;
              </p>
              <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.2em] text-[#6F4E37]">
                — The GETSUKA Studio
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:col-span-7">
            <div className="rounded-lg border border-[#E5E4E2] bg-white p-6 shadow-xs transition hover:border-[#6F4E37]/40">
              <span className="flex h-10 w-10 items-center justify-center rounded bg-[#E6E0F0] text-sm font-bold text-[#6F4E37]">
                01
              </span>
              <h3 className="mt-4 font-serif text-lg font-medium text-[#252321]">
                Narrative Integrity
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[#716C67]">
                Each capsule reflects careful character and world study. From color palettes derived from key animated sequences to typographic tributes, the design honors the emotional core of the source work.
              </p>
            </div>

            <div className="rounded-lg border border-[#E5E4E2] bg-white p-6 shadow-xs transition hover:border-[#6F4E37]/40">
              <span className="flex h-10 w-10 items-center justify-center rounded bg-[#E6E0F0] text-sm font-bold text-[#6F4E37]">
                02
              </span>
              <h3 className="mt-4 font-serif text-lg font-medium text-[#252321]">
                Architectural Fit
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[#716C67]">
                Structured drop-shoulders, heavyweight cotton drape, and calibrated necklines ensure that every silhouette stands firm as a contemporary streetwear staple.
              </p>
            </div>

            <div className="rounded-lg border border-[#E5E4E2] bg-white p-6 shadow-xs transition hover:border-[#6F4E37]/40">
              <span className="flex h-10 w-10 items-center justify-center rounded bg-[#E6E0F0] text-sm font-bold text-[#6F4E37]">
                03
              </span>
              <h3 className="mt-4 font-serif text-lg font-medium text-[#252321]">
                Disciplined Palette
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[#716C67]">
                Rich Mocha Brown, Platinum Silver, and Pale Lavender form our chromatic signature, anchoring vibrant anime elements within an understated luxury context.
              </p>
            </div>

            <div className="rounded-lg border border-[#E5E4E2] bg-white p-6 shadow-xs transition hover:border-[#6F4E37]/40">
              <span className="flex h-10 w-10 items-center justify-center rounded bg-[#E6E0F0] text-sm font-bold text-[#6F4E37]">
                04
              </span>
              <h3 className="mt-4 font-serif text-lg font-medium text-[#252321]">
                Identity & Community
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[#716C67]">
                A quiet nod between kindred spirits in the wild. Wearing GETSUKA is an authentic signal of shared cultural appreciation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          EDITORIAL IMAGE GALLERY (AUTHENTIC ASSETS)
      ===================================================== */}
      <section className="border-y border-[#E5E4E2] bg-white py-20">
        <div className="mx-auto max-w-[1400px] px-6 sm:px-8 lg:px-12">
          <div className="mb-10 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#6F4E37]">
              ATELIER ARCHIVE
            </p>
            <h2 className="mt-2 font-serif text-3xl font-normal text-[#252321] sm:text-4xl">
              Curated Silhouette Visuals
            </h2>
            <p className="mx-auto mt-3 max-w-[540px] text-xs text-[#716C67]">
              Visual excerpts from recent GETSUKA studio drops celebrating anime culture and tailored fashion.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="group overflow-hidden rounded-md border border-[#E5E4E2] bg-[#FAF9F7]">
              <div className="aspect-[3/4] overflow-hidden">
                <img
                  src={tshirt1}
                  alt="GETSUKA Atelier Graphic Silhouette"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="p-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#6F4E37]">
                  DROP 01
                </p>
                <h4 className="mt-1 font-serif text-sm font-medium text-[#252321]">
                  Heavyweight Graphic Tee
                </h4>
                <p className="mt-1 text-[10px] text-[#716C67]">
                  Precision silk-screen artwork on 280 GSM tailored cotton.
                </p>
              </div>
            </div>

            <div className="group overflow-hidden rounded-md border border-[#E5E4E2] bg-[#FAF9F7]">
              <div className="aspect-[3/4] overflow-hidden">
                <img
                  src={onePiece}
                  alt="Anime Creative Direction"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="p-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#6F4E37]">
                  SERIES ART
                </p>
                <h4 className="mt-1 font-serif text-sm font-medium text-[#252321]">
                  Iconic Narrative Imagery
                </h4>
                <p className="mt-1 text-[10px] text-[#716C67]">
                  Celebrating unforgettable journeys, camaraderie, and will.
                </p>
              </div>
            </div>

            <div className="group overflow-hidden rounded-md border border-[#E5E4E2] bg-[#FAF9F7] sm:col-span-2 lg:col-span-1">
              <div className="aspect-[3/4] overflow-hidden">
                <img
                  src={tshirt3}
                  alt="Monochrome Capsule Design"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="p-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#6F4E37]">
                  DROP 03
                </p>
                <h4 className="mt-1 font-serif text-sm font-medium text-[#252321]">
                  Minimalist Typography Edit
                </h4>
                <p className="mt-1 text-[10px] text-[#716C67]">
                  Subtle Japanese characters layered over relaxed proportions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          SISTER PAGES NAVIGATION
      ===================================================== */}
      <section className="bg-[#FAF9F7] py-20">
        <div className="mx-auto max-w-[1400px] px-6 sm:px-8 lg:px-12">
          <div className="mb-8 flex flex-col items-start justify-between gap-4 border-b border-[#E5E4E2] pb-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#6F4E37]">
                EXPAND THE JOURNEY
              </p>
              <h2 className="mt-1 font-serif text-2xl font-normal text-[#252321] sm:text-3xl">
                Explore the GETSUKA Story
              </h2>
            </div>
            <button
              type="button"
              onClick={() => navigate("/shop")}
              className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6F4E37] transition hover:text-[#5B3F2C]"
            >
              SHOP ALL PIECES →
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate("/philosophy/heritage")}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/philosophy/heritage")}
              className="group cursor-pointer rounded-lg border border-[#E5E4E2] bg-white p-8 transition-all hover:border-[#6F4E37]/50 hover:shadow-md"
            >
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#6F4E37]">
                PAGE A
              </span>
              <h3 className="mt-2 font-serif text-2xl font-medium text-[#252321] group-hover:text-[#6F4E37] transition">
                Our Heritage & The Story of GETSUKA
              </h3>
              <p className="mt-3 text-xs leading-relaxed text-[#716C67]">
                Discover how the vision began: bridging the worlds of Tokyo subcultures and contemporary luxury fashion through patient development.
              </p>
              <span className="mt-5 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#6F4E37]">
                READ HERITAGE STORY →
              </span>
            </div>

            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate("/philosophy/universe")}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/philosophy/universe")}
              className="group cursor-pointer rounded-lg border border-[#E5E4E2] bg-white p-8 transition-all hover:border-[#6F4E37]/50 hover:shadow-md"
            >
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#6F4E37]">
                PAGE B
              </span>
              <h3 className="mt-2 font-serif text-2xl font-medium text-[#252321] group-hover:text-[#6F4E37] transition">
                The GETSUKA Universe / Craft & Expression
              </h3>
              <p className="mt-3 text-xs leading-relaxed text-[#716C67]">
                Unpack the artistic direction: character motifs, graphic balance, and the creative discipline behind every seasonal drop.
              </p>
              <span className="mt-5 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#6F4E37]">
                EXPLORE THE UNIVERSE →
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PhilosophyPage;
