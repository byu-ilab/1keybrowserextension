/**
 * UserDatabase.js
 *
 * Contains functions to access the user database of indexeddb, the encrypted local browser database.
 * The user database is used to store important and sensitive information for this user and this authenticator.
 */

 // Note we are trying to follow the advice found here:
 //
 // https://levelup.gitconnected.com/adding-encryption-at-rest-to-your-web-app-with-mrs-jeggers-f50b037fbc54
 // 


import Dexie from "dexie";

const db = new Dexie("userDb");
  
db.version(1).stores({
  user: "++id",
  localVault: "++id",
  remoteVault: "++id"
});



/**
 * 
 * @param {*} username -- username for the user
 * @param {*} localVaultSalt -- salt for the local vault
 * @param {*} localVaultIV -- IV for the local vault

 */
export async function createUser(
  username,
  localVaultSalt,
  localVaultIV,
) {

  await db.open();

  const user = {
    username: username,
    localVaultSalt: localVaultSalt,
    localVaultIV: localVaultIV
  };

  await db.user.add(user);
  db.close();
}

/**
 * Gets stored object of user information.
 *
 * @param idbKey optional; key used to encrypt the user database
 * @returns user info object or undefined if an error occurs
 */
export async function getUserInfo() {
  await db.open();
  let user = await db.user.first();
  db.close();
  return user;
}

/**
 * Deletes the user database.
 * Used when CA gives an error for registration. Since registration never completed this database can't yet exist.
 */
export async function clearUserDb() {
  await Dexie.delete("userDb");
  db = null;
}

/**
 * Checks whether the user database exists. If it does, that means this authenticator is already registered and contains user info.
 *
 * @returns boolean for if user is registered with this authenticator.
 */
export async function checkForRegisteredUser() {
  let exists = await Dexie.exists("userDb");
  if (!exists) {
    return false;
  }
  await db.open();
  let user = await db.user.first();
  if (!user) {
    return false;
  }

  return true
}


/********* Local Vault ********/

/** Create a vault
 * @param {*} localVaultIV -- used to encrypt the local vault
 * @param {*} localVaultIV -- used to encrypt the local vault
 * @param {*} remoteVaultIV -- used to decrypt the remote vault
 * @param {*} remoteVaultKey -- used to decrypt the remote vault
 * @param {*} authKeyPair -- used to request an authCertificate
 * @param {*} authCertificate -- used to prove we are authorized to retrieve the remote vault
 */
export async function createLocalVault(
  localVaultIV,
  localVaultKey,
  remoteVaultIV,
  remoteVaultKey,
  authKeyPair,
  authCertificate,
) {

  await db.open();

  const vault = {
    remoteVaultIV: remoteVaultIV,
    remoteVaultKey: remoteVaultKey,
    authkeyPair: authKeyPair,
    authCertificate: authCertificate,
  };

  let cipher = forge.cipher.createCipher('AES-GCM', localVaultKey);
  cipher.start({iv: localVaultIV});
  cipher.update(forge.util.createBuffer(vault, 'raw'));
  cipher.finish();

  const encryptedVault = {
    localVault: cipher.output
  }

  await db.localVault.add(encryptedVault);
  db.close();
}