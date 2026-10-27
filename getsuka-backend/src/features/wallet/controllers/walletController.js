import mongoose from "mongoose";

import Wallet from "../models/wallet.js";

// =========================================================
// GET USER WALLET
// =========================================================

export const getWallet = async (
  req,
  res
) => {
  try {
    const userId =
      req.user.userId;

    let wallet =
      await Wallet.findOne({
        userId,
      });

    // -------------------------------------------------------
    // CREATE WALLET IF IT DOES NOT EXIST
    // -------------------------------------------------------

    if (!wallet) {
      try {
        wallet = await Wallet.create({
          userId,
          balance: 0,
          transactions: [],
        });
      } catch (createErr) {
        if (createErr.code === 11000) {
          wallet = await Wallet.findOne({ userId });
        } else {
          throw createErr;
        }
      }
    }

    return res.status(200).json({
      success: true,

      wallet: {
        _id: wallet._id,
        userId: wallet.userId,
        balance: wallet.balance,
        transactions:
          wallet.transactions,
        createdAt:
          wallet.createdAt,
        updatedAt:
          wallet.updatedAt,
      },
    });
  } catch (error) {
    console.error(
      "Get Wallet Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to get wallet",
    });
  }
};

// =========================================================
// GET WALLET TRANSACTIONS
// =========================================================

export const getWalletTransactions =
  async (
    req,
    res
  ) => {
    try {
      const userId =
        req.user.userId;
      const userObjectId =
        new mongoose.Types.ObjectId(userId);

      const page = Math.max(
        parseInt(req.query.page, 10) || 1,
        1
      );

      const limit = Math.min(
        Math.max(parseInt(req.query.limit, 10) || 10, 1),
        100
      );

      const skip = (page - 1) * limit;

      // -----------------------------------------------------
      // PIPELINE: REVERSE & SLICE EMBEDDED TRANSACTIONS IN DB
      // -----------------------------------------------------
      const pipeline = [
        {
          $match: {
            userId: userObjectId,
          },
        },
        {
          $project: {
            balance: 1,
            totalTransactions: {
              $size: {
                $ifNull: ["$transactions", []],
              },
            },
            transactions: {
              $slice: [
                {
                  $reverseArray: {
                    $ifNull: ["$transactions", []],
                  },
                },
                skip,
                limit,
              ],
            },
          },
        },
      ];

      let result =
        await Wallet.aggregate(pipeline);

      // -----------------------------------------------------
      // CREATE WALLET IF IT DOES NOT EXIST
      // -----------------------------------------------------
      if (!result || result.length === 0) {
        try {
          await Wallet.create({
            userId: userObjectId,
            balance: 0,
            transactions: [],
          });
        } catch (createErr) {
          if (createErr.code !== 11000) {
            throw createErr;
          }
        }

        result =
          await Wallet.aggregate(pipeline);
      }

      const walletData =
        result && result.length > 0
          ? result[0]
          : {
              balance: 0,
              totalTransactions: 0,
              transactions: [],
            };

      const totalTransactions =
        walletData.totalTransactions || 0;

      const totalPages = Math.ceil(
        totalTransactions / limit
      );

      const transactions =
        walletData.transactions || [];

      return res.status(200).json({
        success: true,

        balance:
          walletData.balance ?? 0,

        transactions,

        pagination: {
          currentPage: page,
          totalPages,
          totalTransactions,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
          hasPreviousPage: page > 1,
        },
      });
    } catch (error) {
      console.error(
        "Get Wallet Transactions Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to get wallet transactions",
      });
    }
  };

// =========================================================
// CREDIT WALLET (ATOMIC & CONCURRENCY SAFE)
// =========================================================
//
// Used for:
// 1. Razorpay wallet top-up
// 2. Order cancellation refund
// 3. Order return refund
// 4. Manual admin credit
// 5. Referral reward credit
//
// Guarantees:
// - Atomic $inc / $add with pipeline update.
// - Concurrency-safe balance calculation ($round to 2 decimals).
// - Subdocument transaction with accurate balanceAfterTransaction.
// - Strict idempotency for Razorpay top-ups and order refunds.
// =========================================================

