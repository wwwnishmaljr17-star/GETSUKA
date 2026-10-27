/**
 * Shared utility functions for formatting currency and dates.
 * Preserves standard en-IN formats used across GETSUKA.
 */

/**
 * Format numeric amount as Indian Rupee (INR) currency string.
 * Example: 2499 -> "₹2,499"
 *
 * @param {number|string} price - Price value to format
 * @returns {string} Formatted price with Rupee symbol
 */
export const formatPrice = (price) => {
  const numericPrice = Number(price);
  if (Number.isNaN(numericPrice)) {
    return "₹0";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(numericPrice);
};

/**
 * Format date value to localized display date.
 * Example: "2026-10-15T10:00:00.000Z" -> "15 Oct 2026"
 *
 * @param {string|Date|number} dateValue - Date value to format
 * @param {Intl.DateTimeFormatOptions} [options] - Optional custom format options
 * @returns {string} Localized date string
 */
export const formatDate = (dateValue, options = {}, fallback = "—") => {
  if (!dateValue) {
    return fallback;
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  const defaultOptions = {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...options,
  };

  return new Intl.DateTimeFormat("en-IN", defaultOptions).format(date);
};

/**
 * Format date value to localized date with time.
 * Example: "2026-10-15T10:30:00.000Z" -> "15 Oct 2026, 04:00 PM"
 *
 * @param {string|Date|number} dateValue - Date value to format
 * @returns {string} Localized date and time string
 */
export const formatDateTime = (dateValue) => {
  if (!dateValue) {
    return "N/A";
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
};

/**
 * Safe date formatter returning a fallback string on invalid or missing date.
 * Example: null -> "—"
 *
 * @param {string|Date|number} dateValue - Date value to format
 * @param {Intl.DateTimeFormatOptions} [options] - Optional custom format options
 * @param {string} [fallback] - Fallback string if invalid or null
 * @returns {string} Formatted date string
 */
export const formatDateSafe = (dateValue, options = {}, fallback = "—") => {
  return formatDate(dateValue, options, fallback);
};

