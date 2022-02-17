<template>
  <div class="forgotPassword">
    <div class="spinnerContainer" v-show="loading"><LoadingIcon /></div>
    <div class="header">
      <img src="../../../icons/left-arrow.png" @click="navigateBack" />
      Account Recovery
    </div>

    <div class="instructions">
      All other devices for this account will be deauthorized until you login
      again with the new password.
    </div>
    <br />

    <form id="passkeyForm" v-show="!passkeyValidated">
      <div class="field">
        <label for="passkey">1Key Recovery Passkey:</label><br />
        <input type="password" id="passkey" name="passkey" /><br />
      </div>
    </form>

    <form id="recoveryForm" v-show="passkeyValidated">
      <div class="field">
        <label for="username">Username:</label><br />
        <input type="text" id="username" name="username" /><br />
      </div>
      <div class="field">
        <label for="pwd">Enter new password:</label><br />
        <input type="password" id="pwd" name="pwd" /><br />
        <div class="instructions">
          Must be a minimum of 8 characters.
        </div>
      </div>
      <div class="field">
        <label for="pwd2">Confirm new password:</label><br />
        <input type="password" id="pwd2" name="pwd2" /><br />
      </div>
    </form>

    <div class="fail" v-show="usernameFail">
      This device is not associated with that username.
    </div>

    <div class="fail" v-show="resetFail">
      Password reset failed. Please try again.
    </div>

    <div
      class="recoverButton"
      id="passkeyButton"
      @click="checkPasskey"
      v-show="!passkeyValidated"
    >
      Enter
    </div>

    <div
      class="disabledButton"
      id="resetButton"
      @click="setNewPassword"
      v-show="passkeyValidated"
    >
      Reset Password
    </div>
  </div>
</template>

<script>
/**
 * ForgotPassword.vue
 * Contains forms to enter recovery information to reset the master password.
 * Needs updating for version0.2
 */

