<template>
  <div class="padded">
    <h1>Create an Account</h1>

    <div v-if="step == 1" class="form-and-button" >
      <div class="step">
        Step 1
      </div>

      <form id="registerForm" @submit.prevent="registerStep1">
        <div class="field">
          <label for="username">Username</label><br />
            <div class="specs">Choose a username for your account. This must be at least 2 characters.</div>
          <input
            type="text"
            id="username"
            name="username"
            v-model="username"
          /><br />
        </div>

        <div class="field">
          <label for="name">Computer Name</label><br />
          <div class="specs">Choose a name to identify this computer. This will help you to know which computers you are using to login to your accounts.</div>
          <input type="text" id="name" name="name" v-model="deviceName" /><br />
        </div>

        <div class="field">
          <label for="password">Password</label><br />
          <div class="specs">Enter a password for this device. This is ensures nobody can login to your accounts with this device.</div>
          <input type="password" id="password" name="password" v-model="password" /><br />
        </div>

        <div class="fail" id="failMessage" v-show="registerFail">
          {{errorMessage}}
        </div>

        <div class="note">This will open a new browser tab so you can complete registration of your account. Once you
        are done, come back to this window.</div>

        <button type="submit">
          Create
        </button>
      </form>

    </div>
    <div v-if="step == 2">
      <div class="step">
          Step 2
      </div>
      <div class="specs">
        <p>Click this button after you have created your account with letsauth.org.
        This will authorize the browser extension to access your account.</p>
      </div>

      <button @click="registerStep2">
        Authorize
      </button>
    </div>
    <div v-if="step == 3">
      <div class="step">
          Step 3
      </div>
      <div class="instructions">
        This is your recovery kit. Whenever you register a new device with your
        1Key account or log out of this one, you will need to present the key in
        this kit.
      </div>

      <div class="stepRow">
        <div class="circle">1</div>
        <div class="instructions">
          <a :href="downloadLink" download="Lets-Authenticate-Recovery-Kit">Download your recovery kit.</a>
        </div>
      </div>

      <div class="stepRow">
        <div class="circle">2</div>
        <div class="instructions">
          Print and store copies of this document in a secure location or on other
          devices.
        </div>
      </div>

      <div class="stepRow">
        <div class="circle">3</div>
        <div class="instructions">
          Permanetely delete the 1Key Account Recovery file from this device.
        </div>
      </div>

      <router-link to="/"><button>Finish</button></router-link>

    </div>
  </div>
</template>

<script>
/**
 * Register.vue
 * Contains registration form and process for registering a new Let's Authenticate account
 */

var forge = require('node-forge');

// import base64url from "base64url";
import { Buffer } from 'buffer'
import { BLANK_PDF, generate } from '@pdfme/generator';