export const creditWallet = async ({
  userId,
  amount,
  reason,
  description = "",
  orderId = null,
  orderItemId = null,
  refundOperationId = "",
  orderNumber = "",
  razorpayOrderId = "",
  razorpayPaymentId = "",
  preventDuplicate = false,
  session = null,
}) => {
  // -------------------------------------------------------
  // VALIDATE USER ID
  // -------------------------------------------------------

  if (
    !userId ||
    !mongoose.Types.ObjectId.isValid(userId)
  ) {
    throw new Error("Invalid user ID");
  }

  const userObjectId =
    userId instanceof mongoose.Types.ObjectId
      ? userId
      : new mongoose.Types.ObjectId(userId);

  // -------------------------------------------------------
  // VALIDATE AMOUNT
  // -------------------------------------------------------

  const creditAmount = Number(amount);

  if (
    !Number.isFinite(creditAmount) ||
    creditAmount <= 0
  ) {
    throw new Error("Invalid wallet credit amount");
  }

  // -------------------------------------------------------
  // VALIDATE CREDIT REASON
  // -------------------------------------------------------

  const allowedReasons = [
    "wallet_topup",
    "order_cancellation_refund",
    "order_return_refund",
    "manual_credit",
    "referral_reward",
  ];

  if (!allowedReasons.includes(reason)) {
    throw new Error("Invalid wallet credit reason");
  }

  // -------------------------------------------------------
  // ENSURE WALLET EXISTS
  // -------------------------------------------------------

  let wallet = await Wallet.findOne(
    { userId: userObjectId },
    null,
    session ? { session } : {}
  );

  if (!wallet) {
    try {
      const created = await Wallet.create(
        [{ userId: userObjectId, balance: 0, transactions: [] }],
        session ? { session } : {}
      );
      wallet = created[0];
    } catch (err) {
      if (err.code === 11000) {
        wallet = await Wallet.findOne(
          { userId },
          null,
          session ? { session } : {}
        );
      } else {
        throw err;
      }
    }
  }

  // -------------------------------------------------------
  // PREVENT DUPLICATE TOP-UP OR REFUND (IDEMPOTENCY)
  // -------------------------------------------------------

  const isTopupWithPaymentId =
    reason === "wallet_topup" && Boolean(razorpayPaymentId);

  const isRefundWithOrderId =
    (reason === "order_cancellation_refund" ||
      reason === "order_return_refund") &&
    Boolean(orderId);

  const shouldCheckDuplicate =
    isTopupWithPaymentId ||
    (isRefundWithOrderId &&
      (preventDuplicate || description || orderItemId || refundOperationId));

  if (shouldCheckDuplicate) {
    const existingWalletQuery = { userId };

    if (isTopupWithPaymentId) {
      existingWalletQuery["transactions.razorpayPaymentId"] =
        razorpayPaymentId;
    } else if (isRefundWithOrderId) {
      existingWalletQuery["transactions.orderId"] = orderId;
      existingWalletQuery["transactions.reason"] = reason;

      if (orderItemId && mongoose.Types.ObjectId.isValid(orderItemId)) {
        existingWalletQuery["transactions.orderItemId"] =
          new mongoose.Types.ObjectId(orderItemId);
      }
      if (refundOperationId) {
        existingWalletQuery["transactions.refundOperationId"] =
          refundOperationId;
      } else if (description && !orderItemId) {
        existingWalletQuery["transactions.description"] = description;
      }
    }

    const existingWallet = await Wallet.findOne(
      existingWalletQuery,
      null,
      session ? { session } : {}
    );

    if (existingWallet) {
      const existingTransaction =
        existingWallet.transactions.find((tx) => {
          if (isTopupWithPaymentId) {
            return (
              tx.razorpayPaymentId ===
              razorpayPaymentId
            );
          }
          if (isRefundWithOrderId) {
            const matchOrder =
              tx.orderId &&
              tx.orderId.toString() ===
                orderId.toString();
            const matchReason =
              tx.reason === reason;
            const matchItem = orderItemId
              ? tx.orderItemId &&
                tx.orderItemId.toString() === orderItemId.toString()
              : true;
            const matchOp = refundOperationId
              ? tx.refundOperationId === refundOperationId
              : true;
            const matchDesc = description && !orderItemId && !refundOperationId
              ? tx.description === description
              : true;
            return (
              matchOrder &&
              matchReason &&
              matchItem &&
              matchOp &&
              matchDesc
            );
          }
          return false;
        });

      return {
        wallet: existingWallet,
        transaction:
          existingTransaction || null,
        alreadyCredited: true,
      };
    }
  }

  // -------------------------------------------------------
  // BUILD ATOMIC TRANSACTION RECORD
  // -------------------------------------------------------

  const transactionId =
    new mongoose.Types.ObjectId();
  const now = new Date();

  const transactionData = {
    _id: transactionId,
    type: "credit",
    amount: creditAmount,
    reason,
    description: description || "",
    orderId:
      orderId &&
      mongoose.Types.ObjectId.isValid(orderId)
        ? new mongoose.Types.ObjectId(orderId)
        : null,
    orderItemId:
      orderItemId &&
      mongoose.Types.ObjectId.isValid(orderItemId)
        ? new mongoose.Types.ObjectId(orderItemId)
        : null,
    refundOperationId: refundOperationId || "",
    orderNumber: orderNumber || "",
    razorpayOrderId: razorpayOrderId || "",
    razorpayPaymentId: razorpayPaymentId || "",
    balanceAfterTransaction: {
      $round: [
        {
          $add: [
            { $ifNull: ["$balance", 0] },
            creditAmount,
          ],
        },
        2,
      ],
    },
    createdAt: now,
    updatedAt: now,
  };

  // -------------------------------------------------------
  // ATOMIC FILTER & UPDATE PIPELINE
  // -------------------------------------------------------

  const queryFilter = { userId: userObjectId };

  if (isTopupWithPaymentId) {
    queryFilter["transactions.razorpayPaymentId"] = {
      $ne: razorpayPaymentId,
    };
  } else if (
    isRefundWithOrderId &&
    (preventDuplicate || description || orderItemId || refundOperationId)
  ) {
    const elemMatch = {
      orderId: new mongoose.Types.ObjectId(orderId),
      reason,
    };
    if (orderItemId && mongoose.Types.ObjectId.isValid(orderItemId)) {
      elemMatch.orderItemId = new mongoose.Types.ObjectId(orderItemId);
    }
    if (refundOperationId) {
      elemMatch.refundOperationId = refundOperationId;
    } else if (description && !orderItemId) {
      elemMatch.description = description;
    }

    queryFilter.transactions = {
      $not: {
        $elemMatch: elemMatch,
      },
    };
  }

  const updatePipeline = [
    {
      $set: {
        userId: userObjectId,
        balance: {
          $round: [
            {
              $add: [
                { $ifNull: ["$balance", 0] },
                creditAmount,
              ],
            },
            2,
          ],
        },
        transactions: {
          $concatArrays: [
            { $ifNull: ["$transactions", []] },
            [transactionData],
          ],
        },
      },
    },
  ];

  const updateOptions = {
    returnDocument: "after",
    updatePipeline: true,
    ...(session ? { session } : {}),
  };

  const updatedWallet = await Wallet.findOneAndUpdate(
    queryFilter,
    updatePipeline,
    updateOptions
  );

  // -------------------------------------------------------
  // HANDLE RACE-CONDITION DUPLICATE FILTERING
  // -------------------------------------------------------

  if (!updatedWallet) {
    const existingWallet = await Wallet.findOne(
      { userId },
      null,
      session ? { session } : {}
    );

    if (existingWallet) {
      const existingTx =
        existingWallet.transactions.find((tx) => {
          if (isTopupWithPaymentId) {
            return (
              tx.razorpayPaymentId ===
              razorpayPaymentId
            );
          }
          if (isRefundWithOrderId) {
            const matchOrder =
              tx.orderId &&
              tx.orderId.toString() ===
                orderId.toString();
            const matchReason =
              tx.reason === reason;
            const matchItem = orderItemId
              ? tx.orderItemId &&
                tx.orderItemId.toString() === orderItemId.toString()
              : true;
            const matchOp = refundOperationId
              ? tx.refundOperationId === refundOperationId
              : true;
            const matchDesc = description && !orderItemId && !refundOperationId
              ? tx.description === description
              : true;
            return (
              matchOrder &&
              matchReason &&
              matchItem &&
              matchOp &&
              matchDesc
            );
          }
          return false;
        });

      return {
        wallet: existingWallet,
        transaction: existingTx || null,
        alreadyCredited: true,
      };
    }
  }

  const createdTransaction =
    updatedWallet.transactions.id
      ? updatedWallet.transactions.id(transactionId)
      : updatedWallet.transactions.find(
          (tx) =>
            tx._id.toString() ===
            transactionId.toString()
        );

  return {
    wallet: updatedWallet,
    transaction:
      createdTransaction ||
      updatedWallet.transactions[
        updatedWallet.transactions.length - 1
      ],
    alreadyCredited: false,
  };
};

