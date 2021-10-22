/**
 * UserDatabase.js
 *
 * Contains functions to access the user database of indexeddb, the encrypted local browser database.
 * The user database is used to store important and sensitive information for this user and this authenticator.
 */

import { makeKeypassFromPassword } from "./CertGen.js";
import { getLoggedInCredentials, getIndexeddbKey } from "./LocalStorage.js";
import Dexie from "dexie";
import { applyEncryptionMiddleware, cryptoOptions } from "dexie-encrypted";

/**
 * Stores user info for this first time upon registering this authenticator.
 *
 * @param pemPrivateKey PEM string of this authenticator's private key
 * @param pemPublicKey PEM string of this authenticator's public key
 * @param username string of username for user's 1Key account
 * @param password string of symmetric key derived from the master password
 * @param authname string of name given to this authenticator
 * @param idbKey key used to encrypt the user database
 */
export async function storeNewUserInfo(
  pemPrivateKey,
  pemPublicKey,
  username,
  password,
  authname,
  idbKey
) {
  const db = new Dexie("userDb");

  // set the key and provide a configuration of how to encrypt at a table level.
  applyEncryptionMiddleware(db, idbKey, {
    keyStore: cryptoOptions.NON_INDEXED_FIELDS
  });

  // If this is the first time you've encrypted bump the version number.
  db.version(2).stores({
    keyStore: "id, username"
  });

  await db.open();
  await db.keyStore.delete(1);

  const userInfo = {
    id: 1,
    privateKey: pemPrivateKey,
    publicKey: pemPublicKey,
    username: username,
    password: password,
    authname: authname
  };

  await db.keyStore.add(userInfo);
  db.close();
}

/**
 * Gets stored object of user information.
 *
 * @param idbKey optional; key used to encrypt the user database
 * @returns user info object or undefined if an error occurs
 */
export async function getUserInfo(idbKey) {
  if (await checkForRegisteredUser()) {
    if (!idbKey) {
      idbKey = getIndexeddbKey(getLoggedInCredentials());
    }
    const db = new Dexie("userDb");

    if (idbKey) {
      applyEncryptionMiddleware(db, idbKey, {
        keyStore: cryptoOptions.NON_INDEXED_FIELDS
      });
    }

    db.version(2).stores({ keyStore: "id" });

    await db.open();
    let userInfo = await db.keyStore.toArray();
    db.close();
    return userInfo[0];
  } else {
    return undefined;
  }
}

/**
 * Deletes the user database.
 * Used when CA gives an error for registration. Since registration never completed this database can't yet exist.
 */
export async function clearUserDb() {
  await Dexie.delete("userDb");
}

/**
 * Checks whether the user database exists. If it does, that means this authenticator is already registered and contains user info.
 *
 * @returns boolean for if user is registered with this authenticator.
 */
export async function checkForRegisteredUser() {
  return await Dexie.exists("userDb");
}

/**
 * Edits the password-derived key in the user's info object.
 *
 * @param newPassword string for new master password
 * @param userInfo user info object
 *
 * @returns key derived from new master password
 */
export async function changePasswordInUserDb(newPassword, userInfo) {
  //this must be called AFTER idbkey has been re-encrypted with new password

  //generates new keypass
  let keypass = makeKeypassFromPassword(newPassword);

  //rewrites user entry with said keypass added to top of password list
  await storeNewUserInfo(
    userInfo.privateKey,
    userInfo.publicKey,
    userInfo.username,
    keypass,
    userInfo.authname,
    getIndexeddbKey(newPassword)
  );

  //returns generated keypass
  return keypass;
}
