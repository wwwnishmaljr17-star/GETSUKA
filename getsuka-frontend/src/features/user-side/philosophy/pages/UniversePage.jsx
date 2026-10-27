import { useNavigate } from "react-router-dom";

import jjk from "../../../../assets/home/jjk.jpg";
import naruto from "../../../../assets/home/naruto.jpg";
import onePiece from "../../../../assets/home/onePiece.jpg";
import tshirt4 from "../../../../assets/home/tshirt4.jpg";
import tshirt5 from "../../../../assets/home/tshirt5.jpg";

const UniversePage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FAF9F7] text-[#252321]">
      {/* =====================================================
          HEADER / ATELIER MOODBOARD HERO
      ===================================================== */}
      <section className="border-b border-[#E5E4E2] bg-white py-14">
        <div className="mx-auto max-w-[1400px] px-6 sm:px-8 lg:px-12">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#716C67]">
            <button
              type="button"
              onClick={() => navigate("/philosophy")}
              className="text-[#6F4E37] hover:underline"
            >
              PHILOSOPHY
            </button>
            <span>/</span>
            <span className="text-[#252321]">THE GETSUKA UNIVERSE</span>
          </div>

          <div className="mt-6 max-w-[800px]">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#6F4E37]">
              CREATIVE DIRECTION & MOODBOARD
            </p>
            <h1 className="mt-2 font-serif text-4xl font-normal leading-tight text-[#252321] sm:text-5xl lg:text-6xl">
              Craft & Personal Expression
            </h1>
            <p className="mt-4 text-xs leading-relaxed text-[#716C67] sm:text-sm">
              Inside the GETSUKA studio, fashion is treated as a narrative canvas. Every color accent, typography placement, and silhouette cut is calibrated to express the psychological depth and visual atmosphere of anime worlds.
            </p>
          </div>
        </div>
      </section>

      {/* =====================================================
          EDITORIAL MOODBOARD GRID
      ===================================================== */}
      <section className="mx-auto max-w-[1400px] px-6 py-20 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
          {/* CARD 1: LARGE VISUAL HERO */}
          <div className="group overflow-hidden rounded-xl border border-[#E5E4E2] bg-white shadow-xs md:col-span-8">
            <div className="aspect-[16/9] overflow-hidden bg-[#211B18]">
              <img
                src={jjk}
                alt="Jujutsu Kaisen Atmospheric Creative Direction"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90"
              />
            </div>
            <div className="p-6">
              <span className="rounded bg-[#E6E0F0] px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.2em] text-[#6F4E37]">
                DISCIPLINE 01
              </span>
              <h2 className="mt-3 font-serif text-2xl font-medium text-[#252321]">
                Atmospheric Tension & Shadow
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-[#716C67]">
                Dark fantasy series demand rich, low-contrast palettes. We balance midnight blacks, deep mocha tints, and subtle metallic accents to evoke tension and power without relying on generic graphic noise.
              </p>
            </div>
          </div>

          {/* CARD 2: SIDE FEATURE */}
          <div className="group flex flex-col justify-between overflow-hidden rounded-xl border border-[#E5E4E2] bg-[#211B18] p-8 text-white md:col-span-4">
            <div>
              <span className="rounded border border-[#E6E0F0]/30 bg-[#E6E0F0]/15 px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.2em] text-[#E6E0F0]">
                ATELIER STANDARD
              </span>
              <h3 className="mt-4 font-serif text-xl font-medium text-white">
                The Luxury Palette
              </h3>
              <p className="mt-3 text-xs leading-relaxed text-[#E5E4E2]/80">
                Our palette was specifically formulated to complement all complexions and coordinate seamlessly with casual or elevated streetwear ensembles.
              </p>

              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full border border-white/20 bg-[#6F4E37]" />
                  <span className="text-[10px] font-bold tracking-wider text-[#E5E4E2]">Mocha Brown (#6F4E37)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full border border-white/20 bg-[#E5E4E2]" />
                  <span className="text-[10px] font-bold tracking-wider text-[#E5E4E2]">Platinum Silver (#E5E4E2)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full border border-white/20 bg-[#E6E0F0]" />
                  <span className="text-[10px] font-bold tracking-wider text-[#E5E4E2]">Pale Lavender (#E6E0F0)</span>
                </div>
              </div>
            </div>

            <div className="mt-8 border-t border-white/10 pt-4">
              <p className="text-[9px] uppercase tracking-widest text-[#E6E0F0]">
                Curated Chromatic Harmony
              </p>
            </div>
          </div>

          {/* CARD 3: GRAPHIC PROPORTIONS */}
          <div className="group overflow-hidden rounded-xl border border-[#E5E4E2] bg-white shadow-xs md:col-span-4">
            <div className="aspect-[4/3] overflow-hidden">
              <img
                src={tshirt4}
                alt="Graphic balance in streetwear"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
            <div className="p-6">
              <span className="rounded bg-[#E6E0F0] px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.2em] text-[#6F4E37]">
                DISCIPLINE 02
              </span>
              <h3 className="mt-3 font-serif text-lg font-medium text-[#252321]">
                Graphic Restraint
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[#716C67]">
                We avoid busy collages. Every graphic is anchored by intentional negative space, allowing the silhouette drape and fabric weight to share the visual stage.
              </p>
            </div>
          </div>

          {/* CARD 4: SHONEN ENERGY */}
          <div className="group overflow-hidden rounded-xl border border-[#E5E4E2] bg-white shadow-xs md:col-span-4">
            <div className="aspect-[4/3] overflow-hidden">
              <img
                src={naruto}
                alt="Naruto Shonen Inspiration"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
            <div className="p-6">
              <span className="rounded bg-[#E6E0F0] px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.2em] text-[#6F4E37]">
                DISCIPLINE 03
              </span>
              <h3 className="mt-3 font-serif text-lg font-medium text-[#252321]">
                Unbreakable Will
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[#716C67]">
                Shonen series inspire our most dynamic silhouettes. We translate perseverance and bonds into empowering daily wear that feels substantial on the body.
              </p>
            </div>
          </div>

          {/* CARD 5: CAPSULE REFINEMENT */}
          <div className="group overflow-hidden rounded-xl border border-[#E5E4E2] bg-white shadow-xs md:col-span-4">
            <div className="aspect-[4/3] overflow-hidden">
              <img
                src={tshirt5}
                alt="Editorial Capsule Design"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
            <div className="p-6">
              <span className="rounded bg-[#E6E0F0] px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.2em] text-[#6F4E37]">
                DISCIPLINE 04
              </span>
              <h3 className="mt-3 font-serif text-lg font-medium text-[#252321]">
                Timeless Wearability
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[#716C67]">
                Designed to outlive fast-fashion hype cycles. Each garment pairs seamlessly with tailored trousers, raw denim, overcoats, or utilitarian layers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          CTA AND NAVIGATION BAR
      ===================================================== */}
      <section className="border-t border-[#E5E4E2] bg-white py-16">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-6 px-6 text-center sm:px-8 md:flex-row md:text-left lg:px-12">
          <div>
            <h3 className="font-serif text-2xl font-medium text-[#252321]">
              Ready to Experience the Collection?
            </h3>
            <p className="mt-1 text-xs text-[#716C67]">
              Browse available drops and find the world that speaks to your aesthetic.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/philosophy")}
              className="rounded border border-[#E5E4E2] bg-[#FAF9F7] px-6 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#252321] transition hover:border-[#6F4E37]"
            >
              ← THE PHILOSOPHY
            </button>
            <button
              type="button"
              onClick={() => navigate("/philosophy/heritage")}
              className="rounded border border-[#E5E4E2] bg-[#FAF9F7] px-6 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#252321] transition hover:border-[#6F4E37]"
            >
              OUR HERITAGE
            </button>
            <button
              type="button"
              onClick={() => navigate("/shop")}
              className="rounded bg-[#6F4E37] px-6 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white shadow-md transition hover:bg-[#5B3F2C]"
            >
              SHOP CATALOG →
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default UniversePage;
