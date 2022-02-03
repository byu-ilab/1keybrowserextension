<template>
  <div id="body" class="devices">
    <h2>Devices</h2>
    <LoadingIcon v-if="loadingPage" />

    <div id="box" class="scrollBox" v-else>
      <div v-if="deviceListEmpty">
        <h3>None of your devices have active sessions!</h3>
      </div>
      <div
        class="deviceColumn"
        v-else
        v-for="(device, deviceName) in deviceList"
      >
        <div class="deviceRow" style="padding: 5px 0px 15px 0px;">
          <div class="deviceName" style="font-size: 17px; width: 170px">
            {{ deviceName }}
          </div>
          <div
            v-if="device.accounts.length > 0 && !loading"
            class="logoutAllButton"
            @click="logoutAll(deviceList, deviceName)"
          >
            Logout All
          </div>
          <div v-if="loading" class="spinnerContainer" v-show="loading">
            <LoadingIcon />
          </div>
        </div>
        <div class="accountColumn" v-for="account in device.accounts">
          <div class="accountContainer">
            <div class="accountName" style="font-size: 14px;">
              {{ account.domain }} - {{ account.accountName }}
            </div>
            <div class="accountRow" v-for="session in account.sessions">
              <div class="deviceName" style="font-size: 10px;">
                {{ session.geoLocation }}
              </div>
              <div
                class="logoutButton"
                @click="
                  logoutOne(
                    account.domain,
                    session,
                    account.accountID,
                    deviceName
                  )
                "
              >
                Logout
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
/**
 * Devices.vue
 * This page contains deprecated functionality.
 * If nothing like remote logout is to be implemented in version0.2, then this file can be removed.
 */

import axios from "axios";
import LoadingIcon from "../components/LoadingIcon.vue";
import {
  updateAllCertsList,
  getLoggedInDevices,
  getAccountCert,
  removeSessionFromAuthData,
  removeDeviceSessionsFromAuthData
} from "../tools/CertGen.js";
import { getUserInfo } from "../tools/UserDatabase.js";
export default {
  name: "Devices",
  data() {
    return {
      deviceList: null,
      loading: false,
      loadingPage: false
    };
  },
  components: {
    LoadingIcon
  },
  async created() {
    //make sure local database is up-to-date
    this.loading = true;
    this.loadingPage = true;
    await updateAllCertsList();

    let deviceList = await getLoggedInDevices();
    console.log("device list in created");
    console.log(deviceList);
    this.deviceList = deviceList;
    //await this.logoutAll(deviceList, "mac")

    if (this.$root.$data.nightMode) {
      let results = document.getElementsByClassName("deviceColumn");
      for (let x = 0; x < results.length; x++) {
        results[x].style.color = "var(--scroll-box)";
      }
    }
    this.loadingPage = false;
    this.loading = false;
  },
  async mounted() {
    if (this.$root.$data.nightMode) {
      document.getElementById("body").style.color = "white";
      document.getElementById("box").style.backgroundColor = "var(--dk-green)";
    }
  },
  computed: {
    deviceListEmpty() {
      if (!this.deviceList) {
        return true;
      }
      return Object.keys(this.deviceList).length === 0;
    }
  },
  methods: {
    async logoutOne(domain, session, accountId, deviceName) {
      this.loading = true;
      let response = await this.logout(domain, session, accountId, deviceName);
      this.loading = false;
    },
    async logout(domain, session, accountId, deviceName) {
      try {
        //logout api with website
        let userInfo = await getUserInfo();
        let accountCert = await getAccountCert(accountId, userInfo);
        let response = await axios.post("https://" + domain + "/api/logout", {
          accountCertificate: accountCert,
          sessionCertificate: session.sessionCert
        });

        await removeSessionFromAuthData(accountId, deviceName, session);
        this.removeSessionFromDeviceList(session, accountId, deviceName);
        return 200;
      } catch (error) {
        console.log(error);
        return null;
      }
    },
    async logoutAll(deviceList, deviceName) {
      this.loading = true;
      let accountsLength = deviceList[deviceName].accounts.length;
      for (let i = accountsLength - 1; i >= 0; i--) {
        let sessionsLength = deviceList[deviceName].accounts[i].sessions.length;
        for (let j = sessionsLength - 1; j >= 0; j--) {
          console.log(deviceList[deviceName].accounts[0].sessions[j]);
          await this.logout(
            deviceList[deviceName].accounts[i].domain,
            deviceList[deviceName].accounts[i].sessions[j],
            deviceList[deviceName].accounts[i].accountID,
            deviceName
          );
        }
      }
      this.loading = false;
    },
    removeSessionFromDeviceList(session, accountId, deviceName) {
      for (let device in this.deviceList) {
        for (let i = 0; i < this.deviceList[device].accounts.length; i++) {
          let account = this.deviceList[device].accounts[i];
          if (account.accountID == accountId) {
            for (let j = 0; j < account.sessions.length; j++) {
              if (account.sessions[j].sessionCert == session.sessionCert) {
                account.sessions.splice(j, 1);
                break;
              }
            }

            if (account.sessions.length == 0) {
              this.deviceList[device].accounts.splice(i, 1);
            }
            break;
          }
        }
        console.log("remove session from device list");
        console.log(device);
        if (!this.deviceList[device].accounts) {
          delete this.deviceList[deviceName];
        }
      }
    }
  }
};
</script>

<style lang="scss" scoped>
::-webkit-scrollbar {
  width: 5px;
}

/* Track */
::-webkit-scrollbar-track {
  background: transparent;
}

/* Handle */
::-webkit-scrollbar-thumb {
  background: var(--logo-gray);
  border-radius: 50px;
}

.devices {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.scrollBox {
  background-color: var(--scroll-box);
  width: 280px;
  height: 200px;
  overflow-y: scroll;
  overflow-x: hidden;
  border-radius: 3px;
  box-shadow: 0.15em 0.15em 0.15em rgba(0, 0, 0, 0.3);
  position: relative;
}

.deviceRow {
  display: flex;
  flex-direction: row;
  padding: 10px 15px 10px 15px;
  justify-content: space-between;
  align-items: center;
}

.accountContainer {
  width: 100%;
}

.accountColumn {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.accountRow {
  display: flex;
  flex-direction: row;
  padding: 10px 15px 10px 15px;
  justify-content: space-between;
  align-items: center;
}

.deviceColumn {
  display: flex;
  flex-direction: column;
  padding: 10px 15px 10px 15px;
  border-bottom: 2px solid rgba(22, 86, 99, 0.2);
  align-items: flex-start;
  color: var(--dk-green);
}

.deviceName {
  font-size: 12px;
  font-weight: bold;
  width: 175px;
  word-wrap: break-word;
  text-align: left;
}

.accountName {
  text-align: left;
}

.logoutButton {
  width: 55px;
  height: 23px;
  border-radius: 30px;
  background-color: white;
  font-size: 8px;
  font-weight: bold;
  color: var(--dk-green);
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0.25em 0.25em 0.25em rgba(0, 0, 0, 0.3);
}

.logoutAllButton {
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

.logoutButton:hover {
  box-shadow: 0.01em 0.01em 0.01em rgba(0, 0, 0, 0.3);
}

.logoutAllButton:hover {
  box-shadow: 0.01em 0.01em 0.01em rgba(0, 0, 0, 0.3);
}

.fail {
  font-size: 10px;
  color: var(--fail-red);
  padding: 2px;
}

.instructions {
  color: var(--dk-green);
  font-weight: bold;
  font-size: 10px;
  padding: 10px;
}
</style>
