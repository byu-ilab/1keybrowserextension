/**
 * LocalStorage.js
 *
 * Contains all functions that fetch and set local storage values.
 * Some local storage values are encrypted using Secure LS.
 */



/**
 * Stores the etag from the most recent GET response for authenticator data.
 *
 * @param etag string of etag header from the GET response
 */
export function setAuthenticationDataEtag(etag) {
  chrome.storage.local.set({ etag: etag }, function() {
    console.log("Set etag");
  });
}

/**
 * Gets the etag from the most recent GET response for authenticator data.
 * Used to send in a new GET request as a If-None-Match header.
 *
 * @returns string of etag header from the GET response
 */
export async function getAuthenticationDataEtag() {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.get("etag", function(value) {
        resolve(value.etag);
      });
    } catch (ex) {
      reject(ex);
    }
  });
}

/**
 * Gets boolean value 'letsAuthenticate' which indicates whether the extension
 * has received an authentication request from a website.
 *
 * @returns boolean for if the extension has received an authentication request or no
 */
export async function getAuthenticateValue() {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.get("letsAuthenticate", function(value) {
        resolve(value.letsAuthenticate);
      });
    } catch (ex) {
      reject(ex);
    }
  });
}

/**
 * Gets boolean value 'loggedIn' which indicates whether user is logged-in to the extension.
 *
 * @returns boolean for if user is logged in
 */
export async function getLoggedInValue() {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.get("loggedIn", function(value) {
        resolve(value.loggedIn);
      });
    } catch (ex) {
      reject(ex);
    }
  });
}

/**
 * Gets json string stored in 'letsAuthenticateLogin' which is the login info found in one of the hidden form fields on a website.
 *
 * @returns json string of website login (or register) info
 */
export async function getLoginObject() {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.get("letsAuthenticateLogin", function(value) {
        resolve(value.letsAuthenticateLogin);
      });
    } catch (ex) {
      reject(ex);
    }
  });
}

/**
 * Gets string stored in 'letsAuthenticateLoginSignature' which is the signature resulting from
 * the login info json string being signed by the website private key.
 * This signature is used to verify to validity of the website's authentication request.
 *
 * @returns string of signature of login (or register) info
 */
export async function getLoginObjectSignature() {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.get("letsAuthenticateLoginSignature", function(
        value
      ) {
        resolve(value.letsAuthenticateLoginSignature);
      });
    } catch (ex) {
      reject(ex);
    }
  });
}

/**
 * Gets string stored in 'letsAuthenticateWebUrl' which is the url of the website requesting authentication.
 *
 * @returns string url of website that is requesting authentication
 */
export async function getWebUrl() {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.get("letsAuthenticateWebUrl", function(value) {
        resolve(value.letsAuthenticateWebUrl);
      });
    } catch (ex) {
      reject(ex);
    }
  });
}

/**
 * Gets boolean stored in 'signInSetting' which indicates whether or not the user has the automatic website sign-in setting enabled.
 * This value is automatically set to false upon extension upload.
 *
 * @returns boolean of automatic sign-in setting
 */
export async function getSignInSetting() {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.sync.get("signInSetting", function(value) {
        resolve(value.signInSetting);
      });
    } catch (ex) {
      reject(ex);
    }
  });
}

/**
 * Gets int stored in 'logoutSetting' which indicates after how many minutes the extension automatically logs out according to the automatic logout setting.
 * This value is automatically set to 0 upon extension upload (meaning no automatic logout will occur)
 *
 * @returns int of number of minutes until automatic extension logout or 0 for no automatic logout
 */
export async function getLogoutSetting() {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.sync.get("logoutSetting", function(value) {
        resolve(value.logoutSetting);
      });
    } catch (ex) {
      reject(ex);
    }
  });
}


/**
 * Clears from local storage all values related to authentication with a specific website.
 * Sets the 'letsAuthenticate' value to false, meaning no website is currently requesting authentication with 1Key.
 */
export async function clearAuthInfoFromStorage() {
  chrome.storage.local.set({ letsAuthenticate: false });
  chrome.storage.local.remove("letsAuthenticateLogin");
  chrome.storage.local.remove("letsAuthenticateLoginSignature");
  chrome.storage.local.remove("letsAuthenticateWebUrl");
}
