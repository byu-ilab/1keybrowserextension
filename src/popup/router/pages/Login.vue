<template>
  <div class="padded">
    <h1>Login</h1>

    <form id="loginForm"  @submit.prevent="loginLetsAuthUser">
      <div class="field">
        <label for="pin">Password</label><br />
        <input type="password" id="password" name="password" v-model="password" /><br />
      </div>

      <div class="fail" id="failMessage" v-show="loginFail">
        {{errorMessage}}
      </div>

      <button type="submit">
      Login
    </button>
    </form>

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

import { updateAllCertsList, makeKeypass } from "../tools/CertGen.js";
import { getUser, loginUser } from "../tools/UserDatabase.js";
import {
  setLoggedInCredentials,
  getIndexeddbKey,
} from "../tools/LocalStorage.js";

export default {
  name: "Login",
  data() {
    return {
      loginFail: false,
      errorMessage: "",
      loading: false,
      alreadyRegistered: false,
      password: "",
    };
  },
  methods: {
    invalidForm() {
      return (this.password.length < 8);
      // DZ should probably enforce a username that is alphanumeric. See the restrictions in the CA
    },
    /**
     * Performs work of preparing credentials for login and calling login api.
     */
    async loginLetsAuthUser() {
      this.loginFail = false;
      if (this.invalidForm()) {
        this.loginFail = true;
        this.errorMessage = "The password must be at least 8 characters."
        return;
      }
      console.log("checking password");
      const result = await loginUser(this.password);
      if (!result) {
        this.loginFail = true;
        this.errorMessage = "Incorrect password"
        return;
      }

      console.log("password correct");
      // Not sure we need this
      // await updateAllCertsList(idbKey);
      this.$router.push("/");
    }
  },
};
</script>

<style scoped>

</style>
