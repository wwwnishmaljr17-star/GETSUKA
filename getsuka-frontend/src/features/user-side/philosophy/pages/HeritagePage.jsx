import { useNavigate } from "react-router-dom";

import demonSlayer from "../../../../assets/home/demonSlayer.jpg";
import aot from "../../../../assets/home/aot.jpg";
import tshirt2 from "../../../../assets/home/tshirt2.jpg";

const HeritagePage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FAF9F7] text-[#252321]">
      {/* =====================================================
          HEADER / BREADCRUMB
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
            <span className="text-[#252321]">OUR HERITAGE</span>
          </div>

          <div className="mt-6 max-w-[780px]">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#6F4E37]">
              CHAPTER I
            </p>
            <h1 className="mt-2 font-serif text-4xl font-normal leading-tight text-[#252321] sm:text-5xl lg:text-6xl">
              The Genesis of GETSUKA
            </h1>
            <p className="mt-4 text-xs leading-relaxed text-[#716C67] sm:text-sm">
              Rooted in deep appreciation for Japanese animation, storytelling, and elevated streetwear, GETSUKA emerged from the pursuit of merchandise that mature anime enthusiasts can wear anywhere with quiet confidence.
            </p>
          </div>
        </div>
      </section>

      {/* =====================================================
          CHRONICLE SECTION (EDITORIAL DUAL LAYOUT)
      ===================================================== */}
      <section className="mx-auto max-w-[1400px] px-6 py-20 sm:px-8 lg:px-12">
        <div className="space-y-24">
          {/* ERA 1 */}
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-6">
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#6F4E37]">
                01 / THE SPARK
              </span>
              <h2 className="mt-2 font-serif text-3xl font-normal text-[#252321]">
                Bridging Two Worlds
              </h2>
              <p className="mt-4 text-xs leading-relaxed text-[#716C67] sm:text-sm">
                For years, anime apparel occupied extremes: either novelty merchandise destined for bedroom wear or fleeting fast-fashion collaborations. We envisioned a permanent home where the epic scale of shonen journeys, the psychological depth of seinen, and the refined cuts of high-end casualwear could exist as one cohesive wardrobe.
              </p>
              <p className="mt-3 text-xs leading-relaxed text-[#716C67] sm:text-sm">
                Every drop represents hundreds of silhouette iterations: balancing boxy drape, dense ribbed collars, and print placements that interact organically with human movement.
              </p>
            </div>
            <div className="overflow-hidden rounded-lg border border-[#E5E4E2] bg-white shadow-xs lg:col-span-6">
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={demonSlayer}
                  alt="Anime character storytelling"
                  className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                />
              </div>
              <div className="p-4 bg-[#FAF9F7] border-t border-[#E5E4E2]">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#6F4E37]">
                  VISUAL ARCHIVE
                </p>
                <p className="text-xs text-[#252321] mt-0.5">
                  Artistic inspiration drawn from emotional character arcs and legendary series.
                </p>
              </div>
            </div>
          </div>

          {/* ERA 2 */}
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="order-2 overflow-hidden rounded-lg border border-[#E5E4E2] bg-white shadow-xs lg:order-1 lg:col-span-6">
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={tshirt2}
                  alt="GETSUKA atelier tailored garment"
                  className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                />
              </div>
              <div className="p-4 bg-[#FAF9F7] border-t border-[#E5E4E2]">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#6F4E37]">
                  GARMENT DESIGN
                </p>
                <p className="text-xs text-[#252321] mt-0.5">
                  Custom engineered silhouettes made for versatility and durability.
                </p>
              </div>
            </div>
            <div className="order-1 lg:order-2 lg:col-span-6">
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#6F4E37]">
                02 / THE METHOD
              </span>
              <h2 className="mt-2 font-serif text-3xl font-normal text-[#252321]">
                Patient, Considered Drops
              </h2>
              <p className="mt-4 text-xs leading-relaxed text-[#716C67] sm:text-sm">
                Rather than flooding collections with generic items, GETSUKA operates on curated releases. Each piece is developed with focus, verified sizing tables, and true-to-character detailing that passes rigorous aesthetic review before public availability.
              </p>
              <div className="mt-6 flex items-center gap-6 border-t border-[#E5E4E2] pt-6">
                <div>
                  <p className="text-2xl font-bold font-serif text-[#6F4E37]">280+</p>
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#716C67] mt-1">GSM Premium Weight</p>
                </div>
                <div className="h-8 w-[1px] bg-[#E5E4E2]" />
                <div>
                  <p className="text-2xl font-bold font-serif text-[#6F4E37]">100%</p>
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#716C67] mt-1">Curated Original Lore</p>
                </div>
                <div className="h-8 w-[1px] bg-[#E5E4E2]" />
                <div>
                  <p className="text-2xl font-bold font-serif text-[#6F4E37]">Atelier</p>
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#716C67] mt-1">Studio Standards</p>
                </div>
              </div>
            </div>
          </div>

          {/* ERA 3 */}
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-6">
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#6F4E37]">
                03 / THE HORIZON
              </span>
              <h2 className="mt-2 font-serif text-3xl font-normal text-[#252321]">
                The Ever-Evolving Narrative
              </h2>
              <p className="mt-4 text-xs leading-relaxed text-[#716C67] sm:text-sm">
                GETSUKA continues to expand into seasonal capsules, oversized hoodies, accessories, and archival art pieces. Our commitment remains constant: treating anime with the artistic reverence it has earned, and outfitting you with garments that endure.
              </p>
              <div className="mt-8 flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => navigate("/philosophy/universe")}
                  className="rounded bg-[#6F4E37] px-6 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#5B3F2C]"
                >
                  NEXT: THE UNIVERSE →
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/shop")}
                  className="rounded border border-[#E5E4E2] bg-white px-6 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#252321] transition hover:border-[#6F4E37]"
                >
                  SHOP CATALOG
                </button>
              </div>
            </div>
            <div className="overflow-hidden rounded-lg border border-[#E5E4E2] bg-white shadow-xs lg:col-span-6">
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={aot}
                  alt="Epic anime storytelling"
                  className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                />
              </div>
              <div className="p-4 bg-[#FAF9F7] border-t border-[#E5E4E2]">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#6F4E37]">
                  LEGACY SERIES
                </p>
                <p className="text-xs text-[#252321] mt-0.5">
                  Monumental narratives that inspire our heaviest silhouettes and rawest typography.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HeritagePage;
