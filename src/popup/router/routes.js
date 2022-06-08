import Login from "./pages/Login";
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
    path: "/register",
    name: "Register",
    component: Register,
    props: true
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
