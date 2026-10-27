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
  cancelUserOrderItems,
  returnUserOrder,
} from "../api/orderApi";
import {
  formatPrice,
  formatDate as formatSharedDate,
  formatDateSafe,
} from "../../../../shared/utils/formatters";

const OrderDetailsPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [invoiceError, setInvoiceError] = useState("");
  const [mountTime] = useState(() => Date.now());

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

  const [singleItemCancelQty, setSingleItemCancelQty] =
    useState(1);

  // =========================================================
  // BATCH CANCELLATION & SELECTION STATES
  // =========================================================

  const [selectedCancelItems, setSelectedCancelItems] =
    useState({});

  const [showBatchCancelModal, setShowBatchCancelModal] =
    useState(false);

  const [batchCancelReason, setBatchCancelReason] =
    useState("");

  const [batchCancelLoading, setBatchCancelLoading] =
    useState(false);

  const [batchCancelError, setBatchCancelError] =
    useState("");

  const [batchCancelRefund, setBatchCancelRefund] =
    useState(null);

  const [cancelFeedbackMessage, setCancelFeedbackMessage] =
    useState("");

  // =========================================================
  // ITEM RETURN SELECTION STATES
  // =========================================================

  const [selectedReturnItems, setSelectedReturnItems] =
    useState({});

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

      if (orderId?.startsWith("FAILED-")) {
        navigate("/checkout/payment-failed", {
          replace: true,
          state: {
            failedPaymentId: orderId,
            message: "Your payment was not completed.",
            paymentMethod: "razorpay",
          },
        });
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

  const formatDate = (date) =>
    formatDateSafe(date, { month: "long" }, "—");

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
  }, [order, statusSteps]);

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

  const returnWindow = useMemo(() => {
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

    const now = mountTime;

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
  }, [order?.status, order?.deliveredAt, order?.updatedAt, mountTime]);

  // =========================================================
  // BATCH CANCELLATION HELPERS & HANDLERS
  // =========================================================

  const eligibleCancelItems = useMemo(() => {
    if (!order?.items || (order.status !== "placed" && order.status !== "confirmed")) {
      return [];
    }
    return order.items.filter((item) => {
      const totalQty = Number(item.quantity) || 0;
      const cancelledQty = Number(item.cancelledQuantity) || 0;
      const returnedQty = Number(item.returnedQuantity) || 0;
      return (item.itemStatus || "active") !== "cancelled" && (totalQty - cancelledQty - returnedQty) > 0;
    });
  }, [order]);

  const handleToggleCancelItem = (itemId, maxQty) => {
    setSelectedCancelItems((prev) => {
      const existing = prev[itemId];
      if (existing?.selected) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return {
        ...prev,
        [itemId]: {
          selected: true,
          quantity: existing?.quantity || maxQty || 1,
        },
      };
    });
  };

  const handleCancelItemQtyChange = (itemId, newQty) => {
    setSelectedCancelItems((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        selected: true,
        quantity: Math.max(1, parseInt(newQty, 10) || 1),
      },
    }));
  };

  const selectedCancelItemsList = useMemo(() => {
    if (!order?.items) return [];
    return order.items
      .filter((it) => selectedCancelItems[it._id]?.selected)
      .map((it) => {
        const totalQty = Number(it.quantity) || 1;
        const cancelledQty = Number(it.cancelledQuantity) || 0;
        const returnedQty = Number(it.returnedQuantity) || 0;
        const availableQty = Math.max(1, totalQty - cancelledQty - returnedQty);
        const chosenQty = selectedCancelItems[it._id]?.quantity || availableQty;
        return {
          item: it,
          cancelQty: Math.min(chosenQty, availableQty),
          availableQty,
        };
      });
  }, [order?.items, selectedCancelItems]);

  const estimatedBatchRefund = useMemo(() => {
    if (!order || selectedCancelItemsList.length === 0) return 0;
    const isPaid = order.paymentStatus === "paid" && (order.paymentMethod === "razorpay" || order.paymentMethod === "wallet");
    if (!isPaid) return 0;

    const baseSubtotal = Number(order.originalSubtotal != null ? order.originalSubtotal : order.subtotal) || 1;
    const baseDiscount = Number(order.originalDiscount != null ? order.originalDiscount : order.discount) || 0;
    const isExpress = order.deliveryMethod === "express";
    const expressFee = isExpress ? (Number(order.shippingCharge) || 149) : 0;
    const orderBaseTotal = Number(order.originalTotalAmount != null ? order.originalTotalAmount : order.totalAmount) || 0;
    const maxRefund = Math.max(0, orderBaseTotal - expressFee);
    const alreadyRefunded = Number(order.totalRefundedAmount) || 0;
    const remainingBudget = Math.max(0, maxRefund - alreadyRefunded);

    let sum = 0;
    for (const { item, cancelQty } of selectedCancelItemsList) {
      const totalQty = Number(item.quantity) || 1;
      const gross = Number(item.price) * cancelQty;
      let unitDiscount = 0;
      if (item.discountShare != null && Number(item.discountShare) > 0) {
        unitDiscount = Number(item.discountShare) / totalQty;
      } else if (baseDiscount > 0) {
        unitDiscount = (((Number(item.totalPrice) || (Number(item.price) * totalQty)) / baseSubtotal) * baseDiscount) / totalQty;
      }
      const net = Math.max(0, gross - (unitDiscount * cancelQty));
      sum += net;
    }
    return Math.min(Math.round(sum * 100) / 100, remainingBudget);
  }, [order, selectedCancelItemsList]);

  const handleOpenBatchCancelModal = () => {
    if (selectedCancelItemsList.length === 0) return;
    setBatchCancelReason("");
    setBatchCancelError("");
    setBatchCancelRefund(null);
    setShowBatchCancelModal(true);
  };

  const handleCloseBatchCancelModal = () => {
    if (batchCancelLoading) return;
    setShowBatchCancelModal(false);
    setBatchCancelReason("");
    setBatchCancelError("");
  };

  const handleBatchCancelSubmit = async () => {
    const reason = batchCancelReason.trim();
    if (!reason) {
      setBatchCancelError("Please enter a cancellation reason.");
      return;
    }
    if (selectedCancelItemsList.length === 0) {
      setBatchCancelError("No items selected for cancellation.");
      return;
    }

    try {
      setBatchCancelLoading(true);
      setBatchCancelError("");
      setBatchCancelRefund(null);

      const payloadItems = selectedCancelItemsList.map(({ item, cancelQty }) => ({
        itemId: item._id,
        quantity: cancelQty,
      }));

      const response = await cancelUserOrderItems(orderId, payloadItems, reason);
      const updatedOrder = response?.order || response?.data?.order || response?.data;
      if (updatedOrder) {
        setOrder(updatedOrder);
      }
      if (response?.refund) {
        setBatchCancelRefund(response.refund);
      }
      setCancelFeedbackMessage(response?.message || "Selected items cancelled successfully");
      setSelectedCancelItems({});
      setShowBatchCancelModal(false);

      try {
        const fresh = await getUserOrderById(orderId);
        if (fresh?.order) setOrder(fresh.order);
      } catch {
        // best effort refresh
      }
    } catch (err) {
      console.error("Batch Cancel Error:", err);
      setBatchCancelError(err?.response?.data?.message || err?.message || "Failed to cancel selected items");
    } finally {
      setBatchCancelLoading(false);
    }
  };

  // =========================================================
  // OPEN ITEM CANCEL MODAL
  // =========================================================

  const handleOpenItemCancelModal = (item) => {
    setSelectedItem(item);
    const totalQty = Number(item?.quantity) || 1;
    const cancelledQty = Number(item?.cancelledQuantity) || 0;
    const returnedQty = Number(item?.returnedQuantity) || 0;
    const avail = Math.max(1, totalQty - cancelledQty - returnedQty);
    setSingleItemCancelQty(avail);
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
    setSingleItemCancelQty(1);
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
          reason,
          singleItemCancelQty
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
  // ITEM RETURN HELPERS & HANDLERS
  // =========================================================

  const eligibleReturnItems = useMemo(() => {
    if (!order?.items || order.status !== "delivered") return [];
    return order.items.filter((item) => {
      const totalQty = Number(item.quantity) || 0;
      const cancelledQty = Number(item.cancelledQuantity) || 0;
      const returnedQty = Number(item.returnedQuantity) || 0;
      return (item.itemStatus || "active") !== "cancelled" && (totalQty - cancelledQty - returnedQty) > 0;
    });
  }, [order]);

  const handleToggleReturnItem = (itemId, maxQty) => {
    setSelectedReturnItems((prev) => {
      const existing = prev[itemId];
      if (existing?.selected) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return {
        ...prev,
        [itemId]: {
          selected: true,
          quantity: existing?.quantity || maxQty || 1,
        },
      };
    });
  };

  const handleReturnItemQtyChange = (itemId, newQty) => {
    setSelectedReturnItems((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        selected: true,
        quantity: Math.max(1, parseInt(newQty, 10) || 1),
      },
    }));
  };

  const selectedReturnItemsList = useMemo(() => {
    if (!order?.items) return [];
    return order.items
      .filter((it) => selectedReturnItems[it._id]?.selected)
      .map((it) => {
        const totalQty = Number(it.quantity) || 1;
        const cancelledQty = Number(it.cancelledQuantity) || 0;
        const returnedQty = Number(it.returnedQuantity) || 0;
        const availableQty = Math.max(1, totalQty - cancelledQty - returnedQty);
        const chosenQty = selectedReturnItems[it._id]?.quantity || availableQty;
        return {
          item: it,
          returnQty: Math.min(chosenQty, availableQty),
          availableQty,
        };
      });
  }, [order?.items, selectedReturnItems]);

  const estimatedReturnRefund = useMemo(() => {
    if (!order || selectedReturnItemsList.length === 0) return 0;
    const isPaid = (order.paymentStatus === "paid" && (order.paymentMethod === "razorpay" || order.paymentMethod === "wallet")) || order.paymentMethod === "cod";
    if (!isPaid) return 0;

    const baseSubtotal = Number(order.originalSubtotal != null ? order.originalSubtotal : order.subtotal) || 1;
    const baseDiscount = Number(order.originalDiscount != null ? order.originalDiscount : order.discount) || 0;
    const isExpress = order.deliveryMethod === "express";
    const expressFee = isExpress ? (Number(order.shippingCharge) || 149) : 0;
    const orderBaseTotal = Number(order.originalTotalAmount != null ? order.originalTotalAmount : order.totalAmount) || 0;
    const maxRefund = Math.max(0, orderBaseTotal - expressFee);
    const alreadyRefunded = Number(order.totalRefundedAmount) || 0;
    const remainingBudget = Math.max(0, maxRefund - alreadyRefunded);

    let sum = 0;
    for (const { item, returnQty } of selectedReturnItemsList) {
      const totalQty = Number(item.quantity) || 1;
      const gross = Number(item.price) * returnQty;
      let unitDiscount = 0;
      if (item.discountShare != null && Number(item.discountShare) > 0) {
        unitDiscount = Number(item.discountShare) / totalQty;
      } else if (baseDiscount > 0) {
        unitDiscount = (((Number(item.totalPrice) || (Number(item.price) * totalQty)) / baseSubtotal) * baseDiscount) / totalQty;
      }
      const net = Math.max(0, gross - (unitDiscount * returnQty));
      sum += net;
    }
    return Math.min(Math.round(sum * 100) / 100, remainingBudget);
  }, [order, selectedReturnItemsList]);

  // =========================================================
  // OPEN RETURN REQUEST MODAL
  // =========================================================

  const handleOpenReturnModal = (specificItem = null) => {
    setReturnReason("");
    setReturnError("");
    if (specificItem && specificItem._id) {
      const totalQty = Number(specificItem.quantity) || 0;
      const cancelledQty = Number(specificItem.cancelledQuantity) || 0;
      const returnedQty = Number(specificItem.returnedQuantity) || 0;
      const avail = Math.max(1, totalQty - cancelledQty - returnedQty);
      setSelectedReturnItems({
        [specificItem._id]: { selected: true, quantity: avail },
      });
    } else {
      const initialReturns = {};
      eligibleReturnItems.forEach((item, idx) => {
        const totalQty = Number(item.quantity) || 0;
        const cancelledQty = Number(item.cancelledQuantity) || 0;
        const returnedQty = Number(item.returnedQuantity) || 0;
        const avail = Math.max(1, totalQty - cancelledQty - returnedQty);
        initialReturns[item._id] = {
          selected: eligibleReturnItems.length === 1 ? true : idx === 0,
          quantity: avail,
        };
      });
      setSelectedReturnItems(initialReturns);
    }
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
    setSelectedReturnItems({});
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

    const payloadItems = selectedReturnItemsList.map(({ item, returnQty }) => ({
      itemId: item._id,
      quantity: returnQty,
    }));

    if (payloadItems.length === 0) {
      setReturnError("Please select at least one item to return.");
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
          reason,
          payloadItems
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

    const formatINR = (val) => {
      const num = Number(val) || 0;
      return (
        "₹" +
        num.toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      );
    };

    const items = Array.isArray(order.items) ? order.items : [];

    // =========================================================
    // AUTHORITATIVE FINANCIAL CALCULATIONS
    // =========================================================

    const calculatedItemsSubtotal = items.reduce((sum, item) => {
      const p = Number(item?.price || 0);
      const q = Number(item?.quantity || 1);
      return sum + (Number(item?.totalPrice) || p * q);
    }, 0);

    const originalSubtotal =
      order?.originalSubtotal != null && Number(order.originalSubtotal) > 0
        ? Number(order.originalSubtotal)
        : calculatedItemsSubtotal > 0
        ? calculatedItemsSubtotal
        : Number(order?.subtotal || 0);

    const originalDiscount =
      order?.originalDiscount != null
        ? Number(order.originalDiscount)
        : Number(order?.discount || 0);

    const shippingCharge = Number(order?.shippingCharge || 0);
    const isExpress =
      order?.deliveryMethod === "express" || shippingCharge === 149;
    const nonRefundableShipping = isExpress ? shippingCharge : 0;
    const tax = Number(order?.tax || 0);

    // Immutable snapshot if present, else safe derived total
    const originalTotalAmount =
      order?.originalTotalAmount != null && Number(order.originalTotalAmount) > 0
        ? Number(order.originalTotalAmount)
        : order?.totalAmount != null &&
          order?.totalRefundedAmount != null &&
          Number(order.totalRefundedAmount) > 0
        ? Number(order.totalAmount) + Number(order.totalRefundedAmount)
        : Math.max(
            0,
            originalSubtotal - originalDiscount + shippingCharge + tax
          );

    // Payment & COD classification
    const isCod = order?.paymentMethod === "cod";
    const isUnpaidCod =
      isCod &&
      order?.paymentStatus !== "paid" &&
      order?.status !== "delivered" &&
      order?.status !== "returned";

    // Item-level processed details
    const processedItems = items.map((item, index) => {
      const originalQty = Math.max(1, Number(item?.quantity || 1));
      const isItemCancelled = (item?.itemStatus || "active") === "cancelled";
      const isItemCompletedReturn = item?.returnStatus === "completed";

      const cancelledQty = Math.min(
        originalQty,
        Math.max(
          0,
          Number(
            item?.cancelledQuantity != null
              ? item.cancelledQuantity
              : isItemCancelled
              ? originalQty
              : 0
          )
        )
      );

      const returnedQty = Math.min(
        originalQty - cancelledQty,
        Math.max(
          0,
          Number(
            item?.returnedQuantity != null
              ? item.returnedQuantity
              : isItemCompletedReturn
              ? originalQty
              : 0
          )
        )
      );

      const retainedQty = Math.max(0, originalQty - cancelledQty - returnedQty);
      const unitPrice = Number(item?.price || 0);
      const originalItemAmount =
        Number(item?.totalPrice) || unitPrice * originalQty;

      // Proportional coupon discount allocation
      let discountShare = 0;
      if (item?.discountShare != null && Number(item.discountShare) > 0) {
        discountShare = Number(item.discountShare);
      } else if (originalDiscount > 0 && originalSubtotal > 0) {
        discountShare =
          Math.round(
            ((originalItemAmount / originalSubtotal) * originalDiscount) * 100
          ) / 100;
      }

      // Item-level refund calculation
      let itemRefund = 0;
      if (!isUnpaidCod) {
        if (Number(item?.refundedAmount || 0) > 0) {
          itemRefund = Number(item.refundedAmount);
        } else if (cancelledQty > 0 || returnedQty > 0) {
          const nonRetainedQty = cancelledQty + returnedQty;
          const unitDiscount =
            originalQty > 0 ? discountShare / originalQty : 0;
          itemRefund = Math.max(
            0,
            Math.round(
              (unitPrice * nonRetainedQty - unitDiscount * nonRetainedQty) * 100
            ) / 100
          );
        }
      }

      const itemNetRetained = Math.max(
        0,
        Math.round(
          (originalItemAmount -
            (retainedQty === 0
              ? discountShare
              : (discountShare * retainedQty) / originalQty) -
            itemRefund) *
            100
        ) / 100
      );

      return {
        ...item,
        index: index + 1,
        originalQty,
        cancelledQty,
        returnedQty,
        retainedQty,
        unitPrice,
        originalItemAmount,
        discountShare,
        itemRefund,
        itemNetRetained,
        isFullyCancelled: cancelledQty >= originalQty,
        isFullyReturned: returnedQty >= originalQty,
        isPartiallyModified:
          (cancelledQty > 0 || returnedQty > 0) && retainedQty > 0,
      };
    });

    // Authoritative wallet refund
    const backendRefundAmount = Number(order?.totalRefundedAmount || 0);
    const itemRefundSum = processedItems.reduce(
      (acc, it) => acc + it.itemRefund,
      0
    );

    let totalRefunded = isUnpaidCod
      ? 0
      : Math.max(backendRefundAmount, itemRefundSum);

    const maxRefundable = Math.max(
      0,
      originalTotalAmount - nonRefundableShipping
    );

    // Legacy fallback if order status indicates full refund but records were uninitialized
    if (!isUnpaidCod && totalRefunded === 0) {
      if (
        order?.paymentStatus === "refunded" ||
        (order?.status === "cancelled" &&
          (order?.paymentStatus === "paid" ||
            order?.paymentMethod === "razorpay" ||
            order?.paymentMethod === "wallet"))
      ) {
        totalRefunded = maxRefundable;
      }
    }

    totalRefunded = Math.min(totalRefunded, maxRefundable);
    totalRefunded = Math.round(totalRefunded * 100) / 100;

    // Net retained order value
    let netRetainedOrderValue = Math.max(
      0,
      Math.round((originalTotalAmount - totalRefunded) * 100) / 100
    );

    const allItemsNonRetained =
      processedItems.length > 0 &&
      processedItems.every((it) => it.retainedQty === 0);

    if (allItemsNonRetained) {
      netRetainedOrderValue = isUnpaidCod ? 0 : nonRefundableShipping;
    }

    // Invoice Status derivation
    let invoiceStatus = "PAID";
    let invoiceStatusBadgeClass = "badge-paid";

    if (isUnpaidCod) {
      if (order?.status === "cancelled" || allItemsNonRetained) {
        invoiceStatus = "CANCELLED (UNPAID COD)";
        invoiceStatusBadgeClass = "badge-cancelled";
      } else {
        invoiceStatus = "COD PENDING";
        invoiceStatusBadgeClass = "badge-cod";
      }
    } else {
      if (
        order?.paymentStatus === "refunded" ||
        (allItemsNonRetained && totalRefunded >= maxRefundable) ||
        (order?.status === "cancelled" && totalRefunded > 0)
      ) {
        invoiceStatus = "REFUNDED";
        invoiceStatusBadgeClass = "badge-refunded";
      } else if (totalRefunded > 0) {
        invoiceStatus = "PARTIALLY REFUNDED";
        invoiceStatusBadgeClass = "badge-partial";
      } else if (order?.status === "cancelled") {
        invoiceStatus = "CANCELLED";
        invoiceStatusBadgeClass = "badge-cancelled";
      } else if (order?.paymentStatus === "paid") {
        invoiceStatus = "PAID";
        invoiceStatusBadgeClass = "badge-paid";
      } else {
        invoiceStatus = "PAYMENT PENDING";
        invoiceStatusBadgeClass = "badge-pending";
      }
    }

    // Asset paths
    const origin = window.location.origin;
    const animeArtUrl = `${origin}/assets/getsuka-anime-art.png`;
    const invoiceDateStr = new Date().toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });

    const itemsHtml = processedItems
      .map((item) => {
        let statusBadge = "";
        let rowClass = "";

        if (item.isFullyCancelled) {
          rowClass = "row-cancelled";
          statusBadge = `<span class="item-tag tag-cancelled">CANCELLED</span>`;
        } else if (item.isFullyReturned) {
          rowClass = "row-returned";
          statusBadge = `<span class="item-tag tag-returned">RETURNED</span>`;
        } else if (item.isPartiallyModified) {
          rowClass = "row-partial";
          statusBadge = `<span class="item-tag tag-partial">PARTIAL (${item.retainedQty} of ${item.originalQty} kept)</span>`;
        } else {
          statusBadge = `<span class="item-tag tag-active">ACTIVE / RETAINED</span>`;
        }

        const variantParts = [
          item?.size ? `Size: ${escapeHtml(item.size)}` : "",
          item?.color ? `Color: ${escapeHtml(item.color)}` : "",
          item?.sku ? `SKU: ${escapeHtml(item.sku)}` : "",
        ].filter(Boolean);

        return `
          <tr class="${rowClass}">
            <td class="col-num">${item.index}</td>
            <td class="col-desc">
              <div class="product-name">${escapeHtml(
                item?.productName || "GETSUKA Apparel"
              )}</div>
              ${statusBadge}
              ${
                variantParts.length > 0
                  ? `<div class="variant-info">${variantParts.join(" · ")}</div>`
                  : ""
              }
              ${
                item.cancelledQty > 0 && item.cancellationReason
                  ? `<div class="mod-note">Cancel reason: ${escapeHtml(
                      item.cancellationReason
                    )}</div>`
                  : ""
              }
              ${
                item.returnedQty > 0 && item.returnReason
                  ? `<div class="mod-note">Return reason: ${escapeHtml(
                      item.returnReason
                    )}</div>`
                  : ""
              }
            </td>
            <td class="col-price">${formatINR(item.unitPrice)}</td>
            <td class="col-qty">
              <div class="qty-line"><strong>Orig:</strong> ${item.originalQty}</div>
              <div class="qty-line ${
                item.retainedQty > 0 ? "qty-retained" : "qty-zero"
              }"><strong>Kept:</strong> ${item.retainedQty}</div>
              ${
                item.cancelledQty > 0
                  ? `<div class="qty-line qty-cancelled"><strong>Canc:</strong> ${item.cancelledQty}</div>`
                  : ""
              }
              ${
                item.returnedQty > 0
                  ? `<div class="qty-line qty-returned"><strong>Ret:</strong> ${item.returnedQty}</div>`
                  : ""
              }
            </td>
            <td class="col-discount">
              ${
                item.discountShare > 0
                  ? `<span class="discount-val">- ${formatINR(
                      item.discountShare
                    )}</span>`
                  : `<span class="muted">—</span>`
              }
            </td>
            <td class="col-refund">
              ${
                item.itemRefund > 0
                  ? `<span class="refund-val">- ${formatINR(
                      item.itemRefund
                    )}</span>`
                  : `<span class="muted">—</span>`
              }
            </td>
            <td class="col-total">
              <span class="${
                item.itemNetRetained > 0 ? "net-val" : "muted-val"
              }">
                ${formatINR(item.itemNetRetained)}
              </span>
            </td>
          </tr>
        `;
      })
      .join("");

    const invoiceWindow = window.open("", "_blank", "width=1000,height=850");

    if (!invoiceWindow) {
      setInvoiceError(
        "Please allow pop-ups in your browser to view or download the invoice."
      );
      return;
    }

    setInvoiceError("");

    invoiceWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>GETSUKA-Invoice-${escapeHtml(
            order.orderNumber || order._id || "Order"
          )}.pdf</title>

          <!-- Google Fonts -->
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
          <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />

          <style>
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }

            html, body {
              background: #FAF9F7;
              color: #252321;
              font-family: 'Plus Jakarta Sans', sans-serif;
              font-size: 13px;
              line-height: 1.5;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            /* TOOLBAR - HIDDEN WHEN PRINTING */
            .action-bar {
              position: sticky;
              top: 0;
              z-index: 100;
              background: #FAF9F7;
              border-bottom: 1px solid #E5E4E2;
              padding: 12px 24px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
            }

            .action-title {
              display: flex;
              align-items: center;
              gap: 12px;
              font-size: 13px;
              font-weight: 600;
              letter-spacing: 1.5px;
              text-transform: uppercase;
              color: #252321;
            }

            .action-title .kanji {
              color: #6F4E37;
              font-family: 'Playfair Display', Georgia, serif;
              font-weight: 900;
              font-size: 18px;
            }

            .action-buttons {
              display: flex;
              gap: 12px;
            }

            .btn {
              cursor: pointer;
              display: inline-flex;
              align-items: center;
              gap: 8px;
              padding: 8px 18px;
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 1.2px;
              text-transform: uppercase;
              border-radius: 4px;
              transition: all 0.2s ease;
            }

            .btn-primary {
              background: #6F4E37;
              color: #ffffff;
              border: 1px solid #6F4E37;
              box-shadow: 0 2px 10px rgba(111, 78, 55, 0.2);
            }

            .btn-primary:hover {
              background: #5a3e2b;
              box-shadow: 0 4px 16px rgba(239, 68, 68, 0.5);
              transform: translateY(-1px);
            }

            .btn-secondary {
              background: #FFFFFF;
              color: #716C67;
              border: 1px solid #E5E4E2;
            }

            .btn-secondary:hover {
              color: #ffffff;
              border-color: #6F4E37;
            }

            /* INVOICE CONTAINER */
            .invoice-wrapper {
              max-width: 900px;
              margin: 30px auto 60px;
              padding: 0 20px;
              position: relative;
            }

            .invoice-card {
              position: relative;
              background: #FFFFFF;
              border: 1px solid #E5E4E2;
              border-radius: 8px;
              padding: 36px 40px;
              box-shadow: 0 4px 25px rgba(0, 0, 0, 0.05);
              overflow: hidden;
            }

            /* WATERMARK */
            .watermark-art {
              position: absolute;
              right: -40px;
              bottom: 40px;
              width: 480px;
              height: 480px;
              background-image: url('${animeArtUrl}');
              background-size: cover;
              background-position: center;
              opacity: 0.04;
              pointer-events: none;
              mix-blend-mode: screen;
              z-index: 0;
            }

            .invoice-content {
              position: relative;
              z-index: 1;
            }

            /* HEADER */
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 1px solid #E5E4E2;
              padding-bottom: 24px;
              position: relative;
            }

            .brand-section {
              display: flex;
              flex-direction: column;
              gap: 4px;
            }

            .brand-name {
              display: flex;
              align-items: center;
              gap: 10px;
              font-family: 'Playfair Display', Georgia, serif;
              font-size: 32px;
              font-weight: 900;
              letter-spacing: 2.5px;
              color: #ffffff;
              
            }

            .brand-kanji {
              color: #6F4E37;
              font-weight: 900;
              font-size: 28px;
            }

            .brand-sub {
              font-size: 10px;
              font-weight: 600;
              letter-spacing: 3px;
              text-transform: uppercase;
              color: #6F4E37;
            }

            .brand-tagline {
              margin-top: 4px;
              font-size: 11px;
              color: #716C67;
              letter-spacing: 0.8px;
            }

            .invoice-meta-header {
              text-align: right;
              display: flex;
              flex-direction: column;
              align-items: flex-end;
              gap: 6px;
            }

            .invoice-title-text {
              font-family: 'Playfair Display', Georgia, serif;
              font-size: 26px;
              font-weight: 800;
              letter-spacing: 3px;
              color: #ffffff;
            }

            .invoice-num {
              font-family: 'JetBrains Mono', monospace;
              font-size: 13px;
              color: #252321;
              letter-spacing: 1px;
            }

            .invoice-date {
              font-size: 11px;
              color: #716C67;
            }

            /* STATUS BADGES */
            .status-badge {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              margin-top: 4px;
              padding: 5px 12px;
              border-radius: 4px;
              font-size: 10px;
              font-weight: 800;
              letter-spacing: 1.5px;
              text-transform: uppercase;
            }

            .status-badge::before {
              content: '';
              display: inline-block;
              width: 6px;
              height: 6px;
              border-radius: 50%;
            }

            .badge-paid {
              background: rgba(34, 197, 94, 0.12);
              border: 1px solid rgba(34, 197, 94, 0.4);
              color: #4ade80;
            }
            .badge-paid::before {
              background: #22c55e;
              box-shadow: 0 0 6px #22c55e;
            }

            .badge-partial {
              background: #E6E0F0;
              border: 1px solid #D8D3CF;
              color: #6F4E37;
            }
            .badge-partial::before {
              background: #ef4444;
              box-shadow: 0 0 6px #ef4444;
            }

            .badge-refunded {
              background: rgba(168, 85, 247, 0.15);
              border: 1px solid rgba(168, 85, 247, 0.4);
              color: #c084fc;
            }
            .badge-refunded::before {
              background: #a855f7;
              box-shadow: 0 0 6px #a855f7;
            }

            .badge-cancelled {
              background: #E6E0F0;
              border: 1px solid #D8D3CF;
              color: #6F4E37;
            }
            .badge-cancelled::before {
              background: #ef4444;
              box-shadow: 0 0 6px #ef4444;
            }

            .badge-cod {
              background: rgba(245, 158, 11, 0.15);
              border: 1px solid rgba(245, 158, 11, 0.4);
              color: #fbbf24;
            }
            .badge-cod::before {
              background: #f59e0b;
              box-shadow: 0 0 6px #f59e0b;
            }

            .badge-pending {
              background: rgba(148, 163, 184, 0.12);
              border: 1px solid rgba(148, 163, 184, 0.3);
              color: #252321;
            }
            .badge-pending::before {
              background: #94a3b8;
            }

            /* ART HERO STRIP */
            .art-hero-strip {
              margin-top: 20px;
              height: 72px;
              border-radius: 6px;
              background-image: linear-gradient(90deg, rgba(15, 17, 24, 0.95) 0%, rgba(15, 17, 24, 0.4) 50%, rgba(15, 17, 24, 0.95) 100%), url('${animeArtUrl}');
              background-size: cover;
              background-position: center 30%;
              border: 1px solid #E5E4E2;
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 0 24px;
            }

            .art-hero-text {
              font-family: 'Playfair Display', Georgia, serif;
              font-size: 13px;
              letter-spacing: 2.5px;
              font-weight: 700;
              color: #f1f5f9;
              text-transform: uppercase;
              text-shadow: 0 2px 8px rgba(0,0,0,0.8);
            }

            .art-hero-sub {
              font-size: 10px;
              letter-spacing: 1.5px;
              color: #6F4E37;
              font-weight: 600;
              text-transform: uppercase;
            }

            /* META GRID */
            .meta-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin: 24px 0;
            }

            .meta-box {
              background: #FAF9F7;
              border: 1px solid #E5E4E2;
              border-top: 2px solid #6F4E37;
              border-radius: 6px;
              padding: 16px 20px;
            }

            .meta-heading {
              font-size: 10px;
              font-weight: 800;
              letter-spacing: 2px;
              text-transform: uppercase;
              color: #6F4E37;
              margin-bottom: 10px;
              display: flex;
              align-items: center;
              gap: 6px;
            }

            .meta-body {
              font-size: 12px;
              color: #252321;
              line-height: 1.7;
            }

            .meta-body strong {
              color: #ffffff;
              font-size: 13px;
            }

            .meta-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 4px;
            }

            .meta-key {
              color: #716C67;
            }

            .meta-val {
              color: #f1f5f9;
              font-weight: 600;
              text-align: right;
            }

            /* PRODUCTS TABLE */
            .table-container {
              margin: 28px 0;
              border: 1px solid #E5E4E2;
              border-radius: 6px;
              overflow: hidden;
              background: #FFFFFF;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
            }

            thead tr {
              background: #FAF9F7;
              border-bottom: 1px solid rgba(239, 68, 68, 0.4);
            }

            th {
              padding: 12px 14px;
              color: #716C67;
              font-size: 10px;
              font-weight: 700;
              letter-spacing: 1.5px;
              text-transform: uppercase;
              text-align: left;
            }

            th.right, td.right {
              text-align: right;
            }

            th.center, td.center {
              text-align: center;
            }

            tbody tr {
              border-bottom: 1px solid #E5E4E2;
              transition: background 0.15s ease;
            }

            tbody tr:last-child {
              border-bottom: none;
            }

            td {
              padding: 14px;
              vertical-align: top;
              color: #252321;
            }

            .row-cancelled {
              background: rgba(239, 68, 68, 0.04);
            }

            .row-returned {
              background: rgba(168, 85, 247, 0.04);
            }

            .row-partial {
              background: rgba(245, 158, 11, 0.03);
            }

            .col-num {
              width: 30px;
              color: #64748b;
              font-family: 'JetBrains Mono', monospace;
              font-size: 11px;
            }

            .col-desc {
              width: 34%;
            }

            .product-name {
              font-size: 13px;
              font-weight: 700;
              color: #ffffff;
              margin-bottom: 4px;
            }

            .variant-info {
              font-size: 11px;
              color: #716C67;
              margin-top: 4px;
            }

            .mod-note {
              font-size: 10px;
              color: #6F4E37;
              margin-top: 4px;
              line-height: 1.4;
            }

            .col-price {
              font-family: 'JetBrains Mono', monospace;
              font-size: 12px;
              color: #252321;
              white-space: nowrap;
            }

            .col-qty {
              white-space: nowrap;
              font-size: 11px;
            }

            .qty-line {
              margin-bottom: 2px;
            }

            .qty-line strong {
              color: #716C67;
              font-weight: 600;
            }

            .qty-retained {
              color: #4ade80;
            }

            .qty-cancelled {
              color: #6F4E37;
            }

            .qty-returned {
              color: #c084fc;
            }

            .qty-zero {
              color: #64748b;
            }

            .col-discount {
              font-family: 'JetBrains Mono', monospace;
              font-size: 12px;
              white-space: nowrap;
            }

            .discount-val {
              color: #38bdf8;
            }

            .col-refund {
              font-family: 'JetBrains Mono', monospace;
              font-size: 12px;
              white-space: nowrap;
            }

            .refund-val {
              color: #6F4E37;
              font-weight: 700;
            }

            .col-total {
              font-family: 'JetBrains Mono', monospace;
              font-size: 13px;
              font-weight: 700;
              text-align: right;
              white-space: nowrap;
            }

            .net-val {
              color: #ffffff;
            }

            .muted-val {
              color: #64748b;
              text-decoration: line-through;
            }

            .item-tag {
              display: inline-block;
              font-size: 9px;
              font-weight: 800;
              letter-spacing: 1px;
              padding: 2px 6px;
              border-radius: 3px;
              margin-bottom: 4px;
              text-transform: uppercase;
            }

            .tag-active {
              background: rgba(34, 197, 94, 0.12);
              color: #4ade80;
              border: 1px solid rgba(34, 197, 94, 0.3);
            }

            .tag-partial {
              background: rgba(245, 158, 11, 0.15);
              color: #fbbf24;
              border: 1px solid rgba(245, 158, 11, 0.35);
            }

            .tag-cancelled {
              background: #E6E0F0;
              color: #6F4E37;
              border: 1px solid #D8D3CF;
            }

            .tag-returned {
              background: rgba(168, 85, 247, 0.15);
              color: #c084fc;
              border: 1px solid rgba(168, 85, 247, 0.35);
            }

            .muted {
              color: #64748b;
            }

            /* SUMMARY SECTION */
            .bottom-section {
              display: grid;
              grid-template-columns: 1fr 380px;
              gap: 24px;
              margin-top: 24px;
              align-items: flex-start;
            }

            .notes-card {
              background: #FAF9F7;
              border: 1px solid #E5E4E2;
              border-left: 3px solid #ef4444;
              border-radius: 6px;
              padding: 18px 20px;
            }

            .notes-heading {
              font-size: 10px;
              font-weight: 800;
              letter-spacing: 2px;
              text-transform: uppercase;
              color: #6F4E37;
              margin-bottom: 8px;
            }

            .notes-body {
              font-size: 11px;
              color: #716C67;
              line-height: 1.6;
            }

            .seal-art {
              margin-top: 14px;
              display: flex;
              align-items: center;
              gap: 8px;
              font-family: 'Playfair Display', Georgia, serif;
              font-size: 11px;
              color: #252321;
              letter-spacing: 1px;
            }

            .seal-stamp {
              border: 1px solid #6F4E37;
              color: #6F4E37;
              padding: 2px 6px;
              border-radius: 2px;
              font-size: 10px;
              font-weight: 800;
            }

            .summary-card {
              background: #FAF9F7;
              border: 1px solid #E5E4E2;
              border-radius: 6px;
              padding: 20px;
            }

            .summary-title {
              font-size: 11px;
              font-weight: 800;
              letter-spacing: 2px;
              text-transform: uppercase;
              color: #252321;
              padding-bottom: 12px;
              border-bottom: 1px solid #23283a;
              margin-bottom: 12px;
            }

            .summary-row {
              display: flex;
              justify-content: space-between;
              padding: 6px 0;
              font-size: 12px;
              color: #716C67;
            }

            .summary-row.bold {
              color: #ffffff;
              font-weight: 600;
            }

            .summary-row.discount {
              color: #38bdf8;
            }

            .summary-row.refund {
              color: #6F4E37;
              font-weight: 700;
              padding: 8px 0;
              border-top: 1px dashed #E5E4E2;
              border-bottom: 1px dashed #E5E4E2;
              margin: 4px 0;
            }

            .summary-value {
              font-family: 'JetBrains Mono', monospace;
              text-align: right;
            }

            /* HERO RETAINED BALANCE */
            .retained-hero-box {
              margin-top: 16px;
              background: linear-gradient(135deg, #E6E0F0 0%, rgba(15, 17, 24, 0.95) 100%);
              border: 1px solid #6F4E37;
              border-radius: 6px;
              padding: 16px;
              box-shadow: 0 4px 20px rgba(239, 68, 68, 0.18);
            }

            .retained-hero-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 6px;
            }

            .retained-label {
              font-size: 11px;
              font-weight: 800;
              letter-spacing: 1.5px;
              text-transform: uppercase;
              color: #f1f5f9;
            }

            .retained-amount {
              font-family: 'JetBrains Mono', monospace;
              font-size: 22px;
              font-weight: 900;
              color: #ffffff;
              text-shadow: 0 0 12px rgba(239, 68, 68, 0.4);
            }

            .retained-caption {
              font-size: 10px;
              color: #252321;
              line-height: 1.4;
              margin-top: 6px;
              border-top: 1px solid rgba(255, 255, 255, 0.1);
              padding-top: 6px;
            }

            /* FOOTER */
            .footer {
              margin-top: 40px;
              padding-top: 24px;
              border-top: 1px solid #23283a;
              text-align: center;
              position: relative;
            }

            .footer-signature {
              font-family: 'Playfair Display', Georgia, serif;
              font-size: 13px;
              font-weight: 700;
              letter-spacing: 2.5px;
              color: #ffffff;
              margin-bottom: 6px;
            }

            .footer-sub {
              font-size: 11px;
              color: #6F4E37;
              letter-spacing: 1.5px;
              text-transform: uppercase;
              margin-bottom: 12px;
            }

            .footer-legal {
              font-size: 10px;
              color: #64748b;
              line-height: 1.6;
            }

            /* PRINT STYLES */
            @media print {
              .no-print {
                display: none !important;
              }

              html, body {
                background: #09090d !important;
                color: #f8fafc !important;
                padding: 0 !important;
                margin: 0 !important;
              }

              .invoice-wrapper {
                max-width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
              }

              .invoice-card {
                border: 1px solid rgba(239, 68, 68, 0.4) !important;
                box-shadow: none !important;
                border-radius: 0 !important;
                padding: 20px 24px !important;
              }

              tr, .meta-box, .notes-card, .summary-card, .retained-hero-box {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }

              @page {
                size: A4;
                margin: 8mm 10mm;
              }
            }

            @media (max-width: 768px) {
              .header {
                flex-direction: column;
                gap: 16px;
              }
              .invoice-meta-header {
                text-align: left;
                align-items: flex-start;
              }
              .meta-grid {
                grid-template-columns: 1fr;
              }
              .bottom-section {
                grid-template-columns: 1fr;
              }
            }
          </style>
        </head>

        <body>
          <!-- TOP TOOLBAR -->
          <div class="action-bar no-print">
            <div class="action-title">
              <span class="kanji">月下</span>
              <span>GETSUKA Invoice Preview</span>
            </div>
            <div class="action-buttons">
              <button class="btn btn-secondary" onclick="window.close()">✕ Close</button>
              <button class="btn btn-primary" onclick="window.print()">🖨️ Print / Save as PDF</button>
            </div>
          </div>

          <div class="invoice-wrapper">
            <div class="invoice-card">
              <div class="watermark-art"></div>

              <div class="invoice-content">
                <!-- HEADER -->
                <div class="header">
                  <div class="brand-section">
                    <div class="brand-name">
                      <span>GETSUKA</span>
                      <span class="brand-kanji">月下</span>
                    </div>
                    <div class="brand-sub">Anime Fashion Store · Tokyo &amp; Global</div>
                    <div class="brand-tagline">Cinematic Streetwear for the Discerning Fan</div>
                  </div>

                  <div class="invoice-meta-header">
                    <div class="invoice-title-text">TAX INVOICE</div>
                    <div class="invoice-num">INV-${escapeHtml(
                      order.orderNumber || order._id || "—"
                    )}</div>
                    <div class="invoice-date">Issue Date: ${escapeHtml(
                      invoiceDateStr
                    )}</div>
                    <div class="status-badge ${invoiceStatusBadgeClass}">
                      ${escapeHtml(invoiceStatus)}
                    </div>
                  </div>
                </div>

                <!-- ART HERO STRIP -->
                <div class="art-hero-strip">
                  <div class="art-hero-text">
                    GETSUKA OFFICIAL INVOICE
                  </div>
                  <div class="art-hero-sub">
                    // ARCHIVAL FINANCIAL RECORD //
                  </div>
                </div>

                <!-- META INFO GRID -->
                <div class="meta-grid">
                  <div class="meta-box">
                    <div class="meta-heading">
                      <span>✦</span>
                      <span>Customer &amp; Billing Address</span>
                    </div>
                    <div class="meta-body">
                      <strong>${escapeHtml(
                        order?.shippingAddress?.fullName || "Valued Customer"
                      )}</strong><br />
                      ${escapeHtml(
                        order?.shippingAddress?.addressLine || "—"
                      )}<br />
                      ${escapeHtml(order?.shippingAddress?.city || "—")}, ${escapeHtml(
          order?.shippingAddress?.state || "—"
        )} - ${escapeHtml(order?.shippingAddress?.pincode || "—")}<br />
                      ${
                        order?.shippingAddress?.phone
                          ? `Phone: ${escapeHtml(order.shippingAddress.phone)}`
                          : ""
                      }
                    </div>
                  </div>

                  <div class="meta-box">
                    <div class="meta-heading">
                      <span>✦</span>
                      <span>Order &amp; Payment Specifications</span>
                    </div>
                    <div class="meta-body">
                      <div class="meta-row">
                        <span class="meta-key">Order Number:</span>
                        <span class="meta-val">${escapeHtml(
                          order.orderNumber || order._id || "—"
                        )}</span>
                      </div>
                      <div class="meta-row">
                        <span class="meta-key">Order Date:</span>
                        <span class="meta-val">${escapeHtml(
                          formatDate(order?.createdAt)
                        )}</span>
                      </div>
                      <div class="meta-row">
                        <span class="meta-key">Payment Method:</span>
                        <span class="meta-val">${escapeHtml(
                          getPaymentMethod(order?.paymentMethod)
                        )}</span>
                      </div>
                      <div class="meta-row">
                        <span class="meta-key">Delivery Option:</span>
                        <span class="meta-val">${escapeHtml(
                          getDeliveryMethod(order?.deliveryMethod)
                        )}${
                          isExpress ? " (Express · Non-refundable)" : ""
                        }</span>
                      </div>
                      <div class="meta-row">
                        <span class="meta-key">Payment Status:</span>
                        <span class="meta-val">${escapeHtml(
                          formatStatus(order?.paymentStatus)
                        )}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- ITEMS TABLE -->
                <div class="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th class="col-num">#</th>
                        <th class="col-desc">Product &amp; Details</th>
                        <th class="col-price">Unit Price</th>
                        <th class="col-qty">Quantities</th>
                        <th class="col-discount">Discount</th>
                        <th class="col-refund">Refunded</th>
                        <th class="col-total">Retained Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsHtml}
                    </tbody>
                  </table>
                </div>

                <!-- SUMMARY & NOTES -->
                <div class="bottom-section">
                  <div class="notes-card">
                    <div class="notes-heading">Financial &amp; Refund Policy Notes</div>
                    <div class="notes-body">
                      • All refunds for cancelled or returned merchandise are automatically credited to your GETSUKA Wallet.<br />
                      • Express delivery fees (₹149) are non-refundable once fulfillment has initiated.<br />
                      • Proportional coupon discounts are calculated at the line-item level.<br />
                      • Unpaid Cash on Delivery cancellations do not produce wallet credits.<br />
                      • For questions regarding this invoice, please reach out to support@getsuka.com.
                    </div>
                    <div class="seal-art">
                      <span class="seal-stamp">月下品質保証</span>
                      <span>GETSUKA AUTHENTIC MERCHANDISE</span>
                    </div>
                  </div>

                  <div class="summary-card">
                    <div class="summary-title">Financial Breakdown</div>

                    <div class="summary-row">
                      <span>Original Subtotal</span>
                      <span class="summary-value">${formatINR(
                        originalSubtotal
                      )}</span>
                    </div>

                    ${
                      originalDiscount > 0
                        ? `
                          <div class="summary-row discount">
                            <span>Coupon Discount ${
                              order.couponCode
                                ? `(${escapeHtml(order.couponCode)})`
                                : ""
                            }</span>
                            <span class="summary-value">- ${formatINR(
                              originalDiscount
                            )}</span>
                          </div>
                        `
                        : ""
                    }

                    <div class="summary-row">
                      <span>Shipping Charge</span>
                      <span class="summary-value">${
                        shippingCharge === 0
                          ? "FREE"
                          : formatINR(shippingCharge)
                      }</span>
                    </div>

                    ${
                      tax > 0
                        ? `
                          <div class="summary-row">
                            <span>Tax / GST</span>
                            <span class="summary-value">${formatINR(tax)}</span>
                          </div>
                        `
                        : ""
                    }

                    <div class="summary-row bold">
                      <span>Original Order Total</span>
                      <span class="summary-value">${formatINR(
                        originalTotalAmount
                      )}</span>
                    </div>

                    ${
                      totalRefunded > 0
                        ? `
                          <div class="summary-row refund">
                            <span>Total Refunded to Wallet</span>
                            <span class="summary-value">- ${formatINR(
                              totalRefunded
                            )}</span>
                          </div>
                        `
                        : ""
                    }

                    <!-- RETAINED VALUE HERO -->
                    <div class="retained-hero-box">
                      <div class="retained-hero-header">
                        <span class="retained-label">${
                          isUnpaidCod && allItemsNonRetained
                            ? "BALANCE OWED"
                            : "NET RETAINED ORDER VALUE"
                        }</span>
                        <span class="retained-amount">${formatINR(
                          netRetainedOrderValue
                        )}</span>
                      </div>
                      <div class="retained-caption">
                        ${
                          isUnpaidCod
                            ? allItemsNonRetained
                              ? "Order was cancelled prior to payment. No amount was charged or refunded."
                              : "Cash on delivery pending upon successful delivery."
                            : totalRefunded > 0
                            ? allItemsNonRetained
                              ? `${formatINR(
                                  totalRefunded
                                )} has been refunded to your GETSUKA wallet.${
                                  netRetainedOrderValue > 0
                                    ? ` ${formatINR(
                                        netRetainedOrderValue
                                      )} retained for non-refundable delivery.`
                                    : " Retained order value is ₹0.00."
                                }`
                              : `${formatINR(
                                  totalRefunded
                                )} has been refunded to your GETSUKA wallet. ${formatINR(
                                  netRetainedOrderValue
                                )} represents the active retained order value.`
                            : "Order fully paid and retained with no refunds issued."
                        }
                      </div>
                    </div>
                  </div>
                </div>

                <!-- FOOTER -->
                <div class="footer">
                  <div class="footer-signature">GETSUKA · 月下</div>
                  <div class="footer-sub">Crafted in the Shadows • Designed for Eternity</div>
                  <div class="footer-legal">
                    This is an electronically generated tax invoice and does not require a physical signature.<br />
                    GETSUKA Apparel &amp; Fashion Lifestyle Private Limited · support@getsuka.com · https://getsuka.com
                  </div>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);

    invoiceWindow.document.close();
    invoiceWindow.focus();

    setTimeout(() => {
      invoiceWindow.print();
    }, 400);
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F7] text-[#252321]">

        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">

          <div className="animate-pulse">

            <div className="h-3 w-28 bg-[#E5E4E2]/70" />

            <div className="mt-5 h-6 w-56 bg-[#E5E4E2]/70" />

            <div className="mt-3 h-3 w-44 bg-[#E5E4E2]/70" />

            <div className="mt-12 h-px w-full bg-[#E5E4E2]/70" />

            <div className="mt-8 h-8 w-full bg-[#E5E4E2]/70" />

            <div className="mt-10 grid gap-8 lg:grid-cols-[1.5fr_0.9fr]">

              <div className="space-y-5">

                {[1, 2].map(
                  (item) => (
                    <div
                      key={item}
                      className="flex gap-5 border-b border-[#E5E4E2] pb-5"
                    >

                      <div className="h-24 w-24 bg-[#E5E4E2]/70" />

                      <div className="flex-1 space-y-3">

                        <div className="h-4 w-48 bg-[#E5E4E2]/70" />

                        <div className="h-3 w-24 bg-[#E5E4E2]/70" />

                        <div className="h-3 w-28 bg-[#E5E4E2]/70" />

                      </div>

                    </div>
                  )
                )}

              </div>

              <div className="h-80 border border-[#E5E4E2] bg-white shadow-sm" />

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
      <div className="min-h-screen bg-[#FAF9F7] text-[#252321]">

        <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center px-5">

          <div className="w-full border border-[#E5E4E2] bg-white shadow-sm px-8 py-12 text-center">

            <p className="text-xs uppercase tracking-[0.3em] text-[#6F4E37]">
              GETSUKA
            </p>

            <h1 className="mt-5 text-2xl font-medium">
              Unable to load order
            </h1>

            <p className="mt-3 text-sm text-[#716C67]">
              {error ||
                "The requested order could not be found."}
            </p>

            <div className="mt-7 flex justify-center gap-3">

              <button
                type="button"
                onClick={() =>
                  navigate("/orders")
                }
                className="border border-[#E5E4E2] px-6 py-3 text-xs font-medium tracking-widest text-white transition hover:border-[#6F4E37] hover:text-[#6F4E37]"
              >
                BACK TO ORDERS
              </button>

              <button
                type="button"
                onClick={() =>
                  window.location.reload()
                }
                className="bg-[#6F4E37] px-6 py-3 text-xs font-medium tracking-widest text-white transition hover:bg-[#5a3e2b]"
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
    <div className="min-h-screen bg-[#FAF9F7] text-[#252321]">

      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">

        {/* =====================================================
            ORDER HEADER
        ===================================================== */}

        <div className="flex flex-col gap-6 border-b border-[#E5E4E2] pb-6 sm:flex-row sm:items-end sm:justify-between">

          <div>

            <p className="text-[10px] uppercase tracking-[0.25em] text-[#716C67]">
              ORDER #{order.orderNumber}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">

              <p className="text-xs uppercase tracking-[0.18em] text-[#716C67]">
                PLACED ON{" "}
                {formatDate(
                  order.createdAt
                )}
              </p>

              <span className="text-[#6F4E37]">
                •
              </span>

              <span className="text-xs uppercase tracking-[0.18em] text-[#6F4E37]">
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

              <div className="absolute left-1 right-1 top-[7px] h-px bg-[#E5E4E2]" />

              <div
                className="absolute left-1 top-[7px] h-px bg-[#6F4E37] transition-all duration-500"
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
                              ? "border-[#6F4E37] bg-[#6F4E37]"
                              : "border-[#D8D3CF] bg-white"
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
                              ? "text-[#6F4E37]"
                              : completed
                              ? "text-[#716C67]"
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
          <div className="mt-8 border border-red-900/50 bg-[#E5E4E2]/10 px-5 py-4">

            <p className="text-xs uppercase tracking-[0.18em] text-[#6F4E37]">
              ORDER{" "}
              {isCancelled
                ? "CANCELLED"
                : "RETURNED"}
            </p>

            {(order.cancellationReason ||
              order.returnReason) && (
              <p className="mt-2 text-sm text-[#716C67]">
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
            <div className="mt-8 border border-red-950/70 bg-[#E5E4E2]/10 px-5 py-5">

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                <div>

                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#6F4E37]">
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
                <div className="mt-4 border-t border-[#E5E4E2] pt-4">

                  <p className="text-[9px] uppercase tracking-[0.16em] text-gray-600">
                    RETURN REASON
                  </p>

                  <p className="mt-2 text-xs leading-5 text-[#716C67]">
                    {order.returnReason}
                  </p>

                </div>
              )}

              {returnStatus ===
                "approved" && (
                <p className="mt-4 text-xs leading-5 text-[#716C67]">
                  Return authorized. We will send an agent to collect the product back. Thank you for your cooperation.
                </p>
              )}

              {returnStatus ===
                "pending" && (
                <p className="mt-4 text-xs leading-5 text-[#716C67]">
                  Your request has been sent and is waiting for admin authorization.
                </p>
              )}

              {returnStatus ===
                "rejected" &&
                order?.returnRejectionReason && (
                  <div className="mt-4 border-t border-[#E5E4E2] pt-4">

                    <p className="text-[9px] uppercase tracking-[0.16em] text-gray-600">
                      ADMIN RESPONSE
                    </p>

                    <p className="mt-2 text-xs leading-5 text-[#716C67]">
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

            {/* CANCELLATION FEEDBACK BANNER */}
            {cancelFeedbackMessage && (
              <div className="mb-6 flex items-center justify-between border border-red-900/60 bg-[#E5E4E2]/20 px-5 py-4 text-xs text-[#6F4E37]">
                <span>{cancelFeedbackMessage}</span>
                <button
                  type="button"
                  onClick={() => setCancelFeedbackMessage("")}
                  className="text-[#716C67] hover:text-white"
                >
                  ✕
                </button>
              </div>
            )}

            {/* BATCH REFUND CONFIRMATION */}
            {batchCancelRefund?.amount > 0 && (
              <div className="mb-6 border border-red-950 bg-[#E5E4E2]/15 px-5 py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#6F4E37]">
                      REFUND ADDED TO WALLET
                    </p>
                    <p className="mt-1 text-xs text-[#716C67]">
                      The eligible refund of {formatPrice(batchCancelRefund.amount)} has been credited to your GETSUKA wallet.
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-[#6F4E37]">
                    {formatPrice(batchCancelRefund.amount)}
                  </p>
                </div>
              </div>
            )}

            {/* ITEMS ORDERED HEADER */}
            <div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E4E2] pb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-xs uppercase tracking-[0.18em] text-[#252321] font-semibold">
                    ITEMS ORDERED
                  </h2>
                  {eligibleCancelItems.length > 0 && (
                    <span className="text-[10px] text-[#716C67]">
                      ({eligibleCancelItems.length} eligible for cancellation)
                    </span>
                  )}
                </div>

                {eligibleCancelItems.length > 0 && (
                  <button
                    type="button"
                    onClick={handleOpenBatchCancelModal}
                    disabled={selectedCancelItemsList.length === 0}
                    className="border border-[#6F4E37] bg-[#E6E0F0]/50 px-4 py-2 text-[10px] font-medium uppercase tracking-[0.16em] text-[#6F4E37] transition hover:bg-[#6F4E37] hover:text-white disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-transparent disabled:text-gray-600"
                  >
                    CANCEL SELECTED ITEMS {selectedCancelItemsList.length > 0 ? `(${selectedCancelItemsList.length})` : ""}
                  </button>
                )}
              </div>

              <div>

                {Array.isArray(order.items) &&
                  order.items.map((item, index) => {
                    const image = getProductImage(item);
                    const totalQty = Number(item?.quantity) || 1;
                    const cancelledQty = Number(item?.cancelledQuantity) || 0;
                    const returnedQty = Number(item?.returnedQuantity) || 0;
                    const availableQty = Math.max(0, totalQty - cancelledQty - returnedQty);
                    const isItemCancelled = (item?.itemStatus || "active") === "cancelled" || availableQty === 0;
                    const isEligibleForCancel =
                      (order.status === "placed" || order.status === "confirmed") &&
                      !isItemCancelled &&
                      availableQty > 0;
                    const isSelected = !!selectedCancelItems[item?._id]?.selected;
                    const chosenCancelQty = selectedCancelItems[item?._id]?.quantity || availableQty;

                    return (
                      <div
                        key={
                          item?._id ||
                          `${item?.productId}-${item?.variantId}-${index}`
                        }
                        className={`flex gap-4 border-b border-[#E5E4E2] py-5 transition ${
                          isSelected ? "bg-[#E5E4E2]/10 px-3 -mx-3" : ""
                        }`}
                      >
                        {/* SELECTION CHECKBOX */}
                        {isEligibleForCancel && (
                          <div className="flex items-center pt-2">
                            <input
                              type="checkbox"
                              id={`select-cancel-${item?._id}`}
                              checked={isSelected}
                              onChange={() =>
                                handleToggleCancelItem(item?._id, availableQty)
                              }
                              className="h-4 w-4 cursor-pointer rounded border-[#E5E4E2] bg-white text-[#6F4E37] accent-[#6F4E37] focus:ring-1 focus:ring-[#6F4E37]"
                              title="Select item for cancellation"
                            />
                          </div>
                        )}

                        <div className="h-20 w-20 flex-shrink-0 overflow-hidden border border-[#E5E4E2] bg-[#FAF9F7] sm:h-24 sm:w-24">
                          {image ? (
                            <img
                              src={image}
                              alt={item?.productName || "Product"}
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
                            <h3 className="text-sm font-medium uppercase tracking-wide text-[#252321]">
                              {item?.productName || "GETSUKA PRODUCT"}
                            </h3>

                            <p className="whitespace-nowrap text-sm font-semibold text-[#252321]">
                              {formatPrice(
                                item?.totalPrice ??
                                  Number(item?.price || 0) *
                                    Number(item?.quantity || 0)
                              )}
                            </p>
                          </div>

                          <div className="mt-3 space-y-1 text-xs text-[#716C67]">
                            <p>
                              Size:{" "}
                              <span className="text-[#716C67]">
                                {item?.size || "—"}
                              </span>
                            </p>

                            <p>
                              Color:{" "}
                              <span className="text-[#716C67]">
                                {item?.color || "—"}
                              </span>
                            </p>

                            <p>
                              Ordered Qty:{" "}
                              <span className="text-[#716C67]">{totalQty}</span>
                            </p>

                            {item?.sku && (
                              <p>
                                SKU:{" "}
                                <span className="text-[#716C67]">
                                  {item.sku}
                                </span>
                              </p>
                            )}
                          </div>

                          {/* ITEM STATUS BADGES */}
                          <div className="mt-3 flex flex-wrap gap-2">
                            {cancelledQty > 0 && (
                              <span className="inline-block border border-red-950 bg-[#E5E4E2]/30 px-2 py-0.5 text-[9px] uppercase tracking-wider text-[#6F4E37]">
                                {isItemCancelled
                                  ? "FULLY CANCELLED"
                                  : `CANCELLED: ${cancelledQty} OF ${totalQty} UNITS`}
                              </span>
                            )}

                            {returnedQty > 0 && (
                              <span className="inline-block border border-amber-950 bg-amber-950/30 px-2 py-0.5 text-[9px] uppercase tracking-wider text-amber-400">
                                RETURNED: {returnedQty} OF {totalQty} UNITS
                              </span>
                            )}

                            {item?.returnStatus &&
                              item.returnStatus !== "none" && (
                                <span className="inline-block border border-blue-500/40 bg-blue-950/50 px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-blue-400">
                                  ↩ RETURN: {formatStatus(item.returnStatus)} ({item.returnedQuantity || totalQty} UNIT{(item.returnedQuantity || totalQty) !== 1 ? "S" : ""})
                                </span>
                              )}

                            {returnStatus !== "none" &&
                              (!item?.returnStatus || item.returnStatus === "none") &&
                              !isItemCancelled && (
                                <span className="inline-block border border-emerald-900 bg-emerald-950/40 px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-400">
                                  ✓ KEPT · NOT RETURNING
                                </span>
                              )}

                            {Number(item?.refundedAmount || 0) > 0 && (
                              <span className="inline-block border border-emerald-950 bg-emerald-950/30 px-2 py-0.5 text-[9px] uppercase tracking-wider text-emerald-400">
                                REFUNDED: {formatPrice(item.refundedAmount)}
                              </span>
                            )}
                          </div>

                          {/* QUANTITY CONTROLS IF SELECTED & AVAILABLE > 1 */}
                          {isSelected && availableQty > 1 && (
                            <div className="mt-3 flex items-center gap-3 border border-red-950/70 bg-[#E5E4E2]/20 px-3 py-2">
                              <label
                                htmlFor={`cancel-qty-${item?._id}`}
                                className="text-[10px] uppercase tracking-wider text-[#716C67]"
                              >
                                Cancel Quantity:
                              </label>
                              <select
                                id={`cancel-qty-${item?._id}`}
                                value={chosenCancelQty}
                                onChange={(e) =>
                                  handleCancelItemQtyChange(
                                    item?._id,
                                    e.target.value
                                  )
                                }
                                className="border border-[#E5E4E2] bg-white px-2 py-1 text-xs text-[#252321] outline-none focus:border-[#6F4E37]"
                              >
                                {Array.from(
                                  { length: availableQty },
                                  (_, i) => i + 1
                                ).map((q) => (
                                  <option key={q} value={q}>
                                    {q} {q === availableQty ? "(All)" : "units"}
                                  </option>
                                ))}
                              </select>
                              <span className="text-[10px] text-[#716C67]">
                                of {availableQty} remaining
                              </span>
                            </div>
                          )}

                          {/* ITEM ACTIONS & CANCELLATION DETAILS */}
                          {isItemCancelled ? (
                            <div className="mt-4 border border-red-950 bg-[#E5E4E2]/10 px-4 py-3">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <p className="text-[9px] uppercase tracking-[0.18em] text-[#6F4E37]">
                                    ITEM CANCELLED
                                  </p>
                                  {item?.cancellationReason && (
                                    <p className="mt-1 text-[11px] leading-5 text-[#716C67]">
                                      {item.cancellationReason}
                                    </p>
                                  )}
                                </div>

                                {Number(item?.refundedAmount || 0) > 0 && (
                                  <div className="text-right">
                                    <p className="text-[9px] uppercase tracking-[0.15em] text-gray-600">
                                      REFUNDED TO WALLET
                                    </p>
                                    <p className="mt-1 text-xs font-semibold text-[#6F4E37]">
                                      {formatPrice(item.refundedAmount)}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : item?.returnStatus && item.returnStatus !== "none" ? (
                            <div className="mt-4 border border-blue-950/80 bg-blue-950/20 px-4 py-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-blue-400">
                                    ↩ RETURN REQUESTED ({item.returnedQuantity || totalQty} OF {totalQty} UNITS)
                                  </p>
                                  <p className="mt-1 text-[11px] text-[#716C67]">
                                    Status: <span className="font-medium text-blue-400">{formatStatus(item.returnStatus)}</span>
                                  </p>
                                  {(item.returnReason || order.returnReason) && (
                                    <p className="mt-1 text-[11px] leading-5 text-[#716C67]">
                                      Reason: <span className="text-gray-200">"{item.returnReason || order.returnReason}"</span>
                                    </p>
                                  )}
                                </div>
                                <span className="text-[10px] uppercase tracking-wider text-blue-400">
                                  Pending Authorization
                                </span>
                              </div>
                            </div>
                          ) : returnStatus !== "none" ? (
                            <div className="mt-4 border border-emerald-950/60 bg-emerald-950/15 px-4 py-2.5">
                              <div className="flex items-center justify-between">
                                <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-emerald-400">
                                  ✓ KEPT · NOT RETURNING
                                </p>
                                <span className="text-[10px] text-emerald-500/80">Delivered · Keeping Product</span>
                              </div>
                            </div>
                          ) : (
                            !isCancelled &&
                            !isReturned && (
                              <>
                                {(order.status === "placed" ||
                                  order.status === "confirmed") && (
                                  <div className="mt-4 flex items-center justify-between">
                                    <span className="text-[10px] text-[#716C67]">
                                      {availableQty} unit
                                      {availableQty !== 1 ? "s" : ""} available
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleOpenItemCancelModal(item)
                                      }
                                      className="border border-[#E5E4E2] px-4 py-2 text-[9px] uppercase tracking-[0.16em] text-[#716C67] transition hover:border-[#6F4E37] hover:text-[#6F4E37]"
                                    >
                                      CANCEL ITEM
                                    </button>
                                  </div>
                                )}

                                {order.status === "delivered" &&
                                  returnStatus === "none" &&
                                  returnWindow.eligible &&
                                  availableQty > 0 && (
                                    <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                                      <span className="text-[10px] text-[#716C67]">
                                        Delivered · {availableQty} unit{availableQty !== 1 ? "s" : ""}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleOpenReturnModal(item)
                                        }
                                        className="border border-[#E5E4E2] px-4 py-2 text-[9px] uppercase tracking-[0.16em] text-[#716C67] transition hover:border-[#6F4E37] hover:text-[#6F4E37]"
                                      >
                                        RETURN THIS ITEM
                                      </button>
                                    </div>
                                  )}
                              </>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}

              </div>

            </div>

            {/* ITEM REFUND CONFIRMATION */}

            {itemCancelRefund?.amount > 0 && (
              <div className="mt-6 border border-red-950 bg-[#E5E4E2]/10 px-5 py-4">

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                  <div>

                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#6F4E37]">
                      REFUND ADDED TO WALLET
                    </p>

                    <p className="mt-1 text-xs text-[#716C67]">
                      The eligible refund for the cancelled item has been credited to your GETSUKA wallet.
                    </p>

                  </div>

                  <p className="text-sm font-semibold text-[#6F4E37]">
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

                <h2 className="mb-4 border-b border-[#E5E4E2] pb-4 text-xs uppercase tracking-[0.18em] text-[#252321] font-semibold">
                  DELIVERY ADDRESS
                </h2>

                <div className="min-h-[170px] border border-[#E5E4E2] p-5">

                  <p className="text-sm font-semibold text-[#252321]">
                    {order
                      ?.shippingAddress
                      ?.fullName ||
                      "—"}
                  </p>

                  <div className="mt-3 space-y-1 text-xs leading-5 text-[#716C67]">

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
                    <p className="mt-4 text-xs text-[#716C67]">
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

                <h2 className="mb-4 border-b border-[#E5E4E2] pb-4 text-xs uppercase tracking-[0.18em] text-[#252321] font-semibold">
                  PAYMENT METHOD
                </h2>

                <div className="min-h-[170px] border border-[#E5E4E2] p-5">

                  <div className="flex items-center gap-2">

                    <p className="text-sm font-semibold uppercase text-white">
                      {getPaymentMethod(
                        order.paymentMethod
                      )}
                    </p>

                    <span className="text-xs text-[#6F4E37]">
                      ●
                    </span>

                  </div>

                  <div className="mt-4 space-y-2 text-xs text-[#716C67]">

                    <p>
                      Payment Status:{" "}
                      <span className="text-[#716C67]">
                        {formatStatus(
                          order.paymentStatus
                        )}
                      </span>
                    </p>

                    <p>
                      Delivery:{" "}
                      <span className="text-[#716C67]">
                        {getDeliveryMethod(
                          order.deliveryMethod
                        )}
                      </span>
                    </p>

                    <p>
                      Items:{" "}
                      <span className="text-[#716C67]">
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

            <div className="border border-[#E5E4E2] bg-white shadow-sm p-5 sm:p-6">

              {/* ORDER SUMMARY */}

              <div className="border-b border-[#E5E4E2] pb-4">

                <h2 className="text-xs uppercase tracking-[0.18em] text-[#252321] font-semibold">
                  ORDER SUMMARY
                </h2>

              </div>

              <div className="space-y-5 py-5">

                <div className="flex items-center justify-between gap-5">

                  <span className="text-xs text-[#716C67]">
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

                  <span className="text-xs text-[#716C67]">
                    Shipping
                  </span>

                  <span
                    className={`text-xs ${
                      shippingCharge ===
                      0
                        ? "text-[#6F4E37]"
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

                  <span className="text-xs text-[#716C67]">
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

                    <span className="text-xs text-[#716C67]">
                      Tax
                    </span>

                    <span className="text-xs text-gray-200">
                      {formatPrice(tax)}
                    </span>

                  </div>
                )}

              </div>

              {/* TOTAL */}

              <div className="border-t border-[#E5E4E2] py-5">

                <div className="flex items-center justify-between">

                  <span className="text-sm uppercase tracking-wide text-[#252321] font-semibold">
                    TOTAL
                  </span>

                  <div className="text-right">

                    <span className="mr-3 text-[8px] uppercase tracking-wider text-[#716C67]">
                      INR
                    </span>

                    <span className="text-sm font-semibold text-[#252321]">
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
                className="flex w-full items-center justify-center gap-2 border border-[#E5E4E2] bg-white shadow-sm px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-white transition hover:border-[#6F4E37] hover:text-[#6F4E37]"
              >

                <span>
                  ▣
                </span>

                DOWNLOAD INVOICE (PDF)

              </button>

              {invoiceError && (
                <div className="mt-3 border border-red-500/40 bg-[#E5E4E2]/30 p-3 text-center text-[10px] tracking-[0.08em] text-[#6F4E37]">
                  {invoiceError}
                </div>
              )}

              {/* SUPPORT */}

              <button
                type="button"
                className="mt-3 flex w-full items-center justify-center gap-2 border border-[#E5E4E2] bg-white shadow-sm px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-white transition hover:border-[#6F4E37] hover:text-[#6F4E37]"
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
                      className="flex w-full items-center justify-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[#716C67] transition hover:text-[#6F4E37]"
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

                    <p className="text-[10px] uppercase tracking-[0.16em] text-[#716C67]">
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
                  <div className="mt-7 border border-red-950 bg-[#E5E4E2]/10 px-4 py-5">

                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#6F4E37]">
                      RETURN REQUEST SENT
                    </p>

                    <p className="mt-2 text-xs leading-5 text-[#716C67]">
                      Your return request is waiting for admin authorization.
                    </p>

                  </div>
                )}

              {!isCancelled &&
                !isReturned &&
                returnStatus ===
                  "approved" && (
                  <div className="mt-7 border border-red-950 bg-[#E5E4E2]/10 px-4 py-5">

                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#6F4E37]">
                      RETURN AUTHORIZED
                    </p>

                    <p className="mt-2 text-xs leading-5 text-[#716C67]">
                      We will send an agent to collect the product back. Thank you for your cooperation.
                    </p>

                  </div>
                )}

              {!isCancelled &&
                !isReturned &&
                returnStatus ===
                  "collection_pending" && (
                  <div className="mt-7 border border-red-950 bg-[#E5E4E2]/10 px-4 py-5">

                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#6F4E37]">
                      COLLECTION SCHEDULED
                    </p>

                    <p className="mt-2 text-xs leading-5 text-[#716C67]">
                      Your return has been authorized. Our agent will collect the product.
                    </p>

                  </div>
                )}

              {!isCancelled &&
                !isReturned &&
                returnStatus ===
                  "collected" && (
                  <div className="mt-7 border border-red-950 bg-[#E5E4E2]/10 px-4 py-5">

                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#6F4E37]">
                      PRODUCT COLLECTED
                    </p>

                    <p className="mt-2 text-xs leading-5 text-[#716C67]">
                      The product has been collected and your return is being processed.
                    </p>

                  </div>
                )}

              {!isCancelled &&
                !isReturned &&
                returnStatus ===
                  "rejected" && (
                  <div className="mt-7 border border-red-950 bg-[#E5E4E2]/10 px-4 py-5">

                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#6F4E37]">
                      RETURN REQUEST REJECTED
                    </p>

                    {order?.returnRejectionReason && (
                      <p className="mt-2 text-xs leading-5 text-[#716C67]">
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

      {showItemCancelModal && selectedItem && (() => {
        const totalQty = Number(selectedItem.quantity) || 1;
        const cancelledQty = Number(selectedItem.cancelledQuantity) || 0;
        const returnedQty = Number(selectedItem.returnedQuantity) || 0;
        const availQty = Math.max(1, totalQty - cancelledQty - returnedQty);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#211B18]/60 px-5 backdrop-blur-sm">
            <div className="w-full max-w-md border border-[#E5E4E2] bg-white p-6 shadow-2xl sm:p-8">
              <div className="border-b border-[#E5E4E2] pb-5">
                <p className="text-[10px] uppercase tracking-[0.3em] text-[#6F4E37]">
                  GETSUKA
                </p>
                <h2 className="mt-3 text-lg font-medium uppercase tracking-wide text-[#252321]">
                  CANCEL ITEM
                </h2>
                <p className="mt-2 text-xs leading-5 text-[#716C67]">
                  Cancel this product from your order. The remaining items will stay active.
                </p>
              </div>

              <div className="mt-6 border border-[#E5E4E2] bg-white shadow-sm p-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden border border-[#E5E4E2] bg-[#FAF9F7]">
                    {getProductImage(selectedItem) ? (
                      <img
                        src={getProductImage(selectedItem)}
                        alt={selectedItem?.productName || "Product"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[8px] uppercase tracking-wider text-gray-600">
                        NO IMAGE
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium uppercase tracking-wide text-[#252321]">
                      {selectedItem?.productName || "GETSUKA PRODUCT"}
                    </p>
                    <p className="mt-1 text-[10px] text-[#716C67]">
                      Available: {availQty} unit{availQty !== 1 ? "s" : ""}
                      {selectedItem?.size ? ` · Size: ${selectedItem.size}` : ""}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[#6F4E37]">
                      {formatPrice(
                        Number(selectedItem?.price || 0) * singleItemCancelQty
                      )}
                    </p>
                  </div>
                </div>

                {availQty > 1 && (
                  <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                    <label
                      htmlFor="singleItemCancelSelect"
                      className="text-[10px] uppercase tracking-wider text-[#716C67]"
                    >
                      Units to cancel:
                    </label>
                    <select
                      id="singleItemCancelSelect"
                      value={singleItemCancelQty}
                      onChange={(e) =>
                        setSingleItemCancelQty(
                          Math.min(
                            availQty,
                            Math.max(1, parseInt(e.target.value, 10) || 1)
                          )
                        )
                      }
                      className="border border-[#E5E4E2] bg-white px-3 py-1 text-xs text-[#252321] outline-none focus:border-[#6F4E37]"
                    >
                      {Array.from({ length: availQty }, (_, i) => i + 1).map(
                        (q) => (
                          <option key={q} value={q}>
                            {q} {q === availQty ? "(All)" : "units"}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                )}
              </div>

              {/* NON-REFUNDABLE NOTICE */}
              <div className="mt-4 border border-amber-900/60 bg-amber-950/20 p-3">
                <p className="text-[10px] font-medium uppercase tracking-wider text-amber-500">
                  ⚠ Express delivery charges are non-refundable.
                </p>
                <p className="mt-1 text-[10px] leading-4 text-[#716C67]">
                  {order.paymentMethod === "cod"
                    ? "COD order: cancelled items will be restocked without wallet credit."
                    : "Eligible item value minus allocated discount will be refunded to your GETSUKA wallet."}
                </p>
              </div>

              <div className="mt-6">
                <label
                  htmlFor="itemCancellationReason"
                  className="text-[10px] uppercase tracking-[0.2em] text-[#716C67]"
                >
                  CANCELLATION REASON <span className="text-[#6F4E37]">*</span>
                </label>
                <textarea
                  id="itemCancellationReason"
                  value={itemCancellationReason}
                  onChange={(event) => {
                    setItemCancellationReason(event.target.value);
                    if (itemCancelError) {
                      setItemCancelError("");
                    }
                  }}
                  placeholder="Tell us why you want to cancel this item..."
                  rows={3}
                  disabled={itemCancelLoading}
                  className="mt-3 w-full resize-none border border-[#E5E4E2] bg-white/[0.03] px-4 py-3 text-sm text-white outline-none placeholder:text-gray-700 focus:border-[#6F4E37] disabled:cursor-not-allowed disabled:opacity-50"
                />

                {itemCancelError && (
                  <p className="mt-2 text-xs text-[#6F4E37]">
                    {itemCancelError}
                  </p>
                )}
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleCloseItemCancelModal}
                  disabled={itemCancelLoading}
                  className="flex-1 border border-[#E5E4E2] px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[#252321] transition hover:bg-[#FAF9F7] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  KEEP ITEM
                </button>
                <button
                  type="button"
                  onClick={handleCancelItem}
                  disabled={itemCancelLoading}
                  className="flex-1 bg-[#6F4E37] px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-white transition hover:bg-[#5a3e2b] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {itemCancelLoading ? "CANCELLING..." : "CANCEL ITEM"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* =======================================================
          BATCH CANCEL MODAL
      ======================================================= */}

      {showBatchCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#211B18]/60 px-5 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto border border-[#E5E4E2] bg-white p-6 shadow-2xl sm:p-8">
            <div className="border-b border-[#E5E4E2] pb-5">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#6F4E37]">
                GETSUKA
              </p>
              <h2 className="mt-3 text-lg font-medium uppercase tracking-wide text-[#252321]">
                CANCEL SELECTED ITEMS ({selectedCancelItemsList.length})
              </h2>
              <p className="mt-2 text-xs leading-5 text-[#716C67]">
                Cancel only the selected items from your order. Remaining items will stay active.
              </p>
            </div>

            {/* SELECTED ITEMS BREAKDOWN */}
            <div className="mt-6 space-y-3">
              {selectedCancelItemsList.map(
                ({ item, cancelQty, availableQty }) => (
                  <div
                    key={item._id}
                    className="flex items-center justify-between border border-[#E5E4E2] bg-white shadow-sm p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium uppercase text-white">
                        {item.productName || "PRODUCT"}
                      </p>
                      <p className="mt-1 text-[10px] text-[#716C67]">
                        Cancelling:{" "}
                        <span className="font-semibold text-white">
                          {cancelQty}
                        </span>{" "}
                        of {availableQty} units
                        {item.size ? ` · Size: ${item.size}` : ""}
                      </p>
                    </div>
                    <p className="ml-4 text-xs font-semibold text-white">
                      {formatPrice(Number(item.price || 0) * cancelQty)}
                    </p>
                  </div>
                )
              )}
            </div>

            {/* ESTIMATED REFUND & POLICY */}
            <div className="mt-6 space-y-3 border border-[#E5E4E2] bg-white shadow-sm p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="uppercase tracking-wider text-[#716C67]">
                  {order.paymentMethod === "cod"
                    ? "PAYMENT METHOD"
                    : "ESTIMATED WALLET REFUND"}
                </span>
                <span className="font-semibold text-[#6F4E37]">
                  {order.paymentMethod === "cod"
                    ? "CASH ON DELIVERY (NO REFUND)"
                    : formatPrice(estimatedBatchRefund)}
                </span>
              </div>

              {order.paymentMethod === "cod" ? (
                <p className="text-[10px] leading-4 text-[#716C67]">
                  Since this order is Cash on Delivery, no online payment was collected. Cancelled units will be returned to stock without wallet credit.
                </p>
              ) : (
                <p className="text-[10px] leading-4 text-[#716C67]">
                  Your refund will be calculated proportionally minus allocated promotional discounts and credited to your GETSUKA wallet.
                </p>
              )}

              {/* NON-REFUNDABLE NOTICE */}
              <div className="border-t border-white/10 pt-3">
                <p className="text-[10px] font-medium uppercase tracking-wider text-amber-500">
                  ⚠ Express delivery charges are non-refundable.
                </p>
              </div>
            </div>

            {/* REASON */}
            <div className="mt-6">
              <label
                htmlFor="batchCancellationReason"
                className="text-[10px] uppercase tracking-[0.2em] text-[#716C67]"
              >
                CANCELLATION REASON <span className="text-[#6F4E37]">*</span>
              </label>
              <textarea
                id="batchCancellationReason"
                value={batchCancelReason}
                onChange={(event) => {
                  setBatchCancelReason(event.target.value);
                  if (batchCancelError) setBatchCancelError("");
                }}
                placeholder="Tell us why you want to cancel these items..."
                rows={3}
                disabled={batchCancelLoading}
                className="mt-3 w-full resize-none border border-[#E5E4E2] bg-white/[0.03] px-4 py-3 text-sm text-white outline-none placeholder:text-gray-700 focus:border-[#6F4E37] disabled:cursor-not-allowed disabled:opacity-50"
              />

              {batchCancelError && (
                <p className="mt-2 text-xs text-[#6F4E37]">
                  {batchCancelError}
                </p>
              )}
            </div>

            {/* ACTION BUTTONS */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleCloseBatchCancelModal}
                disabled={batchCancelLoading}
                className="flex-1 border border-[#E5E4E2] px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[#252321] transition hover:bg-[#FAF9F7] disabled:cursor-not-allowed disabled:opacity-50"
              >
                KEEP ITEMS
              </button>
              <button
                type="button"
                onClick={handleBatchCancelSubmit}
                disabled={batchCancelLoading}
                className="flex-1 bg-[#6F4E37] px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-white transition hover:bg-[#5a3e2b] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {batchCancelLoading ? "CANCELLING..." : "CONFIRM CANCELLATION"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =======================================================
          RETURN REQUEST MODAL
      ======================================================= */}

      {showReturnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#211B18]/60 px-5 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto border border-[#E5E4E2] bg-white p-6 shadow-2xl sm:p-8">
            <div className="border-b border-[#E5E4E2] pb-5">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#6F4E37]">
                GETSUKA
              </p>
              <h2 className="mt-3 text-lg font-medium uppercase tracking-wide text-[#252321]">
                REQUEST RETURN
              </h2>
              <p className="mt-2 text-xs leading-5 text-[#716C67]">
                Select the delivered items you want to return. The return request must be authorized by GETSUKA before agent pickup.
              </p>
            </div>

            {/* DELIVERED ITEMS SELECTION */}
            <div className="mt-6 space-y-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#716C67]">
                SELECT ITEMS TO RETURN
              </p>

              {eligibleReturnItems.map((item) => {
                const totalQty = Number(item.quantity) || 1;
                const cancelledQty = Number(item.cancelledQuantity) || 0;
                const returnedQty = Number(item.returnedQuantity) || 0;
                const availQty = Math.max(
                  1,
                  totalQty - cancelledQty - returnedQty
                );
                const isSelected = !!selectedReturnItems[item._id]?.selected;
                const chosenQty =
                  selectedReturnItems[item._id]?.quantity || availQty;

                return (
                  <div
                    key={item._id}
                    className={`flex items-center gap-3 border border-[#E5E4E2] bg-white shadow-sm p-3 transition ${
                      isSelected
                        ? "border-[#6F4E37] bg-[#E6E0F0]/30"
                        : "opacity-60"
                    }`}
                  >
                    <input
                      type="checkbox"
                      id={`return-check-${item._id}`}
                      checked={isSelected}
                      onChange={() =>
                        handleToggleReturnItem(item._id, availQty)
                      }
                      className="h-4 w-4 cursor-pointer rounded border-[#E5E4E2] bg-white text-[#6F4E37] accent-[#6F4E37] focus:ring-1 focus:ring-[#6F4E37]"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium uppercase text-[#252321]">
                        {item.productName || "PRODUCT"}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[#716C67]">
                        Delivered: {availQty} unit{availQty !== 1 ? "s" : ""}
                        {item.size ? ` · Size: ${item.size}` : ""}
                      </p>
                    </div>

                    {isSelected && availQty > 1 && (
                      <select
                        value={chosenQty}
                        onChange={(e) =>
                          handleReturnItemQtyChange(item._id, e.target.value)
                        }
                        className="border border-[#E5E4E2] bg-white px-2 py-1 text-xs text-[#252321] outline-none focus:border-[#6F4E37]"
                      >
                        {Array.from(
                          { length: availQty },
                          (_, i) => i + 1
                        ).map((q) => (
                          <option key={q} value={q}>
                            Qty: {q}
                          </option>
                        ))}
                      </select>
                    )}

                    <p className="ml-2 text-xs font-semibold text-white">
                      {formatPrice(
                        Number(item.price || 0) *
                          (isSelected ? chosenQty : availQty)
                      )}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* REFUND & POLICY DETAILS */}
            <div className="mt-6 space-y-3 border border-[#E5E4E2] bg-white shadow-sm p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="uppercase tracking-wider text-[#716C67]">
                  ESTIMATED REFUND UPON COLLECTION
                </span>
                <span className="font-semibold text-[#6F4E37]">
                  {formatPrice(estimatedReturnRefund)}
                </span>
              </div>

              <p className="text-[10px] leading-4 text-[#716C67]">
                {order.paymentMethod === "cod"
                  ? "For Cash on Delivery orders, eligible product refunds will be credited to your GETSUKA wallet after our courier collects the items."
                  : "For online payments, eligible product refunds will be credited to your GETSUKA wallet once the collection stage is complete."}
              </p>

              {/* NON-REFUNDABLE NOTICE */}
              <div className="border-t border-white/10 pt-3">
                <p className="text-[10px] font-medium uppercase tracking-wider text-amber-500">
                  ⚠ Express delivery charges are non-refundable.
                </p>
                <p className="mt-1 text-[10px] leading-4 text-[#716C67]">
                  Delivery charges are not refunded upon cancellation or return.
                </p>
              </div>
            </div>

            {/* REASON */}
            <div className="mt-6">
              <label
                htmlFor="returnReason"
                className="text-[10px] uppercase tracking-[0.2em] text-[#716C67]"
              >
                RETURN REASON <span className="text-[#6F4E37]">*</span>
              </label>
              <textarea
                id="returnReason"
                value={returnReason}
                onChange={(event) => {
                  setReturnReason(event.target.value);
                  if (returnError) setReturnError("");
                }}
                placeholder="Tell us why you want to return this order..."
                rows={3}
                disabled={returnLoading}
                className="mt-3 w-full resize-none border border-[#E5E4E2] bg-white/[0.03] px-4 py-3 text-sm text-white outline-none placeholder:text-gray-700 focus:border-[#6F4E37] disabled:cursor-not-allowed disabled:opacity-50"
              />

              {returnError && (
                <p className="mt-2 text-xs text-[#6F4E37]">
                  {returnError}
                </p>
              )}
            </div>

            {/* SELECTED SUMMARY & ACTION BUTTONS */}
            <div className="mt-6">
              <p className="mb-3 text-[10px] uppercase tracking-wider text-[#716C67]">
                {selectedReturnItemsList.length > 0
                  ? `Returning ${selectedReturnItemsList.length} of ${eligibleReturnItems.length} product${eligibleReturnItems.length !== 1 ? "s" : ""}. Unselected products will remain kept.`
                  : "⚠ Please select at least one product to return."}
              </p>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleCloseReturnModal}
                  disabled={returnLoading}
                  className="flex-1 border border-[#E5E4E2] px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[#252321] transition hover:bg-[#FAF9F7] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  KEEP ORDER
                </button>
                <button
                  type="button"
                  onClick={handleReturnOrder}
                  disabled={returnLoading || selectedReturnItemsList.length === 0}
                  className="flex-1 bg-[#6F4E37] px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-white transition hover:bg-[#5a3e2b] disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-[#716C67]"
                >
                  {returnLoading
                    ? "SENDING REQUEST..."
                    : selectedReturnItemsList.length > 0
                    ? `SEND RETURN REQUEST (${selectedReturnItemsList.length} ITEM${selectedReturnItemsList.length !== 1 ? "S" : ""})`
                    : "SELECT ITEM TO RETURN"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default OrderDetailsPage;