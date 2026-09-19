const AdminLogoutModal = ({
  show,
  onCancel,
  onConfirm,
}) => {
  if (!show) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center px-4">

      <div className="w-full max-w-[340px] bg-[#111111] border border-white/10">

        {/* HEADER */}

        <div className="px-6 py-5 border-b border-white/10">

          <h2 className="text-[15px] tracking-wide text-white">
            LOG OUT
          </h2>

          <p className="text-[8px] text-gray-500 mt-2">
            Are you sure you want to log out of the
            GETSUKA admin panel?
          </p>

        </div>

        {/* ACTIONS */}

        <div className="px-6 py-5 flex gap-3">

          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-[38px] border border-white/15 text-[8px] tracking-[0.15em] text-gray-400 hover:text-white hover:bg-white/5 transition"
          >
            CANCEL
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 h-[38px] bg-red-500 text-white text-[8px] tracking-[0.15em] hover:bg-red-600 transition"
          >
            LOG OUT →
          </button>

        </div>

      </div>

    </div>
  );
};

export default AdminLogoutModal;