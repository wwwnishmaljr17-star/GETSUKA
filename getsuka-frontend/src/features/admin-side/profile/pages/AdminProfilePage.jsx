import { useNavigate } from "react-router-dom";

const AdminProfilePage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-full text-[#16233f]">

      {/* =====================================================
          PAGE HEADER / HERO
      ===================================================== */}

      <section className="relative overflow-hidden px-[26px] pt-[28px] pb-[25px]">

        {/* Background glow */}

        <div className="pointer-events-none absolute inset-0">

          <div className="absolute right-[8%] top-[-80px] h-[280px] w-[500px] rounded-full bg-[#1557f5]/[0.08] blur-[100px]" />

          <div className="absolute left-[30%] top-[20px] h-[180px] w-[300px] rounded-full bg-[#3978ff]/[0.06] blur-[80px]" />

        </div>

        {/* Breadcrumb */}

        <div className="relative z-10 flex items-center gap-[8px] text-[9px]">

          <span className="text-[#1557f5]">
            ◇
          </span>

          <span className="text-[#64728a] transition hover:text-[#1557f5]">
            Dashboard
          </span>

          <span className="text-[#aeb9c9]">
            ›
          </span>

          <span className="font-medium text-[#1557f5]">
            Admin Profile
          </span>

        </div>

        {/* Title */}

        <div className="relative z-10 mt-[24px] flex items-end justify-between">

          <div>

            <h1 className="text-[28px] font-semibold leading-none tracking-[-0.04em] text-[#16233f]">
              Admin Profile
            </h1>

            <p className="mt-[10px] text-[10px] text-[#71809a]">
              Manage your{" "}
              <span className="font-medium text-[#1557f5]">
                GETSUKA
              </span>{" "}
              administrator account and security settings.
            </p>

          </div>

          <div className="hidden text-right sm:block">

            <p className="text-[8px] uppercase tracking-[0.16em] text-[#8b97aa]">
              Account Status
            </p>

            <div className="mt-[6px] flex items-center justify-end gap-[6px]">

              <span className="h-[7px] w-[7px] rounded-full bg-[#1f9d62]" />

              <span className="text-[9px] font-medium text-[#1f9d62]">
                ACTIVE
              </span>

            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <main className="px-[26px] pb-[35px]">


        {/* =================================================
            PROFILE HERO CARD
        ================================================= */}

        <section className="relative overflow-hidden rounded-[14px] border border-[#dfe7f3] bg-white shadow-[0_8px_30px_rgba(25,65,130,0.07)]">

          {/* Blue glow */}

          <div className="pointer-events-none absolute right-[-80px] top-[-100px] h-[250px] w-[350px] rounded-full bg-[#1557f5]/[0.07] blur-[90px]" />

          <div className="relative flex flex-col gap-[20px] px-[22px] py-[22px] md:flex-row md:items-center md:justify-between">

            {/* PROFILE INFO */}

            <div className="flex items-center gap-[16px]">

              {/* AVATAR */}

              <div className="relative">

                <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full border border-[#1557f5]/40 bg-[#edf3ff] shadow-[0_0_25px_rgba(21,87,245,0.12)]">

                  <span className="text-[27px] font-semibold text-[#1557f5]">
                    G
                  </span>

                </div>

                <div className="absolute bottom-[1px] right-[1px] flex h-[18px] w-[18px] items-center justify-center rounded-full border-[3px] border-white bg-[#1f9d62]">

                  <span className="h-[5px] w-[5px] rounded-full bg-white" />

                </div>

              </div>


              {/* DETAILS */}

              <div>

                <div className="flex flex-wrap items-center gap-[9px]">

                  <h2 className="text-[17px] font-semibold text-[#16233f]">
                    Nishmal
                  </h2>

                  <span className="rounded-full border border-[#1557f5]/25 bg-[#edf3ff] px-[8px] py-[4px] text-[6px] font-semibold uppercase tracking-[0.1em] text-[#1557f5]">
                    Super Admin
                  </span>

                </div>

                <p className="mt-[6px] text-[10px] text-[#64728a]">
                  nishmal.1221@gmail.com
                </p>

                <p className="mt-[7px] text-[7px] font-medium uppercase tracking-[0.16em] text-[#1557f5]">
                  GETSUKA ADMIN ACCOUNT
                </p>

              </div>

            </div>


            {/* EDIT BUTTON */}

            <button
              type="button"
              onClick={() =>
                navigate("/admin/profile/edit")
              }
              className="h-[42px] rounded-[8px] bg-[#1557f5] px-[19px] text-[8px] font-medium tracking-[0.08em] text-white shadow-[0_8px_25px_rgba(21,87,245,0.18)] transition hover:bg-[#0d47d9] hover:shadow-[0_10px_30px_rgba(21,87,245,0.24)] md:min-w-[145px]"
            >
              ✎ &nbsp; EDIT PROFILE
            </button>

          </div>

        </section>


        {/* =================================================
            INFORMATION GRID
        ================================================= */}

        <div className="mt-[14px] grid grid-cols-1 gap-[14px] xl:grid-cols-2">


          {/* =================================================
              PERSONAL INFORMATION
          ================================================= */}

          <section className="overflow-hidden rounded-[12px] border border-[#dfe7f3] bg-white shadow-[0_8px_25px_rgba(25,65,130,0.05)]">

            {/* HEADER */}

            <div className="flex items-center justify-between border-b border-[#e7edf6] px-[18px] py-[15px]">

              <div>

                <p className="text-[10px] font-semibold text-[#16233f]">
                  Personal Information
                </p>

                <p className="mt-[4px] text-[8px] text-[#71809a]">
                  Administrator account details.
                </p>

              </div>

              <div className="flex h-[31px] w-[31px] items-center justify-center rounded-full border border-[#dce7f8] bg-[#edf3ff] text-[13px] text-[#1557f5]">
                ◎
              </div>

            </div>


            {/* CONTENT */}

            <div className="px-[18px]">

              {/* FULL NAME */}

              <div className="flex min-h-[58px] items-center justify-between border-b border-[#e7edf6]">

                <div>

                  <p className="text-[7px] font-medium uppercase tracking-[0.14em] text-[#71809a]">
                    Full Name
                  </p>

                  <p className="mt-[6px] text-[10px] font-medium text-[#16233f]">
                    Nishmal
                  </p>

                </div>

                <span className="text-[7px] font-medium text-[#b1bdce]">
                  01
                </span>

              </div>


              {/* EMAIL */}

              <div className="flex min-h-[58px] items-center justify-between border-b border-[#e7edf6]">

                <div>

                  <p className="text-[7px] font-medium uppercase tracking-[0.14em] text-[#71809a]">
                    Email Address
                  </p>

                  <p className="mt-[6px] text-[10px] font-medium text-[#1557f5]">
                    nishmal.1221@gmail.com
                  </p>

                </div>

                <span className="text-[7px] font-medium text-[#b1bdce]">
                  02
                </span>

              </div>


              {/* PHONE */}

              <div className="flex min-h-[58px] items-center justify-between">

                <div>

                  <p className="text-[7px] font-medium uppercase tracking-[0.14em] text-[#71809a]">
                    Phone Number
                  </p>

                  <p className="mt-[6px] text-[10px] text-[#9aa6b8]">
                    Not added
                  </p>

                </div>

                <span className="text-[7px] font-medium text-[#b1bdce]">
                  03
                </span>

              </div>

            </div>

          </section>


          {/* =================================================
              STORE INFORMATION
          ================================================= */}

          <section className="overflow-hidden rounded-[12px] border border-[#dfe7f3] bg-white shadow-[0_8px_25px_rgba(25,65,130,0.05)]">

            {/* HEADER */}

            <div className="flex items-center justify-between border-b border-[#e7edf6] px-[18px] py-[15px]">

              <div>

                <p className="text-[10px] font-semibold text-[#16233f]">
                  Store Information
                </p>

                <p className="mt-[4px] text-[8px] text-[#71809a]">
                  Information about the GETSUKA store.
                </p>

              </div>

              <div className="flex h-[31px] w-[31px] items-center justify-center rounded-full border border-[#dce7f8] bg-[#edf3ff] text-[13px] text-[#1557f5]">
                ◈
              </div>

            </div>


            {/* CONTENT */}

            <div className="px-[18px]">

              {/* STORE */}

              <div className="flex min-h-[58px] items-center justify-between border-b border-[#e7edf6]">

                <div>

                  <p className="text-[7px] font-medium uppercase tracking-[0.14em] text-[#71809a]">
                    Store
                  </p>

                  <p className="mt-[6px] text-[10px] font-semibold text-[#1557f5]">
                    GETSUKA
                  </p>

                </div>

                <span className="text-[7px] font-medium text-[#b1bdce]">
                  01
                </span>

              </div>


              {/* STORE CATEGORY */}

              <div className="flex min-h-[58px] items-center justify-between border-b border-[#e7edf6]">

                <div>

                  <p className="text-[7px] font-medium uppercase tracking-[0.14em] text-[#71809a]">
                    Store Category
                  </p>

                  <p className="mt-[6px] text-[10px] text-[#24324a]">
                    Anime T-Shirts
                  </p>

                </div>

                <span className="text-[7px] font-medium text-[#b1bdce]">
                  02
                </span>

              </div>


              {/* PRODUCT FOCUS */}

              <div className="flex min-h-[58px] items-center justify-between">

                <div>

                  <p className="text-[7px] font-medium uppercase tracking-[0.14em] text-[#71809a]">
                    Product Focus
                  </p>

                  <p className="mt-[6px] text-[10px] text-[#24324a]">
                    Anime Collections
                  </p>

                </div>

                <span className="text-[7px] font-medium text-[#b1bdce]">
                  03
                </span>

              </div>

            </div>

          </section>

        </div>


        {/* =================================================
            SECURITY
        ================================================= */}

        <section className="mt-[14px] overflow-hidden rounded-[12px] border border-[#dfe7f3] bg-white shadow-[0_8px_25px_rgba(25,65,130,0.05)]">

          {/* HEADER */}

          <div className="flex items-center justify-between border-b border-[#e7edf6] px-[18px] py-[15px]">

            <div>

              <p className="text-[10px] font-semibold text-[#16233f]">
                Security
              </p>

              <p className="mt-[4px] text-[8px] text-[#71809a]">
                Manage your administrator password.
              </p>

            </div>

            <div className="flex h-[31px] w-[31px] items-center justify-center rounded-full border border-[#dce7f8] bg-[#edf3ff] text-[13px] text-[#1557f5]">
              ◉
            </div>

          </div>


          {/* SECURITY CONTENT */}

          <div className="flex flex-col gap-[18px] px-[18px] py-[18px] md:flex-row md:items-center md:justify-between">

            <div>

              <p className="text-[7px] font-medium uppercase tracking-[0.14em] text-[#71809a]">
                Password
              </p>

              <div className="mt-[8px] flex items-center gap-[7px]">

                <span className="text-[11px] tracking-[0.22em] text-[#24324a]">
                  ••••••••••••
                </span>

                <span className="rounded-full border border-[#b9e7ce] bg-[#effaf4] px-[7px] py-[3px] text-[6px] font-medium uppercase tracking-[0.1em] text-[#1f9d62]">
                  Protected
                </span>

              </div>

              <p className="mt-[7px] text-[7px] text-[#8b97aa]">
                Last password update is managed securely.
              </p>

            </div>


            <button
              type="button"
              onClick={() =>
                navigate("/admin/profile/edit")
              }
              className="h-[40px] rounded-[8px] border border-[#cbd8eb] bg-[#f5f8fd] px-[17px] text-[8px] font-medium tracking-[0.08em] text-[#1557f5] transition hover:border-[#1557f5] hover:bg-[#edf3ff] hover:text-[#0d47d9]"
            >
              CHANGE PASSWORD →
            </button>

          </div>

        </section>


        {/* =================================================
            ACCOUNT STATUS CARDS
        ================================================= */}

        <div className="mt-[14px] grid grid-cols-1 gap-[14px] md:grid-cols-3">


          {/* ROLE */}

          <div className="rounded-[12px] border border-[#dfe7f3] bg-white p-[18px] shadow-[0_8px_25px_rgba(25,65,130,0.05)]">

            <div className="flex items-center justify-between">

              <p className="text-[7px] font-medium uppercase tracking-[0.14em] text-[#71809a]">
                Account Role
              </p>

              <span className="text-[13px] text-[#1557f5]">
                ◇
              </span>

            </div>

            <p className="mt-[13px] text-[12px] font-semibold text-[#1557f5]">
              ADMIN
            </p>

            <p className="mt-[5px] text-[7px] text-[#8b97aa]">
              Full administrator privileges
            </p>

          </div>


          {/* STATUS */}

          <div className="rounded-[12px] border border-[#dfe7f3] bg-white p-[18px] shadow-[0_8px_25px_rgba(25,65,130,0.05)]">

            <div className="flex items-center justify-between">

              <p className="text-[7px] font-medium uppercase tracking-[0.14em] text-[#71809a]">
                Account Status
              </p>

              <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#effaf4] text-[10px] text-[#1f9d62]">
                ✓
              </span>

            </div>

            <div className="mt-[11px] flex items-center gap-[7px]">

              <span className="h-[7px] w-[7px] rounded-full bg-[#1f9d62]" />

              <p className="text-[10px] font-semibold text-[#1f9d62]">
                ACTIVE
              </p>

            </div>

            <p className="mt-[5px] text-[7px] text-[#8b97aa]">
              Account is currently active
            </p>

          </div>


          {/* ACCESS */}

          <div className="rounded-[12px] border border-[#dfe7f3] bg-white p-[18px] shadow-[0_8px_25px_rgba(25,65,130,0.05)]">

            <div className="flex items-center justify-between">

              <p className="text-[7px] font-medium uppercase tracking-[0.14em] text-[#71809a]">
                Store Access
              </p>

              <span className="text-[13px] text-[#1557f5]">
                ◈
              </span>

            </div>

            <p className="mt-[13px] text-[10px] font-semibold text-[#1557f5]">
              FULL ACCESS
            </p>

            <p className="mt-[5px] text-[7px] text-[#8b97aa]">
              Products, orders and customers
            </p>

          </div>

        </div>


        {/* =================================================
            ADMIN ACCESS INFORMATION
        ================================================= */}

        <section className="mt-[14px] overflow-hidden rounded-[12px] border border-[#dfe7f3] bg-white shadow-[0_8px_25px_rgba(25,65,130,0.05)]">

          <div className="border-b border-[#e7edf6] px-[18px] py-[15px]">

            <p className="text-[10px] font-semibold text-[#16233f]">
              Administrator Access
            </p>

            <p className="mt-[4px] text-[8px] text-[#71809a]">
              Current permissions available to this account.
            </p>

          </div>


          <div className="grid grid-cols-1 gap-[1px] bg-[#e2e9f3] sm:grid-cols-2 lg:grid-cols-4">

            {/* PRODUCTS */}

            <div className="bg-white px-[18px] py-[17px] transition hover:bg-[#f5f8fd]">

              <p className="text-[8px] font-medium text-[#53627a]">
                Products
              </p>

              <p className="mt-[7px] text-[9px] font-medium text-[#1f9d62]">
                ✓ Full Access
              </p>

            </div>


            {/* ORDERS */}

            <div className="bg-white px-[18px] py-[17px] transition hover:bg-[#f5f8fd]">

              <p className="text-[8px] font-medium text-[#53627a]">
                Orders
              </p>

              <p className="mt-[7px] text-[9px] font-medium text-[#1f9d62]">
                ✓ Full Access
              </p>

            </div>


            {/* CUSTOMERS */}

            <div className="bg-white px-[18px] py-[17px] transition hover:bg-[#f5f8fd]">

              <p className="text-[8px] font-medium text-[#53627a]">
                Customers
              </p>

              <p className="mt-[7px] text-[9px] font-medium text-[#1f9d62]">
                ✓ Full Access
              </p>

            </div>


            {/* CATEGORIES */}

            <div className="bg-white px-[18px] py-[17px] transition hover:bg-[#f5f8fd]">

              <p className="text-[8px] font-medium text-[#53627a]">
                Categories
              </p>

              <p className="mt-[7px] text-[9px] font-medium text-[#1f9d62]">
                ✓ Full Access
              </p>

            </div>

          </div>

        </section>


        {/* =================================================
            FOOTER
        ================================================= */}

        <footer className="mt-[30px] flex items-center justify-between border-t border-[#e2e9f3] px-[5px] py-[20px]">

          <div>

            <p className="text-[12px] font-semibold text-[#1557f5]">
              GETSUKA
            </p>

            <p className="mt-[3px] text-[8px] text-[#7a879c]">
              Admin Terminal v1.0.0
            </p>

          </div>

          <p className="text-[9px] text-[#7a879c]">
            Built with{" "}
            <span className="text-[#1557f5]">
              ♥
            </span>{" "}
            for anime fans.
          </p>

        </footer>

      </main>

    </div>
  );
};

export default AdminProfilePage;