import test from "node:test";
import assert from "node:assert/strict";

// Pure calculation logic extracted for invoice generation
export function calculateInvoiceFinancials(order) {
  const items = Array.isArray(order?.items) ? order.items : [];

  const calculatedItemsSubtotal = items.reduce((sum, item) => {
    const p = Number(item?.price || 0);
    const q = Number(item?.quantity || 1);
    return sum + (Number(item?.totalPrice) || (p * q));
  }, 0);

  const originalSubtotal =
    order?.originalSubtotal != null && Number(order.originalSubtotal) > 0
      ? Number(order.originalSubtotal)
      : (calculatedItemsSubtotal > 0 ? calculatedItemsSubtotal : Number(order?.subtotal || 0));

  const originalDiscount =
    order?.originalDiscount != null
      ? Number(order.originalDiscount)
      : Number(order?.discount || 0);

  const shippingCharge = Number(order?.shippingCharge || 0);
  const isExpress = order?.deliveryMethod === "express" || shippingCharge === 149;
  const nonRefundableShipping = isExpress ? shippingCharge : 0;
  const tax = Number(order?.tax || 0);

  const originalTotalAmount =
    order?.originalTotalAmount != null && Number(order.originalTotalAmount) > 0
      ? Number(order.originalTotalAmount)
      : (order?.totalAmount != null && order?.totalRefundedAmount != null && Number(order.totalRefundedAmount) > 0
          ? Number(order.totalAmount) + Number(order.totalRefundedAmount)
          : Math.max(0, originalSubtotal - originalDiscount + shippingCharge + tax));

  const isCod = order?.paymentMethod === "cod";
  const isUnpaidCod = isCod && order?.paymentStatus !== "paid" && order?.status !== "delivered" && order?.status !== "returned";

  const processedItems = items.map((item, index) => {
    const originalQty = Math.max(1, Number(item?.quantity || 1));
    const isItemCancelled = (item?.itemStatus || "active") === "cancelled";
    const isItemCompletedReturn = item?.returnStatus === "completed";

    const cancelledQty = Math.min(
      originalQty,
      Math.max(0, Number(item?.cancelledQuantity != null ? item.cancelledQuantity : (isItemCancelled ? originalQty : 0)))
    );

    const returnedQty = Math.min(
      originalQty - cancelledQty,
      Math.max(0, Number(item?.returnedQuantity != null ? item.returnedQuantity : (isItemCompletedReturn ? originalQty : 0)))
    );

    const retainedQty = Math.max(0, originalQty - cancelledQty - returnedQty);
    const unitPrice = Number(item?.price || 0);
    const originalItemAmount = Number(item?.totalPrice) || (unitPrice * originalQty);

    let discountShare = 0;
    if (item?.discountShare != null && Number(item.discountShare) > 0) {
      discountShare = Number(item.discountShare);
    } else if (originalDiscount > 0 && originalSubtotal > 0) {
      discountShare = Math.round(((originalItemAmount / originalSubtotal) * originalDiscount) * 100) / 100;
    }

    let itemRefund = 0;
    if (!isUnpaidCod) {
      if (Number(item?.refundedAmount || 0) > 0) {
        itemRefund = Number(item.refundedAmount);
      } else if (cancelledQty > 0 || returnedQty > 0) {
        const nonRetainedQty = cancelledQty + returnedQty;
        const unitDiscount = originalQty > 0 ? (discountShare / originalQty) : 0;
        itemRefund = Math.max(
          0,
          Math.round(((unitPrice * nonRetainedQty) - (unitDiscount * nonRetainedQty)) * 100) / 100
        );
      }
    }

    const itemNetRetained = Math.max(
      0,
      Math.round((originalItemAmount - (retainedQty === 0 ? discountShare : (discountShare * (retainedQty / originalQty))) - itemRefund) * 100) / 100
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
      isPartiallyModified: (cancelledQty > 0 || returnedQty > 0) && retainedQty > 0,
    };
  });

  const backendRefundAmount = Number(order?.totalRefundedAmount || 0);
  const itemRefundSum = processedItems.reduce((acc, it) => acc + it.itemRefund, 0);

  let totalRefunded = isUnpaidCod ? 0 : Math.max(backendRefundAmount, itemRefundSum);

  const maxRefundable = Math.max(0, originalTotalAmount - nonRefundableShipping);
  if (!isUnpaidCod && totalRefunded === 0) {
    if (order?.paymentStatus === "refunded" || (order?.status === "cancelled" && (order?.paymentStatus === "paid" || order?.paymentMethod === "razorpay" || order?.paymentMethod === "wallet"))) {
      totalRefunded = maxRefundable;
    }
  }

  totalRefunded = Math.min(totalRefunded, maxRefundable);
  totalRefunded = Math.round(totalRefunded * 100) / 100;

  let netRetainedOrderValue = Math.max(0, Math.round((originalTotalAmount - totalRefunded) * 100) / 100);

  const allItemsNonRetained =
    processedItems.length > 0 &&
    processedItems.every((it) => it.retainedQty === 0);

  if (allItemsNonRetained) {
    netRetainedOrderValue = isUnpaidCod ? 0 : nonRefundableShipping;
  }

  let invoiceStatus = "PAID";
  if (isUnpaidCod) {
    if (order?.status === "cancelled" || allItemsNonRetained) {
      invoiceStatus = "CANCELLED (UNPAID)";
    } else {
      invoiceStatus = "COD PENDING";
    }
  } else {
    if (
      order?.paymentStatus === "refunded" ||
      (allItemsNonRetained && totalRefunded >= maxRefundable) ||
      (order?.status === "cancelled" && totalRefunded > 0)
    ) {
      invoiceStatus = "REFUNDED";
    } else if (totalRefunded > 0) {
      invoiceStatus = "PARTIALLY REFUNDED";
    } else if (order?.status === "cancelled") {
      invoiceStatus = "CANCELLED";
    } else if (order?.paymentStatus === "paid") {
      invoiceStatus = "PAID";
    } else {
      invoiceStatus = "PAYMENT PENDING";
    }
  }

  return {
    originalSubtotal,
    originalDiscount,
    shippingCharge,
    isExpress,
    nonRefundableShipping,
    tax,
    originalTotalAmount,
    totalRefunded,
    netRetainedOrderValue,
    invoiceStatus,
    processedItems,
    allItemsNonRetained,
    isUnpaidCod,
  };
}

