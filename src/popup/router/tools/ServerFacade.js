/**
 * ServerFacade.js
 *
 * Contains all functions for each api calls with the CA.
 */

import axios from "axios";
import {
  getAuthenticationDataEtag,
  setAuthenticationDataEtag
} from "./LocalStorage.js";

var hostName = "https://letsauth.org";
// var hostName = "http://localhost:3000"; //Use this if you are running the CA locally

/**
 * Fetches authenticator data from the CA.
 * Uses the etag value from local storage to set the If-None-Match header.
 * The CA uses that header to check if the authenticator data has changed since the last time this authenticator fetched it.
 * If no change has occurred, there is no need to update and CA doesn't return authenticator data.
 *
 * @param authenticatorCertificate PEM string of authenticator certficate
 * @param username string of username for this 1Key account
 *
 * @returns response if successful, 304 if there's no need to update, and null if error occurs
 */
export async function getAuthenticationDataFromCA(
  authenticatorCertificate,
  username
) {
  let headers = {};
  let etag = await getAuthenticationDataEtag();

  //if an etag is saved, set it as the If-None-Match header
  if (etag != undefined) {
    headers = {
      "If-None-Match": etag
    };
  }

  console.log("authCert");
  console.log(authenticatorCertificate);
  let encodedAuthCert = encodeURIComponent(authenticatorCertificate);
  //documentation now shows endpoint as hostName + "/la0.2/users/" + username + "/data"
  try {
    let response = await axios.get(
      hostName +
        "/la0.2/users/" +
        username +
        "/data?authenticatorCertificate=" +
        encodedAuthCert,
      {
        headers: headers
      }
    );

    setAuthenticationDataEtag(response.headers.Etag);
    return response;
  } catch (error) {
    console.log(error.response);
    if (error.response.status === 304) {
      //TODO: check what CA sends if update is unnecessary. It could be a 304 error, but I don't know.
      //return something to indicate nothing is wrong but it doesn't need to be updated
      return 304;
    }

    if (!error.response) {
      alert("1Key Server is not responding. Please try again later.");
    }
    return error.response;
  }
}

/**
 * Gets a lock identifier and the currently stored authenticator data in the CA.
 * The lock identifier is necessary to PUT changes to the authenticator data.
 *
 * @param authenticatorCertificate PEM string of authenticator certficate
 * @param username string of username for this 1Key account
 *
 * @returns response if successful or null if error occurs
 */
export async function getAuthenticationDataLock(
  authenticatorCertificate,
  username
) {
  try {
    let response = await axios.post(
      hostName + "/la0.2/users/" + username + "/data",
      {
        authenticatorCertificate: authenticatorCertificate
      }
    );
    return response;
  } catch (error) {
    console.log(error.response);
    if (!error.response) {
      alert("1Key Server is not responding. Please try again later.");
    }
    return null;
  }
}

/**
 * Updates the CA-stored value for authenticator data.
 *
 * @param authenticationData json string containing encrypted key and encrypted authenticator data to be stored with CA.
 * @param lockIdentifier string provided by CA using getAuthenticationDataLock.
 * @param authenticatorCertificate PEM string of authenticator certficate
 * @param username string of username for this 1Key account
 *
 * @returns response if successful or null if error occurs
 */
export async function updateAuthenticationDataWithCA(
  authenticationData,
  lockIdentifier,
  authenticatorCertificate,
  username
) {
  try {
    let response = await axios.put(
      hostName + "/la0.2/users/" + username + "/data",
      {
        authenticatorCertificate: authenticatorCertificate,
        authenticationData: authenticationData,
        lockIdentifier: lockIdentifier
      }
    );
    return response;
  } catch (error) {
    console.log(error.response);
    if (!error.response) {
      alert("1Key Server is not responding. Please try again later.");
    }
    return null;
  }
}

/**
 * Renews or creates an account certificate.
 *
 * @param CSR certificate signing request, contains the information to be stored in the account certificate
 * @param authSignature CSR PEM string that is signed by this authenticator's private key
 * @param authenticatorCertificate PEM string of authenticator certficate
 * @param username string of username for this 1Key account
 *
 * @returns response if successful or null if error occurs
 */
export async function renewAccountCertWithCA(
  CSR,
  authSignature,
  authenticatorCertificate,
  username
) {
  try {
    let response = await axios.post(
      hostName + "/la0.2/user/" + username + "/account",
      {
        CSR: CSR,
        authSignature: authSignature,
        authenticatorCertificate: authenticatorCertificate
      }
    );
    return response;
  } catch (error) {
    console.log(error.response);
    if (!error.response) {
      alert("1Key Server is not responding. Please try again later.");
    } else if (error.response.status === 403) {
      alert("Error: Account has been hijacked");
    }
    return null;
  }
}

/**
 * DEPRECATED: this is from version0.2 and is kept just in case we transition away from FIDO back to passwords
 * Completes registering a 1Key account with the CA.
 *
 * @param usr string of desired username for the new 1Key account
 * @param authCSR certificate signing request for an authenticator certificate that contains the public key from this authenticator's keypair
 *
 * @returns response if successful or null if error occurs
 */
export async function sendRegisterToCA(usr, authCSR) {
  try {
    let response = await axios.post(hostName + "/la0.2/password/register", {
      username: usr,
      CSR: authCSR
    });
    return response;
  } catch (error) {
    console.log(error);
    if (!error.response) {
      alert("1Key Server is not responding. Please try again later.");
    } else {
      alert(error.response.data);
      //possible errors: 403 (unable to sign csr) or 500 (internal server error)
      // TODO: maybe differentiate error message based on error type...
    }
    return null;
  }
}

