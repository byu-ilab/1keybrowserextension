<template>
  <div id="body">
    <div class="accountDetails" v-show="!changePassword">
      <h2>Account Details</h2>
      <div id="top" class="title">
        <img
          id="userIcon"
          src="../../../icons/user-blue.png"
          width="50px"
          height="50px"
        />
        <div class="info">
          <strong style="font-size: 20px">{{ username }}</strong>
          This Device: {{ authname }}
        </div>
      </div>

      <div class="buttonRow" v-show="!changePassword">
        <div class="accountDetailsButton" id="syncButton" @click="syncAccount">
          <img
            id="syncIcon"
            src="../../../icons/mobile-sync.png"
            width="38px"
            height="38px"
          />
          Sync Account
        </div>
        <div
          class="accountDetailsButton"
          id="passwordButton"
          @click="switchToChangePassword"
        >
          <img
            id="editIcon"
            src="../../../icons/smart-key.png"
            width="38px"
            height="38px"
          />
          Change Password
        </div>
      </div>

      <div class="syncSuccess" v-show="justSynced">
        Account Sync Successful!
      </div>

      <div id="failSync" class="syncFail" v-show="syncFail">
        Account failed to sync. Please try again.
      </div>
    </div>

    <div v-show="changePassword">
      <ChangePassword />
    </div>
  </div>
</template>

<script>
/**
 * AccountDetails.vue
 * Displays 1Key user information, button for updating recovery data,
 * and button to edit master password.
 */

import { updateAllCertsList } from "../tools/CertGen.js";
import { getUserInfo } from "../tools/UserDatabase.js";
import ChangePassword from "./ChangePassword.vue";
export default {
  name: "Accounts",
  data() {
    return {
      username: "",
      authname: "",
      password: "",
      changePassword: false,
      justSynced: false,
      syncFail: false,
      loading: false
    };
  },
  components: {
    ChangePassword
  },
  async created() {
    //get pertinent info to display about user
    let userInfo = await getUserInfo();
    this.password = userInfo.password;
    this.username = userInfo.username;
    this.authname = userInfo.authname;
  },
  mounted() {
    this.changeToNightMode();
  },
  methods: {
    /**
     * Calls an update to recovery data.
     */
    async syncAccount() {
      //while syncing occurs button disables and stays highlighted to indicate loading
      document.getElementById("syncButton").className = "loadingButton";

      //called when user clicks sync button.
      //It updates certs in db so accounts/devices/authenticators pages are up to date
      let possibleError = await updateAllCertsList();
      if (possibleError === "error") {
        this.syncFail = true;
        this.justSynced = false;
      } else {
        this.justSynced = true;
        this.syncFail = false;
      }

      document.getElementById("syncButton").className = "accountDetailsButton";
    },
    /**
     * Changes the html displayed to be ChangePassword.vue instead of buttons and user information
     */
    switchToChangePassword() {
      this.changePassword = true;
      this.justSynced = false;
      this.syncFail = false;
    },
    /**
     * Changes css on component to night mode colors if night mode setting is on.
     */
    changeToNightMode() {
      if (this.$root.$data.nightMode) {
        document.getElementById("body").style.color = "white";
        document.getElementById("top").style.color = "white";
        document.getElementById("top").style.backgroundColor =
          "var(--dk-green)";
        document.getElementById("userIcon").src = "../../../icons/user.png";
        document.getElementById("failSync").style.color = "var(--n-fail-red)";
        document.getElementById("syncButton").style.color = "var(--logo-gray)";
        document.getElementById("passwordButton").style.color =
          "var(--logo-gray)";
        document.getElementById("syncIcon").src =
          "../../../icons/mobile-sync-night.png";
        document.getElementById("editIcon").src =
          "../../../icons/smart-key-night.png";
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.accountDetails {
  display: flex;
  flex-direction: column;
  text-align: center;
}

.title {
  margin: 0px 20px 10px 20px;
  display: flex;
  flex-direction: row;
  background-color: var(--scroll-box);
  color: var(--dk-green);
  border-radius: 3px;
  padding: 12px;
  width: 280px;
  box-shadow: 0.1em 0.1em 0.1em rgba(0, 0, 0, 0.3);
}

.info {
  display: flex;
  flex-direction: column;
  text-align: start;
  justify-content: center;
  align-items: flex-start;
  margin-left: 12px;
  font-weight: bold;
  font-size: 12px;
}

.loadingButton {
  text-align: center;
  padding: 10px;
  width: 75px;
  height: 75px;
  border-radius: 50px;
  font-size: 12px;
  font-weight: bold;
  color: var(--dk-green);
  margin-left: 20px;
  margin-right: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(137, 159, 163, 0.2);
  pointer-events: none;
}

.loadingButton img {
  margin-bottom: 5px;
}

.accountDetailsButton {
  text-align: center;
  padding: 10px;
  width: 75px;
  height: 75px;
  border-radius: 50px;
  font-size: 12px;
  font-weight: bold;
  color: var(--dk-green);
  margin-left: 20px;
  margin-right: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.accountDetailsButton img {
  margin-bottom: 5px;
}

.accountDetailsButton:hover {
  background: rgba(137, 159, 163, 0.2);
}

.buttonRow {
  display: flex;
  flex-direction: row;
  width: 100%;
  justify-content: center;
  align-items: center;
  margin-top: 10px;
}

.syncFail {
  margin-bottom: 5px;
  font-size: 10px;
  color: var(--fail-red);
  padding: 2px;
}

.syncSuccess {
  margin-bottom: 5px;
  font-size: 10px;
  color: var(--logo-gray);
  padding: 2px;
}

.field {
  padding: 5px;
}

.instructions {
  font-size: 12px;
  color: var(--lt-gray);
  padding: 2px;
}
</style>