import {
  createUser,
  createLocalVault,
  clearUserDb,
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


// DZ -- We should have some workflow where the state in the DB tells us whether the user has registered this browser or not.
// If not registered, we need to guide them to create an account or add this device to an existing account. If registered but
// logged out, guide them to the Login screen. These views then need to check that the user has not somehow accidentally gotten
// to the wrong view.

// To make all that work, we probably need to store some state to indicate whether the account was actually created. And
// if they don't know the right password, let them clear everything and start over.

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
      password: "",
      userInfo: null,
      authKeyPair: null,
      pemAuthPrivate: null,
      pemAuthPublic: null,
      remoteVaultIV: null,
      remoteVaultKey: null,
      downloadLink: ""
    };
  },
  methods: {
    invalidForm() {
      return (this.username.length < 2) | (this.password.length < 8);
      // DZ should probably enforce a username that is alphanumeric. See the restrictions in the CA
    },
    async registerStep1() {
      this.registerFail = false;
      if (this.invalidForm()) {
        this.registerFail = true;
        if (this.username.length < 2) {
          this.errorMessage = "The username must be at least 2 characters."
        } else if (this.password.length < 8) {
          this.errorMessage = "The password must be at least 8 characters."
        }
        return;
      }

      // generate the authenticator key pair
      this.generateAuthenticatorKeyPair();

      console.log("generated and stored keys");
      
      // convert public key in PEM string to Base 64 encoded version
      //let publicKey = base64url.encode(this.userInfo.publicKey)
      let publicKey = Buffer.from(this.pemAuthPublic).toString('base64')

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
            publicKey
        });

      // DZ we are going to need to wait for registration to be done, which is controlled by the user. So we are now done and wait for the user to advance in step 2.
      this.step = 2
    },
    async registerStep2() {
      // DZ -- stopped here -- need to figure out passwords next and clean up storage
      // DZ -- don't forget to get rid of encrypted local storage -- it's useless
      // DZ -- can remove the password from local storage when we logout

      // create the authenticator CSR
      let csr = makeCSR(
        this.authKeyPair.privateKey,
        this.authKeyPair.publicKey,
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

      // create new user info
      let [ user, localVaultKey ] = await createUser(this.username, this.password);
      
      console.log("created user", user)

      // Generate symmetric key that will be stored in the local vault and used to decrypt the authentication data
      this.remoteVaultIV = forge.random.getBytesSync(16);
      this.remoteVaultKey = forge.random.getBytesSync(16);

      console.log("generated keys");
      const printableIV = new Buffer.from(user.localVaultIV).toString('hex');


      console.log("using localVaultIV",printableIV)

      // create local vault
      await createLocalVault(user.localVaultIV, localVaultKey, this.remoteVaultIV, this.remoteVaultKey, this.authKeyPair, response.data.certificate)

      console.log("got an auth certificate");


      // DZ figure out if we are going to create remote vault here or wait until we actually need one

      // DZ likewise see what this is doing
      //create or update authenticator data with this device
      //await createAuthenticatorData(
      //  this.deviceName,
      //  response.data.certificate
      //);
      // console.log("created authenticator data");

      // DZ and see what this is doing!
      // await updateAllCertsList(indexeddbKey);

      console.log("win");

      // DZ we do need to have them print out the recovery kit
      // DZ figure out whether we need to include the IV too -- what do LastPass and 1 Password do?
      this.createPDF();
      this.step = 3;
    },
    generateAuthenticatorKeyPair() {
      //generate auth key pair
      this.authKeyPair = forge.pki.rsa.generateKeyPair(2048);

      //user database (indexeddb) doesn't allow keys to be stored in normal format
      //each key must be converted to PEM format for storage
      this.pemAuthPrivate = forge.pki.privateKeyToPem(this.authKeyPair.privateKey);
      this.pemAuthPublic = forge.pki.publicKeyToPem(this.authKeyPair.publicKey)
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
      this.password = "";
      this.deviceName = "";
      this.key = "";
      this.registerFail = true;
    },
    async createPDF() {
      const printableRemoteVaultKey = new Buffer.from(this.remoteVaultKey).toString('hex');

      const template = {
	      basePdf: BLANK_PDF,
        schemas: [
            {
          header: {
              type: 'text',
              position: { x: 20, y: 20 },
              width: 150,
              height: 20,
          },
          instructions: {
              type: 'text',
              position: { x: 20, y: 40 },
              width: 150,
              height: 20,
          },
          username: {
              type: 'text',
              position: { x: 20, y: 60 },
              width: 150,
              height: 10,
          },
          key: {
              type: 'text',
              position: { x: 20, y: 70 },
              width: 150,
              height: 10,
          },
            },
        ],
      };
      const inputs = [{ header: "Let's Authenticate Recovery Kit",
            instructions: "Store this file in a secure location, NOT on the device it was created for. Whenever you register a new device with your Let's Authenticate account or log out of this one, you will need to enter the information in this kit.",
            username: `Username: ${this.username}`,
            key: `Key: ${printableRemoteVaultKey}`
          }];

      const pdf = await generate({ template, inputs });

      // Browser
      const blob = new Blob([pdf.buffer], { type: 'application/pdf' });
      this.downloadLink = URL.createObjectURL(blob);

      // Node.js
      // fs.writeFileSync(path.join(__dirname, `Lets-Authenticate-Recovery-Kit.pdf`), pdf);

    },
  }
};
</script>

<style scoped>

.step {
  font-weight: bold;
  margin-bottom: 10px;
  margin-top: 0px;
}

.note {
  margin: 10px 0px;
  background-color: #eee;
  padding: 5px;
  box-shadow: 3px 3px 5px 0px #ccc;
}

.stepRow {
  margin: 15px 6px;
  height: 50px;
}

.circle {
  background: black;
   border-radius: 0.8em;
  -moz-border-radius: 0.8em;
  -webkit-border-radius: 0.8em;
  color: #ffffff;
  font-weight: bold;
  line-height: 1.6em;
  margin-right: 15px;
  text-align: center;
  width: 1.6em; 
  font-size: 1.6em;
  float: left;
}

.instructions {
  text-align: left;
}

</style>
