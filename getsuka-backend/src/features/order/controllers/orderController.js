import mongoose from "mongoose";

import Order from "../models/Order.js";
import Product from "../../product/models/Product.js";
import Address from "../../address/models/Address.js";

// =========================================================
// CREATE ORDER
// =========================================================

export const createOrder = async (
  req,
  res
) => {
  try {
    const userId =
      req.user.userId;

    const {
      addressId,
      paymentMethod = "cod",
      deliveryMethod = "standard",
      couponCode = "",
    } = req.body;

    // =======================================================
    // VALIDATE USER
    // =======================================================

    if (
      !mongoose.Types.ObjectId.isValid(
        userId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid user",
      });
    }

    // =======================================================
    // VALIDATE ADDRESS
    // =======================================================

    if (!addressId) {
      return res.status(400).json({
        success: false,
        message:
          "Shipping address is required",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        addressId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid shipping address",
      });
    }

    const address =
      await Address.findOne({
        _id: addressId,
        userId,
      }).lean();

    if (!address) {
      return res.status(404).json({
        success: false,
        message:
          "Shipping address not found",
      });
    }

    // =======================================================
    // VALIDATE PAYMENT METHOD
    // =======================================================

    const allowedPaymentMethods = [
      "upi",
      "card",
      "netbanking",
      "cod",
    ];

    if (
      !allowedPaymentMethods.includes(
        paymentMethod
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid payment method",
      });
    }

    // =======================================================
    // VALIDATE DELIVERY METHOD
    // =======================================================

    const allowedDeliveryMethods = [
      "standard",
      "express",
    ];

    if (
      !allowedDeliveryMethods.includes(
        deliveryMethod
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid delivery method",
      });
    }

    // =======================================================
    // CART
    // =======================================================

    const { items = [] } =
      req.body;

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Order must contain at least one item",
      });
    }

    // =======================================================
    // LOAD PRODUCTS
    // =======================================================

    const productIds =
      items.map(
        (item) =>
          item.productId
      );

    const uniqueProductIds = [
      ...new Set(
        productIds.map(
          (id) => String(id)
        )
      ),
    ];

    for (
      const productId of
      uniqueProductIds
    ) {
      if (
        !mongoose.Types.ObjectId.isValid(
          productId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid product ID",
        });
      }
    }

    const products =
      await Product.find({
        _id: {
          $in: uniqueProductIds,
        },
        isDeleted: false,
        isListed: true,
      });

    if (
      products.length !==
      uniqueProductIds.length
    ) {
      return res.status(400).json({
        success: false,
        message:
          "One or more products are unavailable",
      });
    }

    // =======================================================
    // CREATE PRODUCT MAP
    // =======================================================

    const productMap =
      new Map();

    products.forEach(
      (product) => {
        productMap.set(
          String(product._id),
          product
        );
      }
    );

    // =======================================================
    // PREPARE ORDER ITEMS
    // =======================================================

    const orderItems = [];

    let subtotal = 0;

    for (const item of items) {
      const {
        productId,
        variantId,
        quantity,
      } = item;

      // -----------------------------------------------------
      // BASIC VALIDATION
      // -----------------------------------------------------

      if (
        !productId ||
        !variantId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Product and variant are required",
        });
      }

      const requestedQuantity =
        Number(quantity);

      if (
        !Number.isInteger(
          requestedQuantity
        ) ||
        requestedQuantity <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid product quantity",
        });
      }

      // -----------------------------------------------------
      // PRODUCT
      // -----------------------------------------------------

      const product =
        productMap.get(
          String(productId)
        );

      if (!product) {
        return res.status(404).json({
          success: false,
          message:
            "Product not found",
        });
      }

      // -----------------------------------------------------
      // VARIANT
      // -----------------------------------------------------

      const variant =
        product.variants.id(
          variantId
        );

      if (!variant) {
        return res.status(404).json({
          success: false,
          message:
            `Variant not found for ${product.name}`,
        });
      }

      // -----------------------------------------------------
      // STOCK
      // -----------------------------------------------------

      if (
        variant.stock <
        requestedQuantity
      ) {
        return res.status(400).json({
          success: false,
          message:
            `${product.name} (${variant.color} / ${variant.size}) has only ${variant.stock} item(s) available`,
        });
      }

      // -----------------------------------------------------
      // PRICE
      // -----------------------------------------------------

      const itemPrice =
        product.salePrice !==
          null &&
        product.salePrice !==
          undefined
          ? product.salePrice
          : product.price;

      const itemTotal =
        itemPrice *
        requestedQuantity;

      subtotal += itemTotal;

      // -----------------------------------------------------
      // ORDER ITEM
      // -----------------------------------------------------

      orderItems.push({
        productId:
          product._id,

        variantId:
          variant._id,

        productName:
          product.name,

        productImage:
          product.images?.[0] ||
          "",

        sku:
          variant.sku,

        size:
          variant.size,

        color:
          variant.color,

        quantity:
          requestedQuantity,

        price:
          itemPrice,

        totalPrice:
          itemTotal,
      });
    }

    // =======================================================
    // SHIPPING
    // =======================================================

    const shippingCharge =
      deliveryMethod ===
      "express"
        ? 149
        : 0;

    // =======================================================
    // DISCOUNT
    // =======================================================

    let discount = 0;

    if (
      couponCode &&
      typeof couponCode ===
        "string"
    ) {
      discount = 0;
    }

    // =======================================================
    // TAX
    // =======================================================

    const tax = 0;

    // =======================================================
    // TOTAL
    // =======================================================

    const totalAmount =
      subtotal -
      discount +
      tax +
      shippingCharge;

    // =======================================================
    // ORDER NUMBER
    // =======================================================

    const orderNumber =
      `GET-${Date.now()}-${Math.floor(
        1000 +
          Math.random() *
            9000
      )}`;

    // =======================================================
    // PAYMENT STATUS
    // =======================================================

    const paymentStatus =
      "pending";

    // =======================================================
    // SHIPPING ADDRESS SNAPSHOT
    // =======================================================

    const shippingAddress = {
      addressId:
        address._id,

      fullName:
        address.fullName,

      phone:
        address.phone,

      addressLine:
        address.addressLine,

      city:
        address.city,

      state:
        address.state,

      pincode:
        address.pincode,
    };

    // =======================================================
    // CREATE ORDER
    // =======================================================

    const order =
      await Order.create({
        userId,

        orderNumber,

        items:
          orderItems,

        shippingAddress,

        deliveryMethod,

        shippingCharge,

        subtotal,

        discount,

        tax,

        totalAmount,

        couponCode:
          couponCode || "",

        paymentMethod,

        paymentStatus,

        status:
          "placed",

        returnStatus:
          "none",
      });

    // =======================================================
    // DECREASE STOCK
    // =======================================================

    for (
      const item of orderItems
    ) {
      const product =
        productMap.get(
          String(
            item.productId
          )
        );

      if (!product) {
        continue;
      }

      const variant =
        product.variants.id(
          item.variantId
        );

      if (!variant) {
        continue;
      }

      variant.stock -=
        Number(
          item.quantity
        );

      await product.save();
    }

    // =======================================================
    // RESPONSE
    // =======================================================

    return res.status(201).json({
      success: true,

      message:
        "Order created successfully",

      order,
    });
  } catch (error) {
    console.error(
      "Create Order Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to create order",
    });
  }
};

