/**
 * content.js
 * Content script that is injected into every webpage a user visits.
 */

import { getSignInSetting } from "./popup/router/tools/LocalStorage.js";

/**
 * This callback is given to the page Mutation Observer.
 * Called whenever changes occur on page.
 * If the page contains the hidden Let's Auth fields, they are put in local storage
 * and the letsAuthenticate local storage variable is set to true.
 */
var scanForAuthDetails = async function() {
  chrome.storage.local.get("letsAuthenticate", async function(data) {
    //if there is already a pending request, nothing is collected from the page or changed in storage
    if (!data.letsAuthenticate) {
      //check if hidden fields exist on page.
      if (
        document.getElementById("sessionObject") &&
        document.getElementById("signature")
      ) {
        //If they do check that they have received values.
        if (
          document.getElementById("sessionObject").value &&
          document.getElementById("signature").value
        ) {
          chrome.storage.local.set({ letsAuthenticate: true });
          chrome.storage.local.set({
            letsAuthenticateLogin: document.getElementById("sessionObject")
              .value
          });
          chrome.storage.local.set({
            letsAuthenticateLoginSignature: document.getElementById("signature")
              .value
          });

          chrome.storage.local.set({
            letsAuthenticateWebUrl: document.location.href
          });
          let isAutoSignIn = await getSignInSetting();
          if (!isAutoSignIn) {
            //direct user to popup window
            alert(
              "Login Request Received. Accept Request in 1Key extension popup."
            );
          }
        } else {
          //if no authentication will occur, clear out storage
          chrome.storage.local.set({ letsAuthenticate: false });
          chrome.storage.local.remove("letsAuthenticateLogin");
          chrome.storage.local.remove("letsAuthenticateLoginSignature");
          chrome.storage.local.remove("letsAuthenticateWebUrl");
        }
      }
    }
  });
};

// Create an observer instance linked to the callback function
var observer = new MutationObserver(scanForAuthDetails);

// Start observing the target node (the body of the website) for configured mutations
var targetNode = document.body;
observer.observe(targetNode, {
  attributes: true,
  characterData: true,
  childList: true,
  subtree: true
});
