<template>
  <div class="changePassword">
    <h2>Change Password</h2>

    <form id="passwordForm">
      <div class="field">
        <label for="username">Username:</label><br />
        <input type="text" id="username" name="username" />
      </div>
      <div class="field">
        <label for="pwd">New Password:</label><br />
        <input type="password" id="pwd" name="pwd" />
        <div class="instructions">
          Must be a minimum of 8 characters.
        </div>
      </div>
      <div class="field">
        <label for="pwd2">Confirm New Password:</label><br />
        <input type="password" id="pwd2" name="pwd2" />
      </div>
    </form>
    <div id="failMessage" class="fail" v-show="changePasswordFail">
      Password reset failed.
    </div>
    <div class="buttonRow">
      <div class="passwordButton" @click="cancel">
        Cancel
      </div>
      <div
        class="disabledButton"
        id="changePasswordButton"
        @click="changePassword"
      >
        Reset Password
      </div>
    </div>
  </div>
</template>

<script>
/**
 * ChangePassword.vue
 * Contains form for entering username and a new master password
 * NOT COMPLETED
 */

import { getAuthCert } from "../tools/CertDatabase.js";
import { getUserInfo, changePasswordInUserDb } from "../tools/UserDatabase.js";
import { recoverAccountWithCA } from "../tools/ServerFacade.js";
import { setLogoutCredentials } from "../tools/LocalStorage.js";
export default {
  name: "ChangePassword",
  data() {
    return {
      changePasswordFail: false,
      loading: false
    };
  },
  async mounted() {
    this.addFormEventListeners();

    if (this.$root.$data.nightMode) {
      let results = await document.getElementsByClassName("field");
      for (let x = 0; x < results.length; x++) {
        results[x].style.color = "white";
      }
      let inputs = await document.getElementsByTagName("input");
      for (let x = 0; x < inputs.length; x++) {
        inputs[x].style.backgroundColor = "var(--n-gray)";
        inputs[x].style.color = "white";
      }
      document.getElementById("failMessage").style.color = "var(--n-fail-red)";
    }
  },
  methods: {
    /**
     * Adds listeners to the form so the button to change password won't be enabled
     * until all form fields are properly filled out
     */
    addFormEventListeners() {
      document.getElementById("username").addEventListener("input", checkForm);
      document.getElementById("pwd").addEventListener("input", checkForm);
      document.getElementById("pwd2").addEventListener("input", checkForm);
      function checkForm() {
        if (
          document.getElementById("username").value &&
          document.getElementById("pwd").value &&
          document.getElementById("pwd2").value &&
          document.getElementById("pwd").value.length >= 8 &&
          document.getElementById("pwd").value ===
            document.getElementById("pwd2").value
        ) {
          document.getElementById("changePasswordButton").className =
            "passwordButton";
        } else {
          document.getElementById("changePasswordButton").className =
            "disabledButton";
        }
      }
    },
    /**
     * Collects username and new password from form fields and changes password with CA
     * NOT COMPLETED since version0.2 specifications for changing the master password aren't done
     */
    async changePassword() {
      let userInfo = await getUserInfo();
      let authCertInfo = await getAuthCert(userInfo.authname);

      //get username and new password from form
      let username = document.getElementById("username").value;
      let newPassword = document.getElementById("pwd").value;

      //TODO: when version0.2 has figured out account recovery and editing the master password,
      //then use the correct endpoint to change password with CA

      //send stuff to CA api: username, newPassword, deviceCert, certs, certsSignature
      let response = null; //TODO: set this to be response from CA
      if (response != null) {
        //TODO: follow version0.2 protocal for master password change

        changePasswordInUserDb(newPassword, userInfo);

        //force logout so user inputs their new password
        chrome.storage.local.set({ loggedIn: false });
        setLogoutCredentials();
        this.$router.push("/home");
      } else {
        this.failedChangePassword();
      }
    },
    /**
     * Edit parent component (AccountDetails.vue) so it no longer
     * displays the component ChangePassword.vue
     */
    cancel() {
      this.changePasswordFail = false;
      this.$parent.changePassword = false;
      this.$parent.changeToNightMode();
    },
    /**
     * Sets the password fail var to true so a fail message displays in html.
     * Clears all form fields.
     */
    failedChangePassword() {
      this.changePasswordFail = true;
      document.getElementById("passwordForm").reset();
    }
  }
};
</script>

<style lang="scss" scoped>
.buttonRow {
  display: flex;
  flex-direction: row;
}
.changePassword {
  display: flex;
  flex-direction: column;
  align-items: center;
}
form {
  color: #165663;
  font-weight: bold;
  font-size: 12px;
}
input {
  margin-top: 2px;
  width: 225px;
  height: 15px;
}
.field {
  padding: 2px;
  text-align: left;
}
.disabledButton {
  background: #899fa3;
  text-align: center;
  padding: 10px;
  margin: 15px 5px 15px 5px;
  box-shadow: 0.1em 0.1em 0.1em rgba(0, 0, 0, 0.3);
  border-radius: 25px;
  width: 100px;
  pointer-events: none;
  color: white;
  font-size: 12px;
}
.passwordButton {
  background: #165663;
  text-align: center;
  padding: 10px;
  margin: 15px 5px 15px 5px;
  box-shadow: 0.1em 0.1em 0.1em rgba(0, 0, 0, 0.3);
  border-radius: 25px;
  color: white;
  width: 100px;
  font-size: 12px;
}
.passwordButton:hover {
  background: #899fa3;
}
.syncFail {
  font-size: 10px;
  color: #b22222;
  padding: 2px;
}
.syncSuccess {
  font-size: 10px;
  color: #008000;
  padding: 2px;
}
.instructions {
  font-size: 10px;
  color: #899fa3;
  padding: 2px;
}
.fail {
  font-size: 10px;
  color: #b22222;
  padding: 2px;
}
</style>
