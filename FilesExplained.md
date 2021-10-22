# Explanation of Browser Extension Files

All of the following files are located in src/

## manifest.json

This keeps track of permissions and scripts for the browser extension.

## background.js

This is a persistent background script that runs as long as the browser is open.

- It listens for changes in locally stored values such as settings values, whether or not the user is logged into the extension, and "letsauthenticate" (a boolean indicating whether or not the user is trying to authenticate into a website).
- It sets the badge indicating that a login request has been received.
- It logs out the user when the browser is being closed.
- It logs out the user after a specified idle time indicated by the automatic logout setting (if enabled).
- It calls an update to authenticator data every hour while the user is logged in.

## content.js

This is a content script that is injected into every webpage a user visits.

- It sets a mutation observer that runs a method everytime the DOM of the webpage changes
- The function checks if the hidden form fields need for 1Key authentication are present on the webpage. If they are, and locally stored variable 'letsAuthenticate' isn't already set to true, it sets 'letsAuthenticate' to true. It also sets local values for the login object, signature, and website url

# Files in src/popup/

Files in the popup folder are the bulk of the code in this extension. They are organized just like a Vue website. The popup runs as if it were a new webpage being loaded everytime the user clicks on the extension icon on their browser.

- src/popup/components contains all the subpieces of different pages of popup.
- src/popup/pages contains all the main pages in popup.
- src/popup/tools contains javascript files of useful methods to be exported into pages and components as needed.

## index.js

Doesn't do much. It's just needed for vue

## routes.js

Defines route names for all the pages.

## App.vue

Root of app, determines which page displays when user clicks on popup.

Automatically displays logged in screen. If user is not registered, logged out, or authenticator certificate is expired, then it pushes the home screen.

Also defines colors used through app and font family for app.

## components/Accept.vue

This component displays a message that an authentication request was successful.

Used in Request.vue

## components/AccountDetails.vue

Displays user information such as username and authenticator name.
Has a button that updates recovery data and another button for editing the master password by opening ChangePassword.vue.

Used in Main.vue

## components/Accounts.vue

Displays a list of accounts. Displays domain, accountName, accountId, and authenticators that have certificates for that account.

Used in Main.vue

## components/AlreadyRegistered.vue

Displays option to register a new account with a website the user is already registered with,
or cancel the registration request.

Used in Request.vue

## components/ChangePassword.vue

**_NOT COMPLETED_**

Displays a form to enter username and new password.
Used in AccountDetails.vue for an already logged-in 1Key user to edit their master password.

The details of how the master password can be edited is NOT yet completed for version0.2.

## components/Devices.vue

**_NOT COMPLETED_**

This file was previously used to display all logged in accounts for each authenticator (or device).
It allowed for remote logout of each account.
How we will do this in version0.2 (and even if we will do this) is TBD.

I left all the old code on this page in case it's ever helpful, but it does not work and should display an empty list.

Used in Main.vue

## components/LoadingIcon.vue

Displays animated spinner loading thing. Used in various pages and components during API calls.

## components/LoadingScreen.vue

Component containing LoadingIcon.vue

Used in Request.vue to fill screen correctly.

## components/LostAuthenticator.vue

**_NOT COMPLETED_**

Displays list of authenticators for this 1Key account and options to deauthorize/authorize any authenticator.
You'll need to write a new method to f
The list should display fine, but details of authenticator revocation are NOT completed for version0.2.

Used in Main.vue

## components/Reject.vue

This component displays a message that an authentication request was unsuccessful or canceled by the user.

Used in Request.vue

## components/Request.vue

**_NOT COMPLETED_**

This is a big file that contains functionality to complete authentication for a service.
Contains what is necessary to login or register with a service.

- When no authentication request has been sent, it displays a message explaining how to use the extension for authentication.
- When an authentication request has been sent, it displays buttons to accept or reject the request and options for which account to use (for login) or naming the account (for registration).
- Contains components Accept.vue and Reject.vue to display results of authentication.

Used in Main.vue. This is the first component displayed in Main.vue when user opens the popup (while logged in).

Mostly finished for version0.2, needs debugging because of authenticator data additions.

## components/Settings.vue

Lists available customizable settings.

Settings include:

- Automatic Website Sign-In: When set to true, this allows background.js to automatically authenticate a user when a request is received. User never has to open the popup window to start authentication process.
- Automatic Extension Logout: When on, the user selects number of minutes/hours before logout occurs. This means after that amount of time where the user does not interact with their browser, background.js logs out the user from their 1Key extension.
- Night Mode: When set to true, as each page/component is opened they change their colors to a night mode color scheme.

Used in Main.vue

## pages/ForgotPassword.vue

**_NOT COMPLETED_**

This page can be opened by a link in Login.vue

Contains a form to enter recovery information to reset the master password.

All code in here is previous to version0.2. This will need to be adjusted to match
what version0.2 specifies for Account Recovery and resetting the master password
when user forgets the old master password.

## pages/Home.vue

This is the first page displayed after instillation and when user is logged out.
Displays 3 buttons to login, register, or register a new device, along with a welcome message.

## pages/Login.vue

