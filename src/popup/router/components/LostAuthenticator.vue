<template>
  <div id="body">
    <div class="authenticators" v-show="!editDevice">
      <h2>Authenticators</h2>

      <div id="box" class="scrollBox">
        <div v-for="device in deviceList" :key="device.cert">
          <div class="deviceRow">
            <div class="deviceName">{{ device.name }}</div>
            <div class="deauthorizeButton" @click="startDeauthorize(device)">
              Deauthorize
            </div>
          </div>
        </div>
      </div>
    </div>

    <div id="deauthorizeSection" class="deauthorize" v-show="editDevice">
      <h2 v-if="deauthorizing">Deauthorize {{ editDevice.name }}?</h2>
      <h2 v-else-if="authorizing">Authorize {{ editDevice.name }}?</h2>

      <div class="message" v-if="deauthorizing">
        Please enter username and password to deauthorize this device. All of
        it's certificates will be revoked.
      </div>

      <div class="message" v-else-if="authorizing">
        Please enter username and password to re-authorize this device. All of
        it's certificates will be restored.
      </div>

      <form id="deauthorizeForm">
        <div class="field">
          <label for="username">Username:</label><br />
          <input type="text" id="username" name="username" /><br />
        </div>
        <div class="field">
          <label for="pwd">Password:</label><br />
          <input
            type="password"
            id="pwd"
            name="pwd"
            @keyup.enter="clickDeauthorize"
          />
        </div>
      </form>

      <div id="failMessage" class="fail" v-show="passwordFail">
        Authorization changes to this device failed. Please try again.
      </div>

      <div class="buttonRow">
        <div class="passwordButton" @click="cancelChanges">
          Cancel
        </div>
        <div
          class="passwordButton"
          id="deauthorize"
          @click="finishDeauthorize"
          v-if="deauthorizing"
        >
          Deauthorize
        </div>
        <div
          class="passwordButton"
          id="authorize"
          @click="finishRestore"
          v-else-if="authorizing"
        >
          Authorize
        </div>
      </div>
    </div>
  </div>
</template>

<script>
/**
 * LostAuthenticator.vue
 * Displays all authenticators for user's 1Key account and buttons to deauthorize them.
 * Lot's of leftover code here from version0.1 to reauthorize devices. Version0.2 has
 * a user register the device as a new authenticator in the event they want to reauthorize the authenticator.
 */

import {
  revokeDeviceFromCA,
  restoreDeviceFromCA
} from "../tools/ServerFacade.js";
import { getAllAuthCerts } from "../tools/CertDatabase.js";
import {
  updateAllCertsList,
  removeAuthenticatorFromAuthData
} from "../tools/CertGen.js";
export default {
  name: "LostAuthenticator",
  data() {
    return {
      deviceList: null,
      deauthorizing: false,
      authorizing: false,
      editDevice: null,
      passwordFail: false
    };
  },
  /**
   * On creation it compiles list of authenticators (devices)
   */
  async created() {
    //make sure local database is up-to-date
    await updateAllCertsList();

    this.deviceList = await getAllAuthCerts();
    console.log("deviceList");
    console.log(this.deviceList);
    await this.changeButtonsToNightMode();
  },
  async mounted() {
    if (this.$root.$data.nightMode) {
      document.getElementById("body").style.color = "white";
      document.getElementById("box").style.backgroundColor = "var(--dk-green)";
      document.getElementById("failMessage").style.color = "var(--n-fail-red)";
      document.getElementById("deauthorizeSection").style.color = "white";
    }
  },
  methods: {
    /**
     * Sets deauthorzing to be true so DOM changes to display form to enter username
     * and password in order to complete deauthorization process.
     * Sets editDevice to the given authenticator.
     *
     * @param device object of info for the authenticator whose deauthorize button was selected
     */
    startDeauthorize(device) {
      this.deauthorizing = true;
      this.editDevice = device;
    },
    /**
     * Sets authorzing to be true so DOM changes to display form to enter username
     * and password in order to complete authorization process.
     * Sets editDevice to the given authenticator.
     *
     * @param device object of info for the authenticator whose authorize button was selected
     */
    startAuthorize(device) {
      this.authorizing = true;
      this.editDevice = device;
    },
    /**
     * Deauthorizes the current editDevice var with the CA
     * NOT COMPLETED for version0.2
     * TODO: update this if deauthorization is to be implemented in version0.2
     */
    async finishDeauthorize() {
      document.getElementById("deauthorize").className = "loadingButton";

      //get user input of username and password
      this.passwordFail = false;
      const userPassword = document.getElementById("pwd").value;
      const userName = document.getElementById("username").value;

      //ensure fields are filled
      if (!userName || !userPassword) {
        this.passwordFail = true;
        document.getElementById("deauthorizeForm").reset();
      } else {
        let response = await removeAuthenticatorFromAuthData(
          this.editDevice,
          userPassword,
          userName
        );

        if (response == null) {
          this.passwordFail = true;
          document.getElementById("deauthorizeForm").reset();
        } else {
          for (let i = 0; i < this.deviceList.length; i++) {
            if (this.deviceList[i] == this.editDevice) {
              this.deviceList.splice(i, 1);
              break;
            }
          }
          this.cancelChanges();
        }
      }

      //reset form, make sure buttons all look right
      document.getElementById("deauthorizeForm").reset();
      document.getElementById("deauthorize").className = "passwordButton";
      await this.changeButtonsToNightMode();
    },
    /**
     * Authorizes the current editDevice var with the CA
     * NOT COMPLETED for version0.2
     * TODO: update this if authorization is to be implemented in version0.2
     */
    async finishRestore() {
      document.getElementById("authorize").className = "loadingButton";

      //get user input of username and password
      this.passwordFail = false;
      const userPassword = document.getElementById("pwd").value;
      const userName = document.getElementById("username").value;

      //ensure fields are filled
      if (!userName || !userPassword) {
        this.passwordFail = true;
        document.getElementById("deauthorizeForm").reset();
      } else {
        //TODO: get authorization response from the CA
        let response = null; /*await restoreDeviceFromCA(
          userName,
          userPassword,
          this.editDevice.cert
        );*/

        if (response == null) {
          this.passwordFail = true;
          document.getElementById("deauthorizeForm").reset();
        } else {
          //TODO: refresh list so this authenticator displays as now deauthorized
          this.cancelChanges();
        }
      }

      //reset form, make sure buttons all look right
      document.getElementById("deauthorizeForm").reset();
      document.getElementById("authorize").className = "passwordButton";
      await this.changeButtonsToNightMode();
    },
    cancelChanges() {
      this.deauthorizing = false;
      this.authorizing = false;
      this.passwordFail = false;
      this.editDevice = null;
    },
    /**
     * If night mode setting is on, changes buttons in DOM to night mode colors
     */
    async changeButtonsToNightMode() {
      if (this.$root.$data.nightMode) {
        let results = await document.getElementsByClassName("deviceRow");
        for (let x = 0; x < results.length; x++) {
          results[x].style.color = "var(--scroll-box)";
        }

        let deauthorized = await document.getElementsByClassName(
          "restoreButton"
        );
        for (let x = 0; x < deauthorized.length; x++) {
          deauthorized[x].style.backgroundColor = "var(--logo-gray)";
        }

        let inputs = await document.getElementsByTagName("input");
        for (let x = 0; x < inputs.length; x++) {
          inputs[x].style.backgroundColor = "var(--n-gray)";
          inputs[x].style.color = "white";
        }
      }
    },
    clickDeauthorize() {
      document.getElementById("deauthorize").click();
    }
  }
};
</script>

