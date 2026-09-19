const AdminDashboardPage = () => {
  return (
    <div className="w-full min-h-screen bg-[#111111] text-white">

      {/* ========================================= */}
      {/* MAIN CONTENT */}
      {/* ========================================= */}

      <main className="w-full min-h-screen overflow-y-auto">

        {/* TOP BAR */}

        <header className="h-[34px] border-b border-[#292929] flex items-center px-4">

          <div className="flex items-center gap-3">

            <span className="text-[9px] tracking-[0.15em]">
              ADMIN DASHBOARD
            </span>

          </div>

          <div className="ml-auto flex items-center">

            {/* SEARCH */}

            <div className="w-[390px] h-[19px] border border-[#343434] flex items-center px-2 gap-2">

              <span className="text-[8px] text-gray-500">
                ⌕
              </span>

              <input
                type="text"
                placeholder="SEARCH ORDERS, PRODUCTS, CUSTOMERS..."
                className="w-full bg-transparent outline-none text-[7px] text-gray-300 placeholder:text-gray-600"
              />

            </div>

          </div>

        </header>


        {/* ========================================= */}
        {/* CONTENT */}
        {/* ========================================= */}

        <div className="px-4 py-5">

          {/* TITLE */}

          <div className="flex items-end justify-between">

            <div>

              <h1 className="text-[20px] font-medium tracking-[-0.04em]">
                ADMIN DASHBOARD
              </h1>

              <p className="text-[8px] text-gray-400 mt-1">
                Welcome back, Admin.
              </p>

            </div>

            <span className="text-[8px] text-gray-300">
              17 SEP 2026
            </span>

          </div>


          {/* ========================================= */}
          {/* STAT CARDS */}
          {/* ========================================= */}

          <div className="grid grid-cols-5 gap-3 mt-5">

            <StatCard
              title="TOTAL ORDERS"
              value="128"
            />

            <StatCard
              title="PENDING ORDERS"
              value="12"
              accent="red"
            />

            <StatCard
              title="PROCESSING"
              value="18"
              accent="blue"
            />

            <StatCard
              title="SHIPPED"
              value="31"
            />

            <StatCard
              title="DELIVERED"
              value="61"
              accent="green"
            />

          </div>


          {/* ========================================= */}
          {/* SALES + RECENT ORDERS */}
          {/* ========================================= */}

          <div className="grid grid-cols-[210px_1fr] gap-3 mt-5">

            {/* SALES OVERVIEW */}

            <section className="border border-[#292929] bg-[#141414]">

              <PanelTitle title="SALES OVERVIEW" />

              <div className="px-3 py-3">

                <SalesRow
                  title="TODAY"
                  value="₹12,450"
                />

                <SalesRow
                  title="THIS WEEK"
                  value="₹84,320"
                />

                <SalesRow
                  title="THIS MONTH"
                  value="₹3,42,890"
                />


                {/* GRAPH */}

                <div className="h-[70px] mt-4 border-t border-[#292929] flex items-end justify-between px-2 pb-1">

                  {[12, 22, 30, 25, 43, 36, 55].map(
                    (height, index) => (
                      <div
                        key={index}
                        className="w-[2px] bg-[#e9002d]"
                        style={{
                          height: `${height}px`,
                        }}
                      />
                    )
                  )}

                </div>

              </div>

            </section>


            {/* RECENT ORDERS */}

            <section className="border border-[#292929] bg-[#141414]">

              <PanelTitle
                title="RECENT ORDERS"
                action="VIEW ALL →"
              />

              <div className="grid grid-cols-[75px_1fr_80px_70px_75px] px-3 h-[25px] items-center border-b border-[#292929] text-[6px] text-gray-500">

                <span>ORDER</span>
                <span>CUSTOMER</span>
                <span>DATE</span>
                <span>TOTAL</span>
                <span className="text-right">
                  STATUS
                </span>

              </div>


              <OrderRow
                order="GS-88210"
                customer="Nishmal"
                date="31 Aug 2026"
                total="₹3,398"
                status="SHIPPED"
                statusType="shipped"
              />

              <OrderRow
                order="GS-88209"
                customer="Eren Yeager"
                date="30 Aug 2026"
                total="₹1,250"
                status="PROCESSING"
                statusType="processing"
              />

              <OrderRow
                order="GS-88208"
                customer="Mikasa Ackerman"
                date="30 Aug 2026"
                total="₹4,999"
                status="DELIVERED"
                statusType="delivered"
              />

              <OrderRow
                order="GS-88207"
                customer="Levi Ackerman"
                date="29 Aug 2026"
                total="₹1,250"
                status="CANCELLED"
                statusType="cancelled"
              />

              <OrderRow
                order="GS-88206"
                customer="Armin Arlert"
                date="28 Aug 2026"
                total="₹12,450"
                status="SHIPPED"
                statusType="shipped"
              />

            </section>

          </div>


          {/* ========================================= */}
          {/* BOTTOM PANELS */}
          {/* ========================================= */}

          <div className="grid grid-cols-3 gap-3 mt-5">

            {/* LOW STOCK */}

            <section className="border border-[#292929] bg-[#141414]">

              <PanelTitle
                title="LOW STOCK ALERTS"
                action="INVENTORY →"
              />

              <StockRow
                product="Akatsuki Cloud Jacket"
                stock="4 LEFT"
              />

              <StockRow
                product="Attack Titan Figure"
                stock="7 LEFT"
              />

              <StockRow
                product="Sukuna Necklace"
                stock="3 LEFT"
              />

            </section>


            {/* PENDING RETURNS */}

            <section className="border border-[#292929] bg-[#141414]">

              <PanelTitle
                title="PENDING RETURNS"
                action="RETURNS →"
              />

              <ReturnRow
                id="RET-00921"
                customer="Nishmal"
                amount="₹2,499"
              />

              <ReturnRow
                id="RET-00920"
                customer="Eren Yeager"
                amount="₹3,499"
              />

            </section>


            {/* COUPON OVERVIEW */}

            <section className="border border-[#292929] bg-[#141414]">

              <PanelTitle
                title="COUPON OVERVIEW"
                action="MANAGE →"
              />

              <div className="px-3 py-3">

                <div className="flex items-center justify-between">

                  <span className="text-[7px] text-gray-400">
                    ACTIVE COUPONS
                  </span>

                  <span className="text-[9px]">
                    12
                  </span>

                </div>


                <div className="flex items-center justify-between mt-3">

                  <span className="text-[7px] text-gray-400">
                    TOTAL REDEMPTIONS
                  </span>

                  <span className="text-[9px]">
                    128
                  </span>

                </div>


                <div className="border border-[#292929] mt-4 p-2 flex items-center justify-between">

                  <div>

                    <p className="text-[6px] text-gray-400">
                      TOP COUPON
                    </p>

                    <p className="text-[8px] text-[#e9002d] mt-1">
                      GETSUKA10
                    </p>

                  </div>

                  <span className="border border-gray-600 px-2 py-1 text-[6px]">
                    10% OFF
                  </span>

                </div>

              </div>

            </section>

          </div>

        </div>

      </main>

    </div>
  );
};


