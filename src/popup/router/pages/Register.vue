<template>
  <div class="register">
    <div class="header">
      <img src="../../../icons/left-arrow.png" @click="navigateBack" />
      Create an Account
    </div>

    <div v-if="step == 1">
      <div class="form-and-button" >
        <div class="yubikey-prompt">
          Step 1
        </div>

        <form id="registerForm">
          <div class="field">
            <label for="username">Username:</label><br />
              <div class="keySpecs">Choose a username for your account. This must be at least 2 characters.</div>
            <input
              type="text"
              id="username"
              name="username"
              v-model="username"
            /><br />
          </div>

          <div class="field">
            <label for="name">Computer Name:</label><br />
            <div class="keySpecs">Choose a name to identify this computer. This will help you to know which computers you are using to login to your accounts.</div>
            <input type="text" id="name" name="name" v-model="deviceName" /><br />
          </div>

          <div class="field">
            <label for="pin">Pin:</label><br />
            <div class="keySpecs">Enter a 6 digit pin for this device. This is used to encrypt your keys so nobody else can login to your accounts with this device.</div>
            <input type="password" id="pin" name="pin" v-model="pin" /><br />
          </div>

          <!-- <div class="field" v-if="newDeviceLogin && !alreadyRegistered">
            <label for="key">Key:</label><br />
            <div class="keySpecs">
              Enter the key that was given to you when <br />you first created
              your 1Key account.<br />
              You should have printed this out or saved <br />it on another
              device.
            </div>
            <input type="text" id="key" name="key" v-model="key" /><br />
          </div> -->

          <div class="fail" id="failMessage" v-show="registerFail">
            Registration failed. {errorMessage}
          </div>
        </form>

        <div class="keySPecs">This will open a new browser tab so you can complete registration of your account. Once you
          are done, come back to this window.</div>

        <div
          id="registerButton"
          :class="{ disabledButton: isDisabled, registerButton: !isDisabled }"
          @click="registerStep1"
        >
          Create Account
        </div>
      </div>
    </div>
    <div v-if="step == 2">
      <div class="form-and-button" >
         <div class="keySPecs"><p>Click this button after you have created your account with letsauth.org.
           This will authorize the browser extension to access your account.</p></div>

        <div
          id="nextButton"
          class="registerButton"
          @click="registerStep2"
        >
          Authorize Browser Extension
        </div>
      </div>
    </div>
  </div>
</template>

<script>
/**
 * Register.vue
 * Contains registration form and process for registering a new Let's Authenticate account
 */

var forge = require('node-forge');


import {
  storeNewUserInfo,
  getUserInfo,
  clearUserDb,
  checkForRegisteredUser,
} from "../tools/UserDatabase.js";

import {
  makeCSR,
  updateAllCertsList,
  makeKeypass,
  createAuthenticatorData,
  addAuthToAuthenticatorData,
  delay,
  getSymmetricKeyString,
} from "../tools/CertGen.js";

import { sendAuthCSRToCA } from "../tools/ServerFacade.js";

import {
  getIndexeddbKey,
  setLoggedInCredentials,
  clearSecretLocalStorage,
} from "../tools/LocalStorage.js";

import { storeAuthCert } from "../tools/CertDatabase.js";


// DZ -- We should have some workflow where the state in the DB tells us whether the user has registered this browser or not.
// If not registered, we need to guide them to create an account or add this device to an existing account. If registered but
// logged out, guide them to the Login screen. These views then need to check that the user has not somehow accidentally gotten
// to the wrong view.

// To make all that work, we probably need to store some state to indicate whether the account was actually created. And
// if they don't know the right PIN, let them clear everything and start over.

