/**
 * background.js
 * Persistent background script that runs as long as the browser is open.
 */

import { getSignInSetting } from "./popup/router/tools/LocalStorage.js";
import Main from "./popup/router/pages/Main.vue";
import Request from "./popup/router/components/Request.vue";
import { updateAllCertsList } from "./popup/router/tools/CertGen.js";

/**
 * This listener runs when user installs 1Key.
 * initializes 'letsAuthenticate' as false, loggedIn as false, and settings as off.
 * 'letsAuthenticate' indicates whether a login request has been received from a webpage.
 */
chrome.runtime.onInstalled.addListener(function() {
  chrome.storage.local.set({ letsAuthenticate: false }, function() {
    console.log("Let's authenticate automatically set to false");
  });
  chrome.storage.local.set({ loggedIn: false }, function() {
    console.log("Logged in status automatically set to false");
  });
  chrome.storage.sync.set({ signInSetting: false }, function() {
    console.log("Streamlined sign in setting automatically set to false");
  });
  chrome.storage.sync.set({ logoutSetting: 0 }, function() {
    console.log("Automatic logout setting automatically set to 0 (off)");
  });
  chrome.storage.sync.set({ nightModeSetting: false }, function() {
    console.log("Night mode setting automatically set to false");
  });
});

/**
 * This listener runs everytime browser is opened.
 * schedules recovery data updates for every hour while browser is opened
 */
chrome.runtime.onStartup.addListener(function() {
  setInterval(async function() {
    await scheduledFetchRecoveryData();
  }, 1000 * 60 * 60);
});

/**
 * Updates recovery data locally as long as user is logged in
 */
async function scheduledFetchRecoveryData() {
  chrome.storage.local.get("loggedIn", async function(data) {
    console.log("fetch recovery data");
    await updateAllCertsList();
  });
}

/**
 * This listener runs every time one of the locally stored values changes.
 */
chrome.storage.onChanged.addListener(function(changes, namespace) {
  //if user logged in or a login request was received then this displays
  //a badge indicating request was received while logged in
  if (changes.loggedIn || changes.letsAuthenticate) {
    chrome.storage.local.get("letsAuthenticate", async function(data) {
      if (data.letsAuthenticate === true) {
        chrome.storage.local.get("loggedIn", async function(data) {
          if (data.loggedIn && !(await getSignInSetting())) {
            //NO auto sign in - show notification that there is a pending request
            chrome.action.setBadgeText({
              text: "1"
            });
            chrome.action.setBadgeBackgroundColor({
              color: "#FF0000"
            });
          } else if (data.loggedIn) {
            //green badge indicates actively signing in (for auto sign-in)
            chrome.action.setBadgeBackgroundColor({
              color: "#00B300"
            });
            chrome.action.setBadgeText({
              text: " "
            });
            //YES auto sign in - perform sign in
            await Request.methods.backgroundRequest();

            //turn off green badge once sign in is complete
            chrome.action.setBadgeText({
              text: ""
            });
          }
        });
      } else {
        //Request canceled or something so there is NO badge
        chrome.action.setBadgeText({
          text: ""
        });
      }
    });
  }

  //If auto logout setting changed this sets auto logout
  if (changes.logoutSetting) {
    //setting has been turned on, set listener for the given value of idle time
    if (changes.logoutSetting.newValue !== 0) {
      chrome.idle.setDetectionInterval(changes.logoutSetting.newValue * 60);
      chrome.idle.onStateChanged.addListener(function(newState) {
        if (newState == "idle") {
          Main.methods.logoutLetsAuthUser();
        }
      });
    } else {
      //listener does nothing because setting has been turned off.
      chrome.idle.setDetectionInterval(80000);
      chrome.idle.onStateChanged.addListener(function(newState) {});
    }
  }
});

/**
 * This listener runs when all browser windows are closed.
 * logs user out of 1Key
 */
chrome.windows.onRemoved.addListener(function() {
  chrome.windows.getAll(function(windows) {
    if (windows.length <= 0) {
      chrome.action.setBadgeText({
        text: ""
      });
      Main.methods.logoutLetsAuthUser();
    }
  });
});