test("Invoice Calculations Test Suite", async (t) => {
  await t.test("1. Normal paid order with no refunds", () => {
    const order = {
      orderNumber: "ORD-1001",
      subtotal: 3000,
      originalSubtotal: 3000,
      discount: 300,
      originalDiscount: 300,
      shippingCharge: 0,
      deliveryMethod: "standard",
      totalAmount: 2700,
      originalTotalAmount: 2700,
      totalRefundedAmount: 0,
      paymentMethod: "razorpay",
      paymentStatus: "paid",
      status: "delivered",
      items: [
        { productName: "Gojo Tee", price: 1500, quantity: 2, itemStatus: "active" }
      ]
    };
    const res = calculateInvoiceFinancials(order);
    assert.equal(res.originalSubtotal, 3000);
    assert.equal(res.originalDiscount, 300);
    assert.equal(res.originalTotalAmount, 2700);
    assert.equal(res.totalRefunded, 0);
    assert.equal(res.netRetainedOrderValue, 2700);
    assert.equal(res.invoiceStatus, "PAID");
    assert.equal(res.processedItems[0].retainedQty, 2);
  });

  await t.test("2. Partially refunded order matching screenshot example (₹10,536 - ₹5,536 = ₹5,000)", () => {
    const order = {
      orderNumber: "ORD-SCREENSHOT",
      subtotal: 5000,
      originalSubtotal: 11000,
      discount: 0,
      originalDiscount: 464,
      shippingCharge: 0,
      deliveryMethod: "standard",
      totalAmount: 5000,
      originalTotalAmount: 10536,
      totalRefundedAmount: 5536,
      paymentMethod: "razorpay",
      paymentStatus: "paid",
      status: "confirmed",
      items: [
        { productName: "Sukuna Hoodie", price: 5536, quantity: 1, itemStatus: "cancelled", cancelledQuantity: 1, refundedAmount: 5536 },
        { productName: "Luffy Jacket", price: 5000, quantity: 1, itemStatus: "active", cancelledQuantity: 0, refundedAmount: 0 }
      ]
    };
    const res = calculateInvoiceFinancials(order);
    assert.equal(res.originalTotalAmount, 10536);
    assert.equal(res.totalRefunded, 5536);
    assert.equal(res.netRetainedOrderValue, 5000);
    assert.equal(res.invoiceStatus, "PARTIALLY REFUNDED");
    assert.equal(res.processedItems[0].retainedQty, 0);
    assert.equal(res.processedItems[1].retainedQty, 1);
  });

  await t.test("3. Order with multiple cancelled items", () => {
    const order = {
      orderNumber: "ORD-MULTI-CANCEL",
      subtotal: 2000,
      originalSubtotal: 7000,
      discount: 0,
      originalDiscount: 500,
      shippingCharge: 0,
      deliveryMethod: "standard",
      totalAmount: 2000,
      originalTotalAmount: 6500,
      totalRefundedAmount: 4500,
      paymentMethod: "wallet",
      paymentStatus: "paid",
      status: "confirmed",
      items: [
        { productName: "Item A", price: 2000, quantity: 1, itemStatus: "cancelled", cancelledQuantity: 1, refundedAmount: 2000 },
        { productName: "Item B", price: 2500, quantity: 1, itemStatus: "cancelled", cancelledQuantity: 1, refundedAmount: 2500 },
        { productName: "Item C", price: 2000, quantity: 1, itemStatus: "active", cancelledQuantity: 0, refundedAmount: 0 }
      ]
    };
    const res = calculateInvoiceFinancials(order);
    assert.equal(res.originalTotalAmount, 6500);
    assert.equal(res.totalRefunded, 4500);
    assert.equal(res.netRetainedOrderValue, 2000);
    assert.equal(res.invoiceStatus, "PARTIALLY REFUNDED");
  });

  await t.test("4. Order with partially returned quantity (2 ordered, 1 returned)", () => {
    const order = {
      orderNumber: "ORD-PARTIAL-RETURN",
      subtotal: 1000,
      originalSubtotal: 2000,
      discount: 0,
      shippingCharge: 0,
      deliveryMethod: "standard",
      totalAmount: 1000,
      originalTotalAmount: 2000,
      totalRefundedAmount: 1000,
      paymentMethod: "razorpay",
      paymentStatus: "paid",
      status: "delivered",
      items: [
        {
          productName: "Zoro Kimono",
          price: 1000,
          quantity: 2,
          itemStatus: "active",
          returnedQuantity: 1,
          returnStatus: "completed",
          refundedAmount: 1000
        }
      ]
    };
    const res = calculateInvoiceFinancials(order);
    assert.equal(res.originalTotalAmount, 2000);
    assert.equal(res.totalRefunded, 1000);
    assert.equal(res.netRetainedOrderValue, 1000);
    assert.equal(res.invoiceStatus, "PARTIALLY REFUNDED");
    assert.equal(res.processedItems[0].originalQty, 2);
    assert.equal(res.processedItems[0].returnedQty, 1);
    assert.equal(res.processedItems[0].retainedQty, 1);
  });

  await t.test("5. Fully cancelled / fully refunded order on standard delivery", () => {
    const order = {
      orderNumber: "ORD-FULL-CANCEL",
      subtotal: 0,
      originalSubtotal: 4000,
      discount: 0,
      shippingCharge: 0,
      deliveryMethod: "standard",
      totalAmount: 0,
      originalTotalAmount: 4000,
      totalRefundedAmount: 4000,
      paymentMethod: "razorpay",
      paymentStatus: "refunded",
      status: "cancelled",
      items: [
        { productName: "Tanjiro Haori", price: 4000, quantity: 1, itemStatus: "cancelled", cancelledQuantity: 1, refundedAmount: 4000 }
      ]
    };
    const res = calculateInvoiceFinancials(order);
    assert.equal(res.originalTotalAmount, 4000);
    assert.equal(res.totalRefunded, 4000);
    assert.equal(res.netRetainedOrderValue, 0);
    assert.equal(res.invoiceStatus, "REFUNDED");
  });

  await t.test("6. Unpaid COD cancellation (No wallet refund, net retained ₹0)", () => {
    const order = {
      orderNumber: "ORD-COD-UNPAID",
      subtotal: 0,
      originalSubtotal: 3500,
      discount: 0,
      shippingCharge: 0,
      deliveryMethod: "standard",
      totalAmount: 0,
      originalTotalAmount: 3500,
      totalRefundedAmount: 0,
      paymentMethod: "cod",
      paymentStatus: "pending",
      status: "cancelled",
      items: [
        { productName: "Naruto Cloak", price: 3500, quantity: 1, itemStatus: "cancelled", cancelledQuantity: 1, refundedAmount: 0 }
      ]
    };
    const res = calculateInvoiceFinancials(order);
    assert.equal(res.originalTotalAmount, 3500);
    assert.equal(res.totalRefunded, 0); // MUST NEVER BE REFUNDED TO WALLET
    assert.equal(res.netRetainedOrderValue, 0);
    assert.equal(res.invoiceStatus, "CANCELLED (UNPAID)");
  });

  await t.test("7. Express delivery order with refund (Express fee ₹149 is non-refundable)", () => {
    const order = {
      orderNumber: "ORD-EXPRESS",
      subtotal: 0,
      originalSubtotal: 2000,
      discount: 0,
      shippingCharge: 149,
      deliveryMethod: "express",
      totalAmount: 149,
      originalTotalAmount: 2149,
      totalRefundedAmount: 2000,
      paymentMethod: "razorpay",
      paymentStatus: "paid",
      status: "cancelled",
      items: [
        { productName: "Eren Coat", price: 2000, quantity: 1, itemStatus: "cancelled", cancelledQuantity: 1, refundedAmount: 2000 }
      ]
    };
    const res = calculateInvoiceFinancials(order);
    assert.equal(res.originalTotalAmount, 2149);
    assert.equal(res.totalRefunded, 2000); // 2149 - 149 express fee = 2000 max refund
    assert.equal(res.netRetainedOrderValue, 149); // Express fee retained
    assert.equal(res.invoiceStatus, "REFUNDED");
  });

  await t.test("8. Legacy order without original financial snapshots", () => {
    const order = {
      orderNumber: "ORD-LEGACY",
      subtotal: 3600,
      discount: 200,
      shippingCharge: 0,
      deliveryMethod: "standard",
      totalAmount: 3400,
      paymentMethod: "razorpay",
      paymentStatus: "paid",
      status: "delivered",
      items: [
        { productName: "Legacy Item 1", price: 1800, quantity: 2, itemStatus: "active" }
      ]
    };
    const res = calculateInvoiceFinancials(order);
    assert.equal(res.originalSubtotal, 3600);
    assert.equal(res.originalDiscount, 200);
    assert.equal(res.originalTotalAmount, 3400);
    assert.equal(res.totalRefunded, 0);
    assert.equal(res.netRetainedOrderValue, 3400);
    assert.equal(res.invoiceStatus, "PAID");
  });
});