// =========================================================
// GET USER ORDERS
// =========================================================

export const getUserOrders = async (
  req,
  res
) => {
  try {
    const userId =
      req.user.userId;

    const orders =
      await Order.find({
        userId,
      })
        .sort({
          createdAt: -1,
        })
        .lean();

    return res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error(
      "Get User Orders Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch orders",
    });
  }
};

// =========================================================
// GET USER ORDER BY ID
// =========================================================

export const getUserOrderById =
  async (
    req,
    res
  ) => {
    try {
      const userId =
        req.user.userId;

      const { orderId } =
        req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          orderId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid order ID",
        });
      }

      const order =
        await Order.findOne({
          _id: orderId,
          userId,
        }).lean();

      if (!order) {
        return res.status(404).json({
          success: false,
          message:
            "Order not found",
        });
      }

      return res.status(200).json({
        success: true,
        order,
      });
    } catch (error) {
      console.error(
        "Get User Order Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch order",
      });
    }
  };

// =========================================================
// CANCEL USER ORDER
// =========================================================

export const cancelUserOrder =
  async (
    req,
    res
  ) => {
    try {
      const userId =
        req.user.userId;

      const { orderId } =
        req.params;

      const {
        cancellationReason = "",
      } = req.body;

      // =====================================================
      // VALIDATE ORDER ID
      // =====================================================

      if (
        !mongoose.Types.ObjectId.isValid(
          orderId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid order ID",
        });
      }

      // =====================================================
      // VALIDATE REASON
      // =====================================================

      const reason =
        String(
          cancellationReason
        ).trim();

      if (!reason) {
        return res.status(400).json({
          success: false,
          message:
            "Cancellation reason is required",
        });
      }

      // =====================================================
      // FIND ORDER
      // =====================================================

      const order =
        await Order.findOne({
          _id: orderId,
          userId,
        });

      if (!order) {
        return res.status(404).json({
          success: false,
          message:
            "Order not found",
        });
      }

      // =====================================================
      // CHECK STATUS
      // =====================================================

      const cancellableStatuses =
        [
          "placed",
          "confirmed",
        ];

      if (
        !cancellableStatuses.includes(
          order.status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "This order can no longer be cancelled",
        });
      }

      // =====================================================
      // RESTORE STOCK
      // =====================================================

      for (const item of order.items) {
        if (
          !item.productId ||
          !item.variantId
        ) {
          continue;
        }

        const product =
          await Product.findOne({
            _id:
              item.productId,

            isDeleted:
              false,
          });

        if (!product) {
          continue;
        }

        const variant =
          product.variants.id(
            item.variantId
          );

        if (!variant) {
          continue;
        }

        variant.stock +=
          Number(
            item.quantity || 0
          );

        await product.save();
      }

      // =====================================================
      // UPDATE ORDER
      // =====================================================

      order.status =
        "cancelled";

      order.cancellationReason =
        reason;

      order.cancelledAt =
        new Date();

      await order.save();

      // =====================================================
      // RESPONSE
      // =====================================================

      return res.status(200).json({
        success: true,

        message:
          "Order cancelled successfully",

        order: {
          id:
            order._id,

          orderNumber:
            order.orderNumber,

          status:
            order.status,

          cancellationReason:
            order.cancellationReason,

          cancelledAt:
            order.cancelledAt,
        },
      });
    } catch (error) {
      console.error(
        "Cancel User Order Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to cancel order",
      });
    }
  };

