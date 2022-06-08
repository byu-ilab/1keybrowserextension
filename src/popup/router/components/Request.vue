<template>
  <div id="body">
    <Loading v-show="loading && !showAlreadyRegistered" />
    <AlreadyRegistered v-show="showAlreadyRegistered" />
    <div
      class="index"
      v-show="!accept && !reject && !loading && !showAlreadyRegistered"
    >
      <div class="request">
        <h2>Pending {{ type }} request:</h2>
        {{ domain }}
      </div>

      <div class="scrollBox" v-show="type == 'login'">
        <h3>Select an account for login</h3>
        <div v-for="account in accounts" v-bind:key="account.accountId">
          <label class="container" @click="selectedAccount = account">
            <div class="containerText">{{ account.name }}</div>
            <input
              type="radio"
              checked="checked"
              name="radio"
              v-if="selectedAccount == account"
            />
            <input type="radio" name="radio" v-else />
            <span class="checkmark"></span>
          </label>
        </div>
      </div>

      <form id="accountNameForm" v-show="type == 'registration'">
        <div class="field">
          <input
            type="text"
            id="inputtedAccountName"
            name="inputtedAccountName"
            placeholder="Name Your Account"
          /><br />
        </div>
      </form>

      <div class="buttonRow">
        <div class="accept" @click="checkAuth" id="accept">
          <img
            id="acceptIcon"
            src="../../../icons/checked.png"
            width="50px"
            height="50px"
          />
          Accept
        </div>
        <div class="reject" @click="rejectRequest" id="reject">
          <img
            id="rejectIcon"
            src="../../../icons/close.png"
            width="50px"
            height="50px"
          />
          Reject
        </div>
      </div>
    </div>

    <div v-show="accept">
      <Accept />
    </div>

    <div v-show="reject">
      <Reject />
    </div>
  </div>
</template>

<script>
/**
 * Request.vue
 * Completes authentication (registration and login) to a service
 */

import axios from "axios";
import Loading from "../components/LoadingScreen.vue";
import Accept from "../components/Accept.vue";
import Reject from "../components/Reject.vue";
import AlreadyRegistered from "../components/AlreadyRegistered.vue";
import {
  makeCSR,
  generateUniqueIdentifier,
  isTimeExpired,
  verifySignedString,
  makeCertificate,
  signString,
  addAccountToAuthenticatorData,
  updateAllCertsList,
  renewAccountCert
} from "../tools/CertGen.js";
import {
  addSessionToAuthenticatorData
} from "../tools/CertSession.js"
import {
  getLoginObject,
  getLoginObjectSignature,
  getWebUrl,
  clearAuthInfoFromStorage
} from "../tools/LocalStorage.js";
import {
  getServiceAccount,
  getAuthCert,
  storeServiceAccount,
  updateAccountCert,
  getAccountIdsForDomain
} from "../tools/CertDatabase.js";
import { getUserInfo } from "../tools/UserDatabase.js";

