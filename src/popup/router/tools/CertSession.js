/**
 * CertSession.js
 *
 * Contains various fucntions about creating, checking, or deleting sessions
 * for certificates or other things. The functions were orginally from
 * CertGen.js, but the file was too large to keep strait.
 */
 import axios from "axios";
 import {
   getDecryptedAuthenticatorData,
   encryptAndUpdateAuthenticatorData,

 } from "./CertGen.js";
 // import {
 //   getAllServiceAccounts,
 //   getAuthCert,
 //   isServiceAccountSaved,
 //   updateServiceAccountSessions,
 //   storeServiceAccount,
 //   storeAuthCert,
 //   removeAuthCert,
 //   getServiceAccount,
 //   updateAccountCert
 // } from "./CertDatabase.js";
 // import { getUserInfo } from "./UserDatabase.js";
 // import {
 //   getAuthenticationDataFromCA,
 //   getAuthenticationDataLock,
 //   updateAuthenticationDataWithCA,
 //   revokeDeviceFromCA,
 //   renewAccountCertWithCA
 // } from "./ServerFacade.js";
 // import { getLoggedInCredentials } from "./LocalStorage.js";
 // import { v1 as uuidv1 } from "uuid";
 // import { Buffer } from 'buffer';

/**
 * Removes a session from the authentication data when the user remotely logs out of that account.
 * Used = Devices.vue
 *
 * @param accountID the unique identifier for that account
 * @param authName the name of the authenticator that is logged in to the account
 * @param session the session to be logged out of
 *
 * @returns the updated authentication data
 */
export async function removeSessionFromAuthData(accountID, authName, session) {
  let authDataObj = await getDecryptedAuthenticatorData();

  for (let account of authDataObj.data.map) {
    if (account.accountID == accountID) {
      for (let sessionList of account.sessionList) {
        if (sessionList.authenticator == authName) {
          for (let i = 0; i < sessionList.sessions.length; i++) {
            if (sessionList.sessions[i].sessionCert == session.sessionCert) {
              sessionList.sessions.splice(i, 1);
              break;
            }
          }
        }
      }
    }
  }

  return await encryptAndUpdateAuthenticatorData(
    authDataObj.data,
    authDataObj.key,
    authDataObj.lockID
  );
}

/**
 * Removes all sessions for a specific authenticator. Used when deauthorizing a device, I just wait to update the auth data until I'm finished logging out of each session.
 * Imported but not called in Devices.vue
 *
 * @param authName the name of the authenticator that is being logged out of.
 *
 * @returns updated authentication data
 */
export async function removeDeviceSessionsFromAuthData(authName) {
  let authDataObj = await getDecryptedAuthenticatorData();

  for (let account of authDataObj.data.map) {
    for (let sessionList of account.sessionList) {
      if (sessionList.authenticator == authName) {
        sessionList.sessions = [];
      }
    }
  }

  return await encryptAndUpdateAuthenticatorData(
    authDataObj.data,
    authDataObj.key,
    authDataObj.lockID
  );
}

/**
 * Logs the session out with the relying party. Used = CertGen.js
 *
 * @param domain the domain of the relying party
 * @param accountCertificate the account certificate for the user's account
 * @param sessionCertificate the session to be logged out of
 *
 * @returns the response object if successful, null if logout failed
 */
export async function logoutOfSession(domain, accountCertificate, sessionCertificate) {
  try {
    let response = await axios.post("https://" + domain + "/api/logout", {
      accountCertificate: accountCertificate,
      sessionCertificate: sessionCertificate
    });
    return response;
  } catch (error) {
    console.log(error);
    return null;
  }
}

/**
 * Adds a session to the authenticator data. Used = Request.vue (component)
 * Used with this authenticator logs into an exisiting account, thus starting a new session.
 *
 * @param accountID string id for the account being edited
 * @param authName string authenticator name for this auth
 * @param sessionCert PEM string of session cert being added
 * @param sessionGeoLocation string of geo location being added for this session
 *
 * @returns response from update api or null if error occurs
 */
export async function addSessionToAuthenticatorData(accountID, authName, sessionCert, sessionGeoLocation) {
  //get decrypted data and lockID
  let authDataObj = await getDecryptedAuthenticatorData();

  if (authDataObj == null) {
    return null; //indicates error
  }

  //make session object to add to account object sessionList sessions for this auth
  let sessionObj = {
    sessionCert: sessionCert,
    geoLocation: sessionGeoLocation
  };

  //find this account object
  let index = 0;
  let currentAccount = authDataObj.data.map[index];
  while (currentAccount.accountID != accountID) {
    index += 1;
    currentAccount = authDataObj.data.map[index];
  }

  //find this authenticator in account object
  let authIndex;
  for (let i = 0; i < currentAccount.sessionList.length; i++) {
    if (currentAccount.sessionList[i].authenticator === authName) {
      authIndex = i;
    }
  }

  //If authenticator not present, add authenticator object to sessionList
  if (authIndex === undefined) {
    currentAccount.sessionList.push({
      authenticator: authName,
      sessions: [sessionObj]
    });
  } else {
    //otherwise, just add session object to sessions for this authenticator
    currentAccount.sessionList[authIndex].sessions.push(sessionObj);
  }

  //update overall authenticator data
  authDataObj.data.map[index] = currentAccount;

  //encrypt authentication data and send back to CA
  let response = await encryptAndUpdateAuthenticatorData(
    authDataObj.data,
    authDataObj.key,
    authDataObj.lockID
  );

  return response; //if response is null, function caller handles this as an error
}

/**
 * Gets the expiration time of a certificate. Used = CertDatabase.js
 *
 * @param cert PEM string of certificate
 *
 * @returns date string of certificate expiration
 */
export function getCertificateExpirationTime(cert) {
  let forge = require("node-forge");
  let certData = forge.pki.certificateFromPem(cert);
  return certData.validity.notAfter;
}

/**
 * Checks if an expiration date has already passed, making the cert expired.
 * Used = App.vue
 *
 * @param expirationTime date string of expiration time from a certificate
 *
 * @returns boolean true if expired, false if not
 */
export function isTimeExpired(expirationTime) {
  let dates = {
    convert: function (d) {
      return d.constructor === Date
        ? d
        : d.constructor === Array
          ? new Date(d[0], d[1], d[2])
          : d.constructor === Number
            ? new Date(d)
            : d.constructor === String
              ? new Date(d)
              : typeof d === "object"
                ? new Date(d.year, d.month, d.date)
                : NaN;
    },
    compare: function (a, b) {
      return isFinite((a = this.convert(a).valueOf())) &&
        isFinite((b = this.convert(b).valueOf()))
        ? (a > b) - (a < b)
        : NaN;
    }
  };

  let expirationDate = new Date(expirationTime);
  //if current date is same as or after expiration date, time is expired
  return dates.compare(Date.now(), expirationDate) >= 0;
}