// =========================================================
// DEBIT WALLET (ATOMIC & CONCURRENCY SAFE)
// =========================================================
//
// Used when wallet balance is used for an order payment.
//
// Guarantees:
// - Atomic $subtract with pipeline update.
// - Balance condition: balance >= debitAmount checked atomically.
// - Never creates negative balance under concurrent load.
// - Rejects with "Insufficient wallet balance" if funds unavailable.
// - Stores accurate balanceAfterTransaction in transaction subdoc.
// =========================================================

export const debitWallet = async ({
  userId,
  amount,
  reason = "wallet_payment",
  description = "",
  orderId = null,
  orderNumber = "",
  session = null,
}) => {
  // -------------------------------------------------------
  // VALIDATE USER ID
  // -------------------------------------------------------

  if (
    !userId ||
    !mongoose.Types.ObjectId.isValid(userId)
  ) {
    throw new Error("Invalid user ID");
  }

  const userObjectId =
    userId instanceof mongoose.Types.ObjectId
      ? userId
      : new mongoose.Types.ObjectId(userId);

  // -------------------------------------------------------
  // VALIDATE AMOUNT
  // -------------------------------------------------------

  const debitAmount = Number(amount);

  if (
    !Number.isFinite(debitAmount) ||
    debitAmount <= 0
  ) {
    throw new Error("Invalid wallet debit amount");
  }

  // -------------------------------------------------------
  // VALIDATE DEBIT REASON
  // -------------------------------------------------------

  const allowedReasons = [
    "wallet_payment",
    "manual_debit",
  ];

  if (!allowedReasons.includes(reason)) {
    throw new Error("Invalid wallet debit reason");
  }

  // -------------------------------------------------------
  // BUILD ATOMIC TRANSACTION RECORD
  // -------------------------------------------------------

  const transactionId =
    new mongoose.Types.ObjectId();
  const now = new Date();

  const transactionData = {
    _id: transactionId,
    type: "debit",
    amount: debitAmount,
    reason,
    description: description || "",
    orderId:
      orderId &&
      mongoose.Types.ObjectId.isValid(orderId)
        ? new mongoose.Types.ObjectId(orderId)
        : null,
    orderNumber: orderNumber || "",
    razorpayOrderId: "",
    razorpayPaymentId: "",
    balanceAfterTransaction: {
      $round: [
        {
          $subtract: ["$balance", debitAmount],
        },
        2,
      ],
    },
    createdAt: now,
    updatedAt: now,
  };

  // -------------------------------------------------------
  // ATOMIC UPDATE WITH BALANCE CHECK: balance >= debitAmount
  // -------------------------------------------------------

  const updatedWallet = await Wallet.findOneAndUpdate(
    {
      userId: userObjectId,
      balance: { $gte: debitAmount },
    },
    [
      {
        $set: {
          balance: {
            $round: [
              {
                $subtract: [
                  "$balance",
                  debitAmount,
                ],
              },
              2,
            ],
          },
          transactions: {
            $concatArrays: [
              { $ifNull: ["$transactions", []] },
              [transactionData],
            ],
          },
        },
      },
    ],
    {
      returnDocument: "after",
      updatePipeline: true,
      ...(session ? { session } : {}),
    }
  );

  // -------------------------------------------------------
  // HANDLE FAILURE
  // -------------------------------------------------------

  if (!updatedWallet) {
    const existingWallet = await Wallet.findOne(
      { userId },
      null,
      session ? { session } : {}
    );

    if (!existingWallet) {
      throw new Error("Wallet not found");
    }

    throw new Error("Insufficient wallet balance");
  }

  const createdTransaction =
    updatedWallet.transactions.id
      ? updatedWallet.transactions.id(transactionId)
      : updatedWallet.transactions.find(
          (tx) =>
            tx._id.toString() ===
            transactionId.toString()
        );

  return {
    wallet: updatedWallet,
    transaction:
      createdTransaction ||
      updatedWallet.transactions[
        updatedWallet.transactions.length - 1
      ],
    alreadyCredited: false,
  };
};