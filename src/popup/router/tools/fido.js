/* fido.js
 *  Contains all the functionality for logging in/registering using a FIDO2 key with the CA.
 *  Must be included as a mix in for any pages/views that use FIDO2.
 */

import axios from "axios";

export default {
  methods: {
    bufferDecode: function(value) {
      return Uint8Array.from(atob(value), c => c.charCodeAt(0));
    },
    bufferEncode: function(value) {
      return btoa(String.fromCharCode.apply(null, new Uint8Array(value)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
    },
    async fido_register(username_register) {
      const register_start_response = await axios({
        method: "get",
        url: `register/begin/${username_register}`
      });
      // Filter out credentials
      let credentialCreationOptions = register_start_response.data;
      console.log(
        "Register begin - response recieved",
        register_start_response
      );
      console.log("Cred creation options", credentialCreationOptions);
      credentialCreationOptions.publicKey.challenge = this.bufferDecode(
        credentialCreationOptions.publicKey.challenge
      );
      credentialCreationOptions.publicKey.user.id = this.bufferDecode(
        credentialCreationOptions.publicKey.user.id
      );
      if (credentialCreationOptions.publicKey.excludeCredentials) {
        for (
          var i = 0;
          i < credentialCreationOptions.publicKey.excludeCredentials.length;
          i++
        ) {
          credentialCreationOptions.publicKey.excludeCredentials[
            i
          ].id = this.bufferDecode(
            credentialCreationOptions.publicKey.excludeCredentials[i].id
          );
        }
      }
      //Asks users to create credention on Yubikey or Software app
      console.log("Asking user for credential");
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
        url: `/register/finish/${username_register}`,
        data: {
          id: credential.id,
          rawId: this.bufferEncode(rawId),
          type: credential.type,
          response: {
            attestationObject: this.bufferEncode(attestationObject),
            clientDataJSON: this.bufferEncode(clientDataJSON)
          }
        }
      });
      return register_finish_response.status;
    },
    async fido_login(username_login) {
      const login_part1 = await axios({
        method: "get",
        url: `login/begin/${username_login}`
      });
      console.log(login_part1);
      let credentialRequestOptions = login_part1.data;
      credentialRequestOptions.publicKey.challenge = this.bufferDecode(
        credentialRequestOptions.publicKey.challenge
      );
      let allowCredentials =
        credentialRequestOptions.publicKey.allowCredentials;
      for (const [key, value] of Object.entries(allowCredentials)) {
        console.log(value);
        allowCredentials[key].id = this.bufferDecode(value.id);
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
        url: `login/finish/${username_login}`,
        data: {
          id: credentialAssertion.id,
          rawId: this.bufferEncode(rawId),
          type: credentialAssertion.type,
          response: {
            authenticatorData: this.bufferEncode(authData),
            clientDataJSON: this.bufferEncode(clientDataJSON),
            signature: this.bufferEncode(sig),
            userHandle: this.bufferEncode(userHandle)
          }
        }
      });

      console.log(login_part2);
      return login_part2.status;
    }
  }
};
