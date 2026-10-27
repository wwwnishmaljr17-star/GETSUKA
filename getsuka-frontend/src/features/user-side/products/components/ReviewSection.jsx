import { useCallback, useEffect, useState } from "react";
import reviewApi from "../api/reviewApi";
import { formatDate as formatSharedDate } from "../../../../shared/utils/formatters";

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

  const loadReviews = useCallback(async () => {
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
  }, [productId]);

  useEffect(() => {
    if (productId) {
      loadReviews();
    }
  }, [productId, loadReviews]);

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
                ? "text-[#6F4E37]"
                : "text-[#D8D3CF]"
            } ${
              interactive
                ? "cursor-pointer hover:scale-110 hover:text-[#5B3F2C]"
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

  const formatDate = (date) => formatSharedDate(date, {}, "");

  const getRatingLabel = () => {
    if (averageRating >= 4.5) return "EXCEPTIONAL";
    if (averageRating >= 4) return "EXCELLENT";
    if (averageRating >= 3) return "GOOD";
    if (averageRating >= 2) return "AVERAGE";
    if (averageRating > 0) return "POOR";
    return "NO RATINGS";
  };

  return (
    <section className="border-t border-[#E5E4E2] bg-[#FAF9F7] text-[#252321]">
      <div className="mx-auto max-w-[1500px] px-5 py-16 md:px-10 md:py-20 lg:px-14">

        {/* HEADER */}
        <div className="relative">
          <div className="absolute left-0 top-0 h-full w-[3px] bg-[#6F4E37]" />

          <div className="pl-6 md:pl-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#6F4E37]">
              CLIENT FEEDBACK
            </p>

            <h2 className="mt-3 text-3xl font-normal font-serif uppercase tracking-tight text-[#252321] md:text-5xl">
              RATINGS & REVIEWS
            </h2>

            <div className="mt-4 flex items-center gap-3">
              <span className="h-px w-8 bg-[#6F4E37]" />

              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#716C67]">
                {totalReviews}{" "}
                {totalReviews === 1 ? "VERIFIED REVIEW" : "VERIFIED REVIEWS"}
              </p>
            </div>
          </div>
        </div>

        {/* RATING OVERVIEW */}
        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-[0.8fr_1.2fr]">

          <div className="relative overflow-hidden rounded-md border border-[#E5E4E2] bg-white p-8 md:p-10 shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#716C67]">
              OVERALL RATING
            </p>

            <div className="mt-6 flex items-end gap-4">
              <span className="text-6xl font-normal font-serif leading-none text-[#6F4E37] md:text-7xl">
                {averageRating.toFixed(1)}
              </span>

              <span className="pb-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#716C67]">
                / 5.0
              </span>
            </div>

            <div className="mt-5">
              {renderStars(
                Math.round(averageRating),
                false,
                "text-xl"
              )}
            </div>

            <div className="mt-6 flex items-center gap-3">
              <span className="rounded bg-[#E6E0F0] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.15em] text-[#6F4E37]">
                {getRatingLabel()}
              </span>

              <span className="h-px w-6 bg-[#E5E4E2]" />

              <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#716C67]">
                {totalReviews} REVIEWS
              </span>
            </div>
          </div>

          <div className="rounded-md border border-[#E5E4E2] bg-white p-8 md:p-10 shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#716C67]">
                RATING BREAKDOWN
              </p>

              <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#6F4E37]">
                GETSUKA ARCHIVE
              </span>
            </div>

            <div className="mt-6 space-y-4">
              {[5, 4, 3, 2, 1].map((star) => (
                <div
                  key={star}
                  className="flex items-center gap-4"
                >
                  <div className="flex w-10 items-center gap-1">
                    <span className="text-xs font-bold text-[#252321]">
                      {star}
                    </span>

                    <span className="text-xs text-[#6F4E37]">
                      ★
                    </span>
                  </div>

                  <div className="h-2 flex-1 rounded-full bg-[#FAF9F7] border border-[#E5E4E2] overflow-hidden">
                    <div
                      className="h-full bg-[#6F4E37] transition-all duration-700 rounded-full"
                      style={{
                        width:
                          totalReviews > 0 &&
                          Math.round(averageRating) === star
                            ? "80%"
                            : "0%",
                      }}
                    />
                  </div>

                  <span className="w-8 text-right text-xs font-semibold text-[#716C67]">
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
          <div className="mt-8 flex items-center gap-3 rounded-md border border-red-200 bg-red-50 px-5 py-4 text-xs font-semibold text-red-800">
            <span>!</span>
            <p className="uppercase tracking-wider">{error}</p>
          </div>
        )}

        {success && (
          <div className="mt-8 flex items-center gap-3 rounded-md border border-green-200 bg-green-50 px-5 py-4 text-xs font-semibold text-green-800">
            <span>✓</span>
            <p className="uppercase tracking-wider">{success}</p>
          </div>
        )}

        {/* WRITE REVIEW */}
        <div className="mt-14 rounded-md border border-[#E5E4E2] bg-white p-8 md:p-10 shadow-xs">
          <div className="flex items-end justify-between border-b border-[#E5E4E2] pb-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#6F4E37]">
                SHARE YOUR FEEDBACK
              </p>

              <h3 className="mt-2 text-xl md:text-2xl font-serif font-normal uppercase text-[#252321]">
                WRITE A REVIEW
              </h3>
            </div>

            <span className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-[#716C67] md:block">
              VERIFIED ATELIER OPINION
            </span>
          </div>

          <form
            onSubmit={handleSubmitReview}
            className="mt-6"
          >
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">

              {/* RATING */}
              <div className="py-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#252321]">
                  YOUR RATING
                </p>

                <div className="mt-4">
                  {renderStars(
                    rating,
                    true,
                    "text-2xl"
                  )}
                </div>

                <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#716C67]">
                  {rating === 0
                    ? "SELECT YOUR RATING"
                    : `${rating} OF 5 STARS`}
                </p>
              </div>

              {/* COMMENT */}
              <div>
                <label
                  htmlFor="review-comment"
                  className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#252321]"
                >
                  YOUR THOUGHTS
                </label>

                <div className="relative mt-3">
                  <textarea
                    id="review-comment"
                    value={comment}
                    onChange={(event) =>
                      setComment(event.target.value)
                    }
                    placeholder="Tell us about the fabric feel, fit, sizing, and design..."
                    rows={4}
                    maxLength={1000}
                    className="w-full resize-none rounded-md border border-[#E5E4E2] bg-[#FAF9F7] p-4 text-xs text-[#252321] outline-none transition placeholder:text-[#716C67] focus:border-[#6F4E37] focus:bg-white"
                  />

                  <span className="absolute bottom-3 right-3 text-[9px] uppercase tracking-[0.1em] text-[#716C67]">
                    {comment.length}/1000
                  </span>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded bg-[#6F4E37] px-8 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white shadow-xs transition hover:bg-[#5B3F2C] disabled:cursor-not-allowed disabled:opacity-50"
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
        <div className="mt-16">
          <div className="flex items-end justify-between border-b border-[#E5E4E2] pb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#6F4E37]">
                COMMUNITY VOICES
              </p>

              <h3 className="mt-2 text-xl md:text-2xl font-serif font-normal uppercase text-[#252321]">
                CUSTOMER EXPERIENCES
              </h3>
            </div>

            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#716C67]">
              {totalReviews} REVIEWS
            </span>
          </div>

          {loading ? (
            <div className="py-16 text-center">
              <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-[#D8D3CF] border-t-[#6F4E37]" />

              <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#716C67]">
                Loading reviews...
              </p>
            </div>
          ) : reviews.length === 0 ? (
            <div className="rounded-md border border-[#E5E4E2] bg-white py-16 text-center shadow-xs mt-6">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#E6E0F0] text-xl text-[#6F4E37]">
                ★
              </div>

              <p className="mt-5 text-sm font-bold uppercase text-[#252321]">
                No reviews yet
              </p>

              <p className="mt-2 text-xs text-[#716C67]">
                Be the first to share your experience with this piece.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {reviews.map((review, index) => (
                <article
                  key={review._id}
                  className="rounded-md border border-[#E5E4E2] bg-white p-6 md:p-8 shadow-xs transition hover:border-[#6F4E37]/40"
                >
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-[220px_1fr]">

                    {/* USER */}
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#CDC4DF] bg-[#E6E0F0] text-xs font-bold text-[#6F4E37]">
                        {(review.user?.name || "G")
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase text-[#252321]">
                          {review.user?.name ||
                            "GETSUKA CLIENT"}
                        </p>

                        <div className="mt-1 flex items-center gap-2 text-[9px] uppercase tracking-wider text-[#716C67]">
                          <span>CLIENT</span>
                          {review.isVerifiedPurchase !== false && (
                            <span className="rounded bg-[#E6E0F0] px-1.5 py-0.5 font-bold text-[#6F4E37]">
                              ✓ VERIFIED BUYER
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* REVIEW */}
                    <div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        {renderStars(
                          review.rating,
                          false,
                          "text-sm"
                        )}

                        <p className="text-[10px] font-medium text-[#716C67]">
                          {formatDate(review.createdAt)}
                        </p>
                      </div>

                      <p className="mt-4 text-xs leading-relaxed text-[#252321]">
                        {review.comment}
                      </p>
                    </div>
                  </div>
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
