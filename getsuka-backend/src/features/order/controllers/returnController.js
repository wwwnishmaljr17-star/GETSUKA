
import Order from "../models/Order.js";

// =========================================================
// GET ADMIN RETURN REQUESTS
// GET /api/admin/orders/returns
// =========================================================

export const getAdminReturns = async (req, res) => {
  try {
    const {
      search = "",
      status = "",
      sort = "newest",
      page = 1,
      limit = 10,
    } = req.query;

    // -------------------------------------------------------
    // PAGINATION
    // -------------------------------------------------------

    const currentPage = Math.max(Number(page) || 1, 1);
    const perPage = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const skip = (currentPage - 1) * perPage;

    // -------------------------------------------------------
    // VALID RETURN STATUSES
    // -------------------------------------------------------

    const validReturnStatuses = [
      "pending",
      "approved",
      "rejected",
      "collection_pending",
      "collected",
      "completed",
    ];

    // -------------------------------------------------------
    // BASE FILTER
    // -------------------------------------------------------

    const filter = {
      returnStatus: {
        $in: validReturnStatuses,
      },
    };

    // -------------------------------------------------------
    // RETURN STATUS FILTER
    // -------------------------------------------------------

    if (status && status !== "all") {
      if (!validReturnStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid return status",
        });
      }

      filter.returnStatus = status;
    }

    // -------------------------------------------------------
    // SEARCH
    // -------------------------------------------------------

    const trimmedSearch = String(search).trim();

    if (trimmedSearch) {
      const escapedSearch = trimmedSearch.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      const searchRegex = new RegExp(escapedSearch, "i");

      filter.$or = [
        {
          orderNumber: searchRegex,
        },
        {
          "shippingAddress.fullName": searchRegex,
        },
        {
          "shippingAddress.phone": searchRegex,
        },
        {
          "items.productName": searchRegex,
        },
        {
          returnReason: searchRegex,
        },
      ];
    }

    // -------------------------------------------------------
    // SORT
    // -------------------------------------------------------

    const sortOption =
      sort === "oldest"
        ? { returnRequestedAt: 1, createdAt: 1 }
        : { returnRequestedAt: -1, createdAt: -1 };

    // -------------------------------------------------------
    // TOTAL COUNT
    // -------------------------------------------------------

    const totalReturns = await Order.countDocuments(filter);

    // -------------------------------------------------------
    // FETCH RETURNS
    // -------------------------------------------------------

    const orders = await Order.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(perPage)
      .lean();

    // -------------------------------------------------------
    // FORMAT RESPONSE
    // -------------------------------------------------------

    const returns = orders.map((order) => {
      const shippingAddress = order.shippingAddress || {};

      return {
        _id: order._id,

        orderNumber: order.orderNumber,

        userId: order.userId,

        customer: {
          name: shippingAddress.fullName || "N/A",
          phone: shippingAddress.phone || "N/A",
        },

        items: order.items || [],

        totalAmount: order.totalAmount || 0,

        paymentMethod: order.paymentMethod || null,

        paymentStatus: order.paymentStatus || null,

        orderStatus: order.status || null,

        returnStatus: order.returnStatus || "none",

        returnReason: order.returnReason || "",

        returnRequestedAt: order.returnRequestedAt || null,

        returnApprovedAt: order.returnApprovedAt || null,

        returnRejectedAt: order.returnRejectedAt || null,

        returnRejectionReason:
          order.returnRejectionReason || "",

        returnCollectionRequestedAt:
          order.returnCollectionRequestedAt || null,

        returnCollectedAt:
          order.returnCollectedAt || null,

        returnedAt: order.returnedAt || null,

        createdAt: order.createdAt || null,

        updatedAt: order.updatedAt || null,
      };
    });

    // -------------------------------------------------------
    // PAGINATION DETAILS
    // -------------------------------------------------------

    const totalPages =
      totalReturns === 0
        ? 0
        : Math.ceil(totalReturns / perPage);

    // -------------------------------------------------------
    // RESPONSE
    // -------------------------------------------------------

    return res.status(200).json({
      success: true,

      returns,

      pagination: {
        currentPage,
        totalPages,
        totalReturns,
        limit: perPage,
      },
    });
  } catch (error) {
    console.error(
      "Get admin returns error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch return requests",
    });
  }
};