export default {
  name: "Request",
  data() {
    return {
      domain: "",
      session: "",
      webUrl: "",
      type: "",
      webPki: null,
      accept: false,
      reject: false,
      loading: false,
      userInfo: null,
      accounts: [],
      selectedAccount: null,
      accountName: "",
      showAlreadyRegistered: false
    };
  },
  components: {
    Accept,
    Reject,
    Loading,
    AlreadyRegistered
  },
  /**
   * On creation it extracts authentication information
   */
  async created() {
    //get the info stored from the website hidden form fields, verify web cert
    await this.extractLoginObjValues();
    //get the url for this website that user wants to authenticate into
    this.webUrl = await getWebUrl();

    //get any other accounts that exist for this domain
    this.accounts = Array.from(await getAccountIdsForDomain(this.domain));

    //set the selected account to be the first in the list
    if (this.accounts.length > 0) {
      this.selectedAccount = this.accounts[0];
    }

    //set night mode colors if necessary
    if (this.$root.$data.nightMode) {
      document.getElementById("body").style.color = "white";
      document.getElementById("accept").className = "acceptNight";
      document.getElementById("reject").className = "rejectNight";
      document.getElementById("acceptIcon").src =
        "../../../icons/checked-night.png";
      document.getElementById("rejectIcon").src =
        "../../../icons/close-night.png";
    }
  },
  methods: {
    /**
     * Extract authentication information and automatically start authentication process.
     * This is used to call a request from background.js for auto login.
     */
    async backgroundRequest() {
      //get the info stored from the website hidden form fields, verify web cert
      await this.extractLoginObjValues();
      //get the url for this website that user wants to authenticate into
      this.webUrl = await getWebUrl();

      //get any other accounts that exist for this domain
      this.accounts = Array.from(await getAccountIdsForDomain(this.domain));
      //set the selected account to be the first in the list
      if (this.accounts.length > 0) {
        this.selectedAccount = this.accounts[0];
        //since this is auto registration we don't want the process to be stopped
        //to ask the user if they want to register another account
        if (this.type == "registration") {
          this.accounts = [];
        }
      }

      //initialize accept and reject values (they won't be initialized otherwise since this is called by background script)
      this.accept = false;
      this.reject = false;

      //start authentication process
      await this.checkAuth();
    },
    /**
     * Start and end authentication process, first verifying that the request is still valid.
     */
    async checkAuth() {
      //set loading to true so loading screen displays during process
      this.loading = true;

      //before authentication verify that tab is open
      if (await this.isRequestStillValid()) {
        this.userInfo = await getUserInfo();
        let response;

        //based on authentication type, run process and get response from website
        if (this.type == "registration") {
          response = await this.registerProcess();
        } else {
          response = await this.loginProcess();
        }

        console.log("register/login response");
        console.log(response);

        //based on response, show appropriate component (Reject.vue or Accept.vue)
        if (response) {
          this.routeUser(response);
        } else {
          if (!showAlreadyRegistered) {
            alert("Request failed. Website refused login. Try again Later!");
          }
          this.loading = false;
          this.rejectRequest();
        }
      } else {
        //tab where request came from is now closed
        alert(
          "Request failed. The source of this request is no longer found on the browser."
        );
        this.loading = false;
        this.rejectRequest();
      }
    },
    /**
     * Get the cert information needed and call the website login endpoint.
     * @returns login api response or null if there's an error
     */
    async loginProcess() {
      let forge = require("node-forge");

      //if no account id, display error message telling user to register first
      if (this.accounts.length === 0) {
        alert("You are not registered with this service.");
        this.loading = false;
        this.rejectRequest();
        return;
      }

      //if a valid account cert is stored, do nothing special
      let certInfo = await getServiceAccount(this.selectedAccount.id);
      let cert;

      console.log("first CertInfo");
      console.log(certInfo);

      if (
        certInfo.serviceCert &&
        certInfo.serviceCert != "" &&
        isTimeExpired(certInfo.expire)
      ) {
        //cert is owned by this auth, renew if expired
        cert = await renewAccountCert(
          certInfo.servicePrivateKey,
          certInfo.servicePublicKey,
          certInfo.accountID,
          this.userInfo
        );

        if (cert == null) {
          return cert;
        }

        //add renewed cert to local database
        await updateAccountCert(
          this.selectedAccount.id,
          cert,
          certInfo.servicePublicKey,
          certInfo.servicePrivateKey
        );
        certInfo = await getServiceAccount(this.selectedAccount.id);
      } else if (
        certInfo.serviceCert === "" ||
        !certInfo.serviceCert ||
        !certInfo.servicePrivateKey
      ) {
        //exists for accountId, but there's no cert for account on this auth

        //create keypair and account cert for this account on this auth
        const keyPair = forge.pki.rsa.generateKeyPair(2048);
        let privatePem = forge.pki.privateKeyToPem(keyPair.privateKey);
        let publicPem = forge.pki.publicKeyToPem(keyPair.publicKey);

        //get a cert from the CA with this account id
        cert = await renewAccountCert(
          privatePem,
          publicPem,
          this.selectedAccount.id,
          this.userInfo
        );

        if (cert == null) {
          return cert;
        }

        //add renewed cert to local database
        console.log("publicPem");
        console.log(publicPem);
        console.log("privatePem");
        console.log(privatePem);
        await updateAccountCert(
          this.selectedAccount.id,
          cert,
          publicPem,
          privatePem
        );
        certInfo = await getServiceAccount(this.selectedAccount.id);
      }

      console.log("certInfo");
      console.log(certInfo);
      //create session keypair and certificate (sign session id)
      let sessionCert = makeCertificate(
        this.session,
        certInfo.serviceCert,
        forge.pki.publicKeyFromPem(certInfo.sessionPublicKey), //public key from session keypair
        forge.pki.privateKeyFromPem(certInfo.servicePrivateKey) //signed by service cert private key
      );

      console.log("about to get geolocation");
      //get geolocation info
      const getLocation = () =>
        new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            position => {
              console.log("position");
              console.log(position);
              const location = {
                lat: position.coords.latitude,
                long: position.coords.longitude
              };
              return resolve(location); // Resolve with location. location can now be accessed in the .then method.
            },
            err => reject(err) // Reject with err. err can now be accessed in the .catch method.
          );
        });

      let geolocation = "";
      try {
        geolocation = await getLocation();
      } catch (error) {
        geolocation = "location not available";
      }

      let address = geolocation;
      if (geolocation != "location not available") {
        address = await this.reverseGeocode(geolocation.lat, geolocation.long);
      }

      console.log("geolocation");
      console.log(address);

      //return the response of website login api
      let response = await this.login(certInfo.serviceCert, sessionCert);

      if (response.status == 200) {
        //update authenticator data with this session
        await addSessionToAuthenticatorData(
          this.selectedAccount.id,
          this.userInfo.authname,
          sessionCert,
          address
        );

        console.log("after addSessionToAuthData");

        //this is an easy way to add the session info to the local database, since it's been added to authenticator data
        await updateAllCertsList();
      }

      return response;
    },
    /**
     * Get the cert information needed and call the website register endpoint.
     *
     * @returns register api response or null if there's an error
     */
    async registerProcess() {
      let forge = require("node-forge");
      console.log("entered register process");

      //if already has account ids, ask user if they wish to make a new account
      if (this.accounts.length != 0) {
        this.showAlreadyRegistered = true;
        return;
      }
      //if they want a new account continue w/ registration process

      //request account cert from a previous batch or new batch
      let accountCertObj = await this.requestAccountCert();
      console.log("accountCertObj");
      console.log(accountCertObj);
      if (accountCertObj === null) {
        return null;
      }

      //collect user selected account name, or some generic name if they don't make one
      this.accountName =
        document.getElementById("inputtedAccountName").value != ""
          ? document.getElementById("inputtedAccountName").value
          : "My Account";

      //generate a keypair to use for session certificate
      let sessionKeypair = forge.pki.rsa.generateKeyPair(2048);
      let sessionPrivateKey = forge.pki.privateKeyToPem(
        sessionKeypair.privateKey
      );
      let sessionPublicKey = forge.pki.publicKeyToPem(sessionKeypair.publicKey);

      //create session keypair and certificate (sign session id)
      console.log("public key");
      console.log(sessionKeypair.publicKey);
      let sessionCert = makeCertificate(
        this.session,
        accountCertObj.cert,
        sessionKeypair.publicKey, //public key from session keypair
        forge.pki.privateKeyFromPem(accountCertObj.privateKey) //signed by account cert private key
      );

      //get geolocation info
      console.log("about to get geolocation");
      const getLocation = () =>
        new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            position => {
              const location = {
                lat: position.coords.latitude,
                long: position.coords.longitude
              };
              return resolve(location); // Resolve with location. location can now be accessed in the .then method.
            },
            err => reject(err) // Reject with err. err can now be accessed in the .catch method.
          );
        });

      let geolocation = "";
      try {
        geolocation = await getLocation();
      } catch (error) {
        geolocation = "location not available";
      }

      let address = await this.reverseGeocode(
        geolocation.lat,
        geolocation.long
      );

      console.log("geolocation");
      console.log(geolocation);

      console.log("register");
      //return the response of website register api
      let response = await this.register(accountCertObj.cert, sessionCert);

      if (response.status == 200) {
        let sessionList = [
          {
            authenticator: this.userInfo.authname,
            sessions: [
              {
                sessionCert: sessionCert,
                geolocation: address
              }
            ]
          }
        ];

        //store the account information for new account on local database
        await storeServiceAccount(
          this.domain,
          accountCertObj.accountId,
          this.accountName,
          sessionPrivateKey,
          sessionPublicKey,
          sessionList,
          accountCertObj.cert,
          accountCertObj.privateKey,
          accountCertObj.publicKey
        );

        console.log("addAccountToAuthenticatorData");
        //add account to authenticator data
        await addAccountToAuthenticatorData(
          this.domain,
          accountCertObj.accountId,
          this.accountName,
          sessionPublicKey,
          sessionPrivateKey,
          this.userInfo.authname,
          sessionCert,
          geolocation
        );
      }

      return response;
    },
    /**
     * Get a account certificate with a new unique accountID.
     *
     * @returns object with account certificate with a new account id and keypair
     */
    async requestAccountCert() {
      let forge = require("node-forge");

      let accountId = generateUniqueIdentifier();
      const keyPair = forge.pki.rsa.generateKeyPair(2048);
      let privateKeyPem = forge.pki.privateKeyToPem(keyPair.privateKey);
      let publicKeyPem = forge.pki.publicKeyToPem(keyPair.publicKey);

      let accountCert = await renewAccountCert(
        privateKeyPem,
        publicKeyPem,
        accountId,
        this.userInfo
      );

      return {
        privateKey: privateKeyPem,
        publicKey: publicKeyPem,
        cert: accountCert,
        accountId: accountId
      };
    },
    /**
     * Evaluates a login or register response so the correct component displays in popup (Accept.vue or Reject.vue).
     *
     * @param response login or register api response object from a website
     */
    routeUser(response) {
      console.log("inside routeUser");
      //clear hidden fields from storage
      clearAuthInfoFromStorage();
      //route popup to Accept or Reject
      if (response == null) {
        alert("An error occurred with the request. Please try again.");
        this.reject = true;
      } else {
        this.accept = true;
      }
      this.loading = false;
    },
    /**
     * Takes gps coordinates and converts them into an address/location. This uses the positionstack api.
     * Use the lab email and password to access the positionstack account. Once the apiKey hits 25,000 requests it will
     * stop working.
     */
    async reverseGeocode(lat, long) {
      try {
        let response = await axios.get(
          "http://api.positionstack.com/v1/reverse?access_key=c17c97ab842e9c664f36092f21ab449a&limit=1&query=" +
            lat +
            "," +
            long
        );
        console.log(response.data);
        return response.data.data[0].label;
      } catch (error) {
        console.log(error);
      }
    },
    /**
     * Checks that the website that made the request is still open on the browser.
     * Called before going through with the request.
     *
     * @returns true if website tab is open, false otherwise
     */
    isRequestStillValid() {
      //query tabs for the web url from the authentication request and return query result
      return new Promise(resolve => {
        chrome.tabs.query({ url: this.webUrl }, function(tabs) {
          var result = tabs.length === 0 ? false : true;
          for (let i = 0; i < tabs.length; i++) {
            //inject a content script into this tab that checks for required fields again
            chrome.tabs.executeScript(tabs[i].id, {
              code:
                'if (document.getElementById("sessionObject")' +
                '&& document.getElementById("signature"))' +
                "{" +
                'if (!document.getElementById("sessionObject").value' +
                '|| !document.getElementById("signature").value)' +
                "{" +
                "chrome.storage.local.set({ letsAuthenticate: false });" +
                "}" +
                "} else {" +
                "chrome.storage.local.set({ letsAuthenticate: false });" +
                "}"
            });
          }
          resolve(result);
        });
      });
    },
    /**
     * Saves authentication information from hidden form fields in Vue data for use during authentication process.
     * Gets website pki certificate and verifies that it's legit. Rejects request if it's not legit.
     */
    async extractLoginObjValues() {
      const { Certificate } = require("@fidm/x509");

      //get strings collected from hidden form fields
      let loginString = await getLoginObject();
      let signature = await getLoginObjectSignature();

      //extract object from json strin
      let loginObject = JSON.parse(loginString);

      //save authentication information values in Vue data
      this.domain = loginObject.domain;
      this.session = loginObject.sessionID;
      this.type = loginObject.type;

      //fetch web pki certificate for verification
      let webCert = await this.getWebPKICertificate();

      if (webCert != null) {
        let certData = Certificate.fromPEM(webCert);
        console.log("certData");
        console.log(certData);

        console.log("signature");
        console.log(signature);
        console.log("loginString");
        console.log(loginString);

        // check signature on login object with webpki public key
        // TODO: make sure website certificate verification works! It was giving me issues so it's commented out for now
        if (
          !verifySignedString(certData.publicKeyRaw, loginString, signature)
        ) {
          //reject request if webpki cert is not verified
          clearAuthInfoFromStorage();
          alert("Failed to verify the website requesting login.");
          this.reject = true;
        }
      }
    },
    /**
     * Calls the login api on the website.
     *
     * @param accountCert PEM string format of this authenticator's account cert for this website
     * @param sessionCert PEM string format of session cert made for this session
     *
     * @returns response of api or null if there's an error
     */
    async login(accountCert, sessionCert) {
      try {
        let response = await axios.post(
          "https://" + this.domain + "/la0.2/api/login",
          {
            accountCertificate: accountCert,
            sessionCertificate: sessionCert,
            sessionID: this.session //TODO: get rid of this when it's gone in the CA
          },
          { headers: { "content-type": "application/json" } }
        );
        return response;
      } catch (error) {
        console.log(error);
        this.loading = false;
        this.rejectRequest();
        alert("Request failed. Website refused login. Try again Later!");
        return null;
      }
    },
    /**
     * Calls the register api on the website.
     *
     * @param accountCert PEM string format of this authenticator's account cert for this website
     * @param sessionCert PEM string format of session cert made for this session
     *
     * @returns response of api or null if there's an error
     */
    async register(accountCert, sessionCert) {
      try {
        let response = await axios.post(
          "https://" + this.domain + "/la0.2/api/register",
          {
            accountCertificate: accountCert,
            sessionCertificate: sessionCert,
            sessionID: this.session //TODO: get rid of this when it's gone in the CA
          },
          { headers: { "content-type": "application/json" } }
        );
        return response;
      } catch (error) {
        console.log(error);
        this.loading = false;
        this.rejectRequest();
        alert("Request failed. Website refused register. Try again Later!");
        return null;
      }
    },
    /**
     * Calls the api on the website to fetch the web pki certificate.
     * Rejects authentication request if there's an error.
     *
     * @returns part response body that contains certificate PEM string
     */
    async getWebPKICertificate() {
      try {
        let response = await axios.get(
          "https://" + this.domain + "/la0.2/api/info"
        );
        return response.data.certificate;
      } catch (error) {
        console.log(error);
        clearAuthInfoFromStorage();
        alert("An error occurred with the request. Please try again.");
        this.reject = true;
        return null;
      }
    },
    /**
     * Rejects an authentication request by:
     *  - Clearing authentication info from local storage
     *  - refreshing the webpage
     *  - displaying component Reject.vue
     */
    rejectRequest() {
      //called by reject request button
      clearAuthInfoFromStorage();
      this.reject = true;
      this.refreshPage();
    },
    /**
     * Quaries open tabs for the authentication request url and refreshes that tab.
     */
    refreshPage() {
      chrome.tabs.query({ url: this.webUrl }, function(tabs) {
        for (let i = 0; i < tabs.length; i++) {
          chrome.tabs.update(tabs[i].id, { url: tabs[i].url });
        }
      });
    }
  }
};
</script>

