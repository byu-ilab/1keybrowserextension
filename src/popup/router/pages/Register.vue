<template>
  <div class="register">
    <div class="spinnerContainer" v-show="loading"><LoadingIcon /></div>

    <div class="header">
      <img src="../../../icons/left-arrow.png" @click="navigateBack" />
      Register
    </div>

    <div v-if="!newAuthLogin && !alreadyRegistered" class="yubikey-prompt">
      Have your YubiKey ready for registration. This might take a little bit.
    </div>

    <div class="registeredMessage" v-show="newAuthLogin && !alreadyRegistered">
      To register this browser, enter your 1Key account information and a new
      name for this browser. Have your YubiKey ready for registration. This
      might take a little bit.
    </div>

    <form id="registerForm" v-if="!alreadyRegistered">
      <div class="field">
        <label for="username">Username:</label><br />
        <input type="text" id="username" name="username" /><br />
      </div>
      <div class="field">
        <label for="name">Device Name:</label><br />
        <div class="passwordSpecs">
          Choose a name to identify this browser.
        </div>
        <input type="text" id="name" name="name" /><br />
      </div>

      <div class="fail" id="failMessage" v-show="registerFail">
        Registration failed.
      </div>
    </form>

    <div
      class="disabledButton"
      id="registerButton"
      @click="registerLetsAuthUser"
      v-if="!alreadyRegistered"
    >
      Register
    </div>

    <div class="registeredMessage" v-show="alreadyRegistered">
      This browser is already registered. No additional accounts may be linked
      to this 1Key browser extension.
      <img src="../../../icons/key_icon.png" width="80px" height="80px" />
    </div>
  </div>
</template>

<script>
/**
 * Register.vue
 * Contains registration form and process for registering a new Let's Authenticate account
 * or registering a new device (this browser) on a pre-existing account.
 */

import LoadingIcon from "../components/LoadingIcon.vue";
import {
  storeNewUserInfo,
  getUserInfo,
  clearUserDb,
  checkForRegisteredUser
} from "../tools/UserDatabase.js";
import {
  makeCSR,
  updateAllCertsList,
  makeKeypassFromPassword,
  createAuthenticatorData,
  addAuthToAuthenticatorData,
  generateUniqueIdentifier,
  delay
} from "../tools/CertGen.js";
import {
  sendRegisterToCA,
  sendLoginToCA,
  sendAuthCSRToCA
} from "../tools/ServerFacade.js";
import {
  setIndexeddbKey,
  getIndexeddbKey,
  setLoggedInCredentials,
  clearSecretLocalStorage
} from "../tools/LocalStorage.js";
import { storeAuthCert } from "../tools/CertDatabase.js";
export default {
  name: "Register",
  data() {
    return {
      registerFail: false,
      alreadyRegistered: false,
      newAuthLogin: false,
      loading: false
    };
  },
  components: {
    LoadingIcon
  },
  async created() {
    //checks for the parameter of new authenticator login
    //changes message and CA api used for new authenticator login
    if (this.$route.params.newAuth) {
      this.newAuthLogin = true;
    }

    //verifies whether or not authenticator has been previously registered
    this.alreadyRegistered = await checkForRegisteredUser();

    //add form listeners to ensure all fields are filled correctly before register button is enabled
    this.addFormEventListeners();

    //change colors to night mode if necessary
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

      let messages = await document.getElementsByClassName("registeredMessage");
      for (let x = 0; x < messages.length; x++) {
        messages[x].style.color = "white";
      }
      document.getElementById("failMessage").style.color = "var(--n-fail-red)";
    }
  },
  methods: {
    async registerLetsAuthUser() {
      this.loading = true;
      document.getElementById("registerButton").className = "disabledButton";

      //get user input from registration form
      let userName = document.getElementById("username").value;
      let authName = document.getElementById("name").value;
      this.registerFail = false;
      let userPassword = generateUniqueIdentifier();

      //get recovery passkeys, generate key that will be used to lock indexeddb
      let keypass = makeKeypassFromPassword(userPassword);
      let indexeddbKey = getIndexeddbKey(keypass);

      //keys are created, keys and user information is stored in user database
      var userInfo = await this.generateAndStoreKeys(
        userName,
        userPassword,
        authName,
        indexeddbKey
      );

      let forge = require("node-forge");
      let publicKeyPem = forge.pki.publicKeyFromPem(userInfo.publicKey);

      //authenticator certificate generated for the CA register api call
      let authCert = makeCSR(
        forge.pki.privateKeyFromPem(userInfo.privateKey),
        publicKeyPem,
        authName,
        "deprecated@email.com" // id@ca.org??
      );

      //basically the only difference between first time registration
      //and new authenticator registration is api sent to CA
      let type = "";
      if (!this.newAuthLogin) {
        type = "register";
      } else {
        type = "login";
        // var messageResponse = await sendLoginToCA(userName, userPassword, authCert);
      }

      chrome.windows.create(
        {
          url:
            "https://letsauth.org/" +
            type +
            "/" +
            userName +
            "?kauth=" +
            publicKeyPem,
          type: "popup"
        },
        async function(win) {
          //sleep every 5 seconds before trying to get a signed auth cert from the CA
          let response = "";
          while (!response) {
            await delay(5000);
            response = await sendAuthCSRToCA(userName, authCert);
          }

          if (response != null) {
            //get certificate from CA, save it. This is your authenticator cert for the future!
            await storeAuthCert(
              authName,
              response.data.authenticatorCertificate,
              "1",
              indexeddbKey
            );

            //loggedIn variable set to true
            chrome.storage.local.set({ loggedIn: true });
            setLoggedInCredentials(makeKeypassFromPassword(userPassword));

            //create or update authenticator data with this device
            if (!this.newAuthLogin) {
              await createAuthenticatorData(authName, response.authCert);
            } else {
              await addAuthToAuthenticatorData(authName, response.authCert);
            }

            await updateAllCertsList(indexeddbKey);

            this.$router.push("/");
          } else {
            await this.failRegister();
          }

          this.loading = false;
          win.close();
        }
      );
    },
    /**
     * Generates the public/private keypair for this authenticator
     * and stores them (along with other important user info) on local encrypted database
     *
     * @param username inputted username, string
     * @param password inputted plain text password, string
     * @param authname inputted name for this authenticator, string
     * @param idbKey local database key that encrypts database
     *
     * @returns object of user info that was just stored
     */
    async generateAndStoreKeys(username, password, authname, idbKey) {
      //generate key pair
      let forge = require("node-forge");
      const keyPair = forge.pki.rsa.generateKeyPair(2048);

      //user database (indexeddb) doesn't allow keys to be stored in normal format
      //each key must be converted to PEM format for storage
      let pemPrivate = forge.pki.privateKeyToPem(keyPair.privateKey);
      let pemPublic = forge.pki.publicKeyToPem(keyPair.publicKey);

      //give keys and other user info to this function to be stored in user index
      await storeNewUserInfo(
        pemPrivate,
        pemPublic,
        username,
        makeKeypassFromPassword(password),
        authname,
        idbKey
      );

      //returns user information that has just been stored
      let userObject = await getUserInfo(idbKey);
      return userObject;
    },
    /**
     * Adds form event listeners that ensure all fields are filled correctly before register button is enabled.
     * For first time registration it checks that passwords match and is 8+ characters
     */
    addFormEventListeners() {
      let callback = this.newAuthLogin ? checkFormNewAuth : checkForm;
      document.getElementById("username").addEventListener("input", callback);
      document.getElementById("name").addEventListener("input", callback);

      function checkForm() {
        if (
          document.getElementById("username").value &&
          document.getElementById("name").value
        ) {
          document.getElementById("registerButton").className =
            "registerButton";
        } else {
          document.getElementById("registerButton").className =
            "disabledButton";
        }
      }

      function checkFormNewAuth() {
        if (
          document.getElementById("username").value &&
          document.getElementById("name").value
        ) {
          document.getElementById("registerButton").className =
            "registerButton";
        } else {
          document.getElementById("registerButton").className =
            "disabledButton";
        }
      }
    },
    /**
     * Navigates back to previous page. Used for back arrow.
     */
    navigateBack() {
      this.$router.go(-1);
    },
    /**
     * Called when registration fails for any reason.
     * Deletes any user information stored in encrypted local database.
     * Clears form and sets an error message to be displayed in html.
     */
    async failRegister() {
      await clearUserDb();
      clearSecretLocalStorage();
      document.getElementById("registerForm").reset();
      this.registerFail = true;
    }
  }
};
</script>