// We probably also need some logic in the CA to wipe out an account that was "partially created" state.
export default {
  name: "Register",
  data() {
    return {
      step: 1,
      errorMessage: "",
      registerFail: false,
      username: "",
      deviceName: "",
      pin: "",
      userInfo: null,
    };
  },
  computed: {
    isDisabled() {
      return !this.username | (this.pin.length < 6) | this.loading;
    },
  },
  async created() {
    //verifies whether or not authenticator has been previously registered
    this.alreadyRegistered = await checkForRegisteredUser();
  },
  methods: {
    async registerStep1() {
      if (this.isDisabled) {
        return
      }
      this.registerFail = false;

      // This is the symmetric key that will be stored in the userInfo and used to decrypt the authentication data
      // DZ come back to this -- we need to be creating a new, random symmetric key, not deriving it from a password or anything else
      // let authKeypass = makeKeypass(authSymmetricKeyString);
      let authSymmetricKeyString = "dummyfornow";

      //This is derived from the pin and used to encrypt local storage
      // DZ need to verify that we are using the PIN to derive a key and encrypt storage with this. Not clear if this is
      // currently implemented (correctly).
      let indexeddbKeypass = makeKeypass(this.pin);
      let indexeddbKey = getIndexeddbKey(indexeddbKeypass);

      //keys are created, keys and user information is stored in user database
      this.userInfo = await this.generateAndStoreKeys(
        this.username,
        authSymmetricKeyString,
        this.deviceName,
        indexeddbKey
      );

      console.log("generated and stored keys");

      // get the authenticator public key from the user info -- and need to convert them back from PEM
      let authPublicKey = forge.pki.publicKeyFromPem(this.userInfo.publicKey);

      // DZ we need to add this localhost:8000 to a "debug" vs "production" setting somewhere
      // This opens a new browser tab so the user can create their account with the CA. Once they are done, they can
      // move on to step 2. Note we need to send the username and the authPublicKey so that the user, once their account is
      // created, have authorized authPublicKey to be valid for their account.
      await chrome.tabs.create(
        {
          url:
            "http://localhost:8080/register/" +
            this.username +
            "?authPublicKey=" +
            authPublicKey
        });

      // DZ we are going to need to wait for registration to be done, which is controlled by the user. So we are now done and wait for the user to advance in step 2.
      this.step = 2
    },
    async registerStep2() {
      // get the authenticator keys from the user info -- and need to convert them back from PEM
      let authPublicKey = forge.pki.publicKeyFromPem(this.userInfo.publicKey);
      let authPrivateKey = forge.pki.privateKeyFromPem(this.userInfo.privateKey);

      //This is derived from the pin and used to encrypt local storage
      // DZ need to verify that we are using the PIN to derive a key and encrypt storage with this. Not clear if this is
      // currently implemented (correctly).
      let indexeddbKeypass = makeKeypass(this.pin);
      let indexeddbKey = getIndexeddbKey(indexeddbKeypass);
      
      // TBD -- see note above
      let authSymmetricKeyString = "dummyfornow";

      // create the authenticator CSR
      let csr = makeCSR(
        authPrivateKey,
        authPublicKey,
        this.username,
        this.username + "@letsauth.org" // id@ca.org??
      );

      console.log("generated authenticator CSR");

      // send the CSR to the CA
      let response = await sendAuthCSRToCA(this.username, csr);
      console.log("got response from CA", response);

      // TBD check for an error in the response and set an appropriate error message
      if (response == null) {
        await this.failRegister();
        console.log("registration failed");
      }

      // store the authenticator certificate
      // DZ look at what this call is doing. Why "1", why is device name needed?
      await storeAuthCert(
        this.deviceName,
        response.data.certificate,
        "1",
        indexeddbKey
      );

      console.log("got an auth certificate");

      //loggedIn variable set to true
      // DZ see what this is needed for and waht it is doing
      chrome.storage.local.set({ loggedIn: true });
      setLoggedInCredentials(makeKeypass(this.pin));

      // DZ likewise see what this is doing
      //create or update authenticator data with this device
      await createAuthenticatorData(
        this.deviceName,
        response.data.certificate
      );
      console.log("created authenticator data");

      // DZ and see what this is doing!
      await updateAllCertsList(indexeddbKey);

      console.log("win");

      // DZ we do need to have them print out the recovery kit
      this.$router.push({
        name: "SecurityPreparation",
        params: { key: authSymmetricKeyString },
      });
    },
    /**
     * Generates the public/private keypair for this authenticator
     * and stores them (along with other important user info) on local encrypted database
     *
     * @param username inputted username, string
     * @param symmetricKeyString symmetric key used to encrypt auth data key, string
     * @param authname inputted name for this authenticator, string
     * @param idbKey local database key that encrypts database
     *
     * @returns object of user info that was just stored
     */
    async generateAndStoreKeys(username, symmetricKeyString, authname, idbKey) {
      // DZ should probably revisit this function to (1) generate a symmetric key, and (2) use
      // this symmetric key to encrypt and decrypt the vault. Should look at 1Password to see how they do it.

      //generate auth key pair
      const authKeyPair = forge.pki.rsa.generateKeyPair(2048);

      //user database (indexeddb) doesn't allow keys to be stored in normal format
      //each key must be converted to PEM format for storage
      let pemAuthPrivate = forge.pki.privateKeyToPem(authKeyPair.privateKey);
      let pemAuthPublic = forge.pki.publicKeyToPem(authKeyPair.publicKey);

      //give keys and other user info to this function to be stored in user index
      await storeNewUserInfo(
        pemAuthPrivate,
        pemAuthPublic,
        username,
        makeKeypass(symmetricKeyString),
        this.deviceName,
        idbKey
      );

      //returns user information that has just been stored
      let userObject = await getUserInfo(idbKey);
      return userObject;
    },
    /**
     * Navigates back to previous page. Used for back arrow.
     * DZ -- should look at this and probably have a better navigation system and better use of the router.
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
      // DZ figure out what to do with this
      await clearUserDb();
      clearSecretLocalStorage();
      // document.getElementById("registerForm").reset();
      this.username = "";
      this.pin = "";
      this.deviceName = "";
      this.key = "";
      this.registerFail = true;
    },
  },
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

.form-and-button {
  display: flex;
  flex-direction: column;
  height: 100%;
  align-items: center;
  justify-content: center;
}

form {
  color: #165663;
  font-weight: bold;
  font-size: 12px;
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
  margin: 9px 0px 15px 0px;
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
  margin: 9px 0px 15px 0px;
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

.keySpecs {
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
  padding: 10px 10px 5px 10px;
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
