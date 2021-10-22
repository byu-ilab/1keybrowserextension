<template>
  <div id="body" class="accounts">
    <h2>Website Accounts</h2>

    <div id="box" class="scrollBox">
      <div v-for="account in accountArray" :key="account.accountId">
        <div class="accountRow">
          <div class="accountCircle" @click="revealDevices(account)">
            {{ account.domain.charAt(0) }}
          </div>
          <div class="accountColumn">
            <div class="domainName">{{ account.domain }}</div>
            <div class="accountName">{{ account.accountName }}</div>
            <div class="accountid">{{ account.accountId }}</div>
          </div>
        </div>
        <div class="deviceView" :id="account.accountId">
          <div
            class="deviceList"
            v-for="device in account.devices"
            :key="device"
          >
            <li>{{ device }}</li>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
/**
 * Accounts.vue
 * Displays a list of all account with this 1Key user,
 * including pertinent information for each account.
 */

import { getAccountsData, updateAllCertsList } from "../tools/CertGen.js";
export default {
  name: "Accounts",
  data() {
    return {
      accountArray: null
    };
  },
  /**
   * On creation it gets the array of account information
   * and sets night mode colors if night mode setting is on.
   */
  async created() {
    //make sure all information in local database is up-to-date
    await updateAllCertsList();

    this.accountArray = await getAccountsData();
    if (this.$root.$data.nightMode) {
      let results = await document.getElementsByClassName("accountColumn");
      for (let x = 0; x < results.length; x++) {
        results[x].style.color = "var(--scroll-box)";
      }

      let devices = await document.getElementsByClassName("deviceList");
      for (let x = 0; x < devices.length; x++) {
        devices[x].style.color = "black";
      }
    }
  },
  async mounted() {
    if (this.$root.$data.nightMode) {
      document.getElementById("body").style.color = "white";
      document.getElementById("box").style.backgroundColor = "var(--dk-green)";
    }
  },
  methods: {
    /**
     * Changes DOM to display (or hide if already revealed) list of authenticators
     * that have service certificates for a given account.
     *
     * @param account object from account array
     */
    revealDevices(account) {
      if (
        document.getElementById(account.accountId).style.display === "block"
      ) {
        document.getElementById(account.accountId).style.display = "none";
      } else {
        document.getElementById(account.accountId).style.display = "block";
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

.accounts {
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
}

.accountRow {
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  border-bottom: 2px solid rgba(22, 86, 99, 0.2);
  padding: 10px;
}

.accountCircle {
  width: 40px;
  height: 40px;
  border-radius: 50px;
  background-color: white;
  font-size: 30px;
  color: #165663;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0.08em 0.08em 0.08em rgba(0, 0, 0, 0.3);
}

.accountCircle:hover {
  box-shadow: 0.015em 0.015em 0.015em rgba(0, 0, 0, 0.3);
}

.deviceView {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  padding: 10px 0px 10px 30px;
  background: white;
  display: none;
  overflow: hidden;
}

.domainName {
  font-size: 15px;
  font-weight: bold;
  margin-bottom: 3px;
  width: 200px;
  word-wrap: break-word;
  text-align: left;
}

.accountName {
  font-size: 12px;
  font-weight: bold;
  margin-bottom: 5px;
  width: 200px;
  word-wrap: break-word;
  text-align: left;
}

.accountid {
  font-size: 8px;
  width: 155px;
  word-wrap: break-word;
  text-align: left;
}

.accountColumn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  word-wrap: break-word;
  padding-left: 10px;
  color: var(--dk-green);
}

li {
  font-size: 12px;
}
</style>
