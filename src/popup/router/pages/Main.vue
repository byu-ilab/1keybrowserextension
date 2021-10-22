<template>
  <div class="app">
    <div class="headerContainer">
      <div class="blueStripe" />
      <div class="overlayImage">
        <img src="../../../icons/key_icon.png" width="40px" />
      </div>
      1KEY
    </div>

    <div class="body">
      <div class="menu" id="menu">
        <div
          class="selectedMenuItem"
          id="requests"
          @click="selectMenuItem('requests')"
        >
          Login Requests
        </div>
        <div class="menuItem" id="accounts" @click="selectMenuItem('accounts')">
          Website Accounts
        </div>
        <div class="menuItem" id="devices" @click="selectMenuItem('devices')">
          Devices I'm logged into
        </div>
        <div class="menuItem" id="lostAuth" @click="selectMenuItem('lostAuth')">
          Lost Authenticator?
        </div>
      </div>

      <div v-if="selected == 'requests' && requestReceived">
        <Request />
      </div>

      <div
        class="componentContainer"
        v-else-if="selected == 'requests' && !requestReceived"
      >
        <div class="noRequest">There are no pending requests.</div>
        <p>
          To receive a login request, attempt login on a website using this
          browser. If the website does not support 1Key then no request will be
          received.
        </p>
      </div>

      <div
        class="componentContainer"
        v-if="selected == 'accounts'"
        :key="this.$root.$data.updateSiteCerts"
      >
        <Accounts />
      </div>
      <div
        class="componentContainer"
        v-if="selected == 'devices'"
        :key="this.$root.$data.updateRecoveryData"
      >
        <Devices />
      </div>
      <div
        class="componentContainer"
        v-if="selected == 'lostAuth'"
        :key="this.$root.$data.updateAuthCerts"
      >
        <LostAuthenticator />
      </div>
      <div class="componentContainer" v-if="selected == 'accountDetails'">
        <AccountDetails />
      </div>
      <div class="componentContainer" v-if="selected == 'settings'">
        <Settings />
      </div>
    </div>

    <div class="footer" id="footer">
      <div>
        <img
          src="../../../icons/settings.png"
          @click="selectMenuItem('settings')"
        />
        <img
          src="../../../icons/user.png"
          id="accountDetails"
          @click="selectMenuItem('accountDetails')"
        />
      </div>
      <img src="../../../icons/logout.png" @click="logoutLetsAuthUser" />
    </div>
  </div>
</template>

<script>
/**
 * Main.vue
 * Logged in page. Contains menu bar buttons and corresponding components that display for each button.
 */

