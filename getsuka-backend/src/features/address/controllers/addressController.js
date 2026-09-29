import Address from "../models/Address.js";

// ============================================
// ADD ADDRESS
// ============================================

export const addAddress = async (req, res) => {
  try {
    const userId = req.user.userId;

    const {
      fullName,
      phone,
      addressLine,
      city,
      state,
      pincode,
      isDefault,
    } = req.body;

    if (
      !fullName?.trim() ||
      !phone?.trim() ||
      !addressLine?.trim() ||
      !city?.trim() ||
      !state?.trim() ||
      !pincode?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "All address fields are required",
      });
    }

    if (!/^\d{10}$/.test(phone.trim())) {
      return res.status(400).json({
        success: false,
        message:
          "Phone number must be exactly 10 digits",
      });
    }

    if (!/^\d{6}$/.test(pincode.trim())) {
      return res.status(400).json({
        success: false,
        message:
          "Pincode must be exactly 6 digits",
      });
    }

    const existingAddressCount =
      await Address.countDocuments({
        userId,
      });

    const shouldBeDefault =
      existingAddressCount === 0 ||
      Boolean(isDefault);

    if (shouldBeDefault) {
      await Address.updateMany(
        {
          userId,
          isDefault: true,
        },
        {
          $set: {
            isDefault: false,
          },
        }
      );
    }

    const address = await Address.create({
      userId,
      fullName: fullName.trim(),
      phone: phone.trim(),
      addressLine: addressLine.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      isDefault: shouldBeDefault,
    });

    return res.status(201).json({
      success: true,
      message: "Address added successfully",
      address,
    });
  } catch (error) {
    console.error(
      "Add Address Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to add address",
    });
  }
};

// ============================================
// GET USER ADDRESSES
// ============================================

export const getUserAddresses = async (
  req,
  res
) => {
  try {
    const userId = req.user.userId;

    const addresses =
      await Address.find({ userId }).sort({
        isDefault: -1,
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      addresses,
    });
  } catch (error) {
    console.error(
      "Get Addresses Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch addresses",
    });
  }
};

// ============================================
// UPDATE ADDRESS
// ============================================

export const updateAddress = async (
  req,
  res
) => {
  try {
    const userId = req.user.userId;
    const { addressId } = req.params;

    const {
      fullName,
      phone,
      addressLine,
      city,
      state,
      pincode,
      isDefault,
    } = req.body;

    if (
      !fullName?.trim() ||
      !phone?.trim() ||
      !addressLine?.trim() ||
      !city?.trim() ||
      !state?.trim() ||
      !pincode?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "All address fields are required",
      });
    }

    if (!/^\d{10}$/.test(phone.trim())) {
      return res.status(400).json({
        success: false,
        message:
          "Phone number must be exactly 10 digits",
      });
    }

    if (!/^\d{6}$/.test(pincode.trim())) {
      return res.status(400).json({
        success: false,
        message:
          "Pincode must be exactly 6 digits",
      });
    }

    const address = await Address.findOne({
      _id: addressId,
      userId,
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    if (Boolean(isDefault)) {
      await Address.updateMany(
        {
          userId,
          _id: {
            $ne: addressId,
          },
          isDefault: true,
        },
        {
          $set: {
            isDefault: false,
          },
        }
      );

      address.isDefault = true;
    } else if (address.isDefault) {
      address.isDefault = true;
    } else {
      address.isDefault = false;
    }

    address.fullName =
      fullName.trim();

    address.phone =
      phone.trim();

    address.addressLine =
      addressLine.trim();

    address.city =
      city.trim();

    address.state =
      state.trim();

    address.pincode =
      pincode.trim();

    await address.save();

    return res.status(200).json({
      success: true,
      message:
        "Address updated successfully",
      address,
    });
  } catch (error) {
    console.error(
      "Update Address Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update address",
    });
  }
};

// ============================================
// DELETE ADDRESS
// ============================================

export const deleteAddress = async (
  req,
  res
) => {
  try {
    const userId = req.user.userId;
    const { addressId } = req.params;

    // ========================================
    // FIND ADDRESS
    // ========================================

    const address = await Address.findOne({
      _id: addressId,
      userId,
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    // ========================================
    // CHECK IF DEFAULT
    // ========================================

    const wasDefault =
      address.isDefault;

    // ========================================
    // DELETE
    // ========================================

    await Address.deleteOne({
      _id: addressId,
      userId,
    });

    // ========================================
    // IF DEFAULT WAS DELETED,
    // MAKE ANOTHER ADDRESS DEFAULT
    // ========================================

    if (wasDefault) {
      const nextAddress =
        await Address.findOne({
          userId,
        }).sort({
          createdAt: -1,
        });

      if (nextAddress) {
        nextAddress.isDefault = true;

        await nextAddress.save();
      }
    }

    return res.status(200).json({
      success: true,
      message:
        "Address deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete Address Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete address",
    });
  }
};