import Order from "../../order/models/Order.js";
import Product from "../../product/models/Product.js";
import User from "../../auth/models/User.js";
import Coupon from "../../coupon/models/Coupon.js";

// =========================================================
// GET ADMIN DASHBOARD DATA
// GET /api/admin/dashboard
// =========================================================

export const getAdminDashboardData = async (req, res) => {
  try {
    const now = new Date();

    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const sevenDaysAgo = new Date(startOfToday);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const startOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

    const startOfYear = new Date(
      now.getFullYear(),
      0,
      1
    );

    // =======================================================
    // PARALLEL QUERIES USING MONGODB AGGREGATION
    // =======================================================

    const [
      orderMetricsAgg,
      revenueMetricsAgg,
      sevenDaysSalesAgg,
      recentOrders,
      lowStockProducts,
      pendingReturns,
      totalUsers,
      totalProducts,
      couponStats,
      topCouponList,
    ] = await Promise.all([
      // 1. ORDER METRICS & OVERALL REVENUE
      Order.aggregate([
        {
          $facet: {
            statusCounts: [
              {
                $group: {
                  _id: "$status",
                  count: { $sum: 1 },
                },
              },
            ],
            totalRevenue: [
              {
                $match: {
                  status: { $nin: ["cancelled", "returned"] },
                  paymentStatus: { $nin: ["failed", "refunded"] },
                },
              },
              {
                $group: {
                  _id: null,
                  total: { $sum: "$totalAmount" },
                },
              },
            ],
            totalOrders: [
              {
                $count: "count",
              },
            ],
          },
        },
      ]),

      // 2. TIME-BASED REVENUE (TODAY, WEEK, MONTH, YEAR)
      Order.aggregate([
        {
          $match: {
            status: { $nin: ["cancelled", "returned"] },
            paymentStatus: { $nin: ["failed", "refunded"] },
            createdAt: { $gte: startOfYear },
          },
        },
        {
          $facet: {
            today: [
              { $match: { createdAt: { $gte: startOfToday } } },
              { $group: { _id: null, total: { $sum: "$totalAmount" } } },
            ],
            thisWeek: [
              { $match: { createdAt: { $gte: sevenDaysAgo } } },
              { $group: { _id: null, total: { $sum: "$totalAmount" } } },
            ],
            thisMonth: [
              { $match: { createdAt: { $gte: startOfMonth } } },
              { $group: { _id: null, total: { $sum: "$totalAmount" } } },
            ],
            thisYear: [
              { $group: { _id: null, total: { $sum: "$totalAmount" } } },
            ],
          },
        },
      ]),

      // 3. DAILY SALES FOR PAST 7 DAYS (FOR CHART)
      Order.aggregate([
        {
          $match: {
            status: { $nin: ["cancelled", "returned"] },
            paymentStatus: { $nin: ["failed", "refunded"] },
            createdAt: { $gte: sevenDaysAgo },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
              },
            },
            totalSales: { $sum: "$totalAmount" },
            ordersCount: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // 4. RECENT ORDERS (LATEST 5)
      Order.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .select(
          "orderNumber totalAmount status paymentStatus paymentMethod shippingAddress.fullName createdAt"
        )
        .lean(),

      // 5. LOW STOCK PRODUCTS (STOCK <= 5)
      Product.aggregate([
        { $match: { isDeleted: false, isListed: true } },
        { $unwind: "$variants" },
        { $match: { "variants.stock": { $lte: 5 } } },
        { $sort: { "variants.stock": 1 } },
        { $limit: 10 },
        {
          $project: {
            _id: 1,
            name: 1,
            variantId: "$variants._id",
            variant: {
              $concat: ["$variants.color", " / ", "$variants.size"],
            },
            sku: "$variants.sku",
            stock: "$variants.stock",
          },
        },
      ]),

      // 6. PENDING RETURNS (LATEST 5)
      Order.find({
        returnStatus: {
          $in: ["pending", "collection_pending", "approved"],
        },
      })
        .sort({ returnRequestedAt: -1, createdAt: -1 })
        .limit(5)
        .select(
          "orderNumber totalAmount returnStatus returnReason returnRequestedAt shippingAddress.fullName createdAt"
        )
        .lean(),

      // 7. TOTAL USERS
      User.countDocuments({ isDeleted: { $ne: true } }),

      // 8. TOTAL PRODUCTS
      Product.countDocuments({ isDeleted: false }),

      // 9. COUPON STATS
      Coupon.aggregate([
        {
          $group: {
            _id: null,
            activeCount: {
              $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] },
            },
            totalRedemptions: { $sum: "$usedCount" },
          },
        },
      ]),

      // 10. TOP COUPON
      Coupon.find({ isActive: true })
        .sort({ usedCount: -1 })
        .limit(1)
        .select("code discountType discountValue usedCount")
        .lean(),
    ]);

    // =======================================================
    // PROCESS ORDER METRICS
    // =======================================================

    const orderFacet = orderMetricsAgg[0] || {};
    const statusCountsArray = orderFacet.statusCounts || [];
    const statusMap = new Map();
    statusCountsArray.forEach((item) => {
      statusMap.set(item._id, item.count);
    });

    const totalOrders = orderFacet.totalOrders?.[0]?.count || 0;
    const totalRevenue = orderFacet.totalRevenue?.[0]?.total || 0;

    const pendingOrders =
      (statusMap.get("placed") || 0);

    const processingOrders =
      (statusMap.get("confirmed") || 0);

    const shippedOrders =
      (statusMap.get("shipped") || 0) +
      (statusMap.get("out_for_delivery") || 0);

    const completedOrders =
      (statusMap.get("delivered") || 0);

    const cancelledOrders =
      (statusMap.get("cancelled") || 0);

    const returnedOrders =
      (statusMap.get("returned") || 0);

    // =======================================================
    // PROCESS REVENUE METRICS
    // =======================================================

    const revenueFacet = revenueMetricsAgg[0] || {};
    const revenueToday = revenueFacet.today?.[0]?.total || 0;
    const revenueWeek = revenueFacet.thisWeek?.[0]?.total || 0;
    const revenueMonth = revenueFacet.thisMonth?.[0]?.total || 0;
    const revenueYear = revenueFacet.thisYear?.[0]?.total || 0;

    // =======================================================
    // PROCESS 7-DAY SALES & CHARTS
    // =======================================================

    const salesMap = new Map();
    sevenDaysSalesAgg.forEach((item) => {
      salesMap.set(item._id, {
        sales: item.totalSales,
        orders: item.ordersCount,
      });
    });

    const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dailyChartData = [];
    const salesValues = [];
    const orderCountValues = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(startOfToday);
      d.setDate(d.getDate() - i);

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const dateKey = `${year}-${month}-${day}`;

      const stat = salesMap.get(dateKey) || { sales: 0, orders: 0 };

      dailyChartData.push({
        date: dateKey,
        day: weekdayNames[d.getDay()],
        sales: stat.sales,
        orders: stat.orders,
      });

      salesValues.push(stat.sales);
      orderCountValues.push(stat.orders);
    }

    // =======================================================
    // PROCESS RECENT ORDERS
    // =======================================================

    const formattedRecentOrders = recentOrders.map((ord) => ({
      id: ord.orderNumber,
      orderId: ord._id,
      customer: ord.shippingAddress?.fullName || "Guest Customer",
      date: ord.createdAt,
      total: ord.totalAmount,
      status: String(ord.status || "placed").toUpperCase(),
      paymentStatus: ord.paymentStatus || "pending",
      paymentMethod: ord.paymentMethod || "cod",
    }));

    // =======================================================
    // PROCESS LOW STOCK PRODUCTS
    // =======================================================

    const formattedLowStock = lowStockProducts.map((p) => ({
      productId: p._id,
      name: p.name,
      variantId: p.variantId,
      variant: p.variant || "Standard",
      sku: p.sku || "",
      stock: p.stock ?? 0,
    }));

    // =======================================================
    // PROCESS PENDING RETURNS
    // =======================================================

    const formattedPendingReturns = pendingReturns.map((ret) => ({
      id: ret.orderNumber,
      orderId: ret._id,
      customer: ret.shippingAddress?.fullName || "Customer",
      amount: ret.totalAmount || 0,
      status: ret.returnStatus || "pending",
      date: ret.returnRequestedAt || ret.createdAt,
      reason: ret.returnReason || "",
    }));

    // =======================================================
    // PROCESS COUPONS
    // =======================================================

    const couponStat = couponStats[0] || {
      activeCount: 0,
      totalRedemptions: 0,
    };
    const topCoupon = topCouponList[0] || null;

    // =======================================================
    // RESPONSE
    // =======================================================

    return res.status(200).json({
      success: true,
      summary: {
        totalOrders,
        totalRevenue,
        pendingOrders,
        processingOrders,
        shippedOrders,
        completedOrders,
        cancelledOrders,
        returnedOrders,
        totalUsers,
        totalProducts,
      },
      revenue: {
        today: revenueToday,
        thisWeek: revenueWeek,
        thisMonth: revenueMonth,
        thisYear: revenueYear,
      },
      recentOrders: formattedRecentOrders,
      lowStockProducts: formattedLowStock,
      pendingReturns: formattedPendingReturns,
      charts: {
        salesOverview: dailyChartData,
        salesValues,
        orderCountValues,
      },
      coupons: {
        activeCount: couponStat.activeCount || 0,
        totalRedemptions: couponStat.totalRedemptions || 0,
        topCoupon: topCoupon
          ? {
              code: topCoupon.code,
              discount:
                topCoupon.discountType === "percentage"
                  ? `${topCoupon.discountValue}% OFF`
                  : `₹${topCoupon.discountValue} OFF`,
              usedCount: topCoupon.usedCount || 0,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Get Admin Dashboard Data Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch admin dashboard data",
    });
  }
};
