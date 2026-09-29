const AdminLogoutModal = ({
  show,
  onCancel,
  onConfirm,
}) => {
  if (!show) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#102047]/35 px-4 backdrop-blur-[4px]">

      {/* =====================================================
          MODAL
      ===================================================== */}

      <div className="w-full max-w-[370px] overflow-hidden rounded-[16px] border border-[#dfe7f3] bg-white shadow-[0_25px_70px_rgba(30,64,175,0.20)]">

        {/* ===================================================
            HEADER
        =================================================== */}

        <div className="border-b border-[#edf1f6] px-[22px] py-[20px]">

          <div className="flex items-center gap-[11px]">

            <div className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-blue-50 text-[15px] text-[#1557f5]">
              ↪
            </div>

            <div>

              <h2 className="text-[14px] font-semibold text-[#182033]">
                Log out
              </h2>

              <p className="mt-[3px] text-[10px] text-[#8b97a8]">
                GETSUKA Admin Panel
              </p>

            </div>

          </div>

        </div>

        {/* ===================================================
            MESSAGE
        =================================================== */}

        <div className="px-[22px] py-[20px]">

          <p className="text-[12px] leading-[1.7] text-[#59677a]">
            Are you sure you want to log out of
            the GETSUKA admin panel?
          </p>

        </div>

        {/* ===================================================
            ACTIONS
        =================================================== */}

        <div className="flex gap-[9px] border-t border-[#edf1f6] bg-[#fafcff] px-[22px] py-[16px]">

          <button
            type="button"
            onClick={onCancel}
            className="h-[38px] flex-1 rounded-[8px] border border-[#dce4ee] bg-white text-[10px] font-medium text-[#647286] transition hover:border-[#cbd6e4] hover:bg-[#f6f9fd] hover:text-[#29364a]"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="h-[38px] flex-1 rounded-[8px] bg-[#1557f5] text-[10px] font-medium text-white shadow-[0_5px_14px_rgba(21,87,245,0.18)] transition hover:bg-[#0d49d8]"
          >
            Log Out
          </button>

        </div>

      </div>

    </div>
  );
};

export default AdminLogoutModal;