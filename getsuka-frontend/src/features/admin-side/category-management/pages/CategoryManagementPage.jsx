import { useEffect, useState } from "react";
import adminAxios from "../../../../lib/adminAxios";

const CategoryManagementPage = () => {
  const [categories, setCategories] = useState([]);

  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    categoriesPerPage: 5,
    totalCategories: 0,
    totalPages: 0,
  });

  const [categoryName, setCategoryName] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [deleteModal, setDeleteModal] = useState({
    open: false,
    category: null,
  });

  // =========================================================
  // FETCH CATEGORIES
  // =========================================================

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await adminAxios.get(
        "/api/admin/categories",
        {
          params: {
            search,
            page,
            limit: 5,
          },
        }
      );

      if (response.data.success) {
        setCategories(
          response.data.categories || []
        );

        setPagination(
          response.data.pagination || {
            currentPage: page,
            categoriesPerPage: 5,
            totalCategories: 0,
            totalPages: 0,
          }
        );
      }
    } catch (error) {
      console.error(
        "Fetch Categories Error:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Failed to fetch categories"
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // INITIAL / SEARCH / PAGINATION
  // =========================================================

  useEffect(() => {
    fetchCategories();
  }, [page, search]);

  // =========================================================
  // ADD CATEGORY
  // =========================================================

  const handleAddCategory = async (event) => {
    event.preventDefault();

    const trimmedName = categoryName.trim();

    if (!trimmedName) {
      setError("Category name is required");
      setSuccess("");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await adminAxios.post(
        "/api/admin/categories",
        {
          name: trimmedName,
        }
      );

      if (response.data.success) {
        setCategoryName("");

        setSuccess(
          response.data.message ||
            "Category added successfully"
        );

        setPage(1);

        if (page === 1) {
          await fetchCategories();
        }
      }
    } catch (error) {
      console.error(
        "Add Category Error:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Failed to add category"
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // START EDIT
  // =========================================================

  const handleStartEdit = (category) => {
    setEditingId(category._id);
    setEditingName(category.name);

    setError("");
    setSuccess("");
  };

  // =========================================================
  // CANCEL EDIT
  // =========================================================

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName("");

    setError("");
  };

  // =========================================================
  // UPDATE CATEGORY
  // =========================================================

  const handleUpdateCategory = async (
    categoryId
  ) => {
    const trimmedName = editingName.trim();

    if (!trimmedName) {
      setError("Category name is required");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await adminAxios.put(
        `/api/admin/categories/${categoryId}`,
        {
          name: trimmedName,
        }
      );

      if (response.data.success) {
        setEditingId(null);
        setEditingName("");

        setSuccess(
          response.data.message ||
            "Category updated successfully"
        );

        await fetchCategories();
      }
    } catch (error) {
      console.error(
        "Update Category Error:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Failed to update category"
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // OPEN DELETE
  // =========================================================

  const handleOpenDelete = (category) => {
    setDeleteModal({
      open: true,
      category,
    });

    setError("");
    setSuccess("");
  };

  // =========================================================
  // CLOSE DELETE
  // =========================================================

  const handleCloseDelete = () => {
    setDeleteModal({
      open: false,
      category: null,
    });
  };

  // =========================================================
  // DELETE CATEGORY
  // =========================================================

  const handleDeleteCategory = async () => {
    const category = deleteModal.category;

    if (!category) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await adminAxios.delete(
        `/api/admin/categories/${category._id}`
      );

      if (response.data.success) {
        handleCloseDelete();

        setSuccess(
          response.data.message ||
            "Category deleted successfully"
        );

        if (
          categories.length === 1 &&
          page > 1
        ) {
          setPage(
            (previousPage) =>
              previousPage - 1
          );
        } else {
          await fetchCategories();
        }
      }
    } catch (error) {
      console.error(
        "Delete Category Error:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Failed to delete category"
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // SEARCH
  // =========================================================

  const handleSearch = (event) => {
    setSearch(event.target.value);
    setPage(1);
  };

  // =========================================================
  // CLEAR SEARCH
  // =========================================================

  const handleClearSearch = () => {
    setSearch("");
    setPage(1);
    setError("");
    setSuccess("");
  };

  // =========================================================
  // PAGINATION
  // =========================================================

  const handlePreviousPage = () => {
    if (page > 1) {
      setPage(
        (previousPage) =>
          previousPage - 1
      );
    }
  };

  const handleNextPage = () => {
    if (
      page < pagination.totalPages
    ) {
      setPage(
        (previousPage) =>
          previousPage + 1
      );
    }
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="min-h-full bg-white text-[#172033]">

      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <section className="border-b border-[#edf1f6] px-[26px] pb-[24px] pt-[25px]">

        {/* BREADCRUMB */}

        <div className="flex items-center gap-[8px] text-[9px]">

          <span className="font-medium text-[#1557f5]">
            Dashboard
          </span>

          <span className="text-[#b5bfcc]">
            /
          </span>

          <span className="text-[#8b97a8]">
            Categories
          </span>

        </div>

        {/* TITLE */}

        <div className="mt-[22px] flex flex-col gap-[15px] sm:flex-row sm:items-end sm:justify-between">

          <div>

            <h1 className="text-[25px] font-semibold tracking-[-0.035em] text-[#162033]">
              Categories
            </h1>

            <p className="mt-[7px] text-[11px] text-[#8290a3]">
              Manage categories for the GETSUKA
              product catalogue.
            </p>

          </div>

          <div className="rounded-full bg-[#f1f6ff] px-[13px] py-[7px] text-[9px] font-medium text-[#1557f5]">

            {pagination.totalCategories}{" "}
            categories

          </div>

        </div>

      </section>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <div className="px-[26px] py-[22px]">

        {/* ===================================================
            ALERTS
        =================================================== */}

        {success && (
          <div className="mb-[14px] flex items-center gap-[9px] rounded-[9px] border border-[#bcebd5] bg-[#f0fff8] px-[14px] py-[11px] text-[10px] text-[#128052]">

            <span className="flex h-[19px] w-[19px] items-center justify-center rounded-full bg-[#d5f8e7] text-[10px]">
              ✓
            </span>

            {success}

          </div>
        )}

        {error && (
          <div className="mb-[14px] flex items-center gap-[9px] rounded-[9px] border border-[#ffd1d8] bg-[#fff5f6] px-[14px] py-[11px] text-[10px] text-[#d93650]">

            <span className="flex h-[19px] w-[19px] items-center justify-center rounded-full bg-[#ffe0e5] text-[10px]">
              !
            </span>

            {error}

          </div>
        )}

        {/* ===================================================
            ADD CATEGORY
        =================================================== */}

        <section className="overflow-hidden rounded-[12px] border border-[#e2e8f1] bg-white shadow-[0_4px_18px_rgba(30,64,175,0.04)]">

          <div className="flex items-center justify-between border-b border-[#edf1f6] px-[18px] py-[15px]">

            <div>

              <p className="text-[12px] font-semibold text-[#1c2940]">
                Add Category
              </p>

              <p className="mt-[4px] text-[9px] text-[#8b97a8]">
                Create a new product category.
              </p>

            </div>

            <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[#edf4ff] text-[17px] font-light text-[#1557f5]">
              +
            </div>

          </div>

          <form
            onSubmit={handleAddCategory}
            className="flex flex-col gap-[11px] p-[18px] sm:flex-row sm:items-end"
          >

            <div className="flex-1">

              <label className="mb-[7px] block text-[9px] font-medium text-[#66758a]">
                Category Name
              </label>

              <input
                type="text"
                value={categoryName}
                onChange={(event) =>
                  setCategoryName(
                    event.target.value
                  )
                }
                placeholder="e.g. One Piece"
                className="h-[42px] w-full rounded-[8px] border border-[#dfe6ef] bg-[#fbfcfe] px-[13px] text-[11px] text-[#263247] outline-none transition placeholder:text-[#aab4c2] focus:border-[#7ba7ff] focus:bg-white focus:ring-[3px] focus:ring-[#1557f5]/5"
              />

            </div>

            <button
              type="submit"
              disabled={saving}
              className="h-[42px] min-w-[145px] rounded-[8px] bg-[#1557f5] px-[18px] text-[10px] font-semibold text-white shadow-[0_5px_14px_rgba(21,87,245,0.15)] transition hover:bg-[#0d49d8] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "ADDING..."
                : "+  ADD CATEGORY"}
            </button>

          </form>

        </section>

        {/* ===================================================
            CATEGORY LIST
        =================================================== */}

        <section className="mt-[16px] overflow-hidden rounded-[12px] border border-[#e2e8f1] bg-white shadow-[0_4px_18px_rgba(30,64,175,0.04)]">

          {/* LIST HEADER */}

          <div className="border-b border-[#edf1f6] px-[18px] py-[15px]">

            <div className="flex flex-col gap-[12px] lg:flex-row lg:items-center lg:justify-between">

              <div>

                <p className="text-[12px] font-semibold text-[#1c2940]">
                  Category List
                </p>

                <p className="mt-[4px] text-[9px] text-[#8b97a8]">
                  Active categories in your product
                  catalogue.
                </p>

              </div>

              {/* SEARCH */}

              <div className="flex gap-[8px]">

                <div className="relative">

                  <span className="absolute left-[12px] top-1/2 -translate-y-1/2 text-[14px] text-[#8e9bad]">
                    ⌕
                  </span>

                  <input
                    type="text"
                    value={search}
                    onChange={handleSearch}
                    placeholder="Search categories..."
                    className="h-[39px] w-full rounded-[8px] border border-[#dfe6ef] bg-[#fbfcfe] pl-[34px] pr-[12px] text-[10px] text-[#263247] outline-none transition placeholder:text-[#aab4c2] focus:border-[#7ba7ff] focus:bg-white sm:w-[245px]"
                  />

                </div>

                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="h-[39px] rounded-[8px] border border-[#dfe6ef] bg-white px-[14px] text-[9px] font-medium text-[#718096] transition hover:border-[#b8c5d7] hover:bg-[#f7faff] hover:text-[#1557f5]"
                >
                  Clear
                </button>

              </div>

            </div>

          </div>

          {/* =================================================
              TABLE
          ================================================= */}

          <div className="overflow-x-auto">

            <table className="w-full min-w-[760px] border-collapse">

              <thead>

                <tr className="h-[46px] border-b border-[#edf1f6] bg-[#f8faff]">

                  <th className="w-[65px] px-[18px] text-left text-[8px] font-semibold uppercase tracking-[0.07em] text-[#7c899b]">
                    #
                  </th>

                  <th className="px-[18px] text-left text-[8px] font-semibold uppercase tracking-[0.07em] text-[#7c899b]">
                    Category
                  </th>

                  <th className="w-[180px] px-[18px] text-left text-[8px] font-semibold uppercase tracking-[0.07em] text-[#7c899b]">
                    Created
                  </th>

                  <th className="w-[150px] px-[18px] text-left text-[8px] font-semibold uppercase tracking-[0.07em] text-[#7c899b]">
                    Status
                  </th>

                  <th className="w-[210px] px-[18px] text-right text-[8px] font-semibold uppercase tracking-[0.07em] text-[#7c899b]">
                    Actions
                  </th>

                </tr>

              </thead>

              <tbody>

                {/* LOADING */}

                {loading ? (
                  <tr>

                    <td
                      colSpan="5"
                      className="h-[280px] text-center"
                    >

                      <div className="flex flex-col items-center">

                        <div className="h-[27px] w-[27px] animate-spin rounded-full border-[2px] border-[#dce5f2] border-t-[#1557f5]" />

                        <p className="mt-[12px] text-[9px] text-[#8996a8]">
                          Loading categories...
                        </p>

                      </div>

                    </td>

                  </tr>
                ) : categories.length === 0 ? (
                  <tr>

                    <td
                      colSpan="5"
                      className="h-[280px] text-center"
                    >

                      <div className="flex flex-col items-center">

                        <div className="flex h-[55px] w-[55px] items-center justify-center rounded-full bg-[#f1f6ff] text-[22px] text-[#8da9dc]">
                          ◇
                        </div>

                        <p className="mt-[13px] text-[10px] font-medium text-[#617087]">
                          No categories found
                        </p>

                        <p className="mt-[5px] text-[8px] text-[#9aa6b6]">
                          Add your first category
                          above.
                        </p>

                      </div>

                    </td>

                  </tr>
                ) : (
                  categories.map(
                    (category, index) => {

                      const rowNumber =
                        (page - 1) * 5 +
                        index +
                        1;

                      const isEditing =
                        editingId ===
                        category._id;

                      return (
                        <tr
                          key={category._id}
                          className="h-[72px] border-b border-[#edf1f6] last:border-0 transition hover:bg-[#f8faff]"
                        >

                          {/* NUMBER */}

                          <td className="px-[18px] text-[9px] font-medium text-[#a1adbd]">
                            {String(
                              rowNumber
                            ).padStart(2, "0")}
                          </td>

                          {/* NAME */}

                          <td className="px-[18px]">

                            {isEditing ? (
                              <input
                                type="text"
                                value={editingName}
                                onChange={(event) =>
                                  setEditingName(
                                    event.target.value
                                  )
                                }
                                autoFocus
                                className="h-[37px] w-full max-w-[360px] rounded-[7px] border border-[#7ba7ff] bg-white px-[12px] text-[10px] text-[#263247] outline-none ring-[3px] ring-[#1557f5]/5"
                              />
                            ) : (
                              <div className="flex items-center gap-[11px]">

                                <div className="flex h-[36px] w-[36px] items-center justify-center rounded-[8px] border border-[#dce7f7] bg-[#f1f6ff] text-[13px] text-[#1557f5]">
                                  ◇
                                </div>

                                <div>

                                  <p className="text-[10px] font-semibold text-[#263247]">
                                    {category.name}
                                  </p>

                                  <p className="mt-[4px] text-[7px] uppercase tracking-[0.08em] text-[#9aa6b6]">
                                    GETSUKA Category
                                  </p>

                                </div>

                              </div>
                            )}

                          </td>

                          {/* CREATED */}

                          <td className="px-[18px] text-[9px] text-[#7c899b]">

                            {category.createdAt
                              ? new Date(
                                  category.createdAt
                                ).toLocaleDateString(
                                  "en-IN",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  }
                                )
                              : "-"}

                          </td>

                          {/* STATUS */}

                          <td className="px-[18px]">

                            <span className="inline-flex items-center gap-[7px] rounded-full border border-[#b9efd8] bg-[#effcf6] px-[10px] py-[6px] text-[7px] font-medium uppercase tracking-[0.05em] text-[#11845b]">

                              <span className="h-[5px] w-[5px] rounded-full bg-[#17b978]" />

                              Active

                            </span>

                          </td>

                          {/* ACTIONS */}

                          <td className="px-[18px]">

                            <div className="flex justify-end gap-[7px]">

                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    disabled={saving}
                                    onClick={() =>
                                      handleUpdateCategory(
                                        category._id
                                      )
                                    }
                                    className="h-[32px] rounded-[7px] bg-[#1557f5] px-[13px] text-[8px] font-medium text-white transition hover:bg-[#0d49d8] disabled:opacity-50"
                                  >
                                    ✓ SAVE
                                  </button>

                                  <button
                                    type="button"
                                    disabled={saving}
                                    onClick={
                                      handleCancelEdit
                                    }
                                    className="h-[32px] rounded-[7px] border border-[#dce4ee] bg-white px-[13px] text-[8px] font-medium text-[#718096] transition hover:bg-[#f5f8fd] hover:text-[#263247] disabled:opacity-50"
                                  >
                                    CANCEL
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleStartEdit(
                                        category
                                      )
                                    }
                                    className="h-[32px] rounded-[7px] border border-[#dce4ee] bg-white px-[13px] text-[8px] font-medium text-[#617087] transition hover:border-[#aebed2] hover:bg-[#f7faff] hover:text-[#1557f5]"
                                  >
                                    ✎ EDIT
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleOpenDelete(
                                        category
                                      )
                                    }
                                    className="h-[32px] rounded-[7px] border border-[#ffd2d9] bg-[#fff6f7] px-[13px] text-[8px] font-medium text-[#d93650] transition hover:bg-[#ffe9ed]"
                                  >
                                    ⌫ DELETE
                                  </button>
                                </>
                              )}

                            </div>

                          </td>

                        </tr>
                      );
                    }
                  )
                )}

              </tbody>

            </table>

          </div>

          {/* =================================================
              PAGINATION
          ================================================= */}

          <div className="flex flex-col gap-[12px] border-t border-[#edf1f6] px-[18px] py-[14px] sm:flex-row sm:items-center sm:justify-between">

            <p className="text-[8px] text-[#8996a8]">

              Showing{" "}

              <span className="font-medium text-[#4c5b70]">
                {categories.length}
              </span>

              {" "}of{" "}

              <span className="font-medium text-[#4c5b70]">
                {pagination.totalCategories}
              </span>

              {" "}categories

            </p>

            <div className="flex items-center gap-[6px]">

              {/* PREVIOUS */}

              <button
                type="button"
                onClick={
                  handlePreviousPage
                }
                disabled={
                  page <= 1 ||
                  loading
                }
                className="flex h-[34px] w-[34px] items-center justify-center rounded-[7px] border border-[#dce4ee] bg-white text-[13px] text-[#7b8798] transition hover:border-[#9db7e8] hover:bg-[#f5f8ff] hover:text-[#1557f5] disabled:cursor-not-allowed disabled:opacity-30"
              >
                ‹
              </button>

              {/* CURRENT PAGE */}

              <div className="flex h-[34px] min-w-[34px] items-center justify-center rounded-[7px] bg-[#1557f5] px-[9px] text-[9px] font-medium text-white shadow-[0_4px_12px_rgba(21,87,245,0.18)]">
                {pagination.currentPage ||
                  page}
              </div>

              {/* NEXT */}

              <button
                type="button"
                onClick={
                  handleNextPage
                }
                disabled={
                  page >=
                    pagination.totalPages ||
                  loading
                }
                className="flex h-[34px] w-[34px] items-center justify-center rounded-[7px] border border-[#dce4ee] bg-white text-[13px] text-[#7b8798] transition hover:border-[#9db7e8] hover:bg-[#f5f8ff] hover:text-[#1557f5] disabled:cursor-not-allowed disabled:opacity-30"
              >
                ›
              </button>

            </div>

          </div>

        </section>

      </div>

      {/* =====================================================
          DELETE MODAL
      ===================================================== */}

      {deleteModal.open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#102047]/35 px-4 backdrop-blur-[4px]">

          <div className="w-full max-w-[410px] overflow-hidden rounded-[14px] border border-[#dce5f0] bg-white shadow-[0_25px_80px_rgba(30,64,175,0.20)]">

            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b border-[#edf1f6] px-[20px] py-[17px]">

              <div>

                <p className="text-[8px] font-semibold uppercase tracking-[0.15em] text-[#1557f5]">
                  GETSUKA / CATEGORIES
                </p>

                <h3 className="mt-[6px] text-[14px] font-semibold text-[#1b273b]">
                  Delete Category?
                </h3>

              </div>

              <button
                type="button"
                onClick={
                  handleCloseDelete
                }
                className="flex h-[28px] w-[28px] items-center justify-center rounded-full bg-[#f4f7fb] text-[16px] text-[#7d899a] transition hover:bg-[#eaf0f8] hover:text-[#263247]"
              >
                ×
              </button>

            </div>

            {/* MODAL BODY */}

            <div className="px-[20px] py-[20px]">

              <p className="text-[10px] leading-[1.7] text-[#718096]">
                Are you sure you want to delete
                this category?
              </p>

              <div className="mt-[14px] rounded-[9px] border border-[#e1e8f1] bg-[#f8faff] px-[14px] py-[12px]">

                <p className="text-[7px] font-medium uppercase tracking-[0.12em] text-[#8b97a8]">
                  Category
                </p>

                <p className="mt-[6px] text-[11px] font-semibold text-[#263247]">
                  {
                    deleteModal.category
                      ?.name
                  }
                </p>

              </div>

              <div className="mt-[13px] rounded-[8px] border border-[#ffe0a3] bg-[#fffaf0] px-[12px] py-[10px]">

                <p className="text-[8px] leading-[1.6] text-[#a16a00]">
                  ⚠ This action will soft delete
                  the category.
                </p>

              </div>

            </div>

            {/* MODAL ACTIONS */}

            <div className="flex justify-end gap-[8px] border-t border-[#edf1f6] bg-[#fafcff] px-[20px] py-[14px]">

              <button
                type="button"
                onClick={
                  handleCloseDelete
                }
                disabled={saving}
                className="h-[36px] rounded-[7px] border border-[#dce4ee] bg-white px-[16px] text-[8px] font-medium text-[#718096] transition hover:bg-[#f5f8fd] hover:text-[#263247] disabled:opacity-50"
              >
                CANCEL
              </button>

              <button
                type="button"
                onClick={
                  handleDeleteCategory
                }
                disabled={saving}
                className="h-[36px] rounded-[7px] bg-[#1557f5] px-[16px] text-[8px] font-medium text-white transition hover:bg-[#0d49d8] disabled:opacity-50"
              >
                {saving
                  ? "DELETING..."
                  : "DELETE CATEGORY"}
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default CategoryManagementPage;