// =========================================================
// RETURN USER ORDER
// =========================================================

export const returnUserOrder =
  async (
    req,
    res
  ) => {
    try {
      const userId =
        req.user.userId;

      const { orderId } =
        req.params;

      const {
        returnReason = "",
      } = req.body;

      // =====================================================
      // VALIDATE ORDER ID
      // =====================================================

      if (
        !mongoose.Types.ObjectId.isValid(
          orderId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid order ID",
        });
      }

      // =====================================================
      // VALIDATE RETURN REASON
      // =====================================================

      const reason =
        String(
          returnReason
        ).trim();

      if (!reason) {
        return res.status(400).json({
          success: false,
          message:
            "Return reason is required",
        });
      }

      // =====================================================
      // FIND ORDER
      // =====================================================

      const order =
        await Order.findOne({
          _id: orderId,
          userId,
        });

      if (!order) {
        return res.status(404).json({
          success: false,
          message:
            "Order not found",
        });
      }

      // =====================================================
      // CHECK ORDER STATUS
      // =====================================================

      if (
        order.status !==
        "delivered"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Only delivered orders can be returned",
        });
      }

      // =====================================================
      // CHECK RETURN STATUS
      // =====================================================

      const currentReturnStatus =
        order.returnStatus ||
        "none";

      if (
        currentReturnStatus !==
        "none"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "A return request already exists for this order",
        });
      }

      // =====================================================
      // CHECK 3-DAY RETURN WINDOW
      // =====================================================

      const deliveredAt =
        order.deliveredAt ||
        order.updatedAt;

      if (!deliveredAt) {
        return res.status(400).json({
          success: false,
          message:
            "Delivery date is not available for this order",
        });
      }

      const deliveredDate =
        new Date(
          deliveredAt
        );

      if (
        Number.isNaN(
          deliveredDate.getTime()
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid delivery date",
        });
      }

      const now =
        new Date();

      const differenceInMilliseconds =
        now.getTime() -
        deliveredDate.getTime();

      const differenceInDays =
        differenceInMilliseconds /
        (1000 * 60 * 60 * 24);

      if (
        differenceInDays >
        3
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Return period has expired. Returns are allowed within 3 days of delivery.",
        });
      }

      // =====================================================
      // CREATE RETURN REQUEST
      // =====================================================

      order.returnReason =
        reason;

      order.returnRequestedAt =
        now;

      order.returnStatus =
        "pending";

      // IMPORTANT:
      // Do NOT change order.status here.
      // Do NOT restore stock here.
      // Stock is restored only after the return reaches
      // the appropriate collection/completion stage.

      await order.save();

      // =====================================================
      // RESPONSE
      // =====================================================

      return res.status(200).json({
        success: true,

        message:
          "Return request submitted successfully",

        order: {
          id:
            order._id,

          orderNumber:
            order.orderNumber,

          status:
            order.status,

          returnStatus:
            order.returnStatus,

          returnReason:
            order.returnReason,

          returnRequestedAt:
            order.returnRequestedAt,
        },
      });
    } catch (error) {
      console.error(
        "Return User Order Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to submit return request",
      });
    }
  };

