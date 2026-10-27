import { useEffect } from "react";

const AdminLogoutModal = ({
  show,
  onCancel,
  onConfirm,
}) => {
  useEffect(() => {
    if (!show) return;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [show, onCancel]);

  if (!show) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#211B18]/60 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-logout-modal-title"
    >

      {/* =====================================================
          MODAL
      ===================================================== */}

      <div className="w-full max-w-[370px] overflow-hidden rounded-md border border-[#E5E4E2] bg-white shadow-[0_25px_60px_rgba(33,27,24,0.16)]">

        {/* ===================================================
            HEADER
        =================================================== */}

        <div className="border-b border-[#E5E4E2] bg-[#FAF9F7] px-[22px] py-[20px]">

          <div className="flex items-center gap-[11px]">

            <div className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-[#E6E0F0] text-[15px] font-bold text-[#6F4E37]">
              ↪
            </div>

            <div>

              <h2 id="admin-logout-modal-title" className="text-[14px] font-bold tracking-[0.05em] uppercase text-[#252321]">
                Log out
              </h2>

              <p className="mt-[3px] text-[10px] text-[#716C67]">
                GETSUKA Admin Panel
              </p>

            </div>

          </div>

        </div>

        {/* ===================================================
            MESSAGE
        =================================================== */}

        <div className="px-[22px] py-[20px] bg-white">

          <p className="text-[12px] leading-[1.7] text-[#716C67]">
            Are you sure you want to log out of
            the GETSUKA admin panel?
          </p>

        </div>

        {/* ===================================================
            ACTIONS
        =================================================== */}

        <div className="flex gap-[9px] border-t border-[#E5E4E2] bg-[#FAF9F7] px-[22px] py-[16px]">

          <button
            type="button"
            onClick={onCancel}
            className="h-[38px] flex-1 rounded border border-[#D8D3CF] bg-white text-[10px] font-semibold uppercase tracking-wider text-[#252321] transition hover:border-[#6F4E37] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6F4E37]"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="h-[38px] flex-1 rounded bg-[#6F4E37] text-[10px] font-semibold uppercase tracking-wider text-white shadow-xs transition hover:bg-[#5B3F2C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6F4E37]"
          >
            Log Out
          </button>

        </div>

      </div>

    </div>
  );
};

export default AdminLogoutModal;