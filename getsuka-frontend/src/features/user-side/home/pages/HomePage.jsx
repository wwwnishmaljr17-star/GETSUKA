import { useNavigate } from "react-router-dom";

import heroImage from "../../../../assets/home/heroImage.jpg";

import tshirt1 from "../../../../assets/home/tshirt1.jpg";
import tshirt2 from "../../../../assets/home/tshirt2.jpg";
import tshirt3 from "../../../../assets/home/tshirt3.jpg";
import tshirt4 from "../../../../assets/home/tshirt4.jpg";
import tshirt5 from "../../../../assets/home/tshirt5.jpg";

import onePiece from "../../../../assets/home/onePiece.jpg";
import naruto from "../../../../assets/home/naruto.jpg";
import jjk from "../../../../assets/home/jjk.jpg";
import demonSlayer from "../../../../assets/home/demonSlayer.jpg";
import aot from "../../../../assets/home/aot.jpg";

const newArrivals = [
  {
    id: 1,
    name: "One Piece Oversized T-Shirt",
    anime: "ONE PIECE",
    price: "₹1,499",
    image: tshirt1,
  },
  {
    id: 2,
    name: "Jujutsu Kaisen T-Shirt",
    anime: "JUJUTSU KAISEN",
    price: "₹1,399",
    image: tshirt2,
  },
  {
    id: 3,
    name: "Naruto Graphic T-Shirt",
    anime: "NARUTO",
    price: "₹1,299",
    image: tshirt3,
  },
  {
    id: 4,
    name: "Demon Slayer T-Shirt",
    anime: "DEMON SLAYER",
    price: "₹1,399",
    image: tshirt4,
  },
];

const trendingProducts = [
  {
    id: 5,
    name: "Anime T-Shirt 01",
    anime: "ANIME COLLECTION",
    price: "₹1,499",
    image: tshirt1,
  },
  {
    id: 6,
    name: "Anime T-Shirt 02",
    anime: "ANIME COLLECTION",
    price: "₹1,499",
    image: tshirt2,
  },
  {
    id: 7,
    name: "Anime T-Shirt 03",
    anime: "ANIME COLLECTION",
    price: "₹1,499",
    image: tshirt3,
  },
  {
    id: 8,
    name: "Anime T-Shirt 04",
    anime: "ANIME COLLECTION",
    price: "₹1,499",
    image: tshirt4,
  },
  {
    id: 9,
    name: "Anime T-Shirt 05",
    anime: "ANIME COLLECTION",
    price: "₹1,499",
    image: tshirt5,
  },
];

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

const ProductCard = ({ product }) => {
  const navigate = useNavigate();

  return (
    <div
      className="group cursor-pointer"
      onClick={() => navigate("/shop")}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-gray-100">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        <div className="absolute top-2 left-2 bg-red-600 text-white text-[8px] tracking-wider px-2 py-1">
          NEW
        </div>
      </div>

      <div className="pt-3">
        <p className="text-[8px] text-gray-400 tracking-wider">
          {product.anime}
        </p>

        <h3 className="text-[11px] text-black mt-1">
          {product.name}
        </h3>

        <p className="text-[10px] font-medium mt-2">
          {product.price}
        </p>
      </div>
    </div>
  );
};

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-black">

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
          animation: getsukaMarquee 22s linear infinite;
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

      <section className="relative min-h-[620px] sm:min-h-[680px] lg:h-screen lg:min-h-[600px] overflow-hidden bg-black">

        <img
          src={heroImage}
          alt="GETSUKA anime fashion"
          className="absolute inset-0 w-full h-full object-cover"
        />

        <div className="absolute inset-0 bg-black/45" />

        <div className="relative z-10 min-h-[620px] sm:min-h-[680px] lg:h-full lg:min-h-0 max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-10 flex items-center">

          <div className="max-w-[520px] text-white">

            <p className="text-[10px] tracking-[0.4em] mb-5">
              GETSUKA / ANIME FASHION
            </p>

            <h1 className="text-[42px] sm:text-5xl md:text-7xl font-medium leading-[0.95] tracking-tight">
              WEAR YOUR
              <br />
              <span className="text-red-500">
                FAVORITE WORLD
              </span>
            </h1>

            <p className="text-[11px] sm:text-xs text-gray-300 mt-6 max-w-[400px] leading-6">
              Premium anime-inspired T-shirts
              created for those who carry their
              favorite worlds with them.
            </p>

            <div className="flex flex-col xs:flex-row gap-3 mt-8">

              <button
                onClick={() => navigate("/shop")}
                className="w-full xs:w-auto bg-white text-black px-7 py-3 text-[9px] tracking-widest hover:bg-gray-200"
              >
                SHOP T-SHIRTS
              </button>

              <button
                onClick={() => navigate("/shop")}
                className="w-full xs:w-auto border border-white text-white px-7 py-3 text-[9px] tracking-widest hover:bg-white hover:text-black"
              >
                EXPLORE COLLECTION
              </button>

            </div>

          </div>

        </div>
      </section>

      {/* ============================================
          NEW ARRIVALS
      ============================================ */}

      <section className="py-20 px-6 lg:px-10">

        <div className="max-w-[1400px] mx-auto">

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">

            <div>

              <p className="text-[9px] text-gray-400 tracking-[0.3em]">
                JUST DROPPED
              </p>

              <h2 className="text-2xl md:text-3xl font-medium mt-2">
                NEW ARRIVALS
              </h2>

            </div>

            <button
              onClick={() => navigate("/shop")}
              className="text-[9px] tracking-widest border-b border-black pb-1"
            >
              VIEW ALL
            </button>

          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">

            {newArrivals.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
              />
            ))}

          </div>

        </div>

      </section>

      {/* ============================================
          TRENDING
      ============================================ */}

      <section className="bg-[#0d0d0d] text-white py-20 px-6 lg:px-10">

        <div className="max-w-[1400px] mx-auto">

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">

            <div>

              <p className="text-[9px] text-gray-500 tracking-[0.3em]">
                MOST WANTED
              </p>

              <h2 className="text-2xl md:text-3xl font-medium mt-2">
                TRENDING NOW
              </h2>

            </div>

            <button
              onClick={() => navigate("/shop")}
              className="text-[9px] tracking-widest border-b border-white pb-1"
            >
              SHOP ALL
            </button>

          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">

            {trendingProducts.map((product) => (
              <div key={product.id}>

                <div
                  className="group cursor-pointer"
                  onClick={() => navigate("/shop")}
                >

                  <div className="relative aspect-[3/4] overflow-hidden bg-gray-900">

                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />

                    <div className="absolute top-2 left-2 bg-red-600 text-white text-[8px] tracking-wider px-2 py-1">
                      TRENDING
                    </div>

                  </div>

                  <div className="pt-3">

                    <p className="text-[8px] text-gray-500 tracking-wider">
                      {product.anime}
                    </p>

                    <h3 className="text-[11px] mt-1">
                      {product.name}
                    </h3>

                    <p className="text-[10px] font-medium mt-2">
                      {product.price}
                    </p>

                  </div>

                </div>

              </div>
            ))}

          </div>

        </div>

      </section>

      {/* ============================================
          SHOP BY ANIME
      ============================================ */}

      <section className="bg-black text-white py-20 px-6 lg:px-10">

        <div className="max-w-[1400px] mx-auto">

          <div className="text-center mb-10">

            <p className="text-[9px] text-gray-500 tracking-[0.3em]">
              FIND YOUR WORLD
            </p>

            <h2 className="text-[28px] sm:text-3xl md:text-4xl font-medium mt-3">
              SHOP BY ANIME
            </h2>

          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 sm:gap-2">

            {animeCollections.map((anime, index) => (
              <div
                key={anime.name}
                className={`relative group overflow-hidden cursor-pointer ${
                  index === 0
                    ? "md:col-span-2 md:row-span-2"
                    : ""
                }`}
                onClick={() => navigate("/shop")}
              >

                <div
                  className={`${
                    index === 0
                      ? "aspect-square"
                      : "aspect-[1.5/1]"
                  }`}
                >

                  <img
                    src={anime.image}
                    alt={anime.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />

                  <div className="absolute inset-0 bg-black/35 group-hover:bg-black/20 transition-colors" />

                  <div className="absolute inset-0 flex items-end p-5">

                    <div>

                      <p className="text-[8px] tracking-[0.3em] text-gray-300">
                        COLLECTION
                      </p>

                      <h3 className="text-lg md:text-xl font-medium mt-1">
                        {anime.name}
                      </h3>

                    </div>

                  </div>

                </div>

              </div>
            ))}

          </div>

        </div>

      </section>

      {/* ============================================
          LIVE MOVING RED BANNER
      ============================================ */}

      <section className="bg-red-600 text-white py-5 overflow-hidden">

        <div className="flex whitespace-nowrap">

          {/* FIRST TRACK */}

          <div className="flex shrink-0 getsuka-marquee">

            <p className="text-[10px] md:text-xs tracking-[0.4em] font-medium px-10">
              WEAR THE WORLD YOU LOVE. SHOP GETSUKA.
            </p>

            <p className="text-[10px] md:text-xs tracking-[0.4em] font-medium px-10">
              WEAR THE WORLD YOU LOVE. SHOP GETSUKA.
            </p>

            <p className="text-[10px] md:text-xs tracking-[0.4em] font-medium px-10">
              WEAR THE WORLD YOU LOVE. SHOP GETSUKA.
            </p>

            <p className="text-[10px] md:text-xs tracking-[0.4em] font-medium px-10">
              WEAR THE WORLD YOU LOVE. SHOP GETSUKA.
            </p>

          </div>

          {/* SECOND TRACK */}

          <div
            className="flex shrink-0 getsuka-marquee"
            aria-hidden="true"
          >

            <p className="text-[10px] md:text-xs tracking-[0.4em] font-medium px-10">
              WEAR THE WORLD YOU LOVE. SHOP GETSUKA.
            </p>

            <p className="text-[10px] md:text-xs tracking-[0.4em] font-medium px-10">
              WEAR THE WORLD YOU LOVE. SHOP GETSUKA.
            </p>

            <p className="text-[10px] md:text-xs tracking-[0.4em] font-medium px-10">
              WEAR THE WORLD YOU LOVE. SHOP GETSUKA.
            </p>

            <p className="text-[10px] md:text-xs tracking-[0.4em] font-medium px-10">
              WEAR THE WORLD YOU LOVE. SHOP GETSUKA.
            </p>

          </div>

        </div>

      </section>

      {/* ============================================
          BOTTOM
      ============================================ */}

      <section className="bg-black text-white py-10 px-6">

        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between gap-5">

          <p className="text-[9px] text-gray-500">
            © 2026 GETSUKA. UNLEASH YOUR STYLE.
          </p>

          <p className="text-[9px] text-gray-500 tracking-widest">
            ANIME / FASHION / CULTURE
          </p>

        </div>

      </section>

    </div>
  );
};

export default HomePage;