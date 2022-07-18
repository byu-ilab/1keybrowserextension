
# 1 Key Browser Extension

Part of the Let's Authenticate system.

## Status

We are working on getting the browser extension compliant with version 3 of the Let's Authenticate protocol. The following are working:

- creating an account with the CA
- login with local password, logout
- route guards so that user is directed to correct page when loading the extension
- hopefully got encrypted vaults working. Need to see if the keypair or cert is good, for example

- TBD check other pages for route guards
- TBD reset if forget password
- TBD renewing auth certificate
- login to websites and remote vault

## Development

To work with this extension, you will want to run the extension, the CA, and the CA website on your own machine. Everything is currently setup to work on localhost.

### Build the extension

After cloning this repository, navigate inside the directory and run:

```
npm install
```

followed by

```
npm run build
```

### Run the Let's Authenticate CA

See the [CA repository](https://github.com/Usable-Security-and-Privacy-Lab/lets-auth-ca) for instructions.

### Run the Let's Authenticate web front end

See the [web site repository](https://github.com/byu-ilab/LetsAuthWebPage) for instructions.

### Test the extension using Chrome

- Go to `chrome://extensions`.
- Toggle on "Developer mode" in the top right corner.
- Select the "Load unpacked" button that appears in the top left.
- Upload the "dist" folder.
- Browse to `chrome-extension://ghhgdcfhabbfmacalblnfobgacebgeie/popup/popup.html`

Because we have hard-coded the extension identifier in the manifest, you can view it this way for simpler debugging (you can open the Chrome Developer console and it will stay there as long as the tab is open).