<style lang="scss" scoped>
.register {
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
  width: 340px;
  height: 50px;
  padding: 10px;
  padding-top: 2px;
  font-size: 35px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-around;
  background: #165663;
  color: white;
}

.header img {
  margin-top: 5px;
  margin-right: 154px;
  width: 22px;
  height: 22px;
  color: white;
}

form {
  color: #165663;
  font-weight: bold;
  font-size: 12px;
  margin-top: 15px;
}

input {
  margin-top: 2px;
  width: 250px;
  height: 15px;
}

.field {
  padding: 5px;
}

.registerButton {
  background: #165663;
  text-align: center;
  padding: 10px;
  margin: 15px 0px 15px 0px;
  box-shadow: 0.1em 0.1em 0.1em rgba(0, 0, 0, 0.3);
  border-radius: 25px;
  color: white;
  width: 120px;
  font-size: 15px;
}

.disabledButton {
  background: #899fa3;
  text-align: center;
  padding: 10px;
  margin: 15px 0px 15px 0px;
  box-shadow: 0.1em 0.1em 0.1em rgba(0, 0, 0, 0.3);
  border-radius: 25px;
  width: 120px;
  pointer-events: none;
  color: white;
  font-size: 15px;
}

.registerButton:hover {
  background: var(--logo-gray);
}

form .fail {
  text-align: center;
}

.fail {
  font-size: 10px;
  color: #b22222;
  padding: 2px;
}

.passwordSpecs {
  font-size: 12px;
  color: var(--logo-gray);
  padding: 2px;
}

.yubikey-prompt {
  font-size: 16px;
  color: var(--logo-gray);
  padding: 2px;
  margin-top: 10px;
  display: flex;
  justify-content: center;
  text-align: center;
}

.registeredMessage {
  color: #165663;
  font-weight: bold;
  font-size: 12px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.registeredMessage img {
  margin-top: 100px;
}
</style>