<style lang="scss" scoped>
.authenticators {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.scrollBox {
  background-color: #c8d3d8;
  width: 280px;
  height: 200px;
  overflow: scroll;
  border-radius: 3px;
  box-shadow: 0.15em 0.15em 0.15em rgba(0, 0, 0, 0.3);
}

.deviceRow {
  display: flex;
  flex-direction: row;
  padding: 10px 15px 10px 15px;
  border-bottom: 2px solid rgba(22, 86, 99, 0.2);
  justify-content: space-between;
  align-items: center;
  color: var(--dk-green);
}

.deviceName {
  font-size: 15px;
  font-weight: bold;
  width: 150px;
  word-wrap: break-word;
  text-align: left;
}

.deauthorizeButton {
  width: 75px;
  height: 30px;
  border-radius: 30px;
  background-color: white;
  font-size: 10px;
  font-weight: bold;
  color: var(--dk-green);
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0.25em 0.25em 0.25em rgba(0, 0, 0, 0.3);
}

.deauthorizeButton:hover {
  box-shadow: 0.01em 0.01em 0.01em rgba(0, 0, 0, 0.3);
}

.restoreButton {
  width: 75px;
  height: 30px;
  border-radius: 30px;
  background-color: #165663;
  font-size: 10px;
  font-weight: bold;
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0.25em 0.25em 0.25em rgba(0, 0, 0, 0.3);
}

.restoreButton:hover {
  box-shadow: 0.01em 0.01em 0.01em rgba(0, 0, 0, 0.3);
}

.deauthorize {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: var(--dk-green);
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

.loadingButton {
  background: #899fa3;
  text-align: center;
  padding: 10px;
  margin: 15px 5px 15px 5px;
  box-shadow: 0.1em 0.1em 0.1em rgba(0, 0, 0, 0.3);
  border-radius: 25px;
  color: white;
  width: 100px;
  font-size: 12px;
  pointer-events: none;
}

.buttonRow {
  display: flex;
  flex-direction: row;
  margin-left: 5px;
  margin-right: 5px;
  justify-content: space-around;
  padding-top: 7px;
}

.fail {
  font-size: 10px;
  color: #b22222;
  padding: 2px;
}

.revokedDevice {
  color: #dcdcdc;
}

.message {
  font-size: 12px;
  padding: 0px 10px 10px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justifiy-content: center;
  text-align: center;
}

form {
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
</style>