// =========================================================
// ADMIN — GET ALL ORDERS
// =========================================================

export const getAdminOrders =
  async (
    req,
    res
  ) => {
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        status = "",
        paymentStatus = "",
        sort = "newest",
      } = req.query;

      const currentPage =
        Math.max(
          Number.parseInt(
            page,
            10
          ) || 1,
          1
        );

      const perPage =
        Math.min(
          Math.max(
            Number.parseInt(
              limit,
              10
            ) || 10,
            1
          ),
          100
        );

      const skip =
        (currentPage - 1) *
        perPage;

      const filter = {};

      // =====================================================
      // SEARCH
      // =====================================================

      const trimmedSearch =
        String(
          search || ""
        ).trim();

      if (trimmedSearch) {
        const searchRegex =
          new RegExp(
            trimmedSearch.replace(
              /[.*+?^${}()|[\]\\]/g,
              "\\$&"
            ),
            "i"
          );

        filter.$or = [
          {
            orderNumber:
              searchRegex,
          },

          {
            "shippingAddress.fullName":
              searchRegex,
          },

          {
            "shippingAddress.phone":
              searchRegex,
          },

          {
            "items.productName":
              searchRegex,
          },
        ];
      }

      // =====================================================
      // STATUS FILTER
      // =====================================================

      const allowedStatuses =
        [
          "placed",
          "confirmed",
          "shipped",
          "out_for_delivery",
          "delivered",
          "cancelled",
          "returned",
        ];

      if (
        status &&
        allowedStatuses.includes(
          status
        )
      ) {
        filter.status =
          status;
      }

      // =====================================================
      // PAYMENT STATUS FILTER
      // =====================================================

      const allowedPaymentStatuses =
        [
          "pending",
          "paid",
          "failed",
          "refunded",
        ];

      if (
        paymentStatus &&
        allowedPaymentStatuses.includes(
          paymentStatus
        )
      ) {
        filter.paymentStatus =
          paymentStatus;
      }

      // =====================================================
      // SORT
      // =====================================================

      let sortOption = {
        createdAt: -1,
      };

      if (
        sort === "oldest"
      ) {
        sortOption = {
          createdAt: 1,
        };
      }

      if (
        sort === "amount-high"
      ) {
        sortOption = {
          totalAmount: -1,
        };
      }

      if (
        sort === "amount-low"
      ) {
        sortOption = {
          totalAmount: 1,
        };
      }

      // =====================================================
      // FETCH ORDERS + COUNT
      // =====================================================

      const [
        orders,
        totalOrders,
      ] = await Promise.all([
        Order.find(filter)
          .sort(sortOption)
          .skip(skip)
          .limit(perPage)
          .lean(),

        Order.countDocuments(
          filter
        ),
      ]);

      // =====================================================
      // PAGINATION
      // =====================================================

      const totalPages =
        Math.ceil(
          totalOrders /
            perPage
        );

      // =====================================================
      // RESPONSE
      // =====================================================

      return res.status(200).json({
        success: true,

        orders,

        pagination: {
          currentPage,

          totalPages,

          totalOrders,

          limit:
            perPage,
        },
      });
    } catch (error) {
      console.error(
        "Get Admin Orders Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch admin orders",
      });
    }
  };