<style lang="scss" scoped>
.index {
  width: 350px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.request {
  width: 330px;
  padding: 15px;
  text-align: center;
  font-size: 14px;
}

.buttonRow {
  display: flex;
  flex-direction: row;
  width: 100%;
  justify-content: center;
  align-items: center;
  margin-top: 20px;
  font-size: 12px;
}

.accept {
  text-align: center;
  padding: 10px;
  width: 70px;
  height: 70px;
  border-radius: 50px;
  font-weight: bold;
  color: var(--dk-green);
  margin-right: 20px;
}

.accept:hover {
  background: rgba(137, 159, 163, 0.2);
}

.acceptNight {
  text-align: center;
  padding: 10px;
  width: 70px;
  height: 70px;
  border-radius: 50px;
  font-weight: bold;
  color: var(--logo-gray);
  margin-right: 20px;
}

.acceptNight:hover {
  background: rgba(137, 159, 163, 0.1);
}

.reject {
  text-align: center;
  padding: 10px;
  width: 70px;
  height: 70px;
  margin-left: 20px;
  border-radius: 50px;
  color: #920808;
}

.reject:hover {
  background: rgba(146, 8, 8, 0.1);
}

.rejectNight {
  text-align: center;
  padding: 10px;
  width: 70px;
  height: 70px;
  margin-left: 20px;
  border-radius: 50px;
  color: var(--n-fail-red);
}

.rejectNight:hover {
  background: rgba(255, 143, 143, 0.1);
}

/* CSS FOR RADIO BUTTONS */

/* The container */
.container {
  display: block;
  position: relative;
  margin-bottom: 12px;
  cursor: pointer;
  font-size: 12px;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

.containerText {
  text-align: start;
  margin-left: 50px;
  overflow-wrap: break-word;
}

/* Hide the browser's default radio button */
.container input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
}

/* Create a custom radio button */
.checkmark {
  position: absolute;
  top: 0;
  left: 0;
  height: 16px;
  width: 16px;
  background-color: #eee;
  border-radius: 50%;
  margin-left: 7px;
}

/* When the radio button is checked, add a blue background */
.container input:checked ~ .checkmark {
  background-color: var(--dk-green);
}

/* Create the indicator (the dot/circle - hidden when not checked) */
.checkmark:after {
  content: "";
  position: absolute;
  display: none;
}

/* Show the indicator (dot/circle) when checked */
.container input:checked ~ .checkmark:after {
  display: block;
}

/* Style the indicator (dot/circle) */
.container .checkmark:after {
  top: 5px;
  left: 5px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: white;
}

.scrollBox {
  text-align: center;
  background-color: var(--scroll-box);
  padding: 20px;
  padding-top: 0px;
  width: 200px;
  height: 50px;
  overflow-y: scroll;
  overflow-x: hidden;
  border-radius: 3px;
  box-shadow: 0.1em 0.1em 0.1em 0.1em rgba(0, 0, 0, 0.3);
}

form {
  color: black;
  font-weight: bold;
  font-size: 15px;
  margin-top: 7px;
}

input {
  margin-top: 5px;
  width: 150px;
  height: 20px;
  text-align: center;
}

.field {
  padding: 5px;
  margin-bottom: 10px;
}
</style>
