<template>
  <div class="login">
    <div class="spinnerContainer" v-show="loading"><LoadingIcon /></div>
    <div class="header">
      <img src="../../../icons/left-arrow.png" @click="navigateBack" />
      Login
    </div>

    <form id="loginForm">
      <div class="field">
        <label for="username">Username:</label><br />
        <input type="text" id="username" name="username" ref="username" v-model="username" @keyup.enter="clickLogin" autofocus="autofocus"/>
        <br />
      </div>
      <div class="field">
        <label for="pin">Pin:</label><br />
        <div class="keySpecs">Enter a 6 digit pin for this device</div>
        <input type="password" id="pin" name="pin" v-model="pin" /><br />
      </div>
    </form>

    <div class="fail" id="failMessage" v-show="loginFail">Login failed</div>

    <button type="submit" :class="{ disabledButton: isDisabled, loginButton: !isDisabled }" id="loginButton" @click="loginLetsAuthUser">
      Login
    </button>

    <router-link id="forgotPwd" to="/forgotPassword" class="forgotPassword" v-show="alreadyRegistered">
      Forgot Password?
    </router-link>
  </div>
</template>

<script>
/**
 * Login.vue
 * Displays login form and functionality to login with CA.
 */

import LoadingIcon from "../components/LoadingIcon.vue";
import { updateAllCertsList, makeKeypass } from "../tools/CertGen.js";
import { getUserInfo, checkForRegisteredUser } from "../tools/UserDatabase.js";
import {
  setLoggedInCredentials,
  getIndexeddbKey,
} from "../tools/LocalStorage.js";

export default {
  name: "Login",
  data() {
    return {
      loginFail: false,
      loading: false,
      alreadyRegistered: false,
      username: "",
      pin: "",
    };
  },
  computed: {
    isDisabled() {
      return !this.username | (this.pin.length < 6) | this.loading;
    },
  },
  components: {
    LoadingIcon,
  },
  async created() {
    //change colors to night mode if necessary
    // if (this.$root.$data.nightMode) {
    //   let results = await document.getElementsByClassName("field");
    //   for (let x = 0; x < results.length; x++) {
    //     results[x].style.color = "white";
    //   }
    //   document.getElementById("username").style.backgroundColor =
    //     "var(--n-gray)";
    //   document.getElementById("pin").style.backgroundColor = "var(--n-gray)";
    //   document.getElementById("username").style.color = "white";
    //   document.getElementById("pin").style.color = "white";
    //   document.getElementById("forgotPwd").style.color = "white";
    //   document.getElementById("failMessage").style.color = "var(--n-fail-red)";
    // }
    // var input = document.getElementById("username");
    //this.$refs.username.focus();
  },
  async mounted() {
    //add form listeners to make sure login form is filled correctly before enabling login button
    //this.addFormEventListeners();
    //check if there is a user registered with this browser extension
    this.alreadyRegistered = await checkForRegisteredUser();
  },
  methods: {
    /**
     * Performs work of preparing credentials for login and calling login api.
     */
    async loginLetsAuthUser() {
      this.loading = true;
      // document.getElementById("loginButton").className = "disabledButton";

      //get user input of username and key
      //const pin = document.getElementById("pin").value;
      // const userName = this.username;
      console.log("checking pin");

      //get user info (including keys and authenticator cert) based on inputted key
      let idbKey = getIndexeddbKey(makeKeypass(this.pin));
      console.log(idbKey);
      if (idbKey) {
        console.log("entered");
        this.userInformation = await getUserInfo(idbKey);
      }
      console.log("pin correct");
      //if password was correct, user information is used for login api
      if (this.userInformation && this.userInformation.username === this.username) {
        console.log("got user information");
        //generate keypass from entered key
        let keypass = makeKeypass(this.pin);
        console.log("made a key from pin");

        setLoggedInCredentials(keypass);
        console.log("set logged in credentials");

        await updateAllCertsList(idbKey);
        this.loading = false;
        chrome.storage.local.set({ loggedIn: true });
        this.$router.push("/");
      } else if (!this.alreadyRegistered) {
        console.log("try adding a new device");

        //no one is registered but user might be trying to register new auth
        this.handleNewDeviceRegistration();
      } else {
        //someone is registered so incorrect credentials were given
        console.log("failed login");
        this.failLogin();
      }
    },
    /**
     * If no one is registered with this browser but user is attempting to login,
     * send them to the register page to register this browser as a new authenticator.
     */
    async handleNewDeviceRegistration() {
      this.$router.push({
        name: "New Device"
      });
    },
    /**
     * Add form listeners to ensure all fields are filled before login button is enabled.
     */
    // addFormEventListeners() {
    //   document.getElementById("username").addEventListener("input", checkForm);
    //   document.getElementById("pin").addEventListener("input", checkForm);

    //   function checkForm() {
    //     if (
    //       document.getElementById("pin").value &&
    //       document.getElementById("pin").value.length == 6 &&
    //       document.getElementById("username").value
    //     ) {
    //       document.getElementById("loginButton").className = "loginButton";
    //     } else {
    //       document.getElementById("loginButton").className = "disabledButton";
    //     }
    //   }
    // },
    // clickLogin() {
    //   if (document.getElementById("loginButton").className == "loginButton")
    //     document.getElementById("loginButton").click();
    // },
    /**
     * Called when login fails.
     * Clears form and sets an error message to be displayed in html.
     */
    failLogin() {
      this.username = "";
      this.pin = "";
      this.loginFail = true;
      this.loading = false;
    },
    /**
     * Goes back to previous page (Home.vue).
     */
    navigateBack() {
      this.$router.go(-1);
    },
  },
};
</script>

<style lang="scss" scoped>
.login {
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
  background: var(--dk-green);
  color: white;
}

.header img {
  margin-top: 5px;
  margin-right: 200px;
  width: 22px;
  height: 22px;
  color: white;
}

.loginButton {
  background: var(--dk-green);
  text-align: center;
  padding: 10px;
  margin: 20px 0px 30px 0px;
  box-shadow: 0.1em 0.1em 0.1em rgba(0, 0, 0, 0.3);
  border-radius: 25px;
  color: white;
  width: 120px;
  font-size: 15px;
}

.loginButton:hover {
  background: #899fa3;
}

.disabledButton {
  background: var(--logo-gray);
  text-align: center;
  padding: 10px;
  margin: 20px 0px 30px 0px;
  box-shadow: 0.1em 0.1em 0.1em rgba(0, 0, 0, 0.3);
  border-radius: 25px;
  width: 120px;
  pointer-events: none;
  color: white;
  font-size: 15px;
  border-width: 0px;
}

.fail {
  font-size: 10px;
  color: var(--fail-red);
  padding: 2px;
}

form {
  color: var(--dk-green);
  font-weight: bold;
  font-size: 15px;
  margin-top: 30px;
}

input {
  margin-top: 5px;
  width: 250px;
  height: 20px;
}

.field {
  padding: 5px;
  margin-bottom: 10px;
}

.forgotPassword {
  text-decoration: none;
  color: var(--dk-green);
  font-size: 12px;
}

.forgotPassword:hover {
  text-decoration: underline;
}

.keySpecs {
  font-size: 12px;
  color: var(--logo-gray);
  padding: 2px;
}
</style>
