/* fido.js
 *  Contains all the functionality for logging in/registering using a FIDO2 key with the CA.
 *  Must be included as a mix in for any pages/views that use FIDO2.
 */

import axios from "axios";

export function bufferDecode(value) {
  return Uint8Array.from(atob(value), c => c.charCodeAt(0));
}

export function bufferEncode(value) {
  return btoa(String.fromCharCode.apply(null, new Uint8Array(value)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export async function fido_register(username_register, csr) {
  const register_start_response = await axios({
    method: "get",
    // url: `https://api.letsauth.org/la0.3/register/begin/${username_register}`,
    url: `http://localhost:3060/la3/account/create-begin/${username_register}`,
    data: {
      CSR: csr
    }
  });
  // Filter out credentials
  let credentialCreationOptions = register_start_response.data;
  console.log("Register begin - response recieved", register_start_response);
  console.log("Cred creation options", credentialCreationOptions);
  
  // TBD -- ideally we wouldn't need to do this
  credentialCreationOptions.publicKey.rp.id = chrome.runtime.id;
  // credentialCreationOptions.publicKey.rp.id = "letsauth.org"
  // delete credentialCreationOptions.publicKey.rp.id

  credentialCreationOptions.publicKey.challenge = bufferDecode(
    credentialCreationOptions.publicKey.challenge
  );
  credentialCreationOptions.publicKey.user.id = bufferDecode(
    credentialCreationOptions.publicKey.user.id
  );
  if (credentialCreationOptions.publicKey.excludeCredentials) {
    for (var i = 0; i < credentialCreationOptions.publicKey.excludeCredentials.length; i++) {
      credentialCreationOptions.publicKey.excludeCredentials[i].id =
      bufferDecode(credentialCreationOptions.publicKey.excludeCredentials[i].id);
    }
  }
  //Asks users to create credention on Yubikey or Software app
  console.log("Asking user for credential");
  console.log(window.isSecureContext);
  const credential = await navigator.credentials.create({
    publicKey: credentialCreationOptions.publicKey
  });
  console.log("Credential Recieved", credential);
  let attestationObject = credential.response.attestationObject;
  let clientDataJSON = credential.response.clientDataJSON;
  let rawId = credential.rawId;

  //Send signed info with public key
  const register_finish_response = await axios({
    method: "post",
    // url: `https://api.letsauth.org/la0.3/register/finish/${username_register}`,
    url: `http://localhost:3060/la3/account/create-finish/${username_register}`,
    data: {
      id: credential.id,
      rawId: bufferEncode(rawId),
      type: credential.type,
      response: {
        attestationObject: bufferEncode(attestationObject),
        clientDataJSON: bufferEncode(clientDataJSON)
      }
    }
  });
  return register_finish_response.status;
}

export async function fido_login(username_login, csr) {
  const login_part1 = await axios({
    method: "get",
    url: `https://api.letsauth.org/la0.3/login/begin/${username_login}`,
    data: {
      CSR: csr
    }
  });
  console.log(login_part1);
  let credentialRequestOptions = login_part1.data;
  credentialRequestOptions.publicKey.challenge = bufferDecode(
    credentialRequestOptions.publicKey.challenge
  );
  let allowCredentials = credentialRequestOptions.publicKey.allowCredentials;
  for (const [key, value] of Object.entries(allowCredentials)) {
    console.log(value);
    allowCredentials[key].id = bufferDecode(value.id);
  }

  const credentialAssertion = await navigator.credentials.get({
    publicKey: credentialRequestOptions.publicKey
  });

  let authData = credentialAssertion.response.authenticatorData;
  let clientDataJSON = credentialAssertion.response.clientDataJSON;
  let rawId = credentialAssertion.rawId;
  let sig = credentialAssertion.response.signature;
  let userHandle = credentialAssertion.response.userHandle;

  const login_part2 = await axios({
    method: "post",
    url: `https://cors-anywhere.herokuapp.com/https://api.letsauth.org/la0.3/login/finish/${username_login}`,
    data: {
      id: credentialAssertion.id,
      rawId: bufferEncode(rawId),
      type: credentialAssertion.type,
      response: {
        authenticatorData: bufferEncode(authData),
        clientDataJSON: bufferEncode(clientDataJSON),
        signature: bufferEncode(sig),
        userHandle: bufferEncode(userHandle)
      }
    }
  });

  console.log(login_part2);
  return login_part2.status;
}
