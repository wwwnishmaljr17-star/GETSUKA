import mongoose from "mongoose";

import Order from "../models/Order.js";
import Product from "../../product/models/Product.js";
import Address from "../../address/models/Address.js";
import Coupon from "../../coupon/models/Coupon.js";

import {
  creditWallet,
  debitWallet,
} from "../../wallet/controllers/walletController.js";

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
      "razorpay",
      "wallet",
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
    // COUPON / DISCOUNT
    // =======================================================

    let discount = 0;
    let appliedCoupon = null;

    const normalizedCouponCode =
      typeof couponCode === "string"
        ? couponCode.trim().toUpperCase()
        : "";

    if (normalizedCouponCode) {
      const coupon =
        await Coupon.findOne({
          code: normalizedCouponCode,
        });

      if (!coupon) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid coupon code",
        });
      }

      if (!coupon.isActive) {
        return res.status(400).json({
          success: false,
          message:
            "This coupon is inactive",
        });
      }

      const now =
        new Date();

      if (
        now <
        coupon.validFrom
      ) {
        return res.status(400).json({
          success: false,
          message:
            "This coupon is not active yet",
        });
      }

      if (
        now >
        coupon.validUntil
      ) {
        return res.status(400).json({
          success: false,
          message:
            "This coupon has expired",
        });
      }

      if (
        coupon.usageLimit !== null &&
        coupon.usedCount >=
          coupon.usageLimit
      ) {
        return res.status(400).json({
          success: false,
          message:
            "This coupon usage limit has been reached",
        });
      }

      if (
        coupon.oneUsePerUser
      ) {
        const previousCouponOrder =
          await Order.exists({
            userId,
            couponCode:
              normalizedCouponCode,
          });

        if (
          previousCouponOrder
        ) {
          return res.status(400).json({
            success: false,
            message:
              "You have already used this coupon",
          });
        }
      }

      if (
        subtotal <
        coupon.minOrderAmount
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Minimum order amount is ₹${coupon.minOrderAmount}`,
        });
      }

      if (
        coupon.discountType ===
        "percentage"
      ) {
        discount =
          (subtotal *
            coupon.discountValue) /
          100;

        if (
          coupon.maxDiscountAmount !==
            null &&
          discount >
            coupon.maxDiscountAmount
        ) {
          discount =
            coupon.maxDiscountAmount;
        }
      } else if (
        coupon.discountType ===
        "fixed"
      ) {
        discount =
          coupon.discountValue;
      }

      discount =
        Math.min(
          discount,
          subtotal
        );

      discount =
        Math.round(
          discount * 100
        ) / 100;

      appliedCoupon =
        coupon;
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
    // COD LIMIT
    // =======================================================

    const COD_LIMIT = 25000;

    if (
      paymentMethod === "cod" &&
      totalAmount > COD_LIMIT
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Cash on Delivery is available only for orders up to ₹25,000. Please choose an online payment method for this order.",
      });
    }

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
      paymentMethod === "razorpay" ||
      paymentMethod === "wallet"
        ? "paid"
        : "pending";

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
          normalizedCouponCode,

        paymentMethod,

        paymentStatus,

        status:
          "placed",

        returnStatus:
          "none",
      });

    // =======================================================
    // INCREMENT COUPON USAGE
    // =======================================================

    if (
      appliedCoupon
    ) {
      const usageFilter = {
        _id:
          appliedCoupon._id,

        isActive:
          true,
      };

      if (
        appliedCoupon.usageLimit !==
        null
      ) {
        usageFilter.usedCount = {
          $lt:
            appliedCoupon.usageLimit,
        };
      }

      const updatedCoupon =
        await Coupon.findOneAndUpdate(
          usageFilter,
          {
            $inc: {
              usedCount:
                1,
            },
          },
          {
            new: true,
          }
        );

      if (
        !updatedCoupon
      ) {
        await Order.deleteOne({
          _id:
            order._id,
        });

        return res.status(400).json({
          success: false,
          message:
            "This coupon usage limit has been reached. Please try again.",
        });
      }
    }

    // =======================================================
    // DEBIT WALLET FOR WALLET PAYMENT
    // =======================================================

    let walletDebitResult =
      null;

    if (
      paymentMethod ===
      "wallet"
    ) {
      try {
        walletDebitResult =
          await debitWallet({
            userId,

            amount:
              totalAmount,

            reason:
              "wallet_payment",

            description:
              `Payment for order ${orderNumber}`,

            orderId:
              order._id,

            orderNumber,
          });
      } catch (walletError) {
        await Order.deleteOne({
          _id:
            order._id,
        });

        if (
          appliedCoupon
        ) {
          await Coupon.findOneAndUpdate(
            {
              _id:
                appliedCoupon._id,

              usedCount: {
                $gt: 0,
              },
            },
            {
              $inc: {
                usedCount:
                  -1,
              },
            }
          );
        }

        return res.status(400).json({
          success: false,
          message:
            walletError.message ||
            "Insufficient wallet balance",
        });
      }
    }

    // =======================================================
    // DECREASE STOCK
    // =======================================================

    for (
      const item of
      orderItems
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
          _id:
            orderId,
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
          cancellationReason
        ).trim();

      if (!reason) {
        return res.status(400).json({
          success: false,
          message:
            "Cancellation reason is required",
        });
      }

      const order =
        await Order.findOne({
          _id:
            orderId,
          userId,
        });

      if (!order) {
        return res.status(404).json({
          success: false,
          message:
            "Order not found",
        });
      }

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

      const activeItems =
        order.items.filter(
          (item) =>
            (item.itemStatus ||
              "active") ===
            "active"
        );

      if (
        activeItems.length ===
        0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "All items in this order are already cancelled",
        });
      }

      // =====================================================
      // RESTORE STOCK
      // =====================================================

      for (
        const item of activeItems
      ) {
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
            item.quantity ||
              0
          );

        await product.save();
      }

      // =====================================================
      // REFUND PAID ORDER
      // =====================================================

      let refundResult =
        null;

      if (
        order.paymentStatus ===
          "paid" &&
        (
          order.paymentMethod ===
            "razorpay" ||
          order.paymentMethod ===
            "wallet"
        )
      ) {
        refundResult =
          await creditWallet({
            userId,

            amount:
              Number(
                order.totalAmount
              ) || 0,

            reason:
              "order_cancellation_refund",

            description:
              `Refund for cancelled order ${order.orderNumber}`,

            orderId:
              order._id,

            orderNumber:
              order.orderNumber,
          });

        order.paymentStatus =
          "refunded";
      }

      // =====================================================
      // MARK ITEMS CANCELLED
      // =====================================================

      const cancelledAt =
        new Date();

      order.items.forEach(
        (item) => {
          if (
            (item.itemStatus ||
              "active") ===
            "active"
          ) {
            item.itemStatus =
              "cancelled";

            item.cancellationReason =
              reason;

            item.cancelledAt =
              cancelledAt;

            if (
              refundResult
            ) {
              item.refundStatus =
                "refunded";

              item.refundedAmount =
                Number(
                  item.totalPrice
                ) || 0;
            }
          }
        }
      );

      // =====================================================
      // UPDATE ORDER
      // =====================================================

      order.status =
        "cancelled";

      order.cancellationReason =
        reason;

      order.cancelledAt =
        cancelledAt;

      await order.save();

      return res.status(200).json({
        success: true,

        message:
          refundResult
            ? "Order cancelled successfully and refund added to wallet"
            : "Order cancelled successfully",

        refund:
          refundResult
            ? {
                amount:
                  Number(
                    order.totalAmount
                  ) || 0,

                walletBalance:
                  refundResult.wallet
                    ?.balance ??
                  null,
              }
            : null,

        order,
      });
    } catch (error) {
      console.error(
        "Cancel User Order Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to cancel order",
      });
    }
  };

// =========================================================
// CANCEL USER ORDER ITEM
// =========================================================

export const cancelUserOrderItem =
  async (
    req,
    res
  ) => {
    try {
      const userId =
        req.user.userId;

      const {
        orderId,
        itemId,
      } = req.params;

      const {
        cancellationReason = "",
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

      if (
        !mongoose.Types.ObjectId.isValid(
          itemId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid order item ID",
        });
      }

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

      const order =
        await Order.findOne({
          _id:
            orderId,
          userId,
        });

      if (!order) {
        return res.status(404).json({
          success: false,
          message:
            "Order not found",
        });
      }

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

      const item =
        order.items.id(itemId);

      if (!item) {
        return res.status(404).json({
          success: false,
          message:
            "Order item not found",
        });
      }

      if (
        (item.itemStatus ||
          "active") ===
        "cancelled"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "This item is already cancelled",
        });
      }

      // =====================================================
      // RESTORE ITEM STOCK
      // =====================================================

      if (
        item.productId &&
        item.variantId
      ) {
        const product =
          await Product.findOne({
            _id:
              item.productId,

            isDeleted:
              false,
          });

        if (!product) {
          return res.status(404).json({
            success: false,
            message:
              "Product for this order item no longer exists",
          });
        }

        const variant =
          product.variants.id(
            item.variantId
          );

        if (!variant) {
          return res.status(404).json({
            success: false,
            message:
              "Variant for this order item no longer exists",
          });
        }

        variant.stock +=
          Number(
            item.quantity ||
              0
          );

        await product.save();
      }

      // =====================================================
      // CALCULATE ITEM REFUND
      // =====================================================
      //
      // The cancelled item's share of the order-level coupon
      // discount is removed from its refund amount.
      //
      // Example:
      // Item = ₹5,000
      // Coupon discount allocated to item = ₹500
      // Refund = ₹4,500
      //
      // COD orders do not receive a wallet refund here.
      // =====================================================

      let refundAmount =
        Number(
          item.totalPrice
        ) || 0;

      if (
        order.paymentStatus ===
          "paid" &&
        (
          order.paymentMethod ===
            "razorpay" ||
          order.paymentMethod ===
            "wallet"
        )
      ) {
        if (
          Number(order.discount) >
            0 &&
          Number(order.subtotal) >
            0
        ) {
          const itemDiscount =
            (refundAmount /
              Number(
                order.subtotal
              )) *
            Number(
              order.discount
            );

          refundAmount =
            Math.max(
              0,
              refundAmount -
                itemDiscount
            );
        }

        refundAmount =
          Math.round(
            refundAmount * 100
          ) / 100;
      } else {
        refundAmount = 0;
      }

      // =====================================================
      // REFUND ITEM TO WALLET
      // =====================================================

      let refundResult =
        null;

      if (
        refundAmount > 0
      ) {
        refundResult =
          await creditWallet({
            userId,

            amount:
              refundAmount,

            reason:
              "order_cancellation_refund",

            description:
              `Refund for cancelled item ${item.productName} from order ${order.orderNumber}`,

            orderId:
              order._id,

            orderNumber:
              order.orderNumber,
          });
      }

      // =====================================================
      // MARK ITEM AS CANCELLED BY USER
      // =====================================================

      item.itemStatus =
        "cancelled";

      item.cancellationReason =
        reason;

      item.cancelledAt =
        new Date();

      if (refundResult) {
        item.refundStatus =
          "refunded";

        item.refundedAmount =
          refundAmount;
      }

      // =====================================================
      // RECALCULATE REMAINING ORDER TOTAL
      // =====================================================
      //
      // The cancelled item stays inside order.items so the
      // admin/user can see exactly which product was cancelled.
      //
      // Only ACTIVE items are included in the new subtotal.
      // The order-level coupon discount is allocated across
      // the remaining active items proportionally.
      //
      // If every item is cancelled:
      //   subtotal       = 0
      //   discount       = 0
      //   shippingCharge = 0
      //   totalAmount    = 0
      //   status         = cancelled
      //
      // This makes the admin order summary show the actual
      // remaining payable amount.
      // =====================================================

      const remainingActiveItems =
        order.items.filter(
          (orderItem) =>
            (orderItem.itemStatus ||
              "active") ===
            "active"
        );

      const remainingSubtotal =
        remainingActiveItems.reduce(
          (
            sum,
            orderItem
          ) =>
            sum +
            (Number(
              orderItem.totalPrice
            ) || 0),
          0
        );

      const originalSubtotal =
        Number(
          order.subtotal
        ) || 0;

      const originalDiscount =
        Number(
          order.discount
        ) || 0;

      let remainingDiscount =
        0;

      if (
        remainingSubtotal > 0 &&
        originalSubtotal > 0 &&
        originalDiscount > 0
      ) {
        remainingDiscount =
          (
            remainingSubtotal /
            originalSubtotal
          ) *
          originalDiscount;

        remainingDiscount =
          Math.min(
            remainingDiscount,
            remainingSubtotal
          );

        remainingDiscount =
          Math.round(
            remainingDiscount * 100
          ) / 100;
      }

      if (
        remainingActiveItems.length ===
        0
      ) {
        order.subtotal =
          0;

        order.discount =
          0;

        order.shippingCharge =
          0;

        order.tax =
          0;

        order.totalAmount =
          0;

        order.status =
          "cancelled";

        order.cancellationReason =
          reason;

        order.cancelledAt =
          new Date();

        if (
          order.paymentStatus ===
            "paid" &&
          (
            order.paymentMethod ===
              "razorpay" ||
            order.paymentMethod ===
              "wallet"
          )
        ) {
          order.paymentStatus =
            "refunded";
        }
      } else {
        const remainingShippingCharge =
          Number(
            order.shippingCharge
          ) || 0;

        const remainingTax =
          Number(
            order.tax
          ) || 0;

        order.subtotal =
          Math.round(
            remainingSubtotal * 100
          ) / 100;

        order.discount =
          remainingDiscount;

        order.shippingCharge =
          remainingShippingCharge;

        order.tax =
          remainingTax;

        order.totalAmount =
          Math.max(
            0,
            Math.round(
              (
                order.subtotal -
                order.discount +
                order.tax +
                order.shippingCharge
              ) * 100
            ) / 100
          );
      }

      await order.save();

      // =====================================================
      // RESPONSE
      // =====================================================

      return res.status(200).json({
        success: true,

        message:
          refundResult
            ? "Item cancelled successfully and refund added to wallet"
            : "Item cancelled successfully",

        refund:
          refundResult
            ? {
                amount:
                  refundAmount,

                walletBalance:
                  refundResult.wallet
                    ?.balance ??
                  null,
              }
            : null,

        order,
      });
    } catch (error) {
      console.error(
        "Cancel User Order Item Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to cancel order item",
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
          returnReason
        ).trim();

      if (!reason) {
        return res.status(400).json({
          success: false,
          message:
            "Return reason is required",
        });
      }

      const order =
        await Order.findOne({
          _id:
            orderId,
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
      // RETURN ONLY AFTER DELIVERY
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
      // ONLY ONE RETURN REQUEST
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
      // 3-DAY RETURN WINDOW
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

      // Order itself stays DELIVERED.
      // Only returnStatus changes.

      await order.save();

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
        sort ===
        "oldest"
      ) {
        sortOption = {
          createdAt: 1,
        };
      }

      if (
        sort ===
        "amount-high"
      ) {
        sortOption = {
          totalAmount: -1,
        };
      }

      if (
        sort ===
        "amount-low"
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
          .sort(
            sortOption
          )
          .skip(skip)
          .limit(perPage)
          .lean(),

        Order.countDocuments(
          filter
        ),
      ]);

      const totalPages =
        Math.ceil(
          totalOrders /
            perPage
        );

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
      // STRICT FORWARD-ONLY ORDER FLOW
      // =====================================================
      //
      // placed
      //   ├── confirmed
      //   └── cancelled
      //
      // confirmed
      //   ├── shipped
      //   └── cancelled
      //
      // shipped
      //   └── out_for_delivery
      //
      // out_for_delivery
      //   └── delivered
      //
      // delivered / cancelled / returned
      //   └── no further admin status changes
      //
      // =====================================================

      const nextStatuses = {
        placed: [
          "confirmed",
          "cancelled",
        ],

        confirmed: [
          "shipped",
          "cancelled",
        ],

        shipped: [
          "out_for_delivery",
        ],

        out_for_delivery: [
          "delivered",
        ],

        delivered: [],

        cancelled: [],

        returned: [],
      };

      const currentStatus =
        order.status;

      const allowedNextStatuses =
        nextStatuses[
          currentStatus
        ] || [];

      if (
        !allowedNextStatuses.includes(
          status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Invalid order status transition: ${currentStatus.replace(
              /_/g,
              " "
            )} → ${status.replace(
              /_/g,
              " "
            )}.`,
        });
      }

      // =====================================================
      // UPDATE STATUS
      // =====================================================

      order.status =
        status;

      // =====================================================
      // DELIVERY DATE
      // =====================================================

      if (
        status ===
        "delivered"
      ) {
        order.deliveredAt =
          new Date();

        // COD is considered paid when delivery is completed.
        if (
          order.paymentMethod ===
          "cod"
        ) {
          order.paymentStatus =
            "paid";
        }
      }

      // =====================================================
      // ONLINE PAYMENT STATUS
      // =====================================================

      if (
        status ===
          "delivered" &&
        (
          order.paymentMethod ===
            "razorpay" ||
          order.paymentMethod ===
            "wallet"
        )
      ) {
        order.paymentStatus =
          "paid";
      }

      // =====================================================
      // ADMIN CANCELLATION
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

        // Refund only if the order was already paid.
        // COD stays pending if cancelled before delivery.
        if (
          order.paymentStatus ===
            "paid" &&
          (
            order.paymentMethod ===
              "razorpay" ||
            order.paymentMethod ===
              "wallet"
          )
        ) {
          await creditWallet({
            userId:
              order.userId,

            amount:
              Number(
                order.totalAmount
              ) || 0,

            reason:
              "order_cancellation_refund",

            description:
              `Refund for admin-cancelled order ${order.orderNumber}`,

            orderId:
              order._id,

            orderNumber:
              order.orderNumber,
          });

          order.paymentStatus =
            "refunded";
        }
      }

      await order.save();

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

      // Return request can only belong to a delivered order.
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

      // Admin can approve ONLY while request is pending.
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

      // Admin can reject ONLY while request is pending.
      // Once approved/pickup starts, reject is impossible.
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

      // Pickup can start only after admin approval.
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
// ADMIN — MARK RETURN COLLECTED / PICKED UP
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

      // =====================================================
      // ONLY COLLECTION_PENDING CAN BE COLLECTED
      // =====================================================

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

      // =====================================================
      // FIND ONLY ELIGIBLE RETURN ITEMS
      // =====================================================
      //
      // Cancelled items are NOT returned.
      // Already refunded items are NOT returned again.
      //
      // Example:
      //
      // Product A
      // ₹1000
      // cancelled + refunded
      //
      // Product B
      // ₹1500
      // active
      //
      // RETURN REFUND = ₹1500
      // NOT ₹2500
      // =====================================================

      const returnItems =
        order.items.filter(
          (item) => {
            const itemStatus =
              item.itemStatus ||
              "active";

            const refundStatus =
              item.refundStatus ||
              "none";

            return (
              itemStatus ===
                "active" &&
              refundStatus !==
                "refunded"
            );
          }
        );

      if (
        returnItems.length ===
        0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "No eligible items are available for return",
        });
      }

      // =====================================================
      // CALCULATE RETURN SUBTOTAL
      // =====================================================

      const returnSubtotal =
        returnItems.reduce(
          (
            total,
            item
          ) => {
            return (
              total +
              (
                Number(
                  item.totalPrice
                ) || 0
              )
            );
          },
          0
        );

      if (
        returnSubtotal <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "No refundable amount found for returned items",
        });
      }

      // =====================================================
      // CALCULATE PROPORTIONAL DISCOUNT
      // =====================================================

      const originalSubtotal =
        Number(
          order.subtotal
        ) || 0;

      const originalDiscount =
        Number(
          order.discount
        ) || 0;

      let returnDiscount =
        0;

      if (
        returnSubtotal > 0 &&
        originalSubtotal > 0 &&
        originalDiscount > 0
      ) {
        returnDiscount =
          (
            returnSubtotal /
            originalSubtotal
          ) *
          originalDiscount;

        returnDiscount =
          Math.min(
            returnDiscount,
            returnSubtotal
          );

        returnDiscount =
          Math.round(
            returnDiscount *
              100
          ) / 100;
      }

      // =====================================================
      // FINAL REFUND AMOUNT
      // =====================================================

      const returnRefundAmount =
        Math.max(
          0,
          Math.round(
            (
              returnSubtotal -
              returnDiscount
            ) * 100
          ) / 100
        );

      if (
        returnRefundAmount <=
        0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Refund amount is zero",
        });
      }

      // =====================================================
      // MARK RETURN AS COLLECTED
      // =====================================================

      order.returnStatus =
        "collected";

      order.returnCollectedAt =
        new Date();

      // =====================================================
      // REFUND ONLY AFTER PICKUP
      // =====================================================

      let refundResult =
        null;

      if (
        order.paymentStatus ===
          "paid" &&
        (
          order.paymentMethod ===
            "razorpay" ||
          order.paymentMethod ===
            "wallet" ||
          order.paymentMethod ===
            "cod"
        )
      ) {
        refundResult =
          await creditWallet({
            userId:
              order.userId,

            amount:
              returnRefundAmount,

            reason:
              "order_return_refund",

            description:
              `Refund for returned items from order ${order.orderNumber}`,

            orderId:
              order._id,

            orderNumber:
              order.orderNumber,
          });

        // ===================================================
        // MARK ONLY RETURNED ITEMS AS REFUNDED
        // ===================================================

        returnItems.forEach(
          (item) => {
            const itemAmount =
              Number(
                item.totalPrice
              ) || 0;

            let itemDiscount =
              0;

            if (
              returnSubtotal >
                0 &&
              returnDiscount >
                0
            ) {
              itemDiscount =
                (
                  itemAmount /
                  returnSubtotal
                ) *
                returnDiscount;
            }

            const itemRefund =
              Math.max(
                0,
                Math.round(
                  (
                    itemAmount -
                    itemDiscount
                  ) * 100
                ) / 100
              );

            item.refundStatus =
              "refunded";

            item.refundedAmount =
              itemRefund;
          }
        );

        // ===================================================
        // MARK ORDER PAYMENT AS REFUNDED
        // ONLY WHEN ALL ELIGIBLE MONEY HAS BEEN REFUNDED
        // ===================================================

        const hasUnrefundedItems =
          order.items.some(
            (item) => {
              const itemStatus =
                item.itemStatus ||
                "active";

              const refundStatus =
                item.refundStatus ||
                "none";

              return (
                itemStatus ===
                  "active" &&
                refundStatus !==
                  "refunded"
              );
            }
          );

        if (
          !hasUnrefundedItems
        ) {
          order.paymentStatus =
            "refunded";
        }
      }

      // =====================================================
      // SAVE
      // =====================================================

      await order.save();

      // =====================================================
      // RESPONSE
      // =====================================================

      return res.status(200).json({
        success: true,

        message:
          refundResult
            ? "Return collected and refund added to wallet"
            : "Return collected successfully",

        refund:
          refundResult
            ? {
                amount:
                  returnRefundAmount,

                walletBalance:
                  refundResult
                    .wallet
                    ?.balance ??
                  null,
              }
            : null,

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
          error.message ||
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

      // Complete only after pickup.
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
      // RESTORE PRODUCT STOCK
      // =====================================================

      for (
        const item of
        order.items
      ) {
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
            item.quantity ||
              0
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

  // =========================================================
// ADMIN — GET ALL RETURN REQUESTS
// =========================================================

export const getAdminReturns = async (
  req,
  res
) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status = "",
      sort = "newest",
    } = req.query;

    const currentPage = Math.max(
      Number.parseInt(page, 10) || 1,
      1
    );

    const perPage = Math.min(
      Math.max(
        Number.parseInt(limit, 10) || 10,
        1
      ),
      100
    );

    const skip =
      (currentPage - 1) * perPage;

    // =======================================================
    // BASE FILTER
    // =======================================================

    const filter = {
      returnStatus: {
        $nin: ["none", null],
      },
    };

    // =======================================================
    // RETURN STATUS FILTER
    // =======================================================

    const allowedReturnStatuses = [
      "pending",
      "approved",
      "rejected",
      "collection_pending",
      "collected",
      "completed",
    ];

    if (
      status &&
      allowedReturnStatuses.includes(status)
    ) {
      filter.returnStatus = status;
    }

    // =======================================================
    // SEARCH
    // =======================================================

    const trimmedSearch =
      String(search || "").trim();

    if (trimmedSearch) {
      const searchRegex = new RegExp(
        trimmedSearch.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        ),
        "i"
      );

      filter.$or = [
        {
          orderNumber: searchRegex,
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
          returnReason: searchRegex,
        },
        {
          "items.productName":
            searchRegex,
        },
      ];
    }

    // =======================================================
    // SORT
    // =======================================================

    const sortOption =
      sort === "oldest"
        ? {
            returnRequestedAt: 1,
          }
        : {
            returnRequestedAt: -1,
          };

    // =======================================================
    // FETCH RETURNS + COUNT
    // =======================================================

    const [
      orders,
      totalReturns,
    ] = await Promise.all([
      Order.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(perPage)
        .lean(),

      Order.countDocuments(filter),
    ]);

    // =======================================================
    // PAGINATION
    // =======================================================

    const totalPages =
      Math.ceil(
        totalReturns / perPage
      );

    // =======================================================
    // FORMAT RESPONSE
    // =======================================================

    const returns = orders.map(
      (order) => ({
        _id: order._id,

        orderNumber:
          order.orderNumber,

        userId:
          order.userId,

        customer: {
          name:
            order.shippingAddress
              ?.fullName ||
            "Unknown Customer",

          phone:
            order.shippingAddress
              ?.phone ||
            "—",
        },

        items:
          order.items || [],

        totalAmount:
          order.totalAmount || 0,

        paymentMethod:
          order.paymentMethod || "",

        paymentStatus:
          order.paymentStatus || "",

        orderStatus:
          order.status || "",

        returnStatus:
          order.returnStatus || "none",

        returnReason:
          order.returnReason || "",

        returnRequestedAt:
          order.returnRequestedAt ||
          null,

        returnApprovedAt:
          order.returnApprovedAt ||
          null,

        returnRejectedAt:
          order.returnRejectedAt ||
          null,

        returnRejectionReason:
          order.returnRejectionReason ||
          "",

        returnCollectionRequestedAt:
          order.returnCollectionRequestedAt ||
          null,

        returnCollectedAt:
          order.returnCollectedAt ||
          null,

        returnedAt:
          order.returnedAt ||
          null,

        createdAt:
          order.createdAt,

        updatedAt:
          order.updatedAt,
      })
    );

    // =======================================================
    // RESPONSE
    // =======================================================

    return res.status(200).json({
      success: true,

      returns,

      pagination: {
        currentPage,

        totalPages,

        totalReturns,

        limit:
          perPage,
      },
    });
  } catch (error) {
    console.error(
      "Get Admin Returns Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch return requests",
    });
  }
};