/**
 * DEPRECATED: this is from version0.2 and is kept just in case we transition away from FIDO back to passwords
 * Completes login to users's 1Key account.
 *
 * @param usr string of inputted username
 * @param pwd string of inputted master password
 * @param authCSR certificate signing request for an authenticator certificate that contains the public key from this authenticator's keypair
 *
 * @returns response if successful or null if error occurs
 */
export async function sendLoginToCA(usr, pwd, authCSR) {
  try {
    let response = await axios.post(hostName + "/la0.2/password/login", {
      username: usr,
      CSR: authCSR
    });
    return response;
  } catch (error) {
    console.log(error.response);
    if (!error.response) {
      alert("1Key Server is not responding. Please try again later.");
    } else {
      console.log(error.response.data);
      //possible errors: 403 (unable to sign csr) or 500 (internal server error)
    }
    return null;
  }
}

/**
 * sends the CSR and returns a valid authenticator certificate
 *
 * @param usr string of inputted username
 * @param authCSR certificate signing request for an authenticator certificate that contains the public key from this authenticator's keypair
 *
 * @returns response if successful or null if error occurs
 */
export async function sendAuthCSRToCA(usr, authCSR) {
  try {
    let response = await axios.post(
      hostName + "/la0.3/users/" + usr + "/sign",
      {
        CSR: authCSR
      }
    );
    return response;
  } catch (error) {
    console.log(error.response);
    if (!error.response) {
      alert("1Key Server is not responding. Please try again later.");
    } else {
      console.log(error.response.data);
      //possible errors: 403 (unable to sign csr) or 500 (internal server error)
    }
    return null;
  }
}

/**
 * DEPRECATED: this is from version0.1 and there is not yet a version of this endpoint for version0.2
 * Revokes an authenticator so any CA api calls it makes aren't completed.
 *
 * @param username inputted username
 * @param password inputted master password
 * @param deviceCert PEM string of authenticator certificate for the authenticator being revoked
 *
 * @returns response if successful or null if error occurs
 */
export async function revokeDeviceFromCA(username, password, deviceCert) {
  console.log("entered revoke device from CA");
  try {
    let response = await axios.post(
      hostName + "/la0.2/user/" + username + "/revoke/password",
      {
        password: password,
        authenticatorCertificate: deviceCert
      }
    );
    console.log("about to enter return");
    return response;
  } catch (error) {
    console.log(error.response);
    if (!error.response) {
      alert("1Key Server is not responding. Please try again later.");
    }
    return null;
  }
}

/**
 * DEPRECATED: this is from version0.1 and there is not yet a version of this endpoint for version0.2
 * Restores a revoked authenticator so it can perform api calls.
 *
 * @param username inputted username
 * @param password inputted master password
 * @param deviceCert PEM string of authenticator certificate for the authenticator being revoked
 *
 * @returns response if successful or null if error occurs
 */
export async function restoreDeviceFromCA(username, password, deviceCert) {
  try {
    let response = await axios.post(hostName + "/users/device/restore", {
      username: username,
      password: password,
      deviceCert: deviceCert
    });
    return response;
  } catch (error) {
    console.log(error.response);
    if (!error.response) {
      alert("1Key Server is not responding. Please try again later.");
    }
    return null;
  }
}

/**
 * DEPRECATED: this is for version0.1 and the equivalent api for version0.2 has not yet been specified
 * Changes master password for an account when the user does not remember the master password.
 * This endpoint revokes all other authenticators until they login with the new password.
 *
 * TODO: figure out how Zappala wants the account recovered and master password changed in version0.2
 *
 * @param username string inputted username
 * @param newPassword string inputted desired new master password
 * @param deviceCert PEM string of authenticator certificate for this authenticator
 * @param certs I think this is the service certs re-encrypted with the new master password ?
 * @param certsSignature I think this is the certs list signed by the authenticator private key ?
 *
 * @returns response if successful or null if error occurs
 */
export async function recoverAccountWithCA(
  username,
  newPassword,
  deviceCert,
  certs,
  certsSignature
) {
  try {
    let response = await axios.post(hostName + "/users/account/recover", {
      username: username,
      password: newPassword,
      deviceCert: deviceCert,
      certList: certs,
      signature: certsSignature
    });
    return response;
  } catch (error) {
    console.log(error.response);
    if (!error.response) {
      alert("1Key Server is not responding. Please try again later.");
    }
    return null;
  }
}

/**
 * DEPRECATED: this is for version0.1, the procedure for editing master password in version0.2 is not yet specified
 * Changes master password for an account when user knows the previous master password.
 *
 * @param username string inputted username
 * @param oldPassword string inputted previous master password (the one being changed)
 * @param newPassword string inputted desired new master password
 * @param deviceCert PEM string of authenticator certificate for this authenticator
 *
 * @returns response if successful or null if error occurs
 */
export async function editPasswordWithCA(
  username,
  oldPassword,
  newPassword,
  deviceCert
) {
  //For user to edit password. Different from account recovery because they know the old password
  try {
    let response = await axios.post(hostName + "/users/editAccount", {
      username: username,
      oldPassword: oldPassword,
      newPassword: newPassword,
      deviceCert: deviceCert
    });
    return response;
  } catch (error) {
    console.log(error.response);
    if (!error.response) {
      alert("1Key Server is not responding. Please try again later.");
    }
    return null;
  }
}
