/**
 * CertGen.js
 *
 * Contains various cryptographic functions and other functions to organize authenticator data
 * or data from indexeddb to display in different pages and components.
 * Basically it's a miscellaneous file of useful things that should probably be refactored into smaller files for simplicity.
 */
import axios from "axios";
import {
  getAllServiceAccounts,
  getAuthCert,
  isServiceAccountSaved,
  updateServiceAccountSessions,
  storeServiceAccount,
  storeAuthCert,
  removeAuthCert,
  getServiceAccount,
  updateAccountCert
} from "./CertDatabase.js";
import { getUserInfo } from "./UserDatabase.js";
import {
  getAuthenticationDataFromCA,
  getAuthenticationDataLock,
  updateAuthenticationDataWithCA,
  revokeDeviceFromCA,
  renewAccountCertWithCA
} from "./ServerFacade.js";
import { getLoggedInCredentials } from "./LocalStorage.js";
import { v1 as uuidv1 } from "uuid";

/**
 * Makes a certificate signing request (CSR).
 *
 * @param privateKey private key object (NOT a pem string)
 * @param publicKey public key object (NOT a pem string)
 * @param nameValue string to put in commonName field of certificate
 * @param emailValue string to put in emailAddress attribute of certificate
 *
 * @returns PEM string format of certificate signing request.
 */
export function makeCSR(privateKey, publicKey, nameValue, emailValue) {
  let forge = require("node-forge");

  //make csr certificate using given name, email, and keys
  let csr = forge.pki.createCertificationRequest();
  csr.publicKey = publicKey;
  csr.setSubject([
    {
      name: "commonName",
      value: nameValue
    }
  ]);
  csr.setAttributes([
    {
      name: "emailAddress",
      value: emailValue
    }
  ]);

  csr.sign(privateKey);

  //return csr in PEM format
  let pem = forge.pki.certificationRequestToPem(csr);
  return pem;
}

/**
 * Makes an X.509 certificate to hold the given public key and signed by the given private key.
 *
 * Used to make a session certificate with the session identifier stored in the commonName
 * and signed by the service private key.
 *
 * @param sessionId string of session identifier provided by website
 * @param issuerCert PEM string certificate of the certificate signing this certificate (service cert)
 * @param publicKey public key object (NOT a pem string), should be the session public key
 * @param privateKey private key object (NOT a pem string), should be the service private key
 *
 * @returns PEM string format of session certificate
 */
export function makeCertificate(sessionId, issuerCert, publicKey, privateKey) {
  let forge = require("node-forge");

  let issuer = forge.pki.certificateFromPem(issuerCert);

  //make a X.509 certificate with subject id in the subject unique identifier field and signed by privateKey
  var cert = forge.pki.createCertificate();
  cert.publicKey = publicKey;
  cert.setSubject([
    {
      name: "commonName",
      value: sessionId
    }
    // {
    //   name: "subjectUniqueIdentifier",
    //   value: sessionId
    // }
    // ^ This doesn't seem to work
  ]);

  //TODO: Zappala orginally said to put the session Id in the subject unique identifier field. Can we use commonName instead? It's easier

  // cert.setExtensions([
  //   {
  //     name: "subjectUniqueIdentifier",
  //     value: sessionId
  //   }
  // ]);
  // ^ This doesn't seem to work either

  cert.setIssuer(issuer.subject.attributes);

  let targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 10);
  cert.validity.notAfter = targetDate;

  cert.sign(privateKey);

  //return certificate as PEM string
  return forge.pki.certificateToPem(cert);
}

/**
 * Creates a random unique string.
 * Used for making new account ids or random strings for any other purpose.
 *
 * @returns string of random unique identifier
 */
export function generateUniqueIdentifier() {
  const uuid = uuidv1();
  return uuid;
}

/**
 * Makes a symmetric key derived from a given string.
 *
 * @param keyString string to use for key derivation
 * @param salt optional; a specified salt to make key derivation more secure
 *
 * @returns base 64 encoded symmetric key
 */
export function makeKeypass(keyString, salt) {
  //make key from string.
  //encode64 key to make a "passKey"
  let scrypt = require("scrypt-js");

  let keyBuffer = Buffer.from(keyString, "utf-8");
  let finalSalt;
  if (salt === undefined) {
    finalSalt = Buffer.from("", "utf-8");
  } else {
    finalSalt = Buffer.from(salt, "utf-8");
  }

  const N = 1 << 12,
    r = 8,
    p = 1;
  const keyLen = 32;

  const key = scrypt.syncScrypt(keyBuffer, finalSalt, N, r, p, keyLen);
  let base64PassKey = window.btoa(String.fromCharCode.apply(null, key));
  return base64PassKey;
}

