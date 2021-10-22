/**
 * LocalStorage.js
 *
 * Contains all functions that fetch and set local storage values.
 * Some local storage values are encrypted using Secure LS.
 */

import SecureLS from "secure-ls";
import { randomBytes } from "tweetnacl";

/**
 * Clears local storage values that were stored using Secure LS.
 */
export function clearSecretLocalStorage() {
  let ls = new SecureLS();
  ls.clear();
}

/**
 * Sets the password key in Secure LS.
 * Called when user logs into their 1Key account.
 *
 * @param password symmetric key made from the master password
 */
export function setLoggedInCredentials(password) {
  //store password while user is logged in
  let passwordLs = new SecureLS({ encodingType: "des", isCompression: true });
  passwordLs.set("credentials", password);
}

/**
 * Gets the password key that is stored in Secure LS.
 * This key is used to decrypt the stored indexed db key that encrypts the local database.
 *
 * @returns password-derived symmetric key
 */
export function getLoggedInCredentials() {
  //store password while user is logged in
  let passwordLs = new SecureLS({ encodingType: "des", isCompression: true });
  try {
    return passwordLs.get("credentials");
  } catch (error) {
    return undefined;
  }
}

/**
 * Removes password key from Secure LS for logout.
 *
 * @returns result of removing the password-derived key.
 */
export function setLogoutCredentials() {
  //take out stored password so nothing can be done
  let passwordLs = new SecureLS({ encodingType: "des", isCompression: true });
  return passwordLs.remove("credentials");
}

/**
 * Saves the randomly generated key that encrypts the indexeddb local database.
 * Also encrypts 10 copies of the indexeddb key with 10 account recovery passkeys.
 * Called upon registering this authenticator.
 *
 * @param password password-derived symmetric key to be used for encrypting the indexeddb key.
 * @returns 10 account recovery passkeys that were used to store 10 copies of the indexeddb key.
 */
export function setIndexeddbKey(password) {
  let key = randomBytes(32);

  let ls = new SecureLS({
    encodingType: "des",
    isCompression: true,
    //encryptionSecret: password
    encryptionNamespace: "main"
  });
  ls.set("indexeddbKey", key);

  //TODO: the 10 recovery passkeys is a feature of version0.1, this will need to be deleted
  //or replaced with account recovery things for version0.2

  //generate 10 random account recovery Passkeys
  let passkeys = [];

  for (let i = 0; i < 10; i++) {
    let passkey =
      Math.random()
        .toString(36)
        .substring(2, 15) +
      Math.random()
        .toString(36)
        .substring(2, 15);

    passkeys.push(passkey);

    //store key with each passkey
    let passkeyLs = new SecureLS({
      encodingType: "des",
      isCompression: true,
      encryptionSecret: passkey,
      encryptionNamespace: i.toString()
    });
    passkeyLs.set("indexeddbKey" + i.toString(), key);
  }

  return passkeys;
}

/**
 * In case of a password change, this replaces storage of indexxed db key by old password.
 * This is not currently being used because key is no longer stored based on password.
 *
 * @param key indexeddb key that encrypts the local database
 * @param newPassword new password-derived
 */
export function resetIndexeddbKey(key, newPassword) {
  let ls = new SecureLS({
    encodingType: "des",
    isCompression: true,
    //encryptionSecret: newPassword,
    encryptionNamespace: "main"
  });
  ls.set("indexeddbKey", key);
}

/**
 * Gets indexeddb key from Secure LS storage.
 * This is the key that encrypts the local database.
 *
 * @param password password-derived symmetric key used to encrypt storage of the indexeddb key.
 * @returns indexed db key that encrypts the local database or undefined if an error occurs
 */
export function getIndexeddbKey(password) {
  try {
    let ls = new SecureLS({
      encodingType: "des",
      isCompression: true,
      //encryptionSecret: password
      encryptionNamespace: "main"
    });
    let keyObj = ls.get("indexeddbKey");
    let keyUint8 = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      keyUint8[i] = keyObj[i];
    }
    return keyUint8;
  } catch (error) {
    //password was probably incorrect, key not found
    console.log("PASSWORD WAS PROBABLY INCORRECT, KEY NOT FOUND");
    return undefined;
  }
}

/**
 * Gets a copy of the indexeddb key from Secure LS storage that has been stored using one of the recovery keys.
 * This is the key that encrypts the local database.
 * Copy of key is deleted from Secure LS because recovery passkeys are supposed to be one time use.
 *
 * TODO: delete or alter this function since the 10 recovery keys are not a feature of version0.2
 *
 * @param recoveryPasskey one of 10 recovery passkeys used to encrypt a copy of the indexeddb
 * @returns indexed db key that encrypts the local database or undefined if nothing was found with the given recovery key
 */
export function getIndexeddbKeyRecovery(recoveryPasskey) {
  if (recoveryPasskey) {
    for (let i = 0; i < 10; i++) {
      try {
        let ls = new SecureLS({
          encodingType: "des",
          isCompression: true,
          encryptionSecret: recoveryPasskey,
          encryptionNamespace: i.toString()
        });
        let keyname = "indexeddbKey" + i.toString();
        let keyObj = ls.get(keyname);
        if (keyObj) {
          ls.remove(keyname);
          let keyUint8 = new Uint8Array(32);
          for (let i = 0; i < 32; i++) {
            keyUint8[i] = keyObj[i];
          }
          return keyUint8;
        }
      } catch (error) {} //doesn't match this passkey but it could be found elsewhere so we do nothing
    }
  }

  //not found
  return undefined;
}

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
 * Gets boolean stored in 'nightModeSetting' which indicates whether or not the user has the night mode setting enabled.
 * This value is automatically set to false upon extension upload.
 *
 * @returns boolean of night mode setting.
 */
export async function getNightModeSetting() {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.sync.get("nightModeSetting", function(value) {
        resolve(value.nightModeSetting);
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
