<template>
  <div id="body">
    <div class="settings">
      <h2>Settings</h2>
      <div class="settingRow">
        <div class="settingName">Automatic Website Sign-In</div>
        <label class="switch">
          <input
            type="checkbox"
            :checked="signInSetting"
            @click="setSignInStreamline(!signInSetting)"
          />
          <span class="slider" />
        </label>
      </div>
      <div class="settingRow">
        <div class="settingName">Automatic Extension Logout</div>
        <label class="switch">
          <input
            type="checkbox"
            :checked="logoutSetting != 0"
            @click="allowMinutesChange"
          />
          <span class="slider" />
        </label>
      </div>
      <div
        class="settingRow"
        style="font-size: 13px"
        v-show="showMinutesSetting"
      >
        Logout after
        <select id="minuteOptions">
          <option value="2">2 minutes</option>
          <option value="5">5 minutes</option>
          <option value="10">10 minutes</option>
          <option value="15">15 minutes</option>
          <option value="30">30 minutes</option>
          <option value="60">1 hour</option>
          <option value="120">2 hours</option>
          <option value="180">3 hours</option>
          <option value="240">4 hours</option>
          <option value="480">8 hours</option>
          <option value="720">12 hours</option>
          <option value="1200">20 hours</option>
          <option value="1440">24 hours</option>
        </select>
        of browser inactivity.
      </div>
      <div class="settingRow">
        <div class="settingName">Night Mode</div>
        <label class="switch">
          <input
            type="checkbox"
            :checked="nightModeSetting"
            @click="setNightMode(!nightModeSetting)"
          />
          <span class="slider" />
        </label>
      </div>
    </div>
  </div>
</template>

<script>
/**
 * Settings.vue
 * Lists available settings: automatic website sign-in, automatic extension logout, and night mode.
 * User can edit settings here.
 */

import {
  getSignInSetting,
  getLogoutSetting,
  getNightModeSetting
} from "../tools/LocalStorage.js";
export default {
  name: "Settings",
  data() {
    return {
      signInSetting: false,
      logoutSetting: 0,
      nightModeSetting: false,
      showMinutesSetting: false
    };
  },
  async mounted() {
    if (this.$root.$data.nightMode) {
      document.getElementById("body").style.color = "white";
    }

    //get local storage settings values to display
    this.signInSetting = await getSignInSetting();
    this.logoutSetting = await getLogoutSetting();
    this.nightModeSetting = await getNightModeSetting();
    this.showMinutesSetting = this.logoutSetting != 0;

    if (this.showMinutesSetting) {
      minuteOptions.value = this.logoutSetting;
    }

    minuteOptions.addEventListener("change", async function() {
      chrome.storage.sync.set({
        logoutSetting: minuteOptions.options[minuteOptions.selectedIndex].value
      });
    });
  },
  methods: {
    /**
     * Stores in local storage the new boolean value for automatic website sign-in
     * @param value boolean of the new sign in setting
     */
    setSignInStreamline(value) {
      this.signInSetting = value;
      chrome.storage.sync.set({ signInSetting: value });
    },
    /**
     * Stores in local storage 0 minutes for automatic extension logout
     * if setting is turned off.
     * If automatic extension logout is turned on it stores the selected minutes value in local storage.
     */
    allowMinutesChange() {
      this.showMinutesSetting = !this.showMinutesSetting;
      if (!this.showMinutesSetting) {
        chrome.storage.sync.set({ logoutSetting: 0 });
      } else {
        let minutes = minuteOptions.options[minuteOptions.selectedIndex].value;
        this.logoutSetting = minutes;
        chrome.storage.sync.set({ logoutSetting: minutes });
      }
    },
    /**
     * Stores in local storage the new boolean value for night mode
     * @param value boolean of the new night mode setting
     */
    setNightMode(value) {
      chrome.storage.sync.set({ nightModeSetting: value });
    }
  }
};
</script>

<style lang="scss" scoped>
.settings {
  display: flex;
  flex-direction: column;
  text-align: center;
  align-items: center;
}

.settingName {
  width: 230px;
  text-align: left;
}

.settingRow {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  font-size: 15px;
  padding-top: 20px;
}

.switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 28px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--lt-gray);
  -webkit-transition: 0.4s;
  transition: 0.4s;
  border-radius: 34px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  -webkit-transition: 0.4s;
  transition: 0.4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: var(--dk-green);
}

input:focus + .slider {
  box-shadow: 0 0 1px var(--lt-gray);
}

input:checked + .slider:before {
  -webkit-transform: translateX(20px);
  -ms-transform: translateX(20px);
  transform: translateX(20px);
}

select {
  font-family: "Montserrat", sans-serif;
  font-size: 11px;
  margin-left: 10px;
  margin-right: 10px;
  padding: 2px;
}
</style>