// =========================================================
// ADMIN — GET SINGLE ORDER
// =========================================================

export const getAdminOrderById =
  async (
    req,
    res
  ) => {
    try {
      const { orderId } =
        req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          orderId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid order ID",
        });
      }

      const order =
        await Order.findById(
          orderId
        ).lean();

      if (!order) {
        return res.status(404).json({
          success: false,
          message:
            "Order not found",
        });
      }

      return res.status(200).json({
        success: true,
        order,
      });
    } catch (error) {
      console.error(
        "Get Admin Order Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch order",
      });
    }
  };

// =========================================================
// ADMIN — UPDATE ORDER STATUS
// =========================================================

export const updateAdminOrderStatus =
  async (
    req,
    res
  ) => {
    try {
      const { orderId } =
        req.params;

      const {
        status,
      } = req.body;

      // =====================================================
      // VALIDATE ORDER ID
      // =====================================================

      if (
        !mongoose.Types.ObjectId.isValid(
          orderId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid order ID",
        });
      }

      // =====================================================
      // VALIDATE STATUS
      // =====================================================

      const allowedStatuses =
        [
          "placed",
          "confirmed",
          "shipped",
          "out_for_delivery",
          "delivered",
          "cancelled",
          "returned",
        ];

      if (
        !allowedStatuses.includes(
          status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid order status",
        });
      }

      // =====================================================
      // FIND ORDER
      // =====================================================

      const order =
        await Order.findById(
          orderId
        );

      if (!order) {
        return res.status(404).json({
          success: false,
          message:
            "Order not found",
        });
      }

      // =====================================================
      // UPDATE STATUS
      // =====================================================

      order.status =
        status;

      // =====================================================
      // UPDATE DELIVERY DATE
      // =====================================================

      if (
        status ===
        "delivered"
      ) {
        order.deliveredAt =
          new Date();
      }

      // =====================================================
      // UPDATE PAYMENT STATUS
      // =====================================================

      if (
        status ===
          "delivered" &&
        order.paymentMethod !==
          "cod"
      ) {
        order.paymentStatus =
          "paid";
      }

      // =====================================================
      // CANCEL DETAILS
      // =====================================================

      if (
        status ===
        "cancelled"
      ) {
        order.cancellationReason =
          order.cancellationReason ||
          "Cancelled by admin";

        order.cancelledAt =
          new Date();
      }

      await order.save();

      // =====================================================
      // RESPONSE
      // =====================================================

      return res.status(200).json({
        success: true,

        message:
          "Order status updated successfully",

        order,
      });
    } catch (error) {
      console.error(
        "Update Admin Order Status Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update order status",
      });
    }
  };

// =========================================================
// ADMIN — APPROVE RETURN REQUEST
// =========================================================

export const approveReturnRequest =
  async (
    req,
    res
  ) => {
    try {
      const { orderId } =
        req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          orderId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid order ID",
        });
      }

      const order =
        await Order.findById(
          orderId
        );

      if (!order) {
        return res.status(404).json({
          success: false,
          message:
            "Order not found",
        });
      }

      if (
        order.status !==
        "delivered"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Only delivered orders can have a return request",
        });
      }

      if (
        order.returnStatus !==
        "pending"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "No pending return request found for this order",
        });
      }

      order.returnStatus =
        "approved";

      order.returnApprovedAt =
        new Date();

      await order.save();

      return res.status(200).json({
        success: true,
        message:
          "Return request approved successfully",
        order,
      });
    } catch (error) {
      console.error(
        "Approve Return Request Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to approve return request",
      });
    }
  };

// =========================================================
// ADMIN — REJECT RETURN REQUEST
// =========================================================

