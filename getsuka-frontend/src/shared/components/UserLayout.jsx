import UserNavbar from "./UserNavbar";
import { Outlet } from "react-router-dom";

const UserLayout = () => {
  return (
    <div className="min-h-screen bg-[#080808] text-white">

      {/* GLOBAL USER NAVBAR */}
      <UserNavbar />

      {/* CURRENT USER PAGE */}
      <Outlet />

    </div>
  );
};

export default UserLayout;