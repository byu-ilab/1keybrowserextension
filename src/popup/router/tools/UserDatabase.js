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


// this is for permanent storage (vaults are encrypted)
import Dexie from "dexie";

// this is for temporary storage while the user is logged in (vaults are decrypted)
import { store } from './store.js'

var forge = require('node-forge');

// initialize the database

const db = new Dexie("userDb");
  
db.version(1).stores({
  user: "++id",
  localVault: "++id",
  remoteVault: "++id"
});



/**
 * 
 * @param {*} username -- username for the user
 * @param {*} password -- password for the local vault

 */
export async function createUser(username, password) {

  let [ localVaultSalt, localVaultIV, localVaultKey ] = await generateLocalVaultKey(password);
  console.log("generated keys",localVaultSalt, localVaultIV, localVaultKey);
  await db.open();

  const user = {
    username: username,
    loggedIn: true,
    localVaultSalt: localVaultSalt,
    localVaultIV: localVaultIV,
  };

  await db.user.add(user);
  let returnedUser = db.user.get(1);
  console.log("created user", user.id)
  db.close();
  return [ returnedUser, localVaultKey ];
}

/**
 * Gets stored object of user information.
 *
 * @param idbKey optional; key used to encrypt the user database
 * @returns user info object or undefined if an error occurs
 */
export async function getUser() {
  await db.open();
  let user = await db.user.get(1);
  db.close();
  return user;
}

export async function loginUser(password) {
  await db.open();
  await db.user.update(user.id, {loggedIn: true});
  let user = await db.user.get(1);

  let localVaultKey = getLocalVaultKey(user.localVaultSalt, password);


  // decrypt the local vault and store it in global state
  let localVault = decryptLocalVault(user.localVaultIV, localVaultKey);
  $actions.setLocalVault(localVault);
  
  // TBD: decrypt the remote vault
  db.close();
}

export async function loginUserWithKey(key) {
  await db.open();
  await db.user.update(user.id, {loggedIn: true});
  let user = await db.user.get(1);

  let localVaultKey = key;

  // decrypt the local vault and store it in global state
  let localVault = decryptLocalVault(user.localVaultIV, localVaultKey);
  store.setLocalVault(localVault);
  
  // TBD: decrypt the remote vault
  db.close();
}

export async function logoutUser() {
  await db.open();
  await db.user.update(1, {loggedIn: false});

  // remove the decrypted vaults
  store.clearAll()
  db.close();
}

export async function isLoggedIn() {
  await db.open()
  let user = await db.user.get(1);
  let loggedIn = user.loggedIn;
  db.close()
  return loggedIn;
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
  let user = await db.user.get(1);
  if (!user) {
    return false;
  }

  return true
}


/********* Local Vault ********/

export async function generateLocalVaultKey(password) {
  const numIterations = 5000;
  let localVaultSalt = forge.random.getBytesSync(128);
  let localVaultIV = forge.random.getBytesSync(16);
  let localVaultKey = forge.pkcs5.pbkdf2(password, localVaultSalt, numIterations, 16);
  return [ localVaultSalt, localVaultIV, localVaultKey ];
}

export async function getLocalVaultKey(salt, password) {
  const numIterations = 5000;
  let localVaultKey = forge.pkcs5.pbkdf2(password, salt, numIterations, 16);
  return localVaultKey;
}

/** Create a vault
 * @param {*} localVaultIV -- used to encrypt the local vault
 * @param {*} localVaultKey -- used to encrypt the local vault
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

  // put the vault into the store
  store.setLocalVault(cipher.output);

}

export async function decryptLocalVault(
  localVaultIV,
  localVaultKey,
) {

  // get the encrypted vault
  await db.open();
  let encryptedVault = await db.localVault.get(1);
  db.close();

  // decrypt the vault
  let decipher = forge.cipher.createDecipher('AES-CBC', localVaultKey);
  decipher.start({iv: localVaultIV});
  decipher.update(encryptedVault.localVault);

  let localVault = decipher.finish();
  return localVault
}