import LoadingIcon from "../components/LoadingIcon.vue";
import { getUserInfo, changePasswordInUserDb } from "../tools/UserDatabase.js";
import { getAuthCert } from "../tools/CertDatabase.js";
import {
  getIndexeddbKeyRecovery,
  resetIndexeddbKey,
  setLoggedInCredentials
} from "../tools/LocalStorage.js";
import { recoverAccountWithCA } from "../tools/ServerFacade.js";
import {
  signString,
  makeKeypass,
  updateCertBlobs,
  updateAllCertsList
} from "../tools/CertGen.js";
export default {
  name: "ForgotPassword",
  data() {
    return {
      usernameFail: false,
      resetFail: false,
      loading: false,
      passkeyValidated: false
    };
  },
  components: {
    LoadingIcon
  },
  async created() {
    //set night mode colors if necessary
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

      let failures = await document.getElementsByClassName("fail");
      for (let x = 0; x < failures.length; x++) {
        failures[x].style.color = "var(--n-fail-red)";
      }
    }
  },
  mounted() {
    //set form event listeners to ensure all fields are filled correctly
    //before user can put in account recovery request
    this.setFormEventListeners();
  },
  methods: {
    /**
     * Checks that inputted passkey value is present in local database.
     * If it is, passkey is deleted from list.
     * TODO: this needs to change since version0.2 doesn't use a list of 1-time use passkeys for recovery.
     */
    async checkPasskey() {
      //find keypass and delete it if found, otherwise the validation fails
      this.passkeyValidated = getIndexeddbKeyRecovery(
        document.getElementById("passkey").value
      );
      this.resetFail = !this.passkeyValidated;
      if (this.resetFail) {
        document.getElementById("passkeyForm").reset();
      }
    },
    /**
     * Checks inputted username based on local database storage on the user.
     * Resets the form and displays error message if username is incorrect.
     *
     * @returns basic info on user if username is correct, null if incorrect
     */
    async checkUsername() {
      //display loading icon and disable button while it handles the request
      this.loading = true;
      document.getElementById("resetButton").className = "disabledButton";

      //get inputted username from form
      let username = document.getElementById("username").value;
      this.usernameFail = false;

      //fetch user basic info
      let userInfo = await getUserInfo(this.passkeyValidated);
      if (userInfo) {
        //check username provided matches stored username
        if (userInfo.username === username) {
          return userInfo;
        } else {
          //incorrect username, clear form and display error message
          document.getElementById("recoveryForm").reset();
          this.usernameFail = true;
          this.loading = false;
          return null;
        }
      } else {
        //info was not able to be fetched, probably due to a database error
        document.getElementById("recoveryForm").reset();
        this.usernameFail = true;
        this.loading = false;
        return null;
      }
    },
    /**
     * Set listeners to form so buttons won't be enabled until all fields are correctly filled.
     */
    setFormEventListeners() {
      //ensure all fields are goood
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
          document.getElementById("resetButton").className = "recoverButton";
        } else {
          document.getElementById("resetButton").className = "disabledButton";
        }
      }
    },
    /**
     * Does work of changing master password with CA
     * TODO: needs updating for version0.2!!
     */
    async setNewPassword() {
      //fetch user info. Will be null if username check failed
      let userInfo = await this.checkUsername();

      //if username was verified we get back a user object
      if (userInfo && userInfo != null) {
        //get new password from form field
        let newPassword = document.getElementById("pwd").value;
        let authCertInfo = await getAuthCert(
          userInfo.authname,
          this.passkeyValidated
        );

        //update all certs so we get up-to-date list of site certs
        console.log(
          "PASSKEY VALIDATED IN FORGOT PASSWORD: ",
          this.passkeyValidated
        );
        let possibleErr = await updateAllCertsList(this.passkeyValidated);
        if (!possibleErr) {
          let certs = []; //await updateCertBlobs(newPassword, this.passkeyValidated);

          //sign json string of site certs with private key
          let certsSignature = signString(
            userInfo.privateKey,
            JSON.stringify(certs)
          );

          //send stuff to CA api: username, newPassword, deviceCert, certs, certsSignature
          let response = await recoverAccountWithCA(
            userInfo.username,
            newPassword,
            authCertInfo.cert,
            certs,
            certsSignature
          );

          if (response != null) {
            //generate and store new keypass from password
            //resetIndexeddbKey(this.passkeyValidated, newPassword);
            let keypass = changePasswordInUserDb(newPassword, userInfo);

            //force user to login with new password
            this.$router.push("/home");
          } else {
            //failed case: CA sent error when trying to recover account
            this.failedReset();
          }
        } else {
          //failed case: certs list didn't update properly
          this.failedReset();
        }

        this.loading = false;
      }
    },
    /**
     * Display error message and clear form
     */
    failedReset() {
      this.resetFail = true;
      document.getElementById("resetButton").className = "disabledButton";
      document.getElementById("recoveryForm").reset();
    },
    /**
     * Go to the previous page, Login.vue
     */
    navigateBack() {
      this.$router.go(-1);
    }
  }
};
</script>

<style lang="scss" scoped>
.forgotPassword {
  width: 360px;
  height: 420px;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.spinnerContainer {
  position: absolute;
  margin-top: 160px;
}

.header {
  width: 360px;
  padding-top: 16px;
  padding-bottom: 16px;
  font-size: 25px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-around;
  background: #165663;
  color: white;
}

.header img {
  margin-right: 58px;
  width: 22px;
  height: 22px;
  color: white;
}

.disabledButton {
  background: #899fa3;
  text-align: center;
  padding: 10px;
  margin: 20px 0px 30px 0px;
  box-shadow: 0.1em 0.1em 0.1em rgba(0, 0, 0, 0.3);
  border-radius: 25px;
  width: 120px;
  pointer-events: none;
  color: white;
  font-size: 15px;
}

.recoverButton {
  background: #165663;
  text-align: center;
  padding: 10px;
  margin: 20px 0px 30px 0px;
  box-shadow: 0.1em 0.1em 0.1em rgba(0, 0, 0, 0.3);
  border-radius: 25px;
  color: white;
  width: 120px;
  font-size: 15px;
}

.recoverButton:hover {
  background: #899fa3;
}

.fail {
  font-size: 10px;
  color: #b22222;
  padding: 2px;
}

form {
  color: #165663;
  font-weight: bold;
  font-size: 15px;
}

input {
  margin-top: 5px;
  width: 250px;
  height: 20px;
}

.field {
  margin-bottom: 10px;
}

.instructions {
  color: #899fa3;
  font-weight: bold;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding-left: 10px;
  padding-right: 10px;
  margin-top: 10px;
  margin-bottom: 10px;
}
</style>
