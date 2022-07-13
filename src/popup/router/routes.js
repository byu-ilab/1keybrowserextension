import Login from "./pages/Login";
import NewUser from "./pages/NewUser";
import Register from "./pages/Register";
import NewDevice from "./pages/NewDevice"; //ADDED
import ForgotPassword from "./pages/ForgotPassword";
import Home from "./pages/Home";
import SecurityPreparation from "./pages/SecurityPreparation";
import Main from "./pages/Main";

export default [
  {
    path: "/",
    component: Main
  },
  {
    path: "/home",
    component: Home
  },
  {
    path: "/login",
    component: Login
  },
  {
    path: "/new-user",
    name: "New User",
    component: NewUser
  },
  {
    path: "/register",
    name: "Register",
    component: Register,
  },
  { //ADDED
    path: "/newdevice",
    name: "New Device",
    component: NewDevice,
    props: true
  },
  {
    path: "/forgotPassword",
    component: ForgotPassword
  },
  {
    path: "/security/",
    component: SecurityPreparation,
    name: "SecurityPreparation"
  }
];