export const rejectReturnRequest =
  async (
    req,
    res
  ) => {
    try {
      const { orderId } =
        req.params;

      const {
        rejectionReason = "",
      } = req.body;

      if (
        !mongoose.Types.ObjectId.isValid(
          orderId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid order ID",
        });
      }

      const reason =
        String(
          rejectionReason
        ).trim();

      if (!reason) {
        return res.status(400).json({
          success: false,
          message:
            "Return rejection reason is required",
        });
      }

      const order =
        await Order.findById(
          orderId
        );

      if (!order) {
        return res.status(404).json({
          success: false,
          message:
            "Order not found",
        });
      }

      if (
        order.returnStatus !==
        "pending"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "No pending return request found for this order",
        });
      }

      order.returnStatus =
        "rejected";

      order.returnRejectedAt =
        new Date();

      order.returnRejectionReason =
        reason;

      await order.save();

      return res.status(200).json({
        success: true,
        message:
          "Return request rejected successfully",
        order,
      });
    } catch (error) {
      console.error(
        "Reject Return Request Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to reject return request",
      });
    }
  };

// =========================================================
// ADMIN — MARK RETURN COLLECTION PENDING
// =========================================================

export const markReturnCollectionPending =
  async (
    req,
    res
  ) => {
    try {
      const { orderId } =
        req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          orderId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid order ID",
        });
      }

      const order =
        await Order.findById(
          orderId
        );

      if (!order) {
        return res.status(404).json({
          success: false,
          message:
            "Order not found",
        });
      }

      if (
        order.returnStatus !==
        "approved"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Return request must be approved before collection",
        });
      }

      order.returnStatus =
        "collection_pending";

      order.returnCollectionRequestedAt =
        new Date();

      await order.save();

      return res.status(200).json({
        success: true,
        message:
          "Return collection marked as pending",
        order,
      });
    } catch (error) {
      console.error(
        "Mark Return Collection Pending Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update return collection status",
      });
    }
  };

// =========================================================
// ADMIN — MARK RETURN COLLECTED
// =========================================================

export const markReturnCollected =
  async (
    req,
    res
  ) => {
    try {
      const { orderId } =
        req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          orderId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid order ID",
        });
      }

      const order =
        await Order.findById(
          orderId
        );

      if (!order) {
        return res.status(404).json({
          success: false,
          message:
            "Order not found",
        });
      }

      if (
        order.returnStatus !==
        "collection_pending"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Return collection is not pending",
        });
      }

      order.returnStatus =
        "collected";

      order.returnCollectedAt =
        new Date();

      await order.save();

      return res.status(200).json({
        success: true,
        message:
          "Return marked as collected",
        order,
      });
    } catch (error) {
      console.error(
        "Mark Return Collected Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to mark return as collected",
      });
    }
  };

// =========================================================
// ADMIN — COMPLETE RETURN
// =========================================================

export const completeReturn =
  async (
    req,
    res
  ) => {
    try {
      const { orderId } =
        req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          orderId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid order ID",
        });
      }

      const order =
        await Order.findById(
          orderId
        );

      if (!order) {
        return res.status(404).json({
          success: false,
          message:
            "Order not found",
        });
      }

      if (
        order.returnStatus !==
        "collected"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Return must be collected before completion",
        });
      }

      // =====================================================
      // RESTORE PRODUCT STOCK ONLY AFTER COLLECTION
      // =====================================================

      for (const item of order.items) {
        if (
          !item.productId ||
          !item.variantId
        ) {
          continue;
        }

        const product =
          await Product.findOne({
            _id:
              item.productId,

            isDeleted:
              false,
          });

        if (!product) {
          continue;
        }

        const variant =
          product.variants.id(
            item.variantId
          );

        if (!variant) {
          continue;
        }

        variant.stock +=
          Number(
            item.quantity || 0
          );

        await product.save();
      }

      order.returnStatus =
        "completed";

      order.returnedAt =
        new Date();

      order.status =
        "returned";

      await order.save();

      return res.status(200).json({
        success: true,
        message:
          "Return completed successfully",
        order,
      });
    } catch (error) {
      console.error(
        "Complete Return Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to complete return",
      });
    }
  };