/**
 * Signs a string with a private key.
 *
 * @param privateKey PEM string of private key
 * @param dataString string to be signed
 *
 * @returns resulting signature string
 */
export function signString(privateKey, dataString) {
  //privateKey must be in PEM format

  let crypto = require("crypto");
  let signerObject = crypto.createSign("RSA-SHA256");
  signerObject.update(dataString, "utf-8");
  let signature = signerObject.sign(privateKey, "base64");

  return signature;
}

/**
 * Verifies a signed string with the public key.
 * Specifically works for Elliptic curve keys, used for SSL certificates.
 * This is used to verify the login object signature provided by a website.
 *
 * TODO: make sure this works. Uncomment the call to this in Request.vue in extractLoginObjValues();
 *
 * @param publicKey raw elliptic curve key
 * @param message string of message
 * @param signedMessage string of signature of message to verify
 *
 * @returns boolean for if verification passes or fails
 */
export function verifySignedString(publicKey, message, signedMessage) {
  const ECKey = require("ec-key");

  const buffer = Buffer.from(publicKey, "base64");
  var key = new ECKey(buffer, "spki");
  console.log("Key");
  console.log(key);

  let verified = key
    .createVerify("SHA256")
    .update(message)
    .verify(signedMessage, "base64");

  return verified;
}

/**
 * Encrypts a string with a symmetric key.
 * Used to encrypt authenticator data or authenticator data key before sending it to the CA.
 *
 * @param data string of data to encrypt
 * @param symmetricKey base 64 encoded symmetric key
 *
 * @returns encrypted string of data
 */
export async function encryptData(data, symmetricKey) {
  const key_in_bytes = Buffer.from(symmetricKey, "base64");

  const crypto = require("crypto");
  const algorithm = "aes-256-ctr";
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key_in_bytes, iv);

  let encrypted = iv;
  cipher.on("readable", () => {
    let chunk;
    while (null !== (chunk = cipher.read())) {
      encrypted = Buffer.concat([encrypted, Buffer.from(chunk, "utf8")]);
    }
  });

  cipher.write(JSON.stringify(data));
  cipher.end();

  return window.btoa(String.fromCharCode.apply(null, encrypted));
}

/**
 * Decrypts an encrypted string using a symmetric key.
 * Used to decrypt authenticator data or authenticator data key received from the CA.
 *
 * @param dataBase64 base 64 encoded encrypted data
 * @param key base 64 encoded symmetric key
 *
 * @returns object of encrypted data or undefined if an error occurs
 */
export async function decryptKey(dataBase64, key) {
  try {
    let data = Buffer.from(dataBase64, "base64");
    const key_in_bytes = Buffer.from(key, "base64");

    const crypto = require("crypto");
    const algorithm = "aes-256-ctr";
    const iv = data.slice(0, 16);
    const decipher = crypto.createDecipheriv(algorithm, key_in_bytes, iv);
    let decrypted = "";
    decipher.on("readable", () => {
      let chunk;
      while (null !== (chunk = decipher.read())) {
        decrypted += chunk;
      }
    });

    decipher.write(data.slice(16));
    decipher.end();
    //remove weird characters from string
    decrypted = decrypted.replace(/[\x00-\x1F\x7F-\x9F]/g, "");
    return JSON.parse(decrypted);
  } catch (error) {
    console.log(error);
    return undefined;
  }
}

export async function decryptData(dataBase64, key) {
  try {
    let data = Buffer.from(dataBase64, "base64");
    const key_in_bytes = Buffer.from(key, "base64");

    const crypto = require("crypto");
    const algorithm = "aes-256-ctr";
    const iv = data.slice(0, 16);
    const decipher = crypto.createDecipheriv(algorithm, key_in_bytes, iv);
    let decrypted = "";
    decipher.on("readable", () => {
      let chunk;
      while (null !== (chunk = decipher.read())) {
        decrypted += chunk;
      }
    });

    decipher.write(data.slice(16));
    decipher.end();
    //remove weird characters from string
    decrypted = decrypted.replace(/[\x00-\x1F\x7F-\x9F]/g, "");
    return JSON.parse(decrypted); //convert JSON string to object
  } catch (error) {
    console.log(error);
    return undefined;
  }
}