Contains login information form and logs a user into the browser extension (logging in with the Let's Authenticate CA).

## pages/Main.vue

This page displays once user logs in. Contains menu bar to show different pages of the 1Key browser extension account
information. Menu bar displays the following components:

- Request.vue
- Accounts.vue
- Devices.vue
- LostAuthenticator.vue
- AccountDetails.vue
- Settings.vue

## pages/Register.vue

**_NOT COMPLETED_**

Contains register information form. This page route takes a param that identifies whether the user is registering
a totally new Let's Authenticate account, or just registering this browser as a new device to an already existing
Let's Authenticate account. This distinction changes the registration form and registration process slightly.

Needs a small fix for recovery process for version0.2. Currently it creates and stores 10 recovery passkeys which will NOT be used in version0.2

## pages/SecurityPreparation.vue

**_NOT COMPLETED_**

Displays instructions to download a pdf of recovery passkeys for safekeeping.
Creates said pdf and link to download.
Pushed by Register.vue before user can get into their new account with this browser.

Needs edits for version0.2. Version 0.2 still calls for user to download an important pdf after registration, but the contents of the pdf will be slightly different.

## tools/CertDatabase.js

Contains functions to access the certificate database of indexeddb, the encrypted local browser database.

The certificate database has 2 stores: authStore and serviceStore.
The auth store contains all the names of the authenticators for a 1Key account and the authenticator certificate for this browser extension.
The service store contains an entry for every account with a service made with this 1Key account and the account certificates owned by this authenticator.
Both stores are updated using authenticator data from the CA.

I recently made a lot of changes to this file, so it may need some debugging.

## tools/CertGen.js

**_NOT COMPLETED_**

Contains a mix of:

- cryptographic functions (making CSRs, certificates, symmetric keys, signatures, verifying signatures, and decryption/encryption)
- functions handling edits to authenticator data
- functions to compile information displayed on different components and pages (Accounts.vue, Devices.vue)

It's basically a miscellaneous file that should be refactored into a few smaller files to make your life easier.

It has a few TODO statements, but mostly the authenticator data helper functions need to be debugged. Most of them are untested.

## tools/LocalStorage.js

**_NOT COMPLETED_**

Contains all functions related to setting and getting values stored in browser's local storage.
Some sensitive values are stored in Secure LS, which is encrypted local storage.

Learn about Secure LS here: https://www.npmjs.com/package/secure-ls

A note on local storage: It's super easy to use but not meant to store a lot. This is why indexeddb is used to stored all the cert info for the account and local storage is used for a few simple values such as settings and website login info.

This is mostly completed, there are a couple TODO statements to change for storage involving recovery keys that needs to be changed for version0.2

## tools/ServerFacade.js

**_NOT COMPLETED_**

Contains functions for each api the authenticator calls from the CA.

Completed for all CA version0.2 endpoints, although some of those endpoints need debugging.
Contains several deprecated version0.1 endpoints. The equivalent endpoints for version0.2 need to replace these (once they are specified).

## tools/UserDatabase.js

Contains functions to access the user database of indexeddb, the encrypted local browser database.
The user database is used to store important and sensitive information for this user and this authenticator.

## A NOTE ON INDEXEDDB AND DEXIE-ENCRYPTED

Indexeddb is a database that comes with the browser. You can look at it by inspecting the popup window or background and going under the Applications tab. Since it is easy to read, I opted to secure it through encryption using Dexie-encrypted.

https://www.npmjs.com/package/dexie-encrypted

Dexie encrypted is fairly young and not commonly used and I have found it has lots of bugs.
You MUST use version 2.0.0, this upgrade has solved a lot of the problems I had before.

## A NOTE ON AUTHENTICATOR (RECOVERY) DATA

Recovery data has recently been renamed 'Authenticator data'.

I recently added in all the handling of getting and updating authenticator data, so debugging this process and making sure the authenticator data is updated between different authenticators should be your first priority.

It is stored as a json string in the CA.

The authenticator data is encrypted by a key, which is encrypted by a master password-derived symmetric key and stored alonside the rest of the encrypted data.

Here is the layout: (subject to change)

```
{
  key: <encrypted key string (encrypted by master-password-derived symmetric key)>
  data: <encrypted data string (encrypted by the above key)>
}
```

Once decrypted, this is the layout of `data`:

```
{
  map: [
        {
          domain: "test.letsauth.org",
          accountId: "some unique identifier",
          accountName: "user given account name",
          sessionPublicKey: "PEM string of public key for session cert",
          sessionPrivateKey: "PEM string of private key for session cert",
          sessionList: [
            {
              authenticator: "name of authenticator that started these sessions",
              sessions: [
                {
                  sessionCert: "PEM string of session cert",
                  geoLocation: {
                    latitude: "latitude coordinates of authenticator when session was created",
                    longitude: "longitude coordinates of authenticator when session was created",
                  }
                },
                ...
              ]
            },
            ...
          ]
        },
        ...
  ],
  authenticatorList: ["auth name 1", "auth name 2", ...]
}
```

`map` should have an object in the list for every account created by this 1Key account.

`sessionList` inside of an account object in `map` should have an object for every authenticator that is authorized to login to that account (ie authenticators that own an account cert for that account).

`sessions` inside of an object in `sessionList` should have an object for every active session

`authenticatorList` should have a string in the list for every authenticator made for this 1Key account.
