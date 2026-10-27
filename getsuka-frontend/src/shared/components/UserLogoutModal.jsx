import { useEffect } from "react";

const UserLogoutModal = ({
  show,
  onCancel,
  onConfirm,
  loading = false,
}) => {
  useEffect(() => {
    if (!show) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !loading) {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [show, onCancel, loading]);

  if (!show) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-[#211B18]/60 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-logout-modal-title"
    >
      <div className="w-full max-w-[390px] overflow-hidden rounded-md border border-[#E5E4E2] bg-white shadow-[0_25px_60px_rgba(33,27,24,0.18)]">
        {/* HEADER */}
        <div className="border-b border-[#E5E4E2] px-6 py-6 bg-[#FAF9F7]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E6E0F0] text-[#6F4E37] text-base font-bold">
              ↪
            </div>
            <div>
              <h2
                id="user-logout-modal-title"
                className="text-sm font-bold text-[#252321] tracking-[0.1em] uppercase"
              >
                Sign Out
              </h2>
              <p className="mt-0.5 text-[11px] text-[#716C67]">
                GETSUKA Luxury Apparel
              </p>
            </div>
          </div>
        </div>

        {/* MESSAGE */}
        <div className="px-6 py-5 bg-white">
          <p className="text-xs leading-relaxed text-[#716C67]">
            Are you sure you want to sign out of your GETSUKA account?
          </p>
        </div>

        {/* ACTIONS */}
        <div className="flex gap-3 border-t border-[#E5E4E2] bg-[#FAF9F7] px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="h-10 flex-1 rounded border border-[#D8D3CF] bg-white text-[11px] font-semibold uppercase tracking-wider text-[#252321] transition hover:border-[#6F4E37] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6F4E37] disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="h-10 flex-1 rounded bg-[#6F4E37] text-[11px] font-semibold uppercase tracking-wider text-white transition hover:bg-[#5B3F2C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6F4E37] disabled:opacity-50 shadow-xs"
          >
            {loading ? "Signing Out..." : "Sign Out"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserLogoutModal;