/**
 * Gets the expiration time of a certificate.
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
 *
 * @param expirationTime date string of expiration time from a certificate
 *
 * @returns boolean true if expired, false if not
 */
export function isTimeExpired(expirationTime) {
  let dates = {
    convert: function(d) {
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
    compare: function(a, b) {
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

/**
 * Updates local certificate database to match what the CA has stored for authenticator data.
 *
 * @param idbKey optional; string key to decrypt indexeddb local database
 *
 * @returns "error" if error occurred, otherwise returns nothing
 */
export async function updateAllCertsList(idbKey) {
  let userInfo = await getUserInfo(idbKey);
  let authCert = await getAuthCert(userInfo.authname);

  //generate symmetric key used for auth data
  let symmetricKey = await userInfo.authSymmetricKey;
  if (
    symmetricKey === null ||
    symmetricKey === undefined ||
    symmetricKey === ""
  ) {
    return; //user is not logged in and cannot update certs
  }

  let response = await getAuthenticationDataFromCA(
    authCert.cert,
    userInfo.username
  );
  //null response indicates error, 304 response indicates no update necessary

  if (response.status != 404 && response != 304) {
    if (response.data.authenticationData != "a blob") {
      let parsedData = JSON.parse(response.data.authenticationData);
      let encryptedData = parsedData.data;
      // let encryptedKey = response.data.key;

      //decrypt encrypted key
      let dataKey = await decryptKey(parsedData.key, symmetricKey);

      //decrypt auth data map
      let data = await decryptData(encryptedData, dataKey);

      console.log("decrypted auth data");
      console.log(data);

      //fill cert database with every item.
      for (let account of data.map) {
        if (await isServiceAccountSaved(account.accountID)) {
          //if account id is in cert database, replace sessions list
          await updateServiceAccountSessions(
            account.accountID,
            account.sessionList
          );
        } else {
          //if account id is NOT in cert database, add whole object
          await storeServiceAccount(
            account.domain,
            account.accountID,
            account.accountName,
            account.sessionPrivateKey,
            account.sessionPublicKey,
            account.sessionList
          );
        }
      }

      //store each auth name in cert database auth store
      for (let auth of data.authenticatorList) {
        if (auth.authname != userInfo.authname) {
          await storeAuthCert(auth.authname, auth.authenticatorCertificate, "");
        }
      }
    }
  } else if (response == null) {
    //This indicates the CA call broke
    return "error";
  }
}

/**
 * Fetches lock identifier and decrypts authenticator data and key
 * Must be called before writing new authenticator data to the CA.
 *
 * @returns object of decrypted authenticator data, decrypted authenticator data key, lock id
 */
async function getDecryptedAuthenticatorData() {
  //get user info
  let userInfo = await getUserInfo();

  //get authenticator certificate for this auth
  let authCert = await getAuthCert(userInfo.authname);

  //get current encrypted authentication data from CA
  let authDataResponse = await getAuthenticationDataFromCA(
    authCert.cert,
    userInfo.username
  );

  //get authentication data lock
  let lockResponse = await getAuthenticationDataLock(
    authCert.cert,
    userInfo.username
  );

  if (lockResponse != null) {
    if (
      authDataResponse.status != 404 &&
      authDataResponse.data.authenticationData
    ) {
      let dataObj = JSON.parse(authDataResponse.data.authenticationData);

      //decrypt authentication data
      let dataKey = await decryptKey(dataObj.key, userInfo.authSymmetricKey);
      let data = await decryptData(dataObj.data, dataKey);

      return {
        data: data,
        key: dataKey,
        lockID: lockResponse.data.lockIdentifier
      };
    } else {
      let key = makeKeypass(userInfo.authSymmetricKey);
      //there is no authenticator data yet for this account, it's first time registration
      //initialize empty lists and create random symmetric key to encrypt data with
      return {
        data: {
          authenticatorList: [],
          map: []
        },
        key: key,
        lockID: lockResponse.data.lockIdentifier
      };
    }
  } else {
    return null; //null indicates error to be handled by function caller
  }
}

/**
 * Encrypts and writes updated authenticator data to the CA.
 *
 * @param data object of authenticator data
 * @param dataKey base 64 encoded symmetric key use to encrypt auth data
 * @param lockID string of lock identifier previously received from CA
 *
 * @returns response of CA api call
 */
async function encryptAndUpdateAuthenticatorData(data, dataKey, lockID) {
  //get user info
  let userInfo = await getUserInfo();

  //get authenticator certificate for this auth
  let authCert = await getAuthCert(userInfo.authname);

  //encrypt authenticator data
  let encryptedData = await encryptData(data, dataKey);

  //encrypt key with symmetric key
  let encryptedKey = await encryptData(dataKey, userInfo.authSymmetricKey);

  //make json string of encrypted key and newly encrypted data to be stored with the CA
  let dataObj = JSON.stringify({
    data: encryptedData,
    key: encryptedKey
  });

  return await updateAuthenticationDataWithCA(
    dataObj,
    lockID,
    authCert.cert,
    userInfo.username
  );
}

/**
 * Adds a new account to authenticator data map
 *
 * @param domain string domain of account
 * @param accountID string unique identifier for account
 * @param accountName string user selected name for account
 * @param sessionPublicKey PEM string public key of session keypair
 * @param sessionPrivateKey PEM string private key of session keypair
 * @param authName string name of this authenticator
 * @param firstSessionCert PEM string of session cert
 * @param sessionGeoLocation string whatever geoLocation is for first session
 *
 * @returns response from update api or null if error occurs
 */
export async function addAccountToAuthenticatorData(
  domain,
  accountID,
  accountName,
  sessionPublicKey,
  sessionPrivateKey,
  authName,
  firstSessionCert,
  sessionGeoLocation
) {
  //get decrypted data and lockID
  let authDataObj = await getDecryptedAuthenticatorData();

  if (authDataObj == null) {
    return null; //indicates error
  }

  //make account object to add to map
  let newAccount = {
    domain: domain,
    accountID: accountID,
    accountName: accountName,
    sessionPublicKey: sessionPublicKey,
    sessionPrivateKey: sessionPrivateKey,
    sessionList: [
      {
        authenticator: authName,
        sessions: [
          {
            sessionCert: firstSessionCert,
            geoLocation: sessionGeoLocation
          }
        ]
      }
    ]
  };

  //add account object to map
  authDataObj.data.map.push(newAccount);

  //encrypt authentication data and send back to CA
  let response = await encryptAndUpdateAuthenticatorData(
    authDataObj.data,
    authDataObj.key,
    authDataObj.lockID
  );

  return response; //if response is null, function caller handles this as an error
}

/**
 * Adds a session to the authenticator data.
 * Used with this authenticator logs into an exisiting account, thus starting a new session.
 *
 * @param accountID string id for the account being edited
 * @param authName string authenticator name for this auth
 * @param sessionCert PEM string of session cert being added
 * @param sessionGeoLocation string of geo location being added for this session
 *
 * @returns response from update api or null if error occurs
 */
export async function addSessionToAuthenticatorData(
  accountID,
  authName,
  sessionCert,
  sessionGeoLocation
) {
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
 * Creates authenticator data for a new 1Key account.
 * Used for first time registration only.
 * Resulting authenticator data is empty except the name of this auth is added to authenticatorList.
 *
 * @param authName string name of this authenticator
 *
 * @returns response from update api or null if error occurs
 */
export async function createAuthenticatorData(authName, authCert) {
  //get decrypted data and lockID
  let authDataObj = await getDecryptedAuthenticatorData();

  if (authDataObj == null) {
    return null; //indicates error
  }

  //add new auth to authenticatorList section of authenticator data
  authDataObj.data.authenticatorList.push({
    authname: authName,
    authenticatorCertificate: authCert
  });

  //encrypt authentication data and send back to CA
  let response = await encryptAndUpdateAuthenticatorData(
    authDataObj.data,
    authDataObj.key,
    authDataObj.lockID
  );

  return response; //if response is null, function caller handles this as an error
}

/**
 * Adds this authenticator to authenticator data.
 * Used when this authenticator is registered to an already existing 1Key account.
 *
 * @param authName string name of this authenticator
 *
 * @returns response from update api or null if error occurs
 */
export async function addAuthToAuthenticatorData(authName, authCert) {
  //get decrypted data and lockID
  let authDataObj = await getDecryptedAuthenticatorData();

  if (authDataObj == null) {
    return null; //indicates error
  }

  //add new auth to authenticatorList section of authenticator data
  authDataObj.data.authenticatorList.push({
    authname: authName,
    authenticatorCertificate: authCert
  });

  //encrypt authentication data and send back to CA
  let response = await encryptAndUpdateAuthenticatorData(
    authDataObj.data,
    authDataObj.key,
    authDataObj.lockID
  );

  return response; //if response is null, function caller handles this as an error
}

/**
 * Compiles a list of accounts with their account id, account name, domain, and authenticators using this account.
 * Used to display accounts on Accounts.vue
 *
 * @returns list of account objects
 */
export async function getAccountsData() {
  //get all accounts
  let accountCerts = await getAllServiceAccounts();

  //make array that has a different account and it's info at each position
  let accountsArray = new Array();

  //loop through accounts and collect important info
  for (let i = 0; i < accountCerts.length; i++) {
    let authenticators = [];

    //loop through all authenticators that have a account cert for this account
    for (let j = 0; j < accountCerts[i].sessionList.length; j++) {
      authenticators.push(accountCerts[i].sessionList[j].authenticator);
    }

    let currentAccount = {
      domain: accountCerts[i].domain,
      accountId: accountCerts[i].accountID,
      accountName: accountCerts[i].accountName,
      devices: authenticators
    };

    accountsArray.push(currentAccount);
  }

  return accountsArray;
}

export async function removeAuthenticatorFromAuthData(authenticator, username) {
  let userInfo = await getUserInfo();
  let authCertObj = await getAuthCert(userInfo.authname);
  //generate symmetric key
  let symmetricKey = userInfo.authSymmetricKey;
  if (
    symmetricKey === null ||
    symmetricKey === undefined ||
    symmetricKey === ""
  ) {
    return; //user is not logged in and cannot edit authenticator data
  }

  let response = await getAuthenticationDataFromCA(authCertObj.cert, username);
  //null response indicates error, 304 response indicates no update necessary

  if (
    response.status != 404 &&
    response != 304 &&
    response.data.authenticationData != "a blob"
  ) {
    let parsedData = JSON.parse(response.data.authenticationData);
    let encryptedData = parsedData.data;
    // let encryptedKey = response.data.key;

    //decrypt encrypted key
    let dataKey = await decryptKey(parsedData.key, symmetricKey);

    //decrypt auth data map
    let data = await decryptData(encryptedData, dataKey);

    try {
      //revoke related session certs
      for (let k = 0; k < data.map.length; k++) {
        let account = data.map[k];
        for (let i = account.sessionList.length - 1; i >= 0; i--) {
          let sessionList = account.sessionList[i];
          if (sessionList.authenticator == authenticator.name) {
            let sessions = sessionList.sessions;
            let accountCert = await getAccountCert(account.accountID, userInfo);
            for (let j = sessions.length - 1; j >= 0; j--) {
              let sessionCert = sessions[j].sessionCert;
              let sessionResponse = await logoutOfSession(
                account.domain,
                accountCert,
                sessionCert
              );
              if (sessionResponse) {
                sessions.splice(j, 1);
              } else {
                return null;
              }
            }
            if (sessionList.sessions.length == 0) {
              account.sessionList.splice(i, 1);
            }
          }
        }
      }

      //revoke auth cert and remove authenticator from auth data
      let authResponse = await revokeDeviceFromCA(
        username,
        password,
        authenticator.cert
      );
      if (authResponse.status == 200) {
        for (let i = 0; i < data.authenticatorList.length; i++) {
          if (data.authenticatorList[i].authname == authenticator.name) {
            data.authenticatorList.splice(i, 1);
            break;
          }
        }
      }

      //update auth data with CA
      //get authentication data lock
      let lockResponse = await getAuthenticationDataLock(
        authCertObj.cert,
        userInfo.username
      );

      let updateResponse = await encryptAndUpdateAuthenticatorData(
        data,
        dataKey,
        lockResponse.data.lockIdentifier
      );

      //remove authenticator from indexeddb
      await removeAuthCert(authenticator.name);

      return 200;
    } catch (error) {
      console.log(error);
      return null;
    }
  } else if (response == null) {
    //This indicates the CA call broke
    return null;
  }
}

/**
 * Logs the session out with the relying party
 *
 * @param domain the domain of the relying party
 * @param accountCertificate the account certificate for the user's account
 * @param sessionCertificate the session to be logged out of
 *
 * @returns the response object if successful, null if logout failed
 */
export async function logoutOfSession(
  domain,
  accountCertificate,
  sessionCertificate
) {
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
 * Gets the account cert from indexeddb, and if the account cert is not there it requests one from the CA.
 *
 * @param accountID the ID of the account we want to get the account certificate for.
 * @param userInfo object retrieved from the user database, contains info like the username, authenticator name, and a private key for the user.
 *
 * @returns the account cert in PEM String form.
 */
export async function getAccountCert(accountID, userInfo) {
  let forge = require("node-forge");
  try {
    let accountObj = await getServiceAccount(accountID);
    if (accountObj.serviceCert) {
      return accountObj.serviceCert;
    }

    //create keypair and account cert for this account on this auth
    const keyPair = forge.pki.rsa.generateKeyPair(2048);
    let privatePem = forge.pki.privateKeyToPem(keyPair.privateKey);
    let publicPem = forge.pki.publicKeyToPem(keyPair.publicKey);
    let accountCert = await renewAccountCert(
      privatePem,
      publicPem,
      accountID,
      userInfo
    );
    await updateAccountCert(accountID, accountCert, publicPem, privatePem);
    return accountCert;
  } catch (error) {
    console.log(error);
    return null;
  }
}

/**
 * Creates a certificate signing request (csr) to get a new cert or renewal of existing cert.
 *
 * @param pemPrivate private key for certificate being requested in PEM string format
 * @param pemPublic public key for certificate being requested in PEM string format
 * @param accountId string of random identifier to be stored on the cert
 * @param userInfo object retrieved from the user database, contains info like the username, authenticator name, and a private key for the user.
 *
 * @returns response from CA api to renew a certificate or null if there's an error
 */
export async function renewAccountCert(
  pemPrivate,
  pemPublic,
  accountId,
  userInfo
) {
  let forge = require("node-forge");
  let authCertObj = await getAuthCert(userInfo.authname);

  //make requested csr
  let renewCSR = makeCSR(
    forge.pki.privateKeyFromPem(pemPrivate),
    forge.pki.publicKeyFromPem(pemPublic),
    accountId,
    accountId + "@letsauth.org"
  );

  //make signed version of csr
  let signedCSR = signString(userInfo.privateKey, renewCSR);

  let certResponse = await renewAccountCertWithCA(
    renewCSR,
    signedCSR,
    authCertObj.cert,
    userInfo.username
  );

  if (certResponse === null) {
    return null;
  }

  return certResponse.data.accountCertificate;
}

/**
 * compiles a list of active sessions for each devices registered with the CA.
 *
 * @returns a map of device names and active sessions for that device
 */
export async function getLoggedInDevices() {
  let allAccounts = await getAllServiceAccounts();
  console.log(allAccounts);

  let deviceList = {};
  for (let account of allAccounts) {
    console.log("account");
    console.log(account);
    let accountName = account.accountName;
    let domain = account.domain;
    let accountID = account.accountID;
    for (let device of account.sessionList) {
      console.log("device");
      console.log(device);
      let clientName = device.authenticator;
      if (!deviceList[clientName]) {
        deviceList[clientName] = {
          accounts: []
        };
      }

      let accountObj = {
        accountID: accountID,
        accountName: accountName,
        domain: domain,
        sessions: []
      };

      for (let session of device.sessions) {
        accountObj.sessions.push(session);
      }

      if (accountObj.sessions.length != 0) {
        deviceList[clientName].accounts.push(accountObj);
      }
    }
  }

  for (let deviceName of Object.keys(deviceList)) {
    if (deviceList[deviceName].accounts.length == 0) {
      delete deviceList[deviceName];
    }
  }
  if (!deviceList) {
    return {};
  }
  return deviceList;
}

/**
 * Removes a session from the authentication data when the user remotely logs out of that account.
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
 * serves as a sleep function, used when waiting to check if kauth was registered and the CSR was signed by the CA
 *
 * @param ms milliseconds the program is supposed to sleep for (ex: 5000 = 5 seconds)
 *
 */
export const delay = ms => new Promise(res => setTimeout(res, ms));

/**
 * Generates the random string that will be used to make a symmetric key to encrypt the authentication data.
 * Change the keyLength variable to change the length of the key string.
 * Uses get-random-values package. Docs: https://www.npmjs.com/package/get-random-values
 *
 */
export function getSymmetricKeyString() {
  var getRandomValues = require("get-random-values");
  let keyLength = 16;
  let dictionary =
    "ABCDEFGHIJKLMNPQRSTUVWXYZabcdefghijklmnopqrstuvwxstuvwxyz123456789";
  var array = new Uint8Array(keyLength);
  getRandomValues(array);
  let key = "";
  for (let i = 0; i < keyLength; i++) {
    if (i != 0 && i % 4 == 0) {
      key += "-";
    }
    let index = array[i] % dictionary.length;
    key += dictionary[index];
  }

  console.log("key: " + key);
  return key;
}
