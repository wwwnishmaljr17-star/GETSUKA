import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import Admin from "../models/Admin.js";

dotenv.config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected");

    const admins = [
      {
        fullName: "GETSUKA Admin",
        email: "admin@getsuka.com",
        password: "Admin@12345",
      },
      {
        fullName: "Nishmal",
        email: "nishmal.1221@gmail.com",
        password: "Admin@12345",
      },
    ];

    for (const adminData of admins) {
      const existingAdmin = await Admin.findOne({
        email: adminData.email,
      });

      if (existingAdmin) {
        console.log(
          `Admin already exists: ${adminData.email}`
        );
        continue;
      }

      const hashedPassword = await bcrypt.hash(
        adminData.password,
        10
      );

      await Admin.create({
        fullName: adminData.fullName,
        email: adminData.email,
        password: hashedPassword,
        role: "admin",
      });

      console.log(
        `Admin created successfully: ${adminData.email}`
      );
    }

    process.exit(0);
  } catch (error) {
    console.error(
      "Failed to create admin:",
      error.message
    );

    process.exit(1);
  }
};

createAdmin();