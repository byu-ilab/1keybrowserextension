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

// for debugging, can delete later
import { Buffer } from 'buffer'

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

  let [ localVaultSalt, localVaultIV, localVaultKey ] = generateLocalVaultKey(password);
  await db.open();

  // hash the password
  // DZ we should check if there is a better way to do this.
  let md = forge.md.sha256.create();
  md.update(localVaultSalt)
  md.update(password);
  const hash = md.digest().toHex();

  const user = {
    username: username,
    hash: hash,
    loggedIn: true,
    localVaultSalt: localVaultSalt,
    localVaultIV: localVaultIV,
  };


  let primaryKey = await db.user.add(user);
  console.log("added user with primary key",primaryKey)
  let returnedUser = await db.user.get(1);

  console.log("created user", returnedUser.id);
  debugValue("with key", localVaultKey)
  debugValue("with IV", returnedUser.localVaultIV);
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
  // change this logic. Don't login until password matches
  console.log("opening database");
  await db.open();

  console.log("getting user");
  let user = await db.user.get(1);
  db.close();

  console.log("going to check hash");

  // check password hash
  let md = forge.md.sha256.create();
  md.update(user.localVaultSalt)
  md.update(password);
  const hash = md.digest().toHex();
  console.log("comparing hash",hash,"to",user.hash)
  if (hash !== user.hash)
    return false;

  console.log("hash matches");

  // get local vault key
  let localVaultKey = getLocalVaultKey(user.localVaultSalt, password);

  console.log("got vault key");

  // decrypt the local vault and store it in global state
  let localVault = await decryptLocalVault(user.localVaultIV, localVaultKey);
  console.log("decrypted local vault");
  store.setLocalVault(localVault);

  console.log("decrypted and set vault")
  
  // TBD: decrypt the remote vault

  console.log("updating user to be logged in");
  await db.open();
  await db.user.update(1, {loggedIn: true});
  db.close();


  return true;
}


export async function logoutUser() {
  await db.open();
  await db.user.update(1, {loggedIn: false});
  db.close();

  // remove the decrypted vaults
  store.clearAll()
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

export function generateLocalVaultKey(password) {
  const numIterations = 5000;
  let localVaultSalt = forge.random.getBytesSync(128);
  let localVaultIV = forge.random.getBytesSync(12);
  let localVaultKey = forge.pkcs5.pbkdf2(password, localVaultSalt, numIterations, 16);
  return [ localVaultSalt, localVaultIV, localVaultKey ];
}

export function getLocalVaultKey(salt, password) {
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

  let vaultString = encodeVault(vault);

  debugValue("creating vault with key", localVaultKey);
  debugValue("and IV",localVaultIV);

  let cipher = forge.cipher.createCipher('AES-GCM', localVaultKey);
  console.log("setting IV");
  cipher.start({iv: localVaultIV});
  cipher.update(forge.util.createBuffer(vaultString));
  const success = cipher.finish();
  if (!success) {
    return null;
  }

  const localVault = {
    vault: cipher.output.toHex(),
    tag: cipher.mode.tag.toHex()
  }

  console.log("OK, did it");
  /* debugValue("vault encrypted as", cipher.output.toHex());
  debugValue("with tag", cipher.mode.tag.toHex());

  debugValue("vault encrypted as", cipher.output);
  debugValue("with tag", cipher.mode.tag);

  /// DZ check decryption of vault right here
  // decrypt the vault
  let decipher = forge.cipher.createDecipher('AES-GCM', localVaultKey);
  console.log("setting IV");
  decipher.start({iv: localVaultIV, tag: cipher.mode.tag});
  console.log("updating with encrypted vault");
  decipher.update(cipher.output);
  console.log("finishing");
  decipher.finish();

 */

  console.log("Encypted vault is",localVault.vault);
  console.log("with tag",localVault.tag);

  await db.localVault.add(localVault);
  db.close();

  // put the vault into the store
  store.setLocalVault(cipher.output);

}

function debugValue(label, value) {
  const printableValue = new Buffer.from(value).toString('hex');
  console.log(label, printableValue);
}

function encodeVault(vault) {
  vault.remoteVaultIV = forge.util.encode64(vault.remoteVaultIV);
  vault.remoteVaultKey = forge.util.encode64(vault.remoteVaultKey);
  const vaultString = JSON.stringify(vault);
  return vaultString;
}

function decodeVault(vaultString) {
  let vault = JSON.parse(vaultString);
  vault.remoteVaultIV = forge.util.decode64(vault.remoteVaultIV);
  vault.remoteVaultKey = forge.util.decode64(vault.remoteVaultKey);
  return vault;
}

export async function decryptLocalVault(
  localVaultIV,
  localVaultKey,
) {

  // get the encrypted vault
  await db.open();
  let localVault = await db.localVault.get(1);
  db.close();

  debugValue("decrypting vault with key",localVaultKey);
  debugValue("and IV", localVaultIV);

  console.log("vault to decrypt is",localVault.vault);
  console.log("with tag", localVault.tag);

  const vault = forge.util.createBuffer(forge.util.hexToBytes(localVault.vault), 'raw');
  const tag = forge.util.createBuffer(forge.util.hexToBytes(localVault.tag), 'raw');

  // decrypt the vault
  let decipher = forge.cipher.createDecipher('AES-GCM', localVaultKey);
  console.log("setting IV");
  decipher.start({iv: localVaultIV, tag: tag});
  console.log("updating with encrypted vault");
  decipher.update(vault);
  console.log("finishing");
  const success = decipher.finish();
  if (!success) {
    return null
  }
  console.log("put it back");

  let returnedVault = decodeVault(decipher.output);

  return returnedVault
}