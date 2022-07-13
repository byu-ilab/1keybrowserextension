<template>
  <div id="app">
    <div class="header">
      <div class="title">Let's Authenticate</div>
      <img class="logo" src="../icons/key-hole-medium.png"/>
    </div>
    <div class="content">
      <router-view />
    </div>
  </div>
</template>

<script>
/**
 * App.vue
 * Root of popup.
 * Determines whether to display Main.vue (logged in screen)
 * or Home.vue (screen to select how to authenticate)
 */

import { getAuthCert } from "./router/tools/CertDatabase.js";
import {
  checkForRegisteredUser,
} from "./router/tools/UserDatabase.js";
import { isTimeExpired } from "./router/tools/CertGen.js";
import {
  getLoggedInValue,
} from "./router/tools/LocalStorage.js";
export default {
  data() {
    return {
      loggedIn: false,
      deviceCertExpired: false
    };
  },
  async beforeCreate() {
    // first check if we have a registered user. If not, we need to go to the account creation / add new device page
    let registered = await checkForRegisteredUser();
    if (!registered) {
      this.$router.push("/new-user");
      return;
    }

    // now check if we are logged in
    this.loggedIn = await getLoggedInValue();
    // if we are logged in, then go to the main page
    if (loggedIn) {
      return;
    }
    // otherwise, go to the login page
    this.$router.push("/login");

    // we used to check device cert expiration here -- not sure if we need this
    // this.checkDeviceCertExpiration(userInfo.authname);
  },
  methods: {
    /**
     * Checks if the most recent device cert is expired. If so, user must login again.
     * @param devicename String name of the authenticator currently being used.
     */
    async checkDeviceCertExpiration(devicename) {
      let expirationTime = (await getAuthCert(devicename)).expire;
      this.deviceCertExpired = isTimeExpired(expirationTime);
    }
  }
};
</script>

<style>
@import url("https://fonts.googleapis.com/css2?family=Roboto:wght@400&display=swap");
@import url("https://fonts.googleapis.com/css2?family=Archivo:wght@100&family=Roboto:wght@400;700&display=swap");


:root {
  --black: #000;
  --blue: #219EBC;
  --orange: #FB8500;
  --dk-green: #165663;
  --logo-gray: #373c3d;
  --lt-gray: #c8d1d7;
  --scroll-box: #c8d3d8;
  --fail-red: #b22222;
  --n-gray: #5b6870;
  --n-replace-white: #22292e;
  --v-dk-green: #062e36;
  --n-fail-red: #ff8f8f;
  --n-borders-black: #121719;
}

#app {
  font-family: "Roboto", sans-serif;
  font-size: 16px;
  width: 600px;
  height: 400px;
}

body {
  margin: 0;
  background: white;
}

h1 {
  font-size: 20px;
}

h2 {
  font-size: 20px;
}

button {
  background-color: #FB8500;
  border: none;
  color: white;
  padding: 15px 32px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 16px;
  margin: 4px 2px;
  cursor: pointer;
  -webkit-transition-duration: 0.4s; /* Safari */
  transition-duration: 0.4s;
}

button:hover {
  box-shadow: 0 8px 16px 0 rgba(0,0,0,0.2), 0 6px 20px 0 rgba(0,0,0,0.19);
}

.blue {
  background-color: #023047;
}


.header {
  display: flex;
  align-items: center;
  flex-direction: column;
  background-color: #219EBC;
  height: 100px;
  padding-top: 10px;
}

.title {
  font-family: "Raleway", serif;
  font-size: 30px;
  color: white;
}

.logo {
  width: 60px;
}

.content {
  display: flex;
  flex-direction: column;
  text-align: center;
}

.padded {
  padding: 10px 50px;
}

</style>
