import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  getAdminOrderById,
  updateAdminOrderStatus,
  approveReturnRequest,
  rejectReturnRequest,
  markReturnCollectionPending,
  markReturnCollected,
  completeReturn,
} from "../api/adminOrderApi";

const AdminOrderDetailsPage = () => {
  const navigate = useNavigate();
  const { orderId } = useParams();

  // =========================================================
  // STATE
  // =========================================================

  const [order, setOrder] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedStatus, setSelectedStatus] =
    useState("");

  const [statusLoading, setStatusLoading] =
    useState(false);

  const [statusError, setStatusError] =
    useState("");

  // =========================================================
  // RETURN MANAGEMENT
  // =========================================================

  const [returnLoading, setReturnLoading] =
    useState(false);

  const [returnError, setReturnError] =
    useState("");

  const [rejectionReason, setRejectionReason] =
    useState("");

  // =========================================================
  // FETCH ORDER
  // =========================================================

  const fetchOrder = async () => {
    if (!orderId) {
      setError("Order ID is missing.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response =
        await getAdminOrderById(orderId);

      const orderData =
        response?.order ||
        response?.data?.order ||
        response?.data ||
        response;

      if (!orderData) {
        throw new Error(
          "Order details not found."
        );
      }

      setOrder(orderData);

      setSelectedStatus(
        orderData.status || ""
      );
    } catch (error) {
      console.error(
        "Admin Order Details Error:",
        error
      );

      setError(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to load order details."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  // =========================================================
  // HELPERS
  // =========================================================

  const formatDate = (date) => {
    if (!date) {
      return "—";
    }

    try {
      return new Date(date).toLocaleDateString(
        "en-GB",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      );
    } catch {
      return "—";
    }
  };

  const formatDateTime = (date) => {
    if (!date) {
      return "—";
    }

    try {
      return new Date(date).toLocaleString(
        "en-GB",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      );
    } catch {
      return "—";
    }
  };

  const formatPrice = (price) => {
    return `₹${Number(
      price || 0
    ).toLocaleString("en-IN")}`;
  };

  const formatStatus = (value) => {
    if (!value) {
      return "Unknown";
    }

    return String(value)
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  };

  // =========================================================
  // PAYMENT DISPLAY STATUS
  // =========================================================
  // COD orders are considered paid once delivered.
  //
  // This also fixes older delivered COD orders that still
  // have "pending" stored from before the COD delivery fix.

  const getDisplayPaymentStatus = () => {
    if (
      order?.paymentMethod === "cod" &&
      order?.status === "delivered"
    ) {
      return "paid";
    }

    return order?.paymentStatus || "pending";
  };

  const displayPaymentStatus =
    getDisplayPaymentStatus();

  // =========================================================
  // ORDER STATUS CLASSES
  // =========================================================

  const getStatusClasses = (value) => {
    switch (value) {
      case "placed":
        return "border-[#f2c96d] bg-[#fff8e8] text-[#a36b00]";

      case "confirmed":
        return "border-[#b9d0ff] bg-[#eef4ff] text-[#1557f5]";

      case "shipped":
        return "border-[#d5c2ff] bg-[#f5f0ff] text-[#7141c7]";

      case "out_for_delivery":
        return "border-[#ffd2a8] bg-[#fff5eb] text-[#c56b19]";

      case "delivered":
        return "border-[#bcebd5] bg-[#effcf6] text-[#11845b]";

      case "cancelled":
        return "border-[#ffd0d8] bg-[#fff3f5] text-[#d93650]";

      case "returned":
        return "border-[#d5dce5] bg-[#f3f6f9] text-[#687789]";

      default:
        return "border-[#dce4ee] bg-[#f7f9fc] text-[#718096]";
    }
  };

  // =========================================================
  // PAYMENT STATUS CLASSES
  // =========================================================

  const getPaymentStatusClasses = (value) => {
    switch (value) {
      case "paid":
        return "border-[#bcebd5] bg-[#effcf6] text-[#11845b]";

      case "pending":
        return "border-[#f2c96d] bg-[#fff8e8] text-[#a36b00]";

      case "failed":
        return "border-[#ffd0d8] bg-[#fff3f5] text-[#d93650]";

      case "refunded":
        return "border-[#d5c2ff] bg-[#f5f0ff] text-[#7141c7]";

      default:
        return "border-[#dce4ee] bg-[#f7f9fc] text-[#718096]";
    }
  };

  // =========================================================
  // RETURN STATUS CLASSES
  // =========================================================

  const getReturnStatusClasses = (value) => {
    switch (value) {
      case "pending":
        return "border-[#f2c96d] bg-[#fff8e8] text-[#a36b00]";

      case "approved":
        return "border-[#b9d0ff] bg-[#eef4ff] text-[#1557f5]";

      case "collection_pending":
        return "border-[#ffd2a8] bg-[#fff5eb] text-[#c56b19]";

      case "collected":
        return "border-[#d5c2ff] bg-[#f5f0ff] text-[#7141c7]";

      case "completed":
        return "border-[#bcebd5] bg-[#effcf6] text-[#11845b]";

      case "rejected":
        return "border-[#ffd0d8] bg-[#fff3f5] text-[#d93650]";

      default:
        return "border-[#dce4ee] bg-[#f7f9fc] text-[#718096]";
    }
  };

  // =========================================================
  // CUSTOMER
  // =========================================================

  const getCustomerName = () => {
    return (
      order?.shippingAddress?.fullName ||
      "Unknown Customer"
    );
  };

  const getCustomerPhone = () => {
    return (
      order?.shippingAddress?.phone ||
      "—"
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
  // ORDER STATUS TRANSITIONS
  // =========================================================

  const getAvailableStatuses = (
    currentStatus
  ) => {
    switch (currentStatus) {
      case "placed":
        return [
          {
            value: "placed",
            label: "Placed",
          },
          {
            value: "confirmed",
            label: "Confirmed",
          },
          {
            value: "cancelled",
            label: "Cancelled",
          },
        ];

      case "confirmed":
        return [
          {
            value: "confirmed",
            label: "Confirmed",
          },
          {
            value: "shipped",
            label: "Shipped",
          },
          {
            value: "cancelled",
            label: "Cancelled",
          },
        ];

      case "shipped":
        return [
          {
            value: "shipped",
            label: "Shipped",
          },
          {
            value: "out_for_delivery",
            label: "Out For Delivery",
          },
        ];

      case "out_for_delivery":
        return [
          {
            value: "out_for_delivery",
            label: "Out For Delivery",
          },
          {
            value: "delivered",
            label: "Delivered",
          },
        ];

      case "delivered":
        return [
          {
            value: "delivered",
            label: "Delivered",
          },
        ];

      case "cancelled":
        return [
          {
            value: "cancelled",
            label: "Cancelled",
          },
        ];

      case "returned":
        return [
          {
            value: "returned",
            label: "Returned",
          },
        ];

      default:
        return currentStatus
          ? [
              {
                value: currentStatus,
                label: formatStatus(
                  currentStatus
                ),
              },
            ]
          : [];
    }
  };

  // =========================================================
  // UPDATE ORDER STATUS
  // =========================================================

  const handleUpdateStatus = async () => {
    if (!order?._id) {
      return;
    }

    if (!selectedStatus) {
      setStatusError(
        "Please select an order status."
      );
      return;
    }

    if (
      selectedStatus ===
      order.status
    ) {
      setStatusError(
        "Please select a different status."
      );
      return;
    }

    const allowedNextStatuses =
      getAvailableStatuses(
        order.status
      ).map(
        (statusOption) =>
          statusOption.value
      );

    if (
      !allowedNextStatuses.includes(
        selectedStatus
      )
    ) {
      setStatusError(
        "This order status transition is not allowed."
      );

      setSelectedStatus(
        order.status || ""
      );

      return;
    }

    try {
      setStatusLoading(true);
      setStatusError("");

      const response =
        await updateAdminOrderStatus(
          order._id,
          selectedStatus
        );

      const updatedOrder =
        response?.order ||
        response?.data?.order ||
        response?.data ||
        response;

      if (updatedOrder) {
        setOrder(updatedOrder);

        setSelectedStatus(
          updatedOrder.status ||
            selectedStatus
        );
      } else {
        setOrder((previous) => ({
          ...previous,
          status: selectedStatus,
        }));
      }
    } catch (error) {
      console.error(
        "Update Admin Order Status Error:",
        error
      );

      setStatusError(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to update order status."
      );
    } finally {
      setStatusLoading(false);
    }
  };

  // =========================================================
  // APPROVE RETURN
  // =========================================================
  // IMPORTANT:
  //
  // Pending
  //   ↓
  // Admin approves
  //   ↓
  // Collection Pending
  //
  // Once approved, collection immediately becomes pending.
  // The admin does NOT need another manual button click.

  const handleApproveReturn = async () => {
    if (!order?._id) {
      return;
    }

    try {
      setReturnLoading(true);
      setReturnError("");

      const response =
        await approveReturnRequest(
          order._id
        );

      const approvedOrder =
        response?.order ||
        response?.data?.order ||
        response?.data ||
        response;

      if (!approvedOrder) {
        await fetchOrder();
        return;
      }

      // -------------------------------------------------------
      // After approval, automatically move the return into
      // collection_pending.
      // -------------------------------------------------------

      const collectionResponse =
        await markReturnCollectionPending(
          order._id
        );

      const updatedOrder =
        collectionResponse?.order ||
        collectionResponse?.data?.order ||
        collectionResponse?.data ||
        collectionResponse;

      if (updatedOrder) {
        setOrder(updatedOrder);

        setSelectedStatus(
          updatedOrder.status || ""
        );
      } else {
        await fetchOrder();
      }
    } catch (error) {
      console.error(
        "Approve Return Error:",
        error
      );

      setReturnError(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to approve return request."
      );
    } finally {
      setReturnLoading(false);
    }
  };

  // =========================================================
  // REJECT RETURN
  // =========================================================

  const handleRejectReturn = async () => {
    if (!order?._id) {
      return;
    }

    const reason =
      rejectionReason.trim();

    if (!reason) {
      setReturnError(
        "Please enter a rejection reason."
      );
      return;
    }

    try {
      setReturnLoading(true);
      setReturnError("");

      const response =
        await rejectReturnRequest(
          order._id,
          reason
        );

      const updatedOrder =
        response?.order ||
        response?.data?.order ||
        response?.data ||
        response;

      if (updatedOrder) {
        setOrder(updatedOrder);

        setSelectedStatus(
          updatedOrder.status || ""
        );
      } else {
        await fetchOrder();
      }

      setRejectionReason("");
    } catch (error) {
      console.error(
        "Reject Return Error:",
        error
      );

      setReturnError(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to reject return request."
      );
    } finally {
      setReturnLoading(false);
    }
  };

  // =========================================================
  // MARK COLLECTION PENDING
  // =========================================================

  const handleCollectionPending = async () => {
    if (!order?._id) {
      return;
    }

    try {
      setReturnLoading(true);
      setReturnError("");

      const response =
        await markReturnCollectionPending(
          order._id
        );

      const updatedOrder =
        response?.order ||
        response?.data?.order ||
        response?.data ||
        response;

      if (updatedOrder) {
        setOrder(updatedOrder);
      } else {
        await fetchOrder();
      }
    } catch (error) {
      console.error(
        "Mark Collection Pending Error:",
        error
      );

      setReturnError(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to update collection status."
      );
    } finally {
      setReturnLoading(false);
    }
  };

  // =========================================================
  // MARK COLLECTED
  // =========================================================

  const handleCollected = async () => {
    if (!order?._id) {
      return;
    }

    try {
      setReturnLoading(true);
      setReturnError("");

      const response =
        await markReturnCollected(
          order._id
        );

      const updatedOrder =
        response?.order ||
        response?.data?.order ||
        response?.data ||
        response;

      if (updatedOrder) {
        setOrder(updatedOrder);
      } else {
        await fetchOrder();
      }
    } catch (error) {
      console.error(
        "Mark Return Collected Error:",
        error
      );

      setReturnError(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to mark return as collected."
      );
    } finally {
      setReturnLoading(false);
    }
  };

  // =========================================================
  // COMPLETE RETURN
  // =========================================================

  const handleCompleteReturn = async () => {
    if (!order?._id) {
      return;
    }

    try {
      setReturnLoading(true);
      setReturnError("");

      const response =
        await completeReturn(
          order._id
        );

      const updatedOrder =
        response?.order ||
        response?.data?.order ||
        response?.data ||
        response;

      if (updatedOrder) {
        setOrder(updatedOrder);

        setSelectedStatus(
          updatedOrder.status || ""
        );
      } else {
        await fetchOrder();
      }
    } catch (error) {
      console.error(
        "Complete Return Error:",
        error
      );

      setReturnError(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to complete return."
      );
    } finally {
      setReturnLoading(false);
    }
  };

  // =========================================================
  // RETURN ACTION AREA
  // =========================================================

  const renderReturnActions = () => {
    if (!order) {
      return null;
    }

    const returnStatus =
      order.returnStatus || "none";

    // -------------------------------------------------------
    // NO RETURN
    // -------------------------------------------------------

    if (returnStatus === "none") {
      return (
        <div className="rounded-[11px] border border-[#e1e8f1] bg-[#f8faff] p-[16px]">
          <div className="flex items-center justify-between gap-[15px]">
            <div>
              <p className="text-[7px] font-semibold uppercase tracking-[0.14em] text-[#718096]">
                Return Request
              </p>

              <p className="mt-[6px] text-[9px] text-[#8996a8]">
                No return request has been submitted for this order.
              </p>
            </div>

            <span className="inline-flex rounded-full border border-[#dce4ee] bg-white px-[9px] py-[5px] text-[6px] font-medium uppercase tracking-[0.08em] text-[#718096]">
              No Request
            </span>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-[11px] border border-[#dfe7f3] bg-white">

        {/* RETURN HEADER */}

        <div className="flex flex-col gap-[10px] border-b border-[#edf1f6] px-[16px] py-[14px] sm:flex-row sm:items-center sm:justify-between">

          <div>
            <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-[#1557f5]">
              Return Management
            </p>

            <p className="mt-[5px] text-[9px] text-[#8996a8]">
              Manage the customer return request.
            </p>
          </div>

          <span
            className={`inline-flex w-fit rounded-full border px-[9px] py-[5px] text-[6px] font-medium uppercase tracking-[0.08em] ${getReturnStatusClasses(
              returnStatus
            )}`}
          >
            {returnStatus ===
            "collection_pending"
              ? "Pickup Pending"
              : formatStatus(
                  returnStatus
                )}
          </span>

        </div>

        <div className="p-[16px]">

          {/* RETURN REASON */}

          <div className="rounded-[9px] border border-[#edf1f6] bg-[#f9fbfe] p-[13px]">

            <p className="text-[7px] font-semibold uppercase tracking-[0.12em] text-[#718096]">
              Customer Return Reason
            </p>

            <p className="mt-[7px] text-[9px] leading-5 text-[#4f5d72]">
              {order.returnReason ||
                "No return reason provided."}
            </p>

          </div>

          {/* REJECTION REASON */}

          {returnStatus ===
            "rejected" &&
            order.returnRejectionReason && (
              <div className="mt-[10px] rounded-[9px] border border-[#ffd1d8] bg-[#fff5f6] p-[13px]">

                <p className="text-[7px] font-semibold uppercase tracking-[0.12em] text-[#d93650]">
                  Rejection Reason
                </p>

                <p className="mt-[7px] text-[9px] leading-5 text-[#a53a4d]">
                  {order.returnRejectionReason}
                </p>

              </div>
            )}

          {/* RETURN DATES */}

          <div className="mt-[12px] grid grid-cols-1 gap-[9px] sm:grid-cols-2 lg:grid-cols-4">

            <div className="rounded-[8px] border border-[#edf1f6] bg-white p-[11px]">
              <p className="text-[6px] uppercase tracking-[0.1em] text-[#8996a8]">
                Requested
              </p>

              <p className="mt-[5px] text-[8px] font-medium text-[#263247]">
                {formatDateTime(
                  order.returnRequestedAt
                )}
              </p>
            </div>

            <div className="rounded-[8px] border border-[#edf1f6] bg-white p-[11px]">
              <p className="text-[6px] uppercase tracking-[0.1em] text-[#8996a8]">
                Approved
              </p>

              <p className="mt-[5px] text-[8px] font-medium text-[#263247]">
                {formatDateTime(
                  order.returnApprovedAt
                )}
              </p>
            </div>

            <div className="rounded-[8px] border border-[#edf1f6] bg-white p-[11px]">
              <p className="text-[6px] uppercase tracking-[0.1em] text-[#8996a8]">
                Collected
              </p>

              <p className="mt-[5px] text-[8px] font-medium text-[#263247]">
                {formatDateTime(
                  order.returnCollectedAt
                )}
              </p>
            </div>

            <div className="rounded-[8px] border border-[#edf1f6] bg-white p-[11px]">
              <p className="text-[6px] uppercase tracking-[0.1em] text-[#8996a8]">
                Completed
              </p>

              <p className="mt-[5px] text-[8px] font-medium text-[#263247]">
                {formatDateTime(
                  order.returnedAt
                )}
              </p>
            </div>

          </div>

          {/* =================================================
              PENDING
          ================================================= */}

          {returnStatus ===
            "pending" && (
            <div className="mt-[14px]">

              <p className="text-[7px] font-semibold uppercase tracking-[0.12em] text-[#718096]">
                Admin Decision
              </p>

              <div className="mt-[8px] grid grid-cols-1 gap-[9px] lg:grid-cols-2">

                <button
                  type="button"
                  onClick={
                    handleApproveReturn
                  }
                  disabled={
                    returnLoading
                  }
                  className="h-[42px] rounded-[8px] bg-[#1557f5] px-[15px] text-[8px] font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-[#0d49d8] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {returnLoading
                    ? "PROCESSING..."
                    : "APPROVE RETURN"}
                </button>

                <div className="flex gap-[7px]">

                  <input
                    type="text"
                    value={
                      rejectionReason
                    }
                    onChange={(
                      event
                    ) =>
                      setRejectionReason(
                        event.target
                          .value
                      )
                    }
                    placeholder="Rejection reason..."
                    disabled={
                      returnLoading
                    }
                    className="h-[42px] min-w-0 flex-1 rounded-[8px] border border-[#dfe6ef] bg-[#f9fbfe] px-[11px] text-[8px] text-[#263247] outline-none placeholder:text-[#aab4c2] focus:border-[#ef8b9b] focus:bg-white"
                  />

                  <button
                    type="button"
                    onClick={
                      handleRejectReturn
                    }
                    disabled={
                      returnLoading
                    }
                    className="h-[42px] rounded-[8px] border border-[#ffd0d8] bg-[#fff5f6] px-[15px] text-[8px] font-semibold uppercase tracking-[0.08em] text-[#d93650] transition hover:border-[#f09baa] hover:bg-[#ffecef] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    REJECT
                  </button>

                </div>

              </div>

            </div>
          )}

          {/* =================================================
              COLLECTION PENDING / PICKUP PENDING
          ================================================= */}

          {returnStatus ===
            "collection_pending" && (
            <div className="mt-[14px]">

              <div className="rounded-[9px] border border-[#ffd2a8] bg-[#fff8f0] p-[13px]">

                <div className="flex items-start gap-[10px]">

                  <div className="mt-[1px] flex h-[25px] w-[25px] shrink-0 items-center justify-center rounded-full bg-[#fff0df] text-[12px]">
                    📦
                  </div>

                  <div>
                    <p className="text-[8px] font-semibold uppercase tracking-[0.1em] text-[#c56b19]">
                      Pickup Pending
                    </p>

                    <p className="mt-[5px] text-[8px] leading-5 text-[#8d6a48]">
                      Return request approved. The returned product is now waiting for pickup / collection.
                    </p>
                  </div>

                </div>

              </div>

              <button
                type="button"
                onClick={
                  handleCollected
                }
                disabled={
                  returnLoading
                }
                className="mt-[9px] h-[42px] w-full rounded-[8px] bg-[#1557f5] px-[15px] text-[8px] font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-[#0d49d8] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {returnLoading
                  ? "PROCESSING..."
                  : "MARK RETURN COLLECTED"}
              </button>

            </div>
          )}

          {/* =================================================
              APPROVED FALLBACK
          ================================================= */}

          {returnStatus ===
            "approved" && (
            <div className="mt-[14px]">

              <div className="rounded-[9px] border border-[#b9d0ff] bg-[#eef4ff] p-[13px]">

                <p className="text-[8px] font-semibold uppercase tracking-[0.1em] text-[#1557f5]">
                  Return Approved
                </p>

                <p className="mt-[5px] text-[8px] leading-5 text-[#5f76a8]">
                  Return approved. Pickup / collection is being arranged.
                </p>

              </div>

              <button
                type="button"
                onClick={
                  handleCollectionPending
                }
                disabled={
                  returnLoading
                }
                className="mt-[9px] h-[42px] w-full rounded-[8px] border border-[#b9d0ff] bg-white px-[15px] text-[8px] font-semibold uppercase tracking-[0.08em] text-[#1557f5] transition hover:bg-[#eef4ff] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {returnLoading
                  ? "PROCESSING..."
                  : "MARK PICKUP PENDING"}
              </button>

            </div>
          )}

          {/* =================================================
              COLLECTED
          ================================================= */}

          {returnStatus ===
            "collected" && (
            <div className="mt-[14px]">

              <div className="rounded-[8px] border border-[#fff0c8] bg-[#fffaf0] p-[11px]">

                <p className="text-[8px] leading-5 text-[#8d6817]">
                  The returned product has been marked as collected. The refund has been processed. Complete the return to restore the product stock.
                </p>

              </div>

              <button
                type="button"
                onClick={
                  handleCompleteReturn
                }
                disabled={
                  returnLoading
                }
                className="mt-[9px] h-[42px] w-full rounded-[8px] bg-[#11845b] px-[15px] text-[8px] font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-[#0c704c] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {returnLoading
                  ? "PROCESSING..."
                  : "COMPLETE RETURN"}
              </button>

            </div>
          )}

          {/* =================================================
              COMPLETED
          ================================================= */}

          {returnStatus ===
            "completed" && (
            <div className="mt-[14px] rounded-[8px] border border-[#bcebd5] bg-[#effcf6] p-[12px]">

              <p className="text-[8px] font-medium text-[#11845b]">
                Return completed successfully. The order has been marked as returned and the product stock has been restored.
              </p>

            </div>
          )}

          {/* =================================================
              REJECTED
          ================================================= */}

          {returnStatus ===
            "rejected" && (
            <div className="mt-[14px] rounded-[8px] border border-[#ffd0d8] bg-[#fff5f6] p-[12px]">

              <p className="text-[8px] font-medium text-[#d93650]">
                This return request has been rejected.
              </p>

            </div>
          )}

          {/* RETURN ERROR */}

          {returnError && (
            <div className="mt-[10px] rounded-[8px] border border-[#ffd0d8] bg-[#fff5f6] p-[11px]">

              <p className="text-[8px] text-[#d93650]">
                {returnError}
              </p>

            </div>
          )}

        </div>
      </div>
    );
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="min-h-full bg-white text-[#172033]">

        <section className="border-b border-[#edf1f6] px-[26px] pb-[24px] pt-[25px]">

          <div className="flex items-center gap-[8px] text-[9px]">

            <button
              type="button"
              onClick={() =>
                navigate("/admin/orders")
              }
              className="font-medium text-[#1557f5] hover:text-[#0d49d8]"
            >
              Orders
            </button>

            <span className="text-[#b5bfcc]">
              /
            </span>

            <span className="text-[#8b97a8]">
              Order Details
            </span>

          </div>

          <h1 className="mt-[22px] text-[25px] font-semibold tracking-[-0.035em] text-[#162033]">
            Order Details
          </h1>

        </section>

        <main className="flex min-h-[500px] items-center justify-center px-[26px]">

          <div className="flex flex-col items-center">

            <div className="h-[30px] w-[30px] animate-spin rounded-full border-2 border-[#dce5f2] border-t-[#1557f5]" />

            <p className="mt-[13px] text-[8px] uppercase tracking-[0.12em] text-[#8996a8]">
              Loading Order...
            </p>

          </div>

        </main>

      </div>
    );
  }

  // =========================================================
  // ERROR
  // =========================================================

  if (error || !order) {
    return (
      <div className="min-h-full bg-white text-[#172033]">

        <section className="border-b border-[#edf1f6] px-[26px] pb-[24px] pt-[25px]">

          <div className="flex items-center gap-[8px] text-[9px]">

            <button
              type="button"
              onClick={() =>
                navigate("/admin/orders")
              }
              className="font-medium text-[#1557f5] hover:text-[#0d49d8]"
            >
              Orders
            </button>

            <span className="text-[#b5bfcc]">
              /
            </span>

            <span className="text-[#8b97a8]">
              Order Details
            </span>

          </div>

          <h1 className="mt-[22px] text-[25px] font-semibold tracking-[-0.035em] text-[#162033]">
            Order Details
          </h1>

        </section>

        <main className="px-[26px] py-[22px]">

          <div className="rounded-[12px] border border-[#ffd1d8] bg-[#fff5f6] p-[18px]">

            <p className="text-[9px] font-medium text-[#d93650]">
              {error ||
                "Order details could not be found."}
            </p>

            <button
              type="button"
              onClick={() =>
                navigate("/admin/orders")
              }
              className="mt-[13px] h-[38px] rounded-[8px] bg-[#1557f5] px-[17px] text-[8px] font-semibold uppercase tracking-[0.08em] text-white hover:bg-[#0d49d8]"
            >
              BACK TO ORDERS
            </button>

          </div>

        </main>

      </div>
    );
  }

  // =========================================================
  // MAIN PAGE
  // =========================================================

  return (
    <div className="min-h-full bg-white text-[#172033]">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <section className="border-b border-[#edf1f6] px-[26px] pb-[24px] pt-[25px]">

        {/* BREADCRUMB */}

        <div className="flex items-center gap-[8px] text-[9px]">

          <button
            type="button"
            onClick={() =>
              navigate("/admin/dashboard")
            }
            className="font-medium text-[#1557f5] transition-colors duration-200 hover:text-[#0d49d8]"
          >
            Dashboard
          </button>

          <span className="text-[#b5bfcc]">
            /
          </span>

          <button
            type="button"
            onClick={() =>
              navigate("/admin/orders")
            }
            className="font-medium text-[#1557f5] transition-colors duration-200 hover:text-[#0d49d8]"
          >
            Orders
          </button>

          <span className="text-[#b5bfcc]">
            /
          </span>

          <span className="text-[#8b97a8]">
            Details
          </span>

        </div>

        {/* TITLE */}

        <div className="mt-[22px] flex flex-col gap-[15px] sm:flex-row sm:items-end sm:justify-between">

          <div>

            <h1 className="text-[25px] font-semibold tracking-[-0.035em] text-[#162033]">
              Order Details
            </h1>

            <p className="mt-[7px] text-[11px] text-[#8290a3]">
              View and manage this GETSUKA customer order.
            </p>

          </div>

          <button
            type="button"
            onClick={() =>
              navigate("/admin/orders")
            }
            className="h-[38px] w-fit rounded-[8px] border border-[#dce4ee] bg-white px-[16px] text-[8px] font-semibold uppercase tracking-[0.08em] text-[#718096] transition hover:border-[#9eb9eb] hover:bg-[#f3f7ff] hover:text-[#1557f5]"
          >
            ← BACK TO ORDERS
          </button>

        </div>

      </section>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="px-[26px] py-[22px]">

        {/* ===================================================
            ORDER HEADER CARD
        =================================================== */}

        <section className="rounded-[12px] border border-[#e1e8f1] bg-white p-[18px] shadow-[0_4px_18px_rgba(30,64,175,0.04)]">

          <div className="flex flex-col gap-[15px] sm:flex-row sm:items-center sm:justify-between">

            <div>

              <p className="text-[7px] font-medium uppercase tracking-[0.14em] text-[#8996a8]">
                Order Number
              </p>

              <p className="mt-[6px] text-[18px] font-semibold text-[#1557f5]">
                {order.orderNumber || "—"}
              </p>

              <p className="mt-[5px] text-[8px] text-[#9aa6b6]">
                Order ID: {order._id || "—"}
              </p>

              <p className="mt-[3px] text-[8px] text-[#9aa6b6]">
                Placed on{" "}
                {formatDateTime(
                  order.createdAt
                )}
              </p>

            </div>

            <div className="flex flex-col items-start gap-[7px] sm:items-end">

              <span
                className={`inline-flex rounded-full border px-[10px] py-[6px] text-[7px] font-medium uppercase tracking-[0.08em] ${getStatusClasses(
                  order.status
                )}`}
              >
                {formatStatus(
                  order.status
                )}
              </span>

              <span
                className={`inline-flex rounded-full border px-[10px] py-[6px] text-[7px] font-medium uppercase tracking-[0.08em] ${getPaymentStatusClasses(
                  displayPaymentStatus
                )}`}
              >
                Payment:{" "}
                {formatStatus(
                  displayPaymentStatus
                )}
              </span>

            </div>

          </div>

        </section>

        {/* ===================================================
            CUSTOMER + SHIPPING
        =================================================== */}

        <div className="mt-[14px] grid grid-cols-1 gap-[14px] lg:grid-cols-2">

          {/* CUSTOMER */}

          <section className="rounded-[12px] border border-[#e1e8f1] bg-white p-[18px] shadow-[0_4px_18px_rgba(30,64,175,0.04)]">

            <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-[#1557f5]">
              Customer Information
            </p>

            <div className="mt-[15px] grid grid-cols-1 gap-[12px] sm:grid-cols-2">

              <div>
                <p className="text-[7px] uppercase tracking-[0.1em] text-[#8996a8]">
                  Full Name
                </p>

                <p className="mt-[5px] text-[10px] font-semibold text-[#263247]">
                  {getCustomerName()}
                </p>
              </div>

              <div>
                <p className="text-[7px] uppercase tracking-[0.1em] text-[#8996a8]">
                  Phone
                </p>

                <p className="mt-[5px] text-[10px] font-semibold text-[#263247]">
                  {getCustomerPhone()}
                </p>
              </div>

              <div>
                <p className="text-[7px] uppercase tracking-[0.1em] text-[#8996a8]">
                  Delivery Method
                </p>

                <p className="mt-[5px] text-[10px] font-semibold uppercase text-[#263247]">
                  {order.deliveryMethod ||
                    "—"}
                </p>
              </div>

              <div>
                <p className="text-[7px] uppercase tracking-[0.1em] text-[#8996a8]">
                  Payment Method
                </p>

                <p className="mt-[5px] text-[10px] font-semibold uppercase text-[#263247]">
                  {order.paymentMethod ||
                    "—"}
                </p>
              </div>

            </div>

          </section>

          {/* SHIPPING */}

          <section className="rounded-[12px] border border-[#e1e8f1] bg-white p-[18px] shadow-[0_4px_18px_rgba(30,64,175,0.04)]">

            <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-[#1557f5]">
              Shipping Address
            </p>

            <div className="mt-[15px] rounded-[9px] border border-[#edf1f6] bg-[#f9fbfe] p-[13px]">

              <p className="text-[10px] font-semibold text-[#263247]">
                {order?.shippingAddress
                  ?.fullName || "—"}
              </p>

              <p className="mt-[7px] text-[9px] leading-5 text-[#657286]">

                {order?.shippingAddress
                  ?.addressLine || "—"}

                <br />

                {order?.shippingAddress
                  ?.city || "—"}
                {", "}
                {order?.shippingAddress
                  ?.state || "—"}
                {" - "}
                {order?.shippingAddress
                  ?.pincode || "—"}

              </p>

              <p className="mt-[7px] text-[8px] text-[#8996a8]">
                Phone:{" "}
                {order?.shippingAddress
                  ?.phone || "—"}
              </p>

            </div>

          </section>

        </div>

        {/* ===================================================
            ORDER ITEMS
        =================================================== */}

        <section className="mt-[14px] overflow-hidden rounded-[12px] border border-[#e1e8f1] bg-white shadow-[0_4px_18px_rgba(30,64,175,0.04)]">

          <div className="flex items-center justify-between border-b border-[#edf1f6] px-[18px] py-[15px]">

            <div>

              <p className="text-[12px] font-semibold text-[#1c2940]">
                Order Items
              </p>

              <p className="mt-[4px] text-[8px] uppercase tracking-[0.08em] text-[#8b97a8]">
                {getItemCount()} total items
              </p>

            </div>

          </div>

          <div>

            {Array.isArray(order.items) &&
              order.items.map(
                (item, index) => {

                  const quantity =
                    Number(
                      item?.quantity || 0
                    );

                  const unitPrice =
                    Number(
                      item?.price || 0
                    );

                  const itemTotal =
                    Number(
                      item?.totalPrice || 0
                    ) ||
                    unitPrice *
                      quantity;

                  return (
                    <div
                      key={
                        item?._id ||
                        `${item?.productId || "item"}-${index}`
                      }
                      className="flex flex-col gap-[12px] border-b border-[#edf1f6] px-[18px] py-[16px] last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                    >

                      <div className="min-w-0">

                        <p className="text-[10px] font-semibold text-[#263247]">
                          {item?.productName ||
                            "GETSUKA Product"}
                        </p>

                        <div className="mt-[6px] flex flex-wrap gap-x-[12px] gap-y-[4px]">

                          <span className="text-[7px] text-[#8996a8]">
                            Qty:{" "}
                            {quantity}
                          </span>

                          {item?.size && (
                            <span className="text-[7px] text-[#8996a8]">
                              Size:{" "}
                              {item.size}
                            </span>
                          )}

                          {item?.color && (
                            <span className="text-[7px] text-[#8996a8]">
                              Color:{" "}
                              {item.color}
                            </span>
                          )}

                          {item?.sku && (
                            <span className="text-[7px] text-[#8996a8]">
                              SKU:{" "}
                              {item.sku}
                            </span>
                          )}

                        </div>

                      </div>

                      <div className="text-left sm:text-right">

                        <p className="text-[7px] text-[#8996a8]">
                          {formatPrice(
                            unitPrice
                          )}{" "}
                          × {quantity}
                        </p>

                        <p className="mt-[4px] text-[11px] font-semibold text-[#263247]">
                          {formatPrice(
                            itemTotal
                          )}
                        </p>

                      </div>

                    </div>
                  );
                }
              )}

          </div>

        </section>

        {/* ===================================================
            SUMMARY + PAYMENT
        =================================================== */}

        <div className="mt-[14px] grid grid-cols-1 gap-[14px] lg:grid-cols-2">

          {/* PAYMENT */}

          <section className="rounded-[12px] border border-[#e1e8f1] bg-white p-[18px] shadow-[0_4px_18px_rgba(30,64,175,0.04)]">

            <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-[#1557f5]">
              Payment Information
            </p>

            <div className="mt-[15px] space-y-[11px]">

              <div className="flex items-center justify-between">

                <span className="text-[8px] text-[#8996a8]">
                  Method
                </span>

                <span className="text-[9px] font-semibold uppercase text-[#263247]">
                  {order.paymentMethod ||
                    "—"}
                </span>

              </div>

              <div className="flex items-center justify-between">

                <span className="text-[8px] text-[#8996a8]">
                  Payment Status
                </span>

                <span
                  className={`rounded-full border px-[8px] py-[5px] text-[6px] font-medium uppercase tracking-[0.08em] ${getPaymentStatusClasses(
                    displayPaymentStatus
                  )}`}
                >
                  {formatStatus(
                    displayPaymentStatus
                  )}
                </span>

              </div>

              <div className="flex items-center justify-between">

                <span className="text-[8px] text-[#8996a8]">
                  Coupon
                </span>

                <span className="text-[9px] font-semibold text-[#263247]">
                  {order.couponCode ||
                    "—"}
                </span>

              </div>

            </div>

          </section>

          {/* ORDER SUMMARY */}

          <section className="rounded-[12px] border border-[#dfe7f3] bg-[#f8faff] p-[18px]">

            <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-[#1557f5]">
              Order Summary
            </p>

            <div className="mt-[15px] space-y-[10px]">

              <div className="flex items-center justify-between">
                <span className="text-[8px] text-[#8996a8]">
                  Subtotal
                </span>

                <span className="text-[9px] font-medium text-[#263247]">
                  {formatPrice(
                    order.subtotal
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[8px] text-[#8996a8]">
                  Shipping
                </span>

                <span className="text-[9px] font-medium text-[#263247]">
                  {formatPrice(
                    order.shippingCharge
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[8px] text-[#8996a8]">
                  Discount
                </span>

                <span className="text-[9px] font-medium text-[#11845b]">
                  -{" "}
                  {formatPrice(
                    order.discount
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[8px] text-[#8996a8]">
                  Tax
                </span>

                <span className="text-[9px] font-medium text-[#263247]">
                  {formatPrice(
                    order.tax
                  )}
                </span>
              </div>

              <div className="border-t border-[#dfe7f3] pt-[11px]">

                <div className="flex items-center justify-between">

                  <span className="text-[9px] font-semibold text-[#263247]">
                    Total Amount
                  </span>

                  <span className="text-[18px] font-semibold text-[#1557f5]">
                    {formatPrice(
                      order.totalAmount
                    )}
                  </span>

                </div>

              </div>

            </div>

          </section>

        </div>

        {/* ===================================================
            STATUS MANAGEMENT
        =================================================== */}

        <section className="mt-[14px] rounded-[12px] border border-[#e1e8f1] bg-white p-[18px] shadow-[0_4px_18px_rgba(30,64,175,0.04)]">

          <div className="flex flex-col gap-[12px] lg:flex-row lg:items-end">

            <div className="flex-1">

              <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-[#1557f5]">
                Order Status Management
              </p>

              <select
                value={selectedStatus}
                onChange={(event) => {
                  setSelectedStatus(
                    event.target.value
                  );

                  setStatusError("");
                }}
                disabled={
                  statusLoading
                }
                className="mt-[9px] h-[43px] w-full rounded-[8px] border border-[#dfe6ef] bg-[#f9fbfe] px-[12px] text-[9px] text-[#263247] outline-none transition hover:border-[#c4d2e5] focus:border-[#6f9cf7] focus:bg-white"
              >
                {getAvailableStatuses(
                  order.status
                ).map(
                  (statusOption) => (
                    <option
                      key={
                        statusOption.value
                      }
                      value={
                        statusOption.value
                      }
                    >
                      {
                        statusOption.label
                      }
                    </option>
                  )
                )}
              </select>

            </div>

            <button
              type="button"
              onClick={
                handleUpdateStatus
              }
              disabled={
                statusLoading ||
                selectedStatus ===
                  order.status
              }
              className="h-[43px] rounded-[8px] bg-[#1557f5] px-[22px] text-[8px] font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-[#0d49d8] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {statusLoading
                ? "UPDATING..."
                : "UPDATE STATUS"}
            </button>

          </div>

          {statusError && (
            <div className="mt-[9px] rounded-[8px] border border-[#ffd1d8] bg-[#fff5f6] px-[12px] py-[9px]">

              <p className="text-[8px] text-[#d93650]">
                {statusError}
              </p>

            </div>
          )}

        </section>

        {/* ===================================================
            RETURN MANAGEMENT
        =================================================== */}

        <section className="mt-[14px]">

          {renderReturnActions()}

        </section>

        {/* ===================================================
            FOOTER
        =================================================== */}

        <footer className="mt-[28px] flex items-center justify-between border-t border-[#e7edf5] px-[5px] py-[18px]">

          <div>

            <p className="text-[11px] font-semibold text-[#1557f5]">
              GETSUKA
            </p>

            <p className="mt-[3px] text-[7px] text-[#8c98a9]">
              Admin Panel
            </p>

          </div>

          <p className="text-[8px] text-[#8c98a9]">
            GETSUKA Administration
          </p>

        </footer>

      </main>

    </div>
  );
};

export default AdminOrderDetailsPage;