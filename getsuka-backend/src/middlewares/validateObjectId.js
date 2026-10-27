import mongoose from "mongoose";

export const validateObjectId = (paramName = "id", customMessage) => {
  return (req, res, next) => {
    const value = req.params[paramName];
    if (value && !mongoose.Types.ObjectId.isValid(value)) {
      return res.status(400).json({
        success: false,
        message: customMessage || `Invalid ${paramName} format`,
      });
    }
    next();
  };
};

export default validateObjectId;
