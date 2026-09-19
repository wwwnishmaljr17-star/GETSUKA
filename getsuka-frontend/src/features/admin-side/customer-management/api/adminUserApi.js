import adminAxios from "../../../../lib/adminAxios";

/* =========================================
   GET ALL USERS
========================================= */

export const getUsers = async ({
  search = "",
  page = 1,
  limit = 10,
}) => {
  try {
    const response = await adminAxios.get(
      "/api/admin/users",
      {
        params: {
          search,
          page,
          limit,
        },
      }
    );

    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Failed to fetch users"
    );
  }
};


/* =========================================
   GET SINGLE USER
========================================= */

export const getUserById = async (userId) => {
  try {
    const response = await adminAxios.get(
      `/api/admin/users/${userId}`
    );

    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Failed to fetch user"
    );
  }
};


/* =========================================
   BLOCK USER
========================================= */

export const blockUser = async (userId) => {
  try {
    const response = await adminAxios.patch(
      `/api/admin/users/${userId}/block`
    );

    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Failed to block user"
    );
  }
};


/* =========================================
   UNBLOCK USER
========================================= */

export const unblockUser = async (userId) => {
  try {
    const response = await adminAxios.patch(
      `/api/admin/users/${userId}/unblock`
    );

    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Failed to unblock user"
    );
  }
};


/* =========================================
   DELETE USER
========================================= */

export const deleteUser = async (userId) => {
  try {
    const response = await adminAxios.delete(
      `/api/admin/users/${userId}`
    );

    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Failed to delete user"
    );
  }
};