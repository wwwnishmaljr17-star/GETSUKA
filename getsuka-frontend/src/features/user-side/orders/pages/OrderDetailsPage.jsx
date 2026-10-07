import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  getUserOrderById,
  cancelUserOrderItem,
  returnUserOrder,
} from "../api/orderApi";

const OrderDetailsPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =========================================================
  // ITEM CANCELLATION STATES
  // =========================================================

  const [showItemCancelModal, setShowItemCancelModal] =
    useState(false);

  const [selectedItem, setSelectedItem] =
    useState(null);

  const [itemCancellationReason, setItemCancellationReason] =
    useState("");

  const [itemCancelLoading, setItemCancelLoading] =
    useState(false);

  const [itemCancelError, setItemCancelError] =
    useState("");

  const [itemCancelRefund, setItemCancelRefund] =
    useState(null);

  // =========================================================
  // RETURN REQUEST STATES
  // =========================================================

  const [showReturnModal, setShowReturnModal] =
    useState(false);

  const [returnReason, setReturnReason] =
    useState("");

  const [returnLoading, setReturnLoading] =
    useState(false);

  const [returnError, setReturnError] =
    useState("");

  // =========================================================
  // LOAD ORDER
  // =========================================================

  useEffect(() => {
    const loadOrder = async () => {
      if (!orderId) {
        setError("Order ID is missing.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response =
          await getUserOrderById(orderId);

        const orderData =
          response?.order ||
          response?.data?.order ||
          response?.data ||
          response;

        if (!orderData) {
          throw new Error("Order not found.");
        }

        setOrder(orderData);
      } catch (error) {
        console.error(
          "Load Order Details Error:",
          error
        );

        setError(
          error?.response?.data?.message ||
            "Unable to load order details."
        );
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [orderId]);

  // =========================================================
  // HELPERS
  // =========================================================

  const formatPrice = (price) => {
    const amount = Number(price || 0);

    return `₹${amount.toLocaleString("en-IN")}`;
  };

  const formatDate = (date) => {
    if (!date) {
      return "—";
    }

    try {
      return new Date(date).toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }
      );
    } catch {
      return "—";
    }
  };

  const formatStatus = (status) => {
    if (!status) {
      return "Unknown";
    }

    return status
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  };

  const getPaymentMethod = (method) => {
    if (!method) {
      return "—";
    }

    switch (method) {
      case "upi":
        return "UPI";

      case "card":
        return "Card";

      case "netbanking":
        return "Net Banking";

      case "cod":
        return "Cash on Delivery";

      default:
        return formatStatus(method);
    }
  };

  const getDeliveryMethod = (method) => {
    if (!method) {
      return "Standard Delivery";
    }

    if (method === "express") {
      return "Express Delivery";
    }

    return "Standard Delivery";
  };

  const getProductImage = (item) => {
    return (
      item?.productImage ||
      item?.image ||
      ""
    );
  };

  const getItemCount = () => {
    if (!Array.isArray(order?.items)) {
      return 0;
    }

    return order.items.reduce(
      (total, item) =>
        total +
        Number(item?.quantity || 0),
      0
    );
  };

  // =========================================================
  // ORDER STATUS
  // =========================================================

  const statusSteps = useMemo(
    () => [
      {
        key: "placed",
        label: "ORDER PLACED",
      },
      {
        key: "confirmed",
        label: "PROCESSING",
      },
      {
        key: "shipped",
        label: "SHIPPED",
      },
      {
        key: "out_for_delivery",
        label: "OUT FOR DELIVERY",
      },
      {
        key: "delivered",
        label: "DELIVERED",
      },
    ],
    []
  );

  const currentStatusIndex = useMemo(() => {
    if (!order?.status) {
      return 0;
    }

    const index =
      statusSteps.findIndex(
        (step) =>
          step.key === order.status
      );

    if (index !== -1) {
      return index;
    }

    if (order.status === "cancelled") {
      return -1;
    }

    if (order.status === "returned") {
      return -1;
    }

    return 0;
  }, [order?.status, statusSteps]);

  const isCancelled =
    order?.status === "cancelled";

  const isReturned =
    order?.status === "returned";

  // =========================================================
  // RETURN STATUS
  // =========================================================

  const returnStatus =
    order?.returnStatus || "none";

  const returnStatusLabels = {
    none: "No return request",
    pending: "Return request pending",
    approved: "Return authorized",
    rejected: "Return request rejected",
    collection_pending:
      "Collection pending",
    collected: "Product collected",
    completed: "Return completed",
  };

  const returnStatusLabel =
    returnStatusLabels[returnStatus] ||
    formatStatus(returnStatus);

  // =========================================================
  // RETURN WINDOW
  // Customer can request return only within 3 days
  // =========================================================

  const getReturnWindowInfo = () => {
    if (order?.status !== "delivered") {
      return {
        eligible: false,
        daysLeft: 0,
      };
    }

    const deliveredDate =
      order?.deliveredAt ||
      order?.updatedAt;

    if (!deliveredDate) {
      return {
        eligible: true,
        daysLeft: 3,
      };
    }

    const deliveredTime =
      new Date(deliveredDate).getTime();

    const now = Date.now();

    const threeDays =
      3 * 24 * 60 * 60 * 1000;

    const elapsed =
      now - deliveredTime;

    if (
      Number.isNaN(deliveredTime) ||
      elapsed < 0
    ) {
      return {
        eligible: true,
        daysLeft: 3,
      };
    }

    if (elapsed > threeDays) {
      return {
        eligible: false,
        daysLeft: 0,
      };
    }

    const remaining =
      Math.max(
        0,
        threeDays - elapsed
      );

    const daysLeft = Math.max(
      1,
      Math.ceil(
        remaining /
          (24 * 60 * 60 * 1000)
      )
    );

    return {
      eligible: true,
      daysLeft,
    };
  };

  const returnWindow =
    getReturnWindowInfo();

  // =========================================================
  // OPEN ITEM CANCEL MODAL
  // =========================================================

  const handleOpenItemCancelModal = (item) => {
    setSelectedItem(item);
    setItemCancellationReason("");
    setItemCancelError("");
    setItemCancelRefund(null);
    setShowItemCancelModal(true);
  };

  // =========================================================
  // CLOSE ITEM CANCEL MODAL
  // =========================================================

  const handleCloseItemCancelModal = () => {
    if (itemCancelLoading) {
      return;
    }

    setShowItemCancelModal(false);
    setSelectedItem(null);
    setItemCancellationReason("");
    setItemCancelError("");
    setItemCancelRefund(null);
  };

  // =========================================================
  // CANCEL SINGLE ITEM
  // =========================================================

  const handleCancelItem = async () => {
    const reason = itemCancellationReason.trim();

    if (!selectedItem?._id) {
      setItemCancelError(
        "Order item information is missing."
      );
      return;
    }

    if (!reason) {
      setItemCancelError(
        "Please enter a cancellation reason."
      );
      return;
    }

    if (itemCancelLoading) {
      return;
    }

    try {
      setItemCancelLoading(true);
      setItemCancelError("");
      setItemCancelRefund(null);

      const response =
        await cancelUserOrderItem(
          orderId,
          selectedItem._id,
          reason
        );

      const cancelledOrder =
        response?.order ||
        response?.data?.order ||
        response?.data;

      if (cancelledOrder) {
        setOrder(cancelledOrder);
      } else {
        throw new Error(
          response?.message ||
            "Unable to update the order."
        );
      }

      if (response?.refund) {
        setItemCancelRefund(
          response.refund
        );
      }

      setShowItemCancelModal(false);
      setSelectedItem(null);
      setItemCancellationReason("");

      try {
        const refreshedResponse =
          await getUserOrderById(orderId);

        const refreshedOrder =
          refreshedResponse?.order ||
          refreshedResponse?.data?.order ||
          refreshedResponse?.data ||
          refreshedResponse;

        if (refreshedOrder) {
          setOrder(refreshedOrder);
        }
      } catch (refreshError) {
        console.error(
          "Refresh Cancelled Item Error:",
          refreshError
        );
      }
    } catch (error) {
      console.error(
        "Cancel Item Error:",
        error
      );

      setItemCancelError(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to cancel this item. Please try again."
      );
    } finally {
      setItemCancelLoading(false);
    }
  };

  // =========================================================
  // OPEN RETURN REQUEST MODAL
  // =========================================================

  const handleOpenReturnModal = () => {
    setReturnReason("");
    setReturnError("");
    setShowReturnModal(true);
  };

  // =========================================================
  // CLOSE RETURN REQUEST MODAL
  // =========================================================

  const handleCloseReturnModal = () => {
    if (returnLoading) {
      return;
    }

    setShowReturnModal(false);
    setReturnReason("");
    setReturnError("");
  };

  // =========================================================
  // SEND RETURN REQUEST
  // =========================================================

  const handleReturnOrder = async () => {
    const reason =
      returnReason.trim();

    if (!reason) {
      setReturnError(
        "Please enter a return reason."
      );
      return;
    }

    if (!returnWindow.eligible) {
      setReturnError(
        "The 3-day return window has expired."
      );
      return;
    }

    if (
      order?.status !== "delivered"
    ) {
      setReturnError(
        "Return requests are available only for delivered orders."
      );
      return;
    }

    if (returnStatus !== "none") {
      setReturnError(
        "A return request already exists for this order."
      );
      return;
    }

    if (returnLoading) {
      return;
    }

    try {
      setReturnLoading(true);
      setReturnError("");

      const response =
        await returnUserOrder(
          orderId,
          reason
        );

      const requestedOrder =
        response?.order ||
        response?.data?.order ||
        response?.data;

      if (requestedOrder) {
        setOrder((previousOrder) => ({
          ...previousOrder,
          ...requestedOrder,

          status:
            requestedOrder?.status ||
            previousOrder?.status,

          returnStatus:
            requestedOrder?.returnStatus ||
            "pending",

          returnReason:
            requestedOrder?.returnReason ||
            reason,
        }));
      } else {
        setOrder((previousOrder) => ({
          ...previousOrder,
          returnStatus: "pending",
          returnReason: reason,
        }));
      }

      setShowReturnModal(false);
      setReturnReason("");

      try {
        const refreshedResponse =
          await getUserOrderById(orderId);

        const refreshedOrder =
          refreshedResponse?.order ||
          refreshedResponse?.data?.order ||
          refreshedResponse?.data ||
          refreshedResponse;

        if (refreshedOrder) {
          setOrder(refreshedOrder);
        }
      } catch (refreshError) {
        console.error(
          "Refresh Return Request Error:",
          refreshError
        );
      }
    } catch (error) {
      console.error(
        "Return Request Error:",
        error
      );

      setReturnError(
        error?.response?.data?.message ||
          "Unable to send the return request. Please try again."
      );
    } finally {
      setReturnLoading(false);
    }
  };

  // =========================================================
  // CALCULATIONS
  // =========================================================

  const subtotal =
    Number(order?.subtotal || 0);

  const shippingCharge =
    Number(order?.shippingCharge || 0);

  const discount =
    Number(order?.discount || 0);

  const tax =
    Number(order?.tax || 0);

  const totalAmount =
    Number(order?.totalAmount || 0);

  // =========================================================
  // DOWNLOAD INVOICE PDF
  // =========================================================

  const handleDownloadInvoice = () => {
    if (!order) {
      return;
    }

    const escapeHtml = (value) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const items = Array.isArray(order.items)
      ? order.items
      : [];

    // =========================================================
    // INVOICE REFUND CALCULATIONS
    // =========================================================
    //
    // The original order totals remain unchanged in the database.
    // For the invoice, however, we calculate the CURRENT financial
    // state from the order items.
    //
    // Cancelled items:
    //   - are shown as CANCELLED / REFUNDED
    //   - their refundedAmount is added to total refunds
    //
    // Active items:
    //   - remain part of the current balance
    //
    // Original Total - Total Refunded = Remaining Balance
    //
    // If every item is cancelled:
    //
    // Total Refunded = Original Total
    // Remaining Balance = ₹0
    //
    // =========================================================

    const cancelledItems = items.filter(
      (item) =>
        (item?.itemStatus || "active") ===
        "cancelled"
    );

    const activeItems = items.filter(
      (item) =>
        (item?.itemStatus || "active") !==
        "cancelled"
    );

    const totalRefunded = cancelledItems.reduce(
      (total, item) => {
        const refundedAmount =
          Number(item?.refundedAmount);

        if (
          Number.isFinite(refundedAmount) &&
          refundedAmount > 0
        ) {
          return total + refundedAmount;
        }

        const itemTotal =
          Number(item?.totalPrice) ||
          Number(item?.price || 0) *
            Number(item?.quantity || 0);

        return total + Math.max(0, itemTotal);
      },
      0
    );

    const originalTotalAmount =
      Number(order?.totalAmount || 0);

    const calculatedRemainingBalance =
      Math.max(
        0,
        originalTotalAmount - totalRefunded
      );

    const allItemsCancelled =
      items.length > 0 &&
      cancelledItems.length === items.length;

    const remainingBalance =
      allItemsCancelled
        ? 0
        : calculatedRemainingBalance;

    const currentItemSubtotal =
      activeItems.reduce(
        (total, item) => {
          const itemTotal =
            Number(item?.totalPrice) ||
            Number(item?.price || 0) *
              Number(item?.quantity || 0);

          return total + itemTotal;
        },
        0
      );

    const originalSubtotal =
      Number(order?.subtotal || 0);

    const refundDisplayAmount =
      Math.min(
        totalRefunded,
        Math.max(0, originalTotalAmount)
      );

    const invoiceStatus =
      allItemsCancelled
        ? "FULLY REFUNDED"
        : totalRefunded > 0
        ? "PARTIALLY REFUNDED"
        : formatStatus(
            order?.paymentStatus
          );

    const itemsHtml = items
      .map((item) => {
        const itemPrice =
          Number(item?.totalPrice) ||
          Number(item?.price || 0) *
            Number(item?.quantity || 0);

        const isItemCancelled =
          (item?.itemStatus || "active") ===
          "cancelled";

        const refundedAmount =
          Number(item?.refundedAmount || 0);

        const itemStatusHtml =
          isItemCancelled
            ? `
              <div class="item-status">
                CANCELLED
                ${
                  refundedAmount > 0
                    ? ` · REFUNDED ₹${refundedAmount.toLocaleString(
                        "en-IN"
                      )}`
                    : ""
                }
              </div>
            `
            : "";

        return `
          <tr class="${
            isItemCancelled
              ? "cancelled-row"
              : ""
          }">
            <td>
              <strong>
                ${escapeHtml(
                  item?.productName ||
                    "GETSUKA Product"
                )}
              </strong>

              ${itemStatusHtml}

              <div class="muted">
                ${
                  item?.size
                    ? `Size: ${escapeHtml(
                        item.size
                      )} · `
                    : ""
                }

                ${
                  item?.color
                    ? `Color: ${escapeHtml(
                        item.color
                      )} · `
                    : ""
                }

                Qty:
                ${Number(
                  item?.quantity || 0
                )}
              </div>

              ${
                isItemCancelled &&
                item?.cancellationReason
                  ? `
                    <div class="cancel-reason">
                      Cancellation reason:
                      ${escapeHtml(
                        item.cancellationReason
                      )}
                    </div>
                  `
                  : ""
              }
            </td>

            <td class="right">
              ₹${itemPrice.toLocaleString(
                "en-IN"
              )}

              ${
                isItemCancelled &&
                refundedAmount > 0
                  ? `
                    <div class="refund-note">
                      Refunded ₹${refundedAmount.toLocaleString(
                        "en-IN"
                      )}
                    </div>
                  `
                  : ""
              }
            </td>
          </tr>
        `;
      })
      .join("");

    const invoiceWindow = window.open(
      "",
      "_blank",
      "width=900,height=750"
    );

    if (!invoiceWindow) {
      window.alert(
        "Please allow pop-ups to download the invoice."
      );
      return;
    }

    invoiceWindow.document.write(`
      <!DOCTYPE html>

      <html>
        <head>

          <title>
            GETSUKA Invoice -
            ${escapeHtml(
              order.orderNumber ||
                order._id ||
                "Order"
            )}
          </title>

          <meta charset="UTF-8" />

          <style>

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 40px;
              font-family:
                Arial,
                Helvetica,
                sans-serif;
              color: #16233f;
              background: #ffffff;
            }

            .invoice {
              max-width: 820px;
              margin: 0 auto;
            }

            .top {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #1557f5;
              padding-bottom: 22px;
            }

            .brand {
              color: #1557f5;
              font-size: 28px;
              font-weight: 800;
              letter-spacing: -1px;
            }

            .brand-sub {
              margin-top: 5px;
              color: #71809a;
              font-size: 10px;
              letter-spacing: 2px;
              text-transform: uppercase;
            }

            .invoice-title {
              text-align: right;
            }

            .invoice-title h1 {
              margin: 0;
              font-size: 22px;
              color: #16233f;
            }

            .invoice-title p {
              margin: 6px 0 0;
              color: #71809a;
              font-size: 12px;
            }

            .invoice-status {
              display: inline-block;
              margin-top: 10px;
              padding: 6px 10px;
              border: 1px solid #dfe7f3;
              border-radius: 4px;
              color: #1557f5;
              font-size: 9px;
              font-weight: 700;
              letter-spacing: 1.3px;
            }

            .meta {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 24px;
              margin: 28px 0;
            }

            .box {
              border: 1px solid #dfe7f3;
              border-radius: 8px;
              padding: 16px;
            }

            .label {
              margin-bottom: 8px;
              color: #71809a;
              font-size: 9px;
              font-weight: 700;
              letter-spacing: 1.5px;
              text-transform: uppercase;
            }

            .value {
              color: #16233f;
              font-size: 12px;
              line-height: 1.7;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 24px;
            }

            th {
              padding: 11px 10px;
              background: #edf3ff;
              color: #1557f5;
              font-size: 9px;
              text-align: left;
              text-transform: uppercase;
              letter-spacing: 1px;
            }

            td {
              padding: 14px 10px;
              border-bottom: 1px solid #e7edf6;
              color: #16233f;
              font-size: 12px;
              vertical-align: top;
            }

            .cancelled-row {
              background: #fff7f7;
            }

            .item-status {
              margin-top: 6px;
              color: #d11a2a;
              font-size: 9px;
              font-weight: 700;
              letter-spacing: 1px;
            }

            .cancel-reason {
              margin-top: 6px;
              color: #9aa4b5;
              font-size: 9px;
              line-height: 1.5;
            }

            .muted {
              margin-top: 5px;
              color: #71809a;
              font-size: 10px;
            }

            .right {
              text-align: right;
              white-space: nowrap;
            }

            .refund-note {
              margin-top: 5px;
              color: #d11a2a;
              font-size: 9px;
              font-weight: 700;
            }

            .summary {
              width: 360px;
              margin: 24px 0 0 auto;
            }

            .summary-row {
              display: flex;
              justify-content: space-between;
              gap: 20px;
              padding: 8px 0;
              color: #64728a;
              font-size: 12px;
            }

            .summary-row strong {
              color: #16233f;
            }

            .refund-row {
              color: #d11a2a;
            }

            .refund-row span:last-child {
              font-weight: 700;
            }

            .balance {
              display: flex;
              justify-content: space-between;
              margin-top: 8px;
              padding-top: 14px;
              border-top: 2px solid #1557f5;
              color: #16233f;
              font-size: 16px;
              font-weight: 700;
            }

            .balance-value {
              text-align: right;
            }

            .refund-info {
              margin-top: 18px;
              border: 1px solid #f0d5d8;
              background: #fff7f7;
              padding: 12px 14px;
              color: #d11a2a;
              font-size: 10px;
              line-height: 1.6;
            }

            .refund-info strong {
              font-size: 11px;
            }

            .footer {
              margin-top: 45px;
              padding-top: 18px;
              border-top: 1px solid #dfe7f3;
              text-align: center;
              color: #71809a;
              font-size: 10px;
            }

            @media print {

              body {
                padding: 20px;
              }

              @page {
                size: A4;
                margin: 12mm;
              }

            }

            @media (max-width: 640px) {

              body {
                padding: 20px;
              }

              .top {
                flex-direction: column;
                gap: 20px;
              }

              .invoice-title {
                text-align: left;
              }

              .meta {
                grid-template-columns: 1fr;
              }

              .summary {
                width: 100%;
              }

            }

          </style>

        </head>

        <body>

          <div class="invoice">

            <div class="top">

              <div>

                <div class="brand">
                  GETSUKA
                </div>

                <div class="brand-sub">
                  Anime Fashion Store
                </div>

              </div>

              <div class="invoice-title">

                <h1>
                  INVOICE
                </h1>

                <p>
                  Order #
                  ${escapeHtml(
                    order.orderNumber ||
                      order._id ||
                      "—"
                  )}
                </p>

                <div class="invoice-status">
                  ${escapeHtml(
                    invoiceStatus
                  )}
                </div>

              </div>

            </div>

            <div class="meta">

              <div class="box">

                <div class="label">
                  Bill To
                </div>

                <div class="value">

                  <strong>
                    ${escapeHtml(
                      order
                        ?.shippingAddress
                        ?.fullName ||
                        "—"
                    )}
                  </strong>

                  <br />

                  ${escapeHtml(
                    order
                      ?.shippingAddress
                      ?.addressLine ||
                      "—"
                  )}

                  <br />

                  ${escapeHtml(
                    order
                      ?.shippingAddress
                      ?.city ||
                      "—"
                  )}
                  ,

                  ${escapeHtml(
                    order
                      ?.shippingAddress
                      ?.state ||
                      "—"
                  )}

                  -

                  ${escapeHtml(
                    order
                      ?.shippingAddress
                      ?.pincode ||
                      "—"
                  )}

                  <br />

                  ${escapeHtml(
                    order
                      ?.shippingAddress
                      ?.phone ||
                      ""
                  )}

                </div>

              </div>

              <div class="box">

                <div class="label">
                  Order Details
                </div>

                <div class="value">

                  Order Date:
                  ${escapeHtml(
                    formatDate(
                      order?.createdAt
                    )
                  )}

                  <br />

                  Payment:
                  ${escapeHtml(
                    getPaymentMethod(
                      order?.paymentMethod
                    )
                  )}

                  <br />

                  Payment Status:
                  ${escapeHtml(
                    formatStatus(
                      order?.paymentStatus
                    )
                  )}

                  <br />

                  Delivery:
                  ${escapeHtml(
                    getDeliveryMethod(
                      order?.deliveryMethod
                    )
                  )}

                  ${
                    totalRefunded > 0
                      ? `
                        <br />

                        Refund Status:
                        ${escapeHtml(
                          invoiceStatus
                        )}
                      `
                      : ""
                  }

                </div>

              </div>

            </div>

            <table>

              <thead>

                <tr>

                  <th>
                    Product
                  </th>

                  <th class="right">
                    Amount
                  </th>

                </tr>

              </thead>

              <tbody>

                ${itemsHtml}

              </tbody>

            </table>

            <div class="summary">

              <div class="summary-row">

                <span>
                  Original Subtotal
                </span>

                <span>
                  ₹${originalSubtotal.toLocaleString(
                    "en-IN"
                  )}
                </span>

              </div>

              ${
                totalRefunded > 0
                  ? `
                    <div class="summary-row">

                      <span>
                        Current Active Items
                      </span>

                      <span>
                        ₹${currentItemSubtotal.toLocaleString(
                          "en-IN"
                        )}
                      </span>

                    </div>
                  `
                  : ""
              }

              <div class="summary-row">

                <span>
                  Shipping
                </span>

                <span>
                  ${
                    shippingCharge === 0
                      ? "FREE"
                      : `₹${shippingCharge.toLocaleString(
                          "en-IN"
                        )}`
                  }
                </span>

              </div>

              <div class="summary-row">

                <span>
                  Discount
                </span>

                <span>
                  - ₹${discount.toLocaleString(
                    "en-IN"
                  )}
                </span>

              </div>

              ${
                tax > 0
                  ? `
                    <div class="summary-row">

                      <span>
                        Tax
                      </span>

                      <span>
                        ₹${tax.toLocaleString(
                          "en-IN"
                        )}
                      </span>

                    </div>
                  `
                  : ""
              }

              <div class="summary-row">

                <span>
                  Original Order Total
                </span>

                <span>
                  ₹${originalTotalAmount.toLocaleString(
                    "en-IN"
                  )}
                </span>

              </div>

              ${
                refundDisplayAmount > 0
                  ? `
                    <div class="summary-row refund-row">

                      <span>
                        Refunded to Wallet
                      </span>

                      <span>
                        - ₹${refundDisplayAmount.toLocaleString(
                          "en-IN"
                        )}
                      </span>

                    </div>
                  `
                  : ""
              }

              <div class="balance">

                <span>
                  ${
                    allItemsCancelled
                      ? "BALANCE"
                      : "REMAINING BALANCE"
                  }
                </span>

                <span class="balance-value">
                  ₹${remainingBalance.toLocaleString(
                    "en-IN"
                  )}
                </span>

              </div>

              ${
                totalRefunded > 0
                  ? `
                    <div class="refund-info">

                      <strong>
                        ${
                          allItemsCancelled
                            ? "FULLY REFUNDED"
                            : "PARTIAL REFUND"
                        }
                      </strong>

                      <br />

                      ${
                        allItemsCancelled
                          ? `₹${refundDisplayAmount.toLocaleString(
                              "en-IN"
                            )} has been refunded to your GETSUKA wallet. The remaining balance is ₹0.`
                          : `₹${refundDisplayAmount.toLocaleString(
                              "en-IN"
                            )} has been refunded to your GETSUKA wallet. The remaining balance is ₹${remainingBalance.toLocaleString(
                              "en-IN"
                            )}.`
                      }

                    </div>
                  `
                  : ""
              }

            </div>

            <div class="footer">

              Thank you for shopping
              with GETSUKA.

              <br />

              Anime fashion made for fans.

            </div>

          </div>

        </body>
      </html>
    `);

    invoiceWindow.document.close();
    invoiceWindow.focus();

    setTimeout(() => {
      invoiceWindow.print();
    }, 300);
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">

        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">

          <div className="animate-pulse">

            <div className="h-3 w-28 bg-white/10" />

            <div className="mt-5 h-6 w-56 bg-white/10" />

            <div className="mt-3 h-3 w-44 bg-white/10" />

            <div className="mt-12 h-px w-full bg-white/10" />

            <div className="mt-8 h-8 w-full bg-white/10" />

            <div className="mt-10 grid gap-8 lg:grid-cols-[1.5fr_0.9fr]">

              <div className="space-y-5">

                {[1, 2].map(
                  (item) => (
                    <div
                      key={item}
                      className="flex gap-5 border-b border-white/10 pb-5"
                    >

                      <div className="h-24 w-24 bg-white/10" />

                      <div className="flex-1 space-y-3">

                        <div className="h-4 w-48 bg-white/10" />

                        <div className="h-3 w-24 bg-white/10" />

                        <div className="h-3 w-28 bg-white/10" />

                      </div>

                    </div>
                  )
                )}

              </div>

              <div className="h-80 border border-white/10 bg-white/[0.02]" />

            </div>

          </div>

        </div>

      </div>
    );
  }

  // =========================================================
  // ERROR
  // =========================================================

  if (error || !order) {
    return (
      <div className="min-h-screen bg-black text-white">

        <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center px-5">

          <div className="w-full border border-white/10 bg-white/[0.02] px-8 py-12 text-center">

            <p className="text-xs uppercase tracking-[0.3em] text-red-500">
              GETSUKA
            </p>

            <h1 className="mt-5 text-2xl font-medium">
              Unable to load order
            </h1>

            <p className="mt-3 text-sm text-gray-500">
              {error ||
                "The requested order could not be found."}
            </p>

            <div className="mt-7 flex justify-center gap-3">

              <button
                type="button"
                onClick={() =>
                  navigate("/orders")
                }
                className="border border-white/20 px-6 py-3 text-xs font-medium tracking-widest text-white transition hover:border-red-500 hover:text-red-400"
              >
                BACK TO ORDERS
              </button>

              <button
                type="button"
                onClick={() =>
                  window.location.reload()
                }
                className="bg-red-600 px-6 py-3 text-xs font-medium tracking-widest text-white transition hover:bg-red-700"
              >
                TRY AGAIN
              </button>

            </div>

          </div>

        </div>

      </div>
    );
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <div className="min-h-screen bg-black text-white">

      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">

        {/* =====================================================
            ORDER HEADER
        ===================================================== */}

        <div className="flex flex-col gap-6 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">

          <div>

            <p className="text-[10px] uppercase tracking-[0.25em] text-gray-500">
              ORDER #{order.orderNumber}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">

              <p className="text-xs uppercase tracking-[0.18em] text-gray-300">
                PLACED ON{" "}
                {formatDate(
                  order.createdAt
                )}
              </p>

              <span className="text-red-600">
                •
              </span>

              <span className="text-xs uppercase tracking-[0.18em] text-red-500">
                {formatStatus(
                  order.status
                )}
              </span>

            </div>

          </div>

        </div>

        {/* =====================================================
            ORDER STATUS TRACKER
        ===================================================== */}

        {!isCancelled &&
          !isReturned && (
            <div className="relative mt-8 px-1">

              <div className="absolute left-1 right-1 top-[7px] h-px bg-red-950" />

              <div
                className="absolute left-1 top-[7px] h-px bg-red-600 transition-all duration-500"
                style={{
                  width:
                    currentStatusIndex <= 0
                      ? "0%"
                      : `${
                          (currentStatusIndex /
                            (statusSteps.length -
                              1)) *
                          100
                        }%`,
                }}
              />

              <div className="relative grid grid-cols-5">

                {statusSteps.map(
                  (step, index) => {

                    const completed =
                      index <=
                      currentStatusIndex;

                    const active =
                      index ===
                      currentStatusIndex;

                    return (
                      <div
                        key={step.key}
                        className="flex flex-col items-center"
                      >

                        <div
                          className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border ${
                            completed
                              ? "border-red-500 bg-red-600"
                              : "border-red-950 bg-[#180000]"
                          }`}
                        >

                          {completed && (
                            <span className="text-[7px] text-white">
                              {active
                                ? "•"
                                : "✓"}
                            </span>
                          )}

                        </div>

                        <p
                          className={`mt-3 text-center text-[7px] uppercase tracking-wide sm:text-[8px] ${
                            active
                              ? "text-red-500"
                              : completed
                              ? "text-gray-300"
                              : "text-gray-600"
                          }`}
                        >
                          {step.label}
                        </p>

                      </div>
                    );
                  }
                )}

              </div>

            </div>
          )}

        {/* =====================================================
            CANCELLED / RETURNED STATUS
        ===================================================== */}

        {(isCancelled ||
          isReturned) && (
          <div className="mt-8 border border-red-900/50 bg-red-950/10 px-5 py-4">

            <p className="text-xs uppercase tracking-[0.18em] text-red-500">
              ORDER{" "}
              {isCancelled
                ? "CANCELLED"
                : "RETURNED"}
            </p>

            {(order.cancellationReason ||
              order.returnReason) && (
              <p className="mt-2 text-sm text-gray-400">
                {order.cancellationReason ||
                  order.returnReason}
              </p>
            )}

          </div>
        )}

        {/* =====================================================
            RETURN REQUEST STATUS
        ===================================================== */}

        {!isCancelled &&
          !isReturned &&
          returnStatus !== "none" && (
            <div className="mt-8 border border-red-950/70 bg-red-950/10 px-5 py-5">

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                <div>

                  <p className="text-[10px] uppercase tracking-[0.2em] text-red-500">
                    RETURN REQUEST
                  </p>

                  <p className="mt-2 text-sm text-white">
                    {returnStatusLabel}
                  </p>

                </div>

                {order?.returnRequestedAt && (
                  <p className="text-[10px] uppercase tracking-[0.12em] text-gray-600">
                    Requested{" "}
                    {formatDate(
                      order.returnRequestedAt
                    )}
                  </p>
                )}

              </div>

              {order?.returnReason && (
                <div className="mt-4 border-t border-red-950/70 pt-4">

                  <p className="text-[9px] uppercase tracking-[0.16em] text-gray-600">
                    RETURN REASON
                  </p>

                  <p className="mt-2 text-xs leading-5 text-gray-400">
                    {order.returnReason}
                  </p>

                </div>
              )}

              {returnStatus ===
                "approved" && (
                <p className="mt-4 text-xs leading-5 text-gray-400">
                  Return authorized. We will send an agent to collect the product back. Thank you for your cooperation.
                </p>
              )}

              {returnStatus ===
                "pending" && (
                <p className="mt-4 text-xs leading-5 text-gray-400">
                  Your request has been sent and is waiting for admin authorization.
                </p>
              )}

              {returnStatus ===
                "rejected" &&
                order?.returnRejectionReason && (
                  <div className="mt-4 border-t border-red-950/70 pt-4">

                    <p className="text-[9px] uppercase tracking-[0.16em] text-gray-600">
                      ADMIN RESPONSE
                    </p>

                    <p className="mt-2 text-xs leading-5 text-gray-400">
                      {order.returnRejectionReason}
                    </p>

                  </div>
                )}

            </div>
          )}

        {/* =====================================================
            MAIN CONTENT
        ===================================================== */}

        <div className="mt-10 grid gap-10 lg:grid-cols-[1.45fr_0.9fr]">

          {/* ===================================================
              LEFT COLUMN
          =================================================== */}

          <div>

            {/* ITEMS ORDERED */}

            <div>

              <div className="border-b border-red-950 pb-4">

                <h2 className="text-xs uppercase tracking-[0.18em] text-white">
                  ITEMS ORDERED
                </h2>

              </div>

              <div>

                {Array.isArray(
                  order.items
                ) &&
                  order.items.map(
                    (item, index) => {

                      const image =
                        getProductImage(
                          item
                        );

                      return (
                        <div
                          key={
                            item?._id ||
                            `${item?.productId}-${item?.variantId}-${index}`
                          }
                          className="flex gap-5 border-b border-red-950/70 py-5"
                        >

                          <div className="h-20 w-20 flex-shrink-0 overflow-hidden border border-white/10 bg-white/[0.03] sm:h-24 sm:w-24">

                            {image ? (
                              <img
                                src={image}
                                alt={
                                  item?.productName ||
                                  "Product"
                                }
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[9px] uppercase tracking-wider text-gray-600">
                                NO IMAGE
                              </div>
                            )}

                          </div>

                          <div className="min-w-0 flex-1">

                            <div className="flex items-start justify-between gap-4">

                              <h3 className="text-sm font-medium uppercase tracking-wide text-white">
                                {item?.productName ||
                                  "GETSUKA PRODUCT"}
                              </h3>

                              <p className="whitespace-nowrap text-sm font-semibold text-white">
                                {formatPrice(
                                  item?.totalPrice ??
                                    Number(
                                      item?.price ||
                                        0
                                    ) *
                                      Number(
                                        item?.quantity ||
                                          0
                                      )
                                )}
                              </p>

                            </div>

                            <div className="mt-3 space-y-1 text-xs text-gray-400">

                              <p>
                                Size:{" "}
                                <span className="text-gray-300">
                                  {item?.size ||
                                    "—"}
                                </span>
                              </p>

                              <p>
                                Color:{" "}
                                <span className="text-gray-300">
                                  {item?.color ||
                                    "—"}
                                </span>
                              </p>

                              <p>
                                Qty:{" "}
                                <span className="text-gray-300">
                                  {item?.quantity ||
                                    0}
                                </span>
                              </p>

                              {item?.sku && (
                                <p>
                                  SKU:{" "}
                                  <span className="text-gray-500">
                                    {item.sku}
                                  </span>
                                </p>
                              )}

                            </div>

                            {/* ITEM CANCELLATION */}

                            {(item?.itemStatus || "active") ===
                              "cancelled" ? (
                              <div className="mt-4 border border-red-950 bg-red-950/10 px-4 py-3">

                                <div className="flex flex-wrap items-center justify-between gap-3">

                                  <div>

                                    <p className="text-[9px] uppercase tracking-[0.18em] text-red-500">
                                      ITEM CANCELLED
                                    </p>

                                    {item?.cancellationReason && (
                                      <p className="mt-1 text-[11px] leading-5 text-gray-500">
                                        {item.cancellationReason}
                                      </p>
                                    )}

                                  </div>

                                  {Number(item?.refundedAmount || 0) > 0 && (
                                    <div className="text-right">

                                      <p className="text-[9px] uppercase tracking-[0.15em] text-gray-600">
                                        REFUNDED TO WALLET
                                      </p>

                                      <p className="mt-1 text-xs font-semibold text-red-500">
                                        {formatPrice(
                                          item.refundedAmount
                                        )}
                                      </p>

                                    </div>
                                  )}

                                </div>

                              </div>
                            ) : (
                              !isCancelled &&
                              !isReturned &&
                              (order.status === "placed" ||
                                order.status === "confirmed") && (
                                <div className="mt-4 flex justify-end">

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleOpenItemCancelModal(item)
                                    }
                                    className="border border-white/15 px-4 py-2 text-[9px] uppercase tracking-[0.16em] text-gray-400 transition hover:border-red-600 hover:text-red-500"
                                  >
                                    CANCEL ITEM
                                  </button>

                                </div>
                              )
                            )}

                          </div>

                        </div>
                      );
                    }
                  )}

              </div>

            </div>

            {/* ITEM REFUND CONFIRMATION */}

            {itemCancelRefund?.amount > 0 && (
              <div className="mt-6 border border-red-950 bg-red-950/10 px-5 py-4">

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                  <div>

                    <p className="text-[10px] uppercase tracking-[0.18em] text-red-500">
                      REFUND ADDED TO WALLET
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      The eligible refund for the cancelled item has been credited to your GETSUKA wallet.
                    </p>

                  </div>

                  <p className="text-sm font-semibold text-red-500">
                    {formatPrice(
                      itemCancelRefund.amount
                    )}
                  </p>

                </div>

              </div>
            )}

            {/* DELIVERY + PAYMENT */}

            <div className="mt-10 grid gap-6 sm:grid-cols-2">

              {/* DELIVERY ADDRESS */}

              <div>

                <h2 className="mb-4 border-b border-red-950 pb-4 text-xs uppercase tracking-[0.18em] text-white">
                  DELIVERY ADDRESS
                </h2>

                <div className="min-h-[170px] border border-white/15 p-5">

                  <p className="text-sm font-semibold text-white">
                    {order
                      ?.shippingAddress
                      ?.fullName ||
                      "—"}
                  </p>

                  <div className="mt-3 space-y-1 text-xs leading-5 text-gray-400">

                    <p>
                      {order
                        ?.shippingAddress
                        ?.addressLine ||
                        "—"}
                    </p>

                    <p>
                      {order
                        ?.shippingAddress
                        ?.city ||
                        "—"}
                      ,{" "}
                      {order
                        ?.shippingAddress
                        ?.state ||
                        "—"}
                    </p>

                    <p>
                      {order
                        ?.shippingAddress
                        ?.pincode ||
                        "—"}
                    </p>

                    <p>
                      India
                    </p>

                  </div>

                  {order
                    ?.shippingAddress
                    ?.phone && (
                    <p className="mt-4 text-xs text-gray-300">
                      +
                      {order
                        .shippingAddress
                        .phone
                        .replace(
                          /^\+/,
                          ""
                        )}
                    </p>
                  )}

                </div>

              </div>

              {/* PAYMENT METHOD */}

              <div>

                <h2 className="mb-4 border-b border-red-950 pb-4 text-xs uppercase tracking-[0.18em] text-white">
                  PAYMENT METHOD
                </h2>

                <div className="min-h-[170px] border border-white/15 p-5">

                  <div className="flex items-center gap-2">

                    <p className="text-sm font-semibold uppercase text-white">
                      {getPaymentMethod(
                        order.paymentMethod
                      )}
                    </p>

                    <span className="text-xs text-red-500">
                      ●
                    </span>

                  </div>

                  <div className="mt-4 space-y-2 text-xs text-gray-400">

                    <p>
                      Payment Status:{" "}
                      <span className="text-gray-300">
                        {formatStatus(
                          order.paymentStatus
                        )}
                      </span>
                    </p>

                    <p>
                      Delivery:{" "}
                      <span className="text-gray-300">
                        {getDeliveryMethod(
                          order.deliveryMethod
                        )}
                      </span>
                    </p>

                    <p>
                      Items:{" "}
                      <span className="text-gray-300">
                        {getItemCount()}
                      </span>
                    </p>

                  </div>

                </div>

              </div>

            </div>

          </div>

          {/* ===================================================
              RIGHT COLUMN
          =================================================== */}

          <div>

            <div className="border border-white/30 p-5 sm:p-6">

              {/* ORDER SUMMARY */}

              <div className="border-b border-red-950 pb-4">

                <h2 className="text-xs uppercase tracking-[0.18em] text-white">
                  ORDER SUMMARY
                </h2>

              </div>

              <div className="space-y-5 py-5">

                <div className="flex items-center justify-between gap-5">

                  <span className="text-xs text-gray-400">
                    Subtotal (
                    {getItemCount()}{" "}
                    {getItemCount() === 1
                      ? "item"
                      : "items"}
                  )
                  </span>

                  <span className="text-xs text-gray-200">
                    {formatPrice(
                      subtotal
                    )}
                  </span>

                </div>

                <div className="flex items-center justify-between gap-5">

                  <span className="text-xs text-gray-400">
                    Shipping
                  </span>

                  <span
                    className={`text-xs ${
                      shippingCharge ===
                      0
                        ? "text-red-500"
                        : "text-gray-200"
                    }`}
                  >
                    {shippingCharge ===
                    0
                      ? "FREE"
                      : formatPrice(
                          shippingCharge
                        )}
                  </span>

                </div>

                <div className="flex items-center justify-between gap-5">

                  <span className="text-xs text-gray-400">
                    Discount
                  </span>

                  <span className="text-xs text-gray-200">
                    -{" "}
                    {formatPrice(
                      discount
                    )}
                  </span>

                </div>

                {tax > 0 && (
                  <div className="flex items-center justify-between gap-5">

                    <span className="text-xs text-gray-400">
                      Tax
                    </span>

                    <span className="text-xs text-gray-200">
                      {formatPrice(tax)}
                    </span>

                  </div>
                )}

              </div>

              {/* TOTAL */}

              <div className="border-t border-red-950 py-5">

                <div className="flex items-center justify-between">

                  <span className="text-sm uppercase tracking-wide text-white">
                    TOTAL
                  </span>

                  <div className="text-right">

                    <span className="mr-3 text-[8px] uppercase tracking-wider text-gray-500">
                      INR
                    </span>

                    <span className="text-sm font-semibold text-white">
                      {formatPrice(
                        totalAmount
                      )}
                    </span>

                  </div>

                </div>

              </div>

              {/* INVOICE */}

              <button
                type="button"
                onClick={
                  handleDownloadInvoice
                }
                className="flex w-full items-center justify-center gap-2 border border-white/30 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-white transition hover:border-red-500 hover:text-red-500"
              >

                <span>
                  ▣
                </span>

                DOWNLOAD INVOICE (PDF)

              </button>

              {/* SUPPORT */}

              <button
                type="button"
                className="mt-3 flex w-full items-center justify-center gap-2 border border-white/30 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-white transition hover:border-red-500 hover:text-red-500"
              >

                <span>
                  ◉
                </span>

                CONTACT SUPPORT

              </button>

              {/* RETURN REQUEST */}

              {!isCancelled &&
                !isReturned &&
                order.status ===
                  "delivered" &&
                returnStatus === "none" &&
                returnWindow.eligible && (
                  <div className="mt-7">

                    <button
                      type="button"
                      onClick={
                        handleOpenReturnModal
                      }
                      className="flex w-full items-center justify-center gap-2 text-[10px] uppercase tracking-[0.18em] text-gray-400 transition hover:text-red-500"
                    >

                      <span>
                        ↩
                      </span>

                      REQUEST RETURN

                    </button>

                    <p className="mt-3 text-center text-[9px] uppercase tracking-[0.12em] text-gray-600">
                      Return available for{" "}
                      {returnWindow.daysLeft}{" "}
                      {returnWindow.daysLeft ===
                      1
                        ? "day"
                        : "days"}{" "}
                      after delivery
                    </p>

                  </div>
                )}

              {!isCancelled &&
                !isReturned &&
                order.status ===
                  "delivered" &&
                returnStatus === "none" &&
                !returnWindow.eligible && (
                  <div className="mt-7 border border-white/10 px-4 py-4 text-center">

                    <p className="text-[10px] uppercase tracking-[0.16em] text-gray-500">
                      RETURN WINDOW CLOSED
                    </p>

                    <p className="mt-2 text-xs leading-5 text-gray-600">
                      Returns can only be requested within 3 days of delivery.
                    </p>

                  </div>
                )}

              {!isCancelled &&
                !isReturned &&
                returnStatus ===
                  "pending" && (
                  <div className="mt-7 border border-red-950 bg-red-950/10 px-4 py-5">

                    <p className="text-[10px] uppercase tracking-[0.18em] text-red-500">
                      RETURN REQUEST SENT
                    </p>

                    <p className="mt-2 text-xs leading-5 text-gray-400">
                      Your return request is waiting for admin authorization.
                    </p>

                  </div>
                )}

              {!isCancelled &&
                !isReturned &&
                returnStatus ===
                  "approved" && (
                  <div className="mt-7 border border-red-950 bg-red-950/10 px-4 py-5">

                    <p className="text-[10px] uppercase tracking-[0.18em] text-red-500">
                      RETURN AUTHORIZED
                    </p>

                    <p className="mt-2 text-xs leading-5 text-gray-400">
                      We will send an agent to collect the product back. Thank you for your cooperation.
                    </p>

                  </div>
                )}

              {!isCancelled &&
                !isReturned &&
                returnStatus ===
                  "collection_pending" && (
                  <div className="mt-7 border border-red-950 bg-red-950/10 px-4 py-5">

                    <p className="text-[10px] uppercase tracking-[0.18em] text-red-500">
                      COLLECTION SCHEDULED
                    </p>

                    <p className="mt-2 text-xs leading-5 text-gray-400">
                      Your return has been authorized. Our agent will collect the product.
                    </p>

                  </div>
                )}

              {!isCancelled &&
                !isReturned &&
                returnStatus ===
                  "collected" && (
                  <div className="mt-7 border border-red-950 bg-red-950/10 px-4 py-5">

                    <p className="text-[10px] uppercase tracking-[0.18em] text-red-500">
                      PRODUCT COLLECTED
                    </p>

                    <p className="mt-2 text-xs leading-5 text-gray-400">
                      The product has been collected and your return is being processed.
                    </p>

                  </div>
                )}

              {!isCancelled &&
                !isReturned &&
                returnStatus ===
                  "rejected" && (
                  <div className="mt-7 border border-red-950 bg-red-950/10 px-4 py-5">

                    <p className="text-[10px] uppercase tracking-[0.18em] text-red-500">
                      RETURN REQUEST REJECTED
                    </p>

                    {order?.returnRejectionReason && (
                      <p className="mt-2 text-xs leading-5 text-gray-400">
                        {
                          order.returnRejectionReason
                        }
                      </p>
                    )}

                  </div>
                )}

            </div>

          </div>

        </div>

      </div>

      {/* =======================================================
          ITEM CANCEL MODAL
      ======================================================= */}

      {showItemCancelModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-5 backdrop-blur-sm">

          <div className="w-full max-w-md border border-white/15 bg-[#080808] p-6 shadow-2xl sm:p-8">

            <div className="border-b border-white/10 pb-5">

              <p className="text-[10px] uppercase tracking-[0.3em] text-red-500">
                GETSUKA
              </p>

              <h2 className="mt-3 text-lg font-medium uppercase tracking-wide text-white">
                CANCEL ITEM
              </h2>

              <p className="mt-2 text-xs leading-5 text-gray-500">
                Cancel only this product from your order. The remaining items will stay active.
              </p>

            </div>

            <div className="mt-6 border border-white/10 bg-white/[0.02] p-4">

              <div className="flex items-center gap-4">

                <div className="h-16 w-16 flex-shrink-0 overflow-hidden border border-white/10 bg-white/[0.03]">

                  {getProductImage(
                    selectedItem
                  ) ? (
                    <img
                      src={getProductImage(
                        selectedItem
                      )}
                      alt={
                        selectedItem?.productName ||
                        "Product"
                      }
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[8px] uppercase tracking-wider text-gray-600">
                      NO IMAGE
                    </div>
                  )}

                </div>

                <div className="min-w-0 flex-1">

                  <p className="truncate text-xs font-medium uppercase tracking-wide text-white">
                    {selectedItem?.productName ||
                      "GETSUKA PRODUCT"}
                  </p>

                  <p className="mt-2 text-[10px] text-gray-500">
                    Qty:{" "}
                    {selectedItem?.quantity ||
                      0}

                    {selectedItem?.size
                      ? ` · Size: ${selectedItem.size}`
                      : ""}
                  </p>

                  <p className="mt-1 text-xs font-semibold text-red-500">
                    {formatPrice(
                      selectedItem?.totalPrice ??
                        Number(
                          selectedItem?.price ||
                            0
                        ) *
                          Number(
                            selectedItem?.quantity ||
                              0
                          )
                    )}
                  </p>

                </div>

              </div>

            </div>

            <div className="mt-6">

              <label
                htmlFor="itemCancellationReason"
                className="text-[10px] uppercase tracking-[0.2em] text-gray-400"
              >
                CANCELLATION REASON
              </label>

              <textarea
                id="itemCancellationReason"
                value={
                  itemCancellationReason
                }
                onChange={(event) => {
                  setItemCancellationReason(
                    event.target.value
                  );

                  if (itemCancelError) {
                    setItemCancelError("");
                  }
                }}
                placeholder="Tell us why you want to cancel this item..."
                rows={4}
                disabled={
                  itemCancelLoading
                }
                className="mt-3 w-full resize-none border border-white/15 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none placeholder:text-gray-700 focus:border-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              />

              {itemCancelError && (
                <p className="mt-2 text-xs text-red-500">
                  {itemCancelError}
                </p>
              )}

              <p className="mt-3 text-[9px] uppercase leading-5 tracking-[0.1em] text-gray-600">
                If the order was paid online, the eligible refund will be added to your GETSUKA wallet.
              </p>

            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">

              <button
                type="button"
                onClick={
                  handleCloseItemCancelModal
                }
                disabled={
                  itemCancelLoading
                }
                className="flex-1 border border-white/20 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-white transition hover:border-white/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                KEEP ITEM
              </button>

              <button
                type="button"
                onClick={
                  handleCancelItem
                }
                disabled={
                  itemCancelLoading
                }
                className="flex-1 bg-red-600 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {itemCancelLoading
                  ? "CANCELLING..."
                  : "CANCEL ITEM"}
              </button>

            </div>

          </div>

        </div>
      )}

      {/* =======================================================
          RETURN REQUEST MODAL
      ======================================================= */}

      {showReturnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-5 backdrop-blur-sm">

          <div className="w-full max-w-md border border-white/20 bg-[#080808] p-6 shadow-2xl sm:p-8">

            <div className="border-b border-white/10 pb-5">

              <p className="text-[10px] uppercase tracking-[0.3em] text-red-500">
                GETSUKA
              </p>

              <h2 className="mt-3 text-lg font-medium uppercase tracking-wide text-white">
                REQUEST RETURN
              </h2>

              <p className="mt-2 text-xs leading-5 text-gray-500">
                Submit a return request for this delivered order. The request must be authorized by GETSUKA before collection.
              </p>

            </div>

            <div className="mt-6">

              <label
                htmlFor="returnReason"
                className="text-[10px] uppercase tracking-[0.2em] text-gray-400"
              >
                RETURN REASON
              </label>

              <textarea
                id="returnReason"
                value={returnReason}
                onChange={(event) => {
                  setReturnReason(
                    event.target.value
                  );

                  if (returnError) {
                    setReturnError("");
                  }
                }}
                placeholder="Tell us why you want to return this order..."
                rows={4}
                disabled={returnLoading}
                className="mt-3 w-full resize-none border border-white/15 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none placeholder:text-gray-700 focus:border-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              />

              {returnError && (
                <p className="mt-2 text-xs text-red-500">
                  {returnError}
                </p>
              )}

            </div>

            <div className="mt-6 flex gap-3">

              <button
                type="button"
                onClick={
                  handleCloseReturnModal
                }
                disabled={
                  returnLoading
                }
                className="flex-1 border border-white/20 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-white transition hover:border-white/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                KEEP ORDER
              </button>

              <button
                type="button"
                onClick={
                  handleReturnOrder
                }
                disabled={
                  returnLoading
                }
                className="flex-1 bg-red-600 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {returnLoading
                  ? "SENDING REQUEST..."
                  : "SEND RETURN REQUEST"}
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default OrderDetailsPage;