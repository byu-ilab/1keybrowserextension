import Login from "./pages/Login";
import NewUser from "./pages/NewUser";
import Register from "./pages/Register";
import NewDevice from "./pages/NewDevice"; //ADDED
import ForgotPassword from "./pages/ForgotPassword";
import Main from "./pages/Main";

import {
  checkForRegisteredUser,
  isLoggedIn
} from "./tools/UserDatabase.js";

export default [
  {
    path: "/",
    component: Main,
    name: 'Main',
    beforeEnter: checkStatus
  },
  {
    path: "/login",
    name: 'Login',
    component: Login,
    beforeEnter: ifRegistered
  },
  {
    path: "/new-user",
    name: "New User",
    component: NewUser,
    beforeEnter: ifNotRegistered
  },
  {
    path: "/register",
    name: "Register",
    component: Register,
    beforeEnter: ifNotRegistered
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

];

async function checkStatus(to, from) {
  // first check if we have a registered user. If not, we need to go to the account creation / add new device page
  let registered = await checkForRegisteredUser();
  console.log("registration status", registered);
  if (!registered)
    return { name: 'New User'};

  // now check if we are logged in  
  let loggedIn = await isLoggedIn();
  console.log("loggedIn status", loggedIn);
  // if we are not logged in, then go to the login page
  if (!loggedIn)
    return { name: 'Login'};
  
  // otherwise, go to the main page
  return true;

  // we used to check device cert expiration here -- not sure if we need this
  // this.checkDeviceCertExpiration(userInfo.authname);
}

async function ifRegistered(to, from) {
  let registered = await checkForRegisteredUser();
  console.log("registration status", registered);
  if (!registered)
    return {name: 'NewUser'};

  return true;
}

async function ifNotRegistered(to, from) {
  let registered = await checkForRegisteredUser();
  console.log("registration status", registered);
  if (registered)
    return false;

  return true;
}