/**
 * CertDatabase.js
 *
 * Contains functions to access the certificate database of indexeddb, the encrypted local browser database.
 * The certificate database has 2 stores: authStore and serviceStore.
 *
 * The authStore contains the authenticator certificate for this authenticator and the names of the other authenticators
 * registered with this account.
 *
 * The serviceStore contains an entry for each account with a service (website or phone app)
 * with the account identifier, account name, keypair used to create session certificates for that account,
 * and the list of active sessions for that account. This is all information that is extracted from authenticator data fetched from the CA.
 * If this authenticator owns a certificate for an account it also stores that service certificate and associated service keypair.
 */

import { getCertificateExpirationTime } from "./CertGen.js";
import { getIndexeddbKey, getLoggedInCredentials } from "./LocalStorage.js";
import Dexie from "dexie";
import { applyEncryptionMiddleware, cryptoOptions } from "dexie-encrypted";

/**
 * Stores a new account in serviceStore.
 *
 * @param domain string domain for service (the url for the service backend)
 * @param accountID string account unique identifier for this account
 * @param accountName string user inputted account name
 * @param sessionPrivateKey PEM string private key from keypair used for session cert creation
 * @param sessionPublicKey PEM string public key from keypair used for session cert creation
 * @param sessionList list of objects giving details of active sessions user has on any authenticator for this account
 * @param serviceCert optional; authenticator owned service certificate, in PEM string format
 * @param servicePrivateKey optional; PEM string private key for service certificate
 * @param servicePublicKey optional; PEM string public key for service certificate
 */
export async function storeServiceAccount(
  domain,
  accountID,
  accountName,
  sessionPrivateKey,
  sessionPublicKey,
  sessionList,
  serviceCert, //This can be empty if this authenticator does not own a cert for this service account
  servicePrivateKey, //also can be empty if auth doesn't own a cert
  servicePublicKey //also can be empty if auth doesn't own a cert
) {
  //keys and cert must be provided in PEM format
  const db = new Dexie("certificateDb");
  let forge = require("node-forge");

  console.log("getIndexeddbKey");
  let idbKey = getIndexeddbKey(getLoggedInCredentials());

  console.log("applyEncryptionMiddleware");
  applyEncryptionMiddleware(db, idbKey, {
    authStore: cryptoOptions.NON_INDEXED_FIELDS,
    serviceStore: cryptoOptions.NON_INDEXED_FIELDS
  });

  console.log("stores");
  db.version(2).stores({
    authStore: "name",
    serviceStore: "accountID, domain"
  });

  console.log("getCertificateExpirationTime");
  let expirationTime = "";
  if (serviceCert) {
    expirationTime = getCertificateExpirationTime(serviceCert);
  }

  const serviceCertInfo = {
    accountID: accountID, //on authentication data
    domain: domain, //on authentication data
    accountName: accountName, //on authentication data
    sessionPrivateKey: sessionPrivateKey, //on authentication data
    sessionPublicKey: sessionPublicKey, //on authentication data
    sessionList: sessionList, //on authentication data
    serviceCert: serviceCert, //only on this authenticator
    servicePrivateKey: servicePrivateKey, //this authenticator
    servicePublicKey: servicePublicKey, //this authenticator
    expire: expirationTime //for convenience, on this authenticator
  };

  console.log("serviceCertInfo");
  console.log(serviceCertInfo);
  await db.open();
  await db.serviceStore.add(serviceCertInfo);
  db.close();
}

/**
 * Edits the sessionList for an account stored in serviceStore.
 *
 * @param accountID string account unique identifier for the account to edit
 * @param sessionList updated list of objects giving details of active sessions for the account
 */
export async function updateServiceAccountSessions(accountID, sessionList) {
  const db = new Dexie("certificateDb");

  let idbKey = getIndexeddbKey(getLoggedInCredentials());

  applyEncryptionMiddleware(db, idbKey, {
    authStore: cryptoOptions.NON_INDEXED_FIELDS,
    serviceStore: cryptoOptions.NON_INDEXED_FIELDS
  });

  db.version(2).stores({
    authStore: "name",
    serviceStore: "accountID, domain"
  });

  await db.open();

  let certInfo = await db.serviceStore
    .where({
      accountID: accountID
    })
    .toArray();

  const updatedCertInfo = {
    accountID: certInfo[0].accountID,
    domain: certInfo[0].domain,
    accountName: certInfo[0].accountName,
    sessionPrivateKey: certInfo[0].sessionPrivateKey,
    sessionPublicKey: certInfo[0].sessionPublicKey,
    sessionList: sessionList,
    serviceCert: certInfo[0].serviceCert,
    servicePrivateKey: certInfo[0].servicePrivateKey,
    servicePublicKey: certInfo[0].servicePublicKey,
    expire: certInfo[0].expire
  };

  //I didn't use db.serviceStore.update because it wasn't working with an older version of Dexie-encrypted.
  //You can test out using update instead

  await db.serviceStore.delete(accountID);
  await db.serviceStore.add(updatedCertInfo);

  db.close();
}

/**
 * Edits the service certificate for an account stored in serviceStore.
 * Used for when the service certificate is renewed.
 *
 * @param accountID string account unique identifier for the account to edit
 * @param cert PEM string of new service certificate
 * @param publicKey the public key for the service account in PEM format
 * @param privateKey the private key for the service account in PEM format
 */
//call this to update only the cert for a given service account
export async function updateAccountCert(
  accountID,
  cert,
  publicKey,
  privateKey
) {
  //keys and cert must be provided in PEM format
  const db = new Dexie("certificateDb");

  let idbKey = getIndexeddbKey(getLoggedInCredentials());

  applyEncryptionMiddleware(db, idbKey, {
    authStore: cryptoOptions.NON_INDEXED_FIELDS,
    serviceStore: cryptoOptions.NON_INDEXED_FIELDS
  });

  db.version(2).stores({
    authStore: "name",
    serviceStore: "accountID, domain"
  });

  let expirationTime = getCertificateExpirationTime(cert);

  await db.open();

  let certInfo = await db.serviceStore
    .where({
      accountID: accountID
    })
    .toArray();

  const updatedCertInfo = {
    accountID: certInfo[0].accountID,
    domain: certInfo[0].domain,
    accountName: certInfo[0].accountName,
    sessionPrivateKey: certInfo[0].sessionPrivateKey,
    sessionPublicKey: certInfo[0].sessionPublicKey,
    sessionList: certInfo[0].sessionList,
    serviceCert: cert,
    servicePrivateKey: privateKey,
    servicePublicKey: publicKey,
    expire: expirationTime
  };

  await db.serviceStore.delete(accountID);
  await db.serviceStore.add(updatedCertInfo);

  db.close();
}

/**
 * Gets the account object for an account in serviceStore.
 *
 * @param accountID string account unique identifier for the desired account
 * @returns account object with id, domain, name, session keypair, session list, service cert and keypair (if exists), and expiration time for service cert (if exists)
 */
export async function getServiceAccount(accountID) {
  let idbKey = getIndexeddbKey(getLoggedInCredentials());

  const db = new Dexie("certificateDb");

  applyEncryptionMiddleware(db, idbKey, {
    authStore: cryptoOptions.NON_INDEXED_FIELDS,
    serviceStore: cryptoOptions.NON_INDEXED_FIELDS
  });

  db.version(2).stores({
    authStore: "name",
    serviceStore: "accountID, domain"
  });

  await db.open();
  let certInfo = await db.serviceStore
    .where({
      accountID: accountID
    })
    .toArray();
  db.close();

  //The previous version of Dexie was really buggy and occasionally returned objects before decryption. Hopefully you won't need this check anymore
  if (certInfo[0] && certInfo[0].serviceCert == "") {
    console.log("Dexie encrypted is broken: ", certInfo[0]);
    return null;
  }

  return certInfo[0];
}

/**
 * Checks if the serviceStore contains an entry for a specified account.
 *
 * @param accountID string account unique identifier for the desired account
 * @returns boolean true if account is saved, false if not
 */
export async function isServiceAccountSaved(accountID) {
  //returns boolean for if an account is saved for the provided account Id
  let idbKey = getIndexeddbKey(getLoggedInCredentials());

  const db = new Dexie("certificateDb");

  applyEncryptionMiddleware(db, idbKey, {
    authStore: cryptoOptions.NON_INDEXED_FIELDS,
    serviceStore: cryptoOptions.NON_INDEXED_FIELDS
  });

  db.version(2).stores({
    authStore: "name",
    serviceStore: "accountID, domain"
  });

  await db.open();
  let certInfo = await db.serviceStore
    .where({
      accountID: accountID
    })
    .toArray();
  db.close();

  return certInfo.length != 0; //if any empty array is returned then the account for that id is not saved
}

/**
 * Gets array of all account entries in the serviceStore.
 *
 * @returns array of account objects.
 */
export async function getAllServiceAccounts() {
  let idbKey = getIndexeddbKey(getLoggedInCredentials());

  const db = new Dexie("certificateDb");

  applyEncryptionMiddleware(db, idbKey, {
    authStore: cryptoOptions.NON_INDEXED_FIELDS,
    serviceStore: cryptoOptions.NON_INDEXED_FIELDS
  });

  db.version(2).stores({
    authStore: "name",
    serviceStore: "accountID, domain"
  });

  await db.open();
  let allServiceAccounts = await db.serviceStore.toArray();
  db.close();

  if (allServiceAccounts[0] && allServiceAccounts[0].serviceCert == "") {
    console.log("Dexie encrypted is broken: ", allServiceAccounts[0]);
    return null;
  }

  return allServiceAccounts;
}

/**
 * Stores information for an authenticator in the authStore.
 *
 * @param authName string name of the authenticator
 * @param cert optional; PEM string of authenticator certificate. Only needed for this browser extension.
 * @param revFlag optional; 1 or 0 indicating revokation status of an authenticator certificate. Leftover from version0.1,
 *                NOT USED IN VERSION0.2
 * @param idbKey optional; string of key to decrypt indexeddb
 */
