import { useNavigate } from "react-router-dom";

const AdminProfilePage = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full h-full overflow-y-auto bg-[#111111] text-white">

      {/* ========================================= */}
      {/* MAIN CONTENT */}
      {/* ========================================= */}

      <main className="w-full min-h-full">

        {/* TOP BAR */}

        <header className="h-[34px] border-b border-[#292929] flex items-center px-4">

          <span className="text-[9px] tracking-[0.15em]">
            ADMIN PROFILE
          </span>

        </header>


        {/* CONTENT */}

        <div className="px-4 py-5">

          {/* ========================================= */}
          {/* TITLE */}
          {/* ========================================= */}

          <div className="flex items-end justify-between">

            <div>

              <h1 className="text-[20px] font-medium tracking-[-0.04em]">
                ADMIN PROFILE
              </h1>

              <p className="text-[8px] text-gray-400 mt-1">
                Manage your GETSUKA store administrator profile.
              </p>

            </div>

          </div>


          {/* ========================================= */}
          {/* PROFILE HEADER */}
          {/* ========================================= */}

          <section className="border border-[#292929] bg-[#141414] mt-5">

            <div className="px-4 py-4 flex items-center justify-between">

              <div className="flex items-center gap-4">

                {/* GETSUKA AVATAR */}

                <div className="w-[58px] h-[58px] border border-[#e9002d] bg-[#0d0d0d] flex items-center justify-center">

                  <span className="text-[20px] text-[#e9002d] font-medium">
                    G
                  </span>

                </div>


                {/* ADMIN INFO */}

                <div>

                  <p className="text-[13px] font-medium">
                    Nishmal
                  </p>

                  <p className="text-[8px] text-gray-500 mt-1">
                    nishmal.1221@gmail.com
                  </p>

                  <p className="text-[7px] text-gray-600 tracking-[0.12em] mt-2">
                    GETSUKA ADMIN ACCOUNT
                  </p>

                </div>

              </div>


              {/* EDIT */}

              <button
                type="button"
                onClick={() =>
                  navigate("/admin/profile/edit")
                }
                className="border border-[#343434] px-5 py-2 text-[7px] tracking-[0.12em] text-gray-300 hover:bg-white hover:text-black transition"
              >
                EDIT PROFILE →
              </button>

            </div>

          </section>


          {/* ========================================= */}
          {/* INFORMATION GRID */}
          {/* ========================================= */}

          <div className="grid grid-cols-2 gap-3 mt-3">


            {/* ========================================= */}
            {/* PERSONAL INFORMATION */}
            {/* ========================================= */}

            <section className="border border-[#292929] bg-[#141414]">

              <div className="h-[31px] px-3 flex items-center border-b border-[#292929]">

                <span className="text-[7px] tracking-[0.12em] text-gray-300">
                  PERSONAL INFORMATION
                </span>

              </div>


              <div className="p-3">

                {/* NAME */}

                <div className="h-[42px] border-b border-[#292929] flex items-center justify-between">

                  <span className="text-[7px] text-gray-500">
                    FULL NAME
                  </span>

                  <span className="text-[8px]">
                    Nishmal
                  </span>

                </div>


                {/* EMAIL */}

                <div className="h-[42px] border-b border-[#292929] flex items-center justify-between">

                  <span className="text-[7px] text-gray-500">
                    EMAIL ADDRESS
                  </span>

                  <span className="text-[8px]">
                    nishmal.1221@gmail.com
                  </span>

                </div>


                {/* PHONE */}

                <div className="h-[42px] flex items-center justify-between">

                  <span className="text-[7px] text-gray-500">
                    PHONE NUMBER
                  </span>

                  <span className="text-[8px] text-gray-400">
                    Not added
                  </span>

                </div>

              </div>

            </section>


            {/* ========================================= */}
            {/* STORE INFORMATION */}
            {/* ========================================= */}

            <section className="border border-[#292929] bg-[#141414]">

              <div className="h-[31px] px-3 flex items-center border-b border-[#292929]">

                <span className="text-[7px] tracking-[0.12em] text-gray-300">
                  STORE INFORMATION
                </span>

              </div>


              <div className="p-3">

                {/* STORE */}

                <div className="h-[42px] border-b border-[#292929] flex items-center justify-between">

                  <span className="text-[7px] text-gray-500">
                    STORE
                  </span>

                  <span className="text-[8px]">
                    GETSUKA
                  </span>

                </div>


                {/* CATEGORY */}

                <div className="h-[42px] border-b border-[#292929] flex items-center justify-between">

                  <span className="text-[7px] text-gray-500">
                    STORE CATEGORY
                  </span>

                  <span className="text-[8px]">
                    ANIME T-SHIRTS
                  </span>

                </div>


                {/* COLLECTION */}

                <div className="h-[42px] flex items-center justify-between">

                  <span className="text-[7px] text-gray-500">
                    PRODUCT FOCUS
                  </span>

                  <span className="text-[8px]">
                    ANIME COLLECTIONS
                  </span>

                </div>

              </div>

            </section>

          </div>


          {/* ========================================= */}
          {/* SECURITY */}
          {/* ========================================= */}

          <section className="border border-[#292929] bg-[#141414] mt-3">

            <div className="h-[31px] px-3 flex items-center border-b border-[#292929]">

              <span className="text-[7px] tracking-[0.12em] text-gray-300">
                SECURITY
              </span>

            </div>


            <div className="px-3 py-3 flex items-center justify-between">

              <div>

                <p className="text-[7px] text-gray-500">
                  PASSWORD
                </p>

                <p className="text-[9px] tracking-[0.25em] mt-2">
                  ••••••••••••
                </p>

              </div>


              <button
                type="button"
                onClick={() =>
                  navigate("/admin/profile/edit")
                }
                className="border border-[#343434] px-4 py-2 text-[7px] tracking-[0.1em] text-gray-300 hover:bg-white hover:text-black transition"
              >
                CHANGE PASSWORD →
              </button>

            </div>

          </section>


          {/* ========================================= */}
          {/* ACCOUNT STATUS */}
          {/* ========================================= */}

          <div className="grid grid-cols-3 gap-3 mt-3">

            {/* ACCOUNT ROLE */}

            <div className="border border-[#292929] bg-[#141414] px-3 py-3">

              <p className="text-[6px] text-gray-500 tracking-[0.12em]">
                ACCOUNT ROLE
              </p>

              <p className="text-[9px] mt-2">
                ADMIN
              </p>

            </div>


            {/* ACCOUNT STATUS */}

            <div className="border border-[#292929] bg-[#141414] px-3 py-3">

              <p className="text-[6px] text-gray-500 tracking-[0.12em]">
                ACCOUNT STATUS
              </p>

              <p className="text-[9px] text-green-400 mt-2">
                ● ACTIVE
              </p>

            </div>


            {/* STORE ACCESS */}

            <div className="border border-[#292929] bg-[#141414] px-3 py-3">

              <p className="text-[6px] text-gray-500 tracking-[0.12em]">
                STORE ACCESS
              </p>

              <p className="text-[9px] text-[#e9002d] mt-2">
                FULL ACCESS
              </p>

            </div>

          </div>

        </div>

      </main>

    </div>
  );
};

export default AdminProfilePage;