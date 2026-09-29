import { useEffect, useState } from "react";
import reviewApi from "../api/reviewApi";

const ReviewSection = ({ productId }) => {
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadReviews = async () => {
    try {
      setLoading(true);
      setError("");

      const response =
        await reviewApi.getProductReviews(productId);

      if (!response?.success) {
        throw new Error(
          response?.message ||
            "Failed to load reviews."
        );
      }

      const reviewData = response?.data || {};

      setReviews(
        Array.isArray(reviewData.reviews)
          ? reviewData.reviews
          : []
      );

      setAverageRating(
        Number(reviewData.averageRating || 0)
      );

      setTotalReviews(
        Number(reviewData.totalReviews || 0)
      );
    } catch (err) {
      console.error("LOAD REVIEWS ERROR:", err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load reviews."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (productId) {
      loadReviews();
    }
  }, [productId]);

  const handleSubmitReview = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!rating) {
      setError("Please select a rating.");
      return;
    }

    if (!comment.trim()) {
      setError("Please write a review.");
      return;
    }

    if (comment.trim().length < 3) {
      setError("Review must be at least 3 characters.");
      return;
    }

    if (comment.trim().length > 1000) {
      setError("Review cannot exceed 1000 characters.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await reviewApi.addReview(
        productId,
        {
          rating,
          comment: comment.trim(),
        }
      );

      if (!response?.success) {
        throw new Error(
          response?.message ||
            "Failed to add review."
        );
      }

      setRating(0);
      setComment("");

      setSuccess(
        "Your review has been added successfully."
      );

      await loadReviews();
    } catch (err) {
      console.error("ADD REVIEW ERROR:", err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to add review."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (
    value,
    interactive = false,
    size = "text-base"
  ) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() =>
              interactive && setRating(star)
            }
            className={`${size} leading-none transition-all duration-200 ${
              star <= value
                ? "text-[#e9002d]"
                : "text-[#252525]"
            } ${
              interactive
                ? "cursor-pointer hover:scale-110 hover:text-[#e9002d]"
                : "cursor-default"
            }`}
            aria-label={`${star} star${
              star > 1 ? "s" : ""
            }`}
          >
            ★
          </button>
        ))}
      </div>
    );
  };

  const formatDate = (date) => {
    if (!date) {
      return "";
    }

    return new Date(date).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  const getRatingLabel = () => {
    if (averageRating >= 4.5) return "EXCEPTIONAL";
    if (averageRating >= 4) return "EXCELLENT";
    if (averageRating >= 3) return "GOOD";
    if (averageRating >= 2) return "AVERAGE";
    if (averageRating > 0) return "POOR";
    return "NO RATINGS";
  };

  return (
    <section className="border-t border-[#151515] bg-black text-white">
      <div className="mx-auto max-w-[1500px] px-5 py-20 md:px-10 md:py-24 lg:px-14">

        {/* HEADER */}
        <div className="relative">
          <div className="absolute left-0 top-0 h-full w-[2px] bg-[#e9002d]" />

          <div className="pl-6 md:pl-8">
            <p className="text-[9px] font-bold uppercase tracking-[0.35em] text-[#e9002d]">
              CUSTOMER FEEDBACK
            </p>

            <h2 className="mt-4 text-4xl font-black uppercase leading-none tracking-[-0.05em] md:text-5xl lg:text-6xl">
              RATINGS
              <br />
              <span className="text-[#2a2a2a]">
                & REVIEWS
              </span>
            </h2>

            <div className="mt-7 flex items-center gap-4">
              <span className="h-px w-10 bg-[#e9002d]" />

              <p className="text-[9px] font-medium uppercase tracking-[0.25em] text-[#555]">
                {totalReviews}{" "}
                {totalReviews === 1 ? "REVIEW" : "REVIEWS"}
              </p>
            </div>
          </div>
        </div>

        {/* RATING OVERVIEW */}
        <div className="mt-14 grid grid-cols-1 gap-px border border-[#171717] bg-[#171717] lg:grid-cols-[0.8fr_1.2fr]">

          <div className="relative overflow-hidden bg-[#050505] p-8 md:p-10">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#e9002d]/5 blur-3xl" />

            <p className="relative text-[8px] font-bold uppercase tracking-[0.3em] text-[#777]">
              OVERALL RATING
            </p>

            <div className="relative mt-7 flex items-end gap-5">
              <span className="text-7xl font-black leading-none tracking-[-0.08em] md:text-8xl">
                {averageRating.toFixed(1)}
              </span>

              <span className="pb-2 text-xs uppercase tracking-[0.2em] text-[#555]">
                / 5
              </span>
            </div>

            <div className="relative mt-7">
              {renderStars(
                Math.round(averageRating),
                false,
                "text-xl"
              )}
            </div>

            <div className="relative mt-6 flex items-center gap-3">
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#e9002d]">
                {getRatingLabel()}
              </span>

              <span className="h-px w-8 bg-[#292929]" />

              <span className="text-[8px] uppercase tracking-[0.15em] text-[#555]">
                {totalReviews} VERIFIED REVIEWS
              </span>
            </div>
          </div>

          <div className="bg-[#080808] p-8 md:p-10">
            <div className="flex items-center justify-between">
              <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-[#777]">
                COMMUNITY RATING
              </p>

              <span className="text-[8px] uppercase tracking-[0.2em] text-[#444]">
                GETSUKA
              </span>
            </div>

            <div className="mt-8 space-y-5">
              {[5, 4, 3, 2, 1].map((star) => (
                <div
                  key={star}
                  className="flex items-center gap-4"
                >
                  <div className="flex w-10 items-center gap-1">
                    <span className="text-[9px] font-bold text-white">
                      {star}
                    </span>

                    <span className="text-[8px] text-[#e9002d]">
                      ★
                    </span>
                  </div>

                  <div className="h-[2px] flex-1 bg-[#1b1b1b]">
                    <div
                      className="h-full bg-[#e9002d] transition-all duration-700"
                      style={{
                        width:
                          totalReviews > 0 &&
                          Math.round(averageRating) === star
                            ? "72%"
                            : "0%",
                      }}
                    />
                  </div>

                  <span className="w-8 text-right text-[8px] text-[#555]">
                    {totalReviews > 0 &&
                    Math.round(averageRating) === star
                      ? totalReviews
                      : 0}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* MESSAGES */}
        {error && (
          <div className="mt-8 flex items-center gap-4 border-l-2 border-[#e9002d] bg-[#080808] px-5 py-4">
            <span className="text-[#e9002d]">!</span>

            <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white">
              {error}
            </p>
          </div>
        )}

        {success && (
          <div className="mt-8 flex items-center gap-4 border-l-2 border-[#333] bg-[#080808] px-5 py-4">
            <span className="text-white">✓</span>

            <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white">
              {success}
            </p>
          </div>
        )}

        {/* WRITE REVIEW */}
        <div className="mt-16">
          <div className="flex items-end justify-between border-b border-[#171717] pb-5">
            <div>
              <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-[#e9002d]">
                YOUR VOICE
              </p>

              <h3 className="mt-3 text-2xl font-black uppercase tracking-[-0.03em] text-white">
                WRITE A REVIEW
              </h3>
            </div>

            <span className="hidden text-[8px] uppercase tracking-[0.2em] text-[#555] md:block">
              SHARE YOUR EXPERIENCE
            </span>
          </div>

          <form
            onSubmit={handleSubmitReview}
            className="mt-8"
          >
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-[260px_1fr]">

              {/* RATING */}
              <div className="py-2">
                <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-white">
                  YOUR RATING
                </p>

                <div className="mt-5">
                  {renderStars(
                    rating,
                    true,
                    "text-2xl"
                  )}
                </div>

                <p className="mt-4 text-[8px] uppercase tracking-[0.15em] text-[#555]">
                  {rating === 0
                    ? "SELECT YOUR RATING"
                    : `${rating} / 5 SELECTED`}
                </p>
              </div>

              {/* COMMENT */}
              <div>
                <label
                  htmlFor="review-comment"
                  className="text-[9px] font-bold uppercase tracking-[0.25em] text-white"
                >
                  YOUR REVIEW
                </label>

                <div className="relative mt-4">
                  <textarea
                    id="review-comment"
                    value={comment}
                    onChange={(event) =>
                      setComment(event.target.value)
                    }
                    placeholder="Tell us about your experience..."
                    rows={4}
                    maxLength={1000}
                    className="w-full resize-none border-b border-[#292929] bg-transparent px-0 py-3 text-sm text-white outline-none transition placeholder:text-[#555] focus:border-[#e9002d]"
                  />

                  <span className="absolute bottom-2 right-0 text-[8px] uppercase tracking-[0.1em] text-[#555]">
                    {comment.length}/1000
                  </span>
                </div>

                <div className="mt-5 flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-[#e9002d] px-9 py-4 text-[9px] font-bold uppercase tracking-[0.2em] text-white transition-all duration-300 hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:bg-[#222] disabled:text-[#555]"
                  >
                    {submitting
                      ? "SUBMITTING..."
                      : "SUBMIT REVIEW →"}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* REVIEWS */}
        <div className="mt-20">
          <div className="flex items-end justify-between border-b border-[#171717] pb-5">
            <div>
              <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-[#e9002d]">
                COMMUNITY
              </p>

              <h3 className="mt-3 text-2xl font-black uppercase tracking-[-0.03em] text-white">
                WHAT THEY SAY
              </h3>
            </div>

            <span className="text-[8px] uppercase tracking-[0.2em] text-[#555]">
              {totalReviews} REVIEWS
            </span>
          </div>

          {loading ? (
            <div className="py-20 text-center">
              <div className="mx-auto h-6 w-6 animate-spin rounded-full border border-[#333] border-t-[#e9002d]" />

              <p className="mt-5 text-[8px] font-bold uppercase tracking-[0.25em] text-[#555]">
                Loading reviews...
              </p>
            </div>
          ) : reviews.length === 0 ? (
            <div className="py-20 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center border border-[#222] text-xl text-[#333]">
                ★
              </div>

              <p className="mt-7 text-[10px] font-bold uppercase tracking-[0.25em] text-white">
                No reviews yet
              </p>

              <p className="mt-3 text-xs text-[#555]">
                Be the first to share your experience.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#171717]">
              {reviews.map((review, index) => (
                <article
                  key={review._id}
                  className="group relative py-9 transition-colors duration-300 hover:bg-[#050505]"
                >
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-[220px_1fr]">

                    {/* USER */}
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#292929] bg-[#080808] text-[10px] font-bold text-white transition-colors group-hover:border-[#e9002d] group-hover:text-[#e9002d]">
                        {(review.user?.name || "G")
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white">
                          {review.user?.name ||
                            "GETSUKA USER"}
                        </p>

                        <p className="mt-2 text-[8px] uppercase tracking-[0.15em] text-[#555]">
                          CUSTOMER
                        </p>
                      </div>
                    </div>

                    {/* REVIEW */}
                    <div>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        {renderStars(
                          review.rating,
                          false,
                          "text-sm"
                        )}

                        <p className="text-[8px] uppercase tracking-[0.15em] text-[#555]">
                          {formatDate(review.createdAt)}
                        </p>
                      </div>

                      <p className="mt-5 max-w-3xl text-sm leading-7 text-white">
                        {review.comment}
                      </p>

                      <div className="mt-6 flex items-center gap-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        <span className="h-px w-6 bg-[#e9002d]" />

                        <span className="text-[7px] font-bold uppercase tracking-[0.25em] text-[#555]">
                          GETSUKA COMMUNITY
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className="absolute right-0 top-9 hidden text-[8px] font-bold tracking-[0.2em] text-[#222] md:block">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ReviewSection;