import Request from "../components/Request.vue";
import Accounts from "../components/Accounts.vue";
import Devices from "../components/Devices.vue";
import LostAuthenticator from "../components/LostAuthenticator.vue";
import AccountDetails from "../components/AccountDetails.vue";
import Settings from "../components/Settings.vue";
import {
  getAuthenticateValue,
  setLogoutCredentials
} from "../tools/LocalStorage.js";
export default {
  data() {
    return {
      selected: "requests",
      requestReceived: false
    };
  },
  components: {
    Request,
    Accounts,
    Devices,
    LostAuthenticator,
    AccountDetails,
    Settings
  },
  async created() {
    //fetch authenticate value (whether or not user is trying to use 1Key to authenticate with a website) from local storage
    this.requestReceived = await getAuthenticateValue();

    //change colors to night mode if necessary
    if (this.$root.$data.nightMode) {
      document.getElementById("accounts").className = "menuItemNight";
      document.getElementById("devices").className = "menuItemNight";
      document.getElementById("lostAuth").className = "menuItemNight";
      document.getElementById("requests").className = "selectedMenuItemNight";
      document.getElementById("footer").style.backgroundColor =
        "var(--n-borders-black)";
      document.getElementById("footer").style.borderColor = "black";
      document.getElementById("menu").style.backgroundColor =
        "var(--n-borders-black)";

      let results = await document.getElementsByClassName("componentContainer");
      for (let x = 0; x < results.length; x++) {
        results[x].style.color = "white";
      }
    }
  },
  methods: {
    /**
     * Logout the user from the 1Key extension
     */
    logoutLetsAuthUser() {
      chrome.storage.local.set({ loggedIn: false });
      setLogoutCredentials();
      if (this.$router) {
        this.$router.push("/home");
      }
    },
    /**
     * Changes component displayed based on a menu bar selection.
     *
     * @param item string identifying name of button selected
     */
    async selectMenuItem(item) {
      let menuItem = this.$root.$data.nightMode ? "menuItemNight" : "menuItem";
      let selectedItem = this.$root.$data.nightMode
        ? "selectedMenuItemNight"
        : "selectedMenuItem";

      this.selected = item;

      document.getElementById("requests").className = menuItem;
      document.getElementById("accounts").className = menuItem;
      document.getElementById("devices").className = menuItem;
      document.getElementById("lostAuth").className = menuItem;

      if (item != "accountDetails" && item != "settings") {
        document.getElementById(item).className = selectedItem;
      }

      if (item == "requests") {
        this.requestReceived = await getAuthenticateValue("letsAuthenticate");
        if (this.$root.$data.nightMode) {
          //This is a gross way of fixing a bug with Nightmode text turning black when there isn't a request
          let results = await document.getElementsByClassName(
            "componentContainer"
          );
          for (let x = 0; x < results.length; x++) {
            results[x].style.color = "white";
          }
        }
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.app {
  width: 450px;
  display: flex;
  justify-content: center;
  flex-direction: column;
}

.headerContainer {
  width: 100%;
  height: 30px;
  padding-top: 2px;
  padding-bottom: 30px;
  font-size: 30px;
  background: #165663;
  color: white;
  text-align: center;
  position: relative;
}

.overlayImage {
  position: absolute;
  margin-top: 35px;
  margin-left: 205px;
  margin-right: 205px;
}

.blueStripe {
  position: absolute;
  margin-top: 50px;
  background: #899fa3;
  height: 10px;
  width: 100%;
  box-shadow: 0.05em 0.05em 0.05em rgba(0, 0, 0, 0.3);
}

.body {
  display: flex;
  flex-direction: row;
  height: 300px;
}

.menu {
  display: flex;
  flex-direction: column;
  background: var(--lt-gray);
  width: 95px;
}

.menuItem {
  width: 94px;
  height: 50px;
  background: var(--lt-gray);
  color: #000;
  font-size: 11px;
  border-right: 1px solid var(--logo-gray);
  border-bottom: 1px solid var(--logo-gray);
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.menuItemNight {
  width: 94px;
  height: 50px;
  background: var(--n-borders-black);
  color: white;
  font-size: 11px;
  border-right: 1px solid black;
  border-bottom: 1px solid black;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.selectedMenuItem {
  width: 95px;
  height: 50px;
  background: white;
  color: #000;
  font-size: 11px;
  border-bottom: 1px solid var(--logo-gray);
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.selectedMenuItemNight {
  width: 95px;
  height: 50px;
  background: var(--n-replace-white);
  color: white;
  font-size: 11px;
  border-bottom: 1px solid black;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.footer {
  width: 100%;
  height: 40px;
  background: #c8d1d7;
  border-top: 1px solid var(--logo-gray);
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.footer img {
  height: 25px;
  width: 25px;
  margin-left: 10px;
  margin-right: 10px;
}

.logoutButton {
  background: #f6c269;
  text-align: center;
  padding: 5px;
  box-shadow: 0.1em 0.1em 0.1em rgba(0, 0, 0, 0.3);
  border-radius: 25px;
  color: #000;
  width: 100px;
  margin-top: 10px;
}

.logoutButton:hover {
  background: #b8924f;
  color: #fff;
}

.componentContainer {
  margin: 20px 10px 0px 10px;
  width: 350px;
  height: 275px;
  text-align: center;
}

.noRequest {
  font-size: 25px;
  font-weight: bold;
  padding: 60px;
}

p {
  font-size: 12px;
}
</style>
