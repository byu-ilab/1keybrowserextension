<template>
  <div id="app">
    <router-view />
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
  getUserInfo
} from "./router/tools/UserDatabase.js";
import { isTimeExpired } from "./router/tools/CertGen.js";
import {
  getLoggedInValue,
  getNightModeSetting
} from "./router/tools/LocalStorage.js";
export default {
  data() {
    return {
      loggedIn: false,
      deviceCertExpired: false
    };
  },
  async created() {
    //check if it's in night mode
    this.$root.$data.nightMode = await getNightModeSetting();
    if (this.$root.$data.nightMode) {
      document.body.style.backgroundColor = "var(--n-replace-white)";
    }

    //home page is pushed for non-registered accounts, logged out accounts,
    //or when user is logged in but auth cert has expired
    let userInfo = await getUserInfo();
    if (await checkForRegisteredUser()) {
      this.loggedIn = await getLoggedInValue();
      if (this.loggedIn) {
        this.checkDeviceCertExpiration(userInfo.authname);
        if (this.deviceCertExpired) {
          //user is logged in, but auth cert is expired
          this.$router.push("/home");
        }
      } else {
        //user is logged out
        this.$router.push("/home");
      }
    } else {
      //if user isn't registered
      this.$router.push("/home");
    }
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
@import url("https://fonts.googleapis.com/css2?family=Montserrat:wght@200&display=swap");

:root {
  --dk-green: #165663;
  --logo-gray: #899fa3;
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
  font-family: "Montserrat", sans-serif;
}

body {
  margin: 0;
  background: white;
}

h2 {
  font-size: 20px;
}
</style>