export async function storeAuthCert(authName, cert, revFlag, idbKey) {
  //keys and cert must be provided in PEM format
  const db = new Dexie("certificateDb");

  if (!idbKey) {
    idbKey = getIndexeddbKey(getLoggedInCredentials());
  }

  applyEncryptionMiddleware(db, idbKey, {
    authStore: cryptoOptions.NON_INDEXED_FIELDS,
    serviceStore: cryptoOptions.NON_INDEXED_FIELDS
  });

  db.version(2).stores({
    authStore: "name",
    serviceStore: "accountID, domain"
  });

  await db.open();

  let expirationTime = getCertificateExpirationTime(cert);

  const authCertInfo = {
    name: authName,
    cert: cert,
    revFlag: revFlag,
    expire: expirationTime
  };

  await db.authStore.delete(authName);
  await db.authStore.add(authCertInfo);

  db.close();
}

/**
 * Removes an auth cert from the authStore. This is used when an authenticator is revoked.
 *
 * @param authName string name of authenticator to be removed.
 * @param idbKey optional; string of key to decrypt indexeddb
 *
 * @returns 200 if successful, null if not successful
 */
export async function removeAuthCert(authName, idbKey) {
  try {
    //keys and cert must be provided in PEM format
    const db = new Dexie("certificateDb");

    if (!idbKey) {
      idbKey = getIndexeddbKey(getLoggedInCredentials());
    }

    applyEncryptionMiddleware(db, idbKey, {
      authStore: cryptoOptions.NON_INDEXED_FIELDS,
      serviceStore: cryptoOptions.NON_INDEXED_FIELDS
    });

    db.version(2).stores({
      authStore: "name",
      serviceStore: "accountID, domain"
    });

    await db.open();

    await db.authStore.delete(authName);
    return 200;
  } catch (error) {
    // something went wrong
    console.log(error);
    return null;
  }
}

/**
 * Gets the entry for a given authenticator from authStore.
 *
 * @param authName string name of desired authenticator.
 *
 * @returns object of authenticator information: name, auth certificate, revFlag, expiration time
 */
export async function getAuthCert(authName) {
  //finds auth certificate based on authName
  let idbKey = getIndexeddbKey(getLoggedInCredentials());

  const db = new Dexie("certificateDb");

  applyEncryptionMiddleware(db, idbKey, {
    authStore: cryptoOptions.NON_INDEXED_FIELDS,
    serviceStore: cryptoOptions.NON_INDEXED_FIELDS
  });

  db.version(2).stores({
    authStore: "name",
    serviceStore: "accountID, domain"
  });

  await db.open();
  let certInfo = await db.authStore
    .where({
      name: authName
    })
    .toArray();
  db.close();

  if (certInfo[0] && certInfo[0].cert == "") {
    console.log("Dexie encrypted is broken: ", certInfo[0]);
    return null;
  }

  return certInfo[0];
}

/**
 * Gets array of all authenticator entries in the authStore.
 *
 * @returns array of authenticator objects.
 */
export async function getAllAuthCerts(idbKey) {
  if (!idbKey) {
    idbKey = getIndexeddbKey(getLoggedInCredentials());
  }

  const db = new Dexie("certificateDb");

  applyEncryptionMiddleware(db, idbKey, {
    authStore: cryptoOptions.NON_INDEXED_FIELDS,
    serviceStore: cryptoOptions.NON_INDEXED_FIELDS
  });

  db.version(2).stores({
    authStore: "name",
    serviceStore: "accountID, domain"
  });

  await db.open();
  let allAuthCerts = await db.authStore.toArray();
  db.close();

  if (allAuthCerts[0] && allAuthCerts[0].cert == "") {
    console.log("Dexie encrypted is broken: ", allAuthCerts[0]);
    return null;
  }

  return allAuthCerts;
}

/**
 * Compiles list of all account ids and names for accounts on a certain domain.
 *
 * This is necessary because in version0.2 you can make multiple accounts with the same website.
 * When user logs-in to a website they need to choose which account they want to login to.
 *
 * @param domain string of domain (url of backend for some website or app)
 *
 * @returns set of objects containing account id and account name for a domain.
 */
export async function getAccountIdsForDomain(domain) {
  let idbKey = getIndexeddbKey(getLoggedInCredentials());
  const db = new Dexie("certificateDb");

  applyEncryptionMiddleware(db, idbKey, {
    authStore: cryptoOptions.NON_INDEXED_FIELDS,
    serviceStore: cryptoOptions.NON_INDEXED_FIELDS
  });

  db.version(2).stores({
    authStore: "name",
    serviceStore: "accountID, domain"
  });

  await db.open();
  let certsForDomain = await db.serviceStore
    .where({
      domain: domain
    })
    .toArray();
  db.close();

  let accountIds = new Set();

  for (let i = 0; i < certsForDomain.length; i++) {
    accountIds.add({
      id: certsForDomain[i].accountID,
      name: certsForDomain[i].accountName
    });
  }

  // accountIds.add({
  //   id: "test",
  //   name: "testname"
  // });

  //return set of all account ids associated with this domain
  return accountIds;
}