/* ========================================= */
/* STAT CARD */
/* ========================================= */

const StatCard = ({
  title,
  value,
  accent,
}) => {

  const accentClass =
    accent === "red"
      ? "border-l-[#e9002d]"
      : accent === "blue"
      ? "border-l-[#55d8ff]"
      : accent === "green"
      ? "border-l-[#52d878]"
      : "border-l-transparent";

  return (
    <div
      className={`h-[57px] border border-[#292929] border-l-2 ${accentClass} bg-[#141414] px-3 py-2`}
    >

      <p className="text-[6px] tracking-[0.12em] text-gray-400">
        {title}
      </p>

      <p className="text-[16px] mt-1">
        {value}
      </p>

    </div>
  );
};


/* ========================================= */
/* PANEL TITLE */
/* ========================================= */

const PanelTitle = ({
  title,
  action,
}) => {

  return (
    <div className="h-[31px] px-3 flex items-center justify-between border-b border-[#292929]">

      <span className="text-[7px] tracking-[0.12em] text-gray-300">
        {title}
      </span>

      {action && (
        <button className="text-[6px] text-[#e9002d] tracking-wide">
          {action}
        </button>
      )}

    </div>
  );
};


/* ========================================= */
/* SALES ROW */
/* ========================================= */

const SalesRow = ({
  title,
  value,
}) => {

  return (
    <div className="h-[29px] flex items-center justify-between border-b border-[#292929]">

      <span className="text-[6px] tracking-wide text-gray-400">
        {title}
      </span>

      <span className="text-[10px]">
        {value}
      </span>

    </div>
  );
};


/* ========================================= */
/* ORDER ROW */
/* ========================================= */

const OrderRow = ({
  order,
  customer,
  date,
  total,
  status,
  statusType,
}) => {

  const statusClass = {
    shipped: "bg-[#343434] text-white",
    processing: "bg-[#00a8df] text-white",
    delivered: "bg-[#159447] text-white",
    cancelled: "bg-[#e9002d] text-white",
  };

  return (
    <div className="grid grid-cols-[75px_1fr_80px_70px_75px] px-3 h-[30px] items-center border-b border-[#292929] text-[7px]">

      <span className="text-gray-300">
        {order}
      </span>

      <span className="text-gray-300">
        {customer}
      </span>

      <span className="text-gray-400">
        {date}
      </span>

      <span>
        {total}
      </span>

      <span className="flex justify-end">

        <span
          className={`px-2 py-1 text-[6px] ${statusClass[statusType]}`}
        >
          {status}
        </span>

      </span>

    </div>
  );
};


/* ========================================= */
/* STOCK ROW */
/* ========================================= */

const StockRow = ({
  product,
  stock,
}) => {

  return (
    <div className="h-[39px] px-3 flex items-center justify-between border-b border-[#292929]">

      <span className="text-[7px] text-gray-300">
        {product}
      </span>

      <span className="text-[6px] bg-[#1b1b1b] border border-[#e9002d] text-[#e9002d] px-2 py-1">
        {stock}
      </span>

    </div>
  );
};


/* ========================================= */
/* RETURN ROW */
/* ========================================= */

const ReturnRow = ({
  id,
  customer,
  amount,
}) => {

  return (
    <div className="h-[48px] px-3 flex items-center justify-between border-b border-[#292929]">

      <div>

        <p className="text-[7px] font-medium">
          {id}
        </p>

        <p className="text-[6px] text-gray-500 mt-1">
          {customer} · {amount}
        </p>

      </div>

      <span className="bg-[#292929] px-2 py-1 text-[6px]">
        PENDING
      </span>

    </div>
  );
};


export default AdminDashboardPage;