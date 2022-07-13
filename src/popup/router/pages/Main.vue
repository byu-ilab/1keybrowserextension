<template>
  <div class="app">

    <div class="body">
      <div class="menu" id="menu">
        <div
          :class="[{selectedMenuItem: isSelected('requests')}, 'menuItem']"
          id="requests"
          @click="selectMenuItem('requests')"
        >
          Login Requests
        </div>
        <div
          :class="[{selectedMenuItem: isSelected('accounts')}, 'menuItem']"
          @click="selectMenuItem('accounts')">
          Website Accounts
        </div>
        <div
          :class="[{selectedMenuItem: isSelected('devices')}, 'menuItem']"
          @click="selectMenuItem('devices')">
          Devices I'm logged into
        </div>
        <div
          :class="[{selectedMenuItem: isSelected('lostAuth')}, 'menuItem']"
          @click="selectMenuItem('lostAuth')">
          Lost Authenticator?
        </div>
      </div>

      <div v-if="selected == 'requests' && requestReceived">
        <Request />
      </div>

      <div
        class="componentContainer"
        v-if="selected == 'requests' && !requestReceived"
      >
        <div class="noRequest">There are no pending requests</div>
        <p>
          If you login to a website using Let's Authenticate, requests will
          appear here.
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
  },
  methods: {
     isSelected(menuName) {
      return menuName === this.selected;
    },
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
    selectMenuItem(menuName) {
      this.selected = menuName;
    }
  }
};
</script>

<style scoped>

.content {
  padding: 0px;
}  

.body {
  display: flex;
  flex-direction: row;
}

.menu {
  display: flex;
  flex-direction: column;
  background: var(--white);
  width: 95px;
}

.menuItem {
  width: 100px;
  height: 50px;
  padding: 5px;
  background: var(--black);
  color: white;
  font-size: 14px;
  border-right: 1px solid white;
  border-bottom: 1px solid white;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  cursor: pointer;
}

.selectedMenuItem {
  background: white;
  color: #000;
}

.footer {
  width: 100%;
  height: 40px;
  background: var(--black);
  border-top: 1px solid white;
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
  padding: 30px;
  text-align: left;
}

.noRequest {
  font-size: 25px;
  font-weight: bold;
}

</style>
