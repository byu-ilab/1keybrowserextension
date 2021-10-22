## Instructions to install Let's Authenticate Extension (Built version)

After cloning this repository, navigate to browser_ext/dist-zip.
In this folder unzip lets-auth-extension-v1.0.0.zip

Once you upload it, the extension will give you the error
"WebSocket connection to 'ws://localhost:9090/' failed: Error in connection establishment: net::ERR_CONNECTION_REFUSED"
but this is fine. Everything will work normally.

** For Version 0.2 you can use the directions for testing on your browser of choice below. **

## Instructions to install Let's Authenticate Extension (Development version)

After cloning this repository, navigate inside the browser_ext directory and run:

```
  npm install
```

Followed by:

```
  npm run watch:dev
```

## Test on Chrome

Go to chrome://extensions
Toggle on "Developer mode" in the top right corner.

Select the "Load unpacked" button that appears in the top left.
Upload the "dist" folder of browser_ext, or upload the unzipped folder of lets-auth-extension-v1.0.0.zip.

## Test on Firefox

For firefox you can not use the zipped version because the following edits have to be made.

Open browser_ext/src/manifest.json and add this to the list:

```
"applications": {
  "gecko": {
    "id": "Keystone@letsauth.org",
    "strict_min_version": "53.0"
  }
},
```

This fixes a bug specific to running the extension in firefox as a temporary add-on.

Go to about:debugging#/runtime/this-firefox
Under temporary extensions select "Load Temporary Add-on".
Upload background.js from the "dist" folder of browser_ext.

## Test on Opera

Go to opera:extensions
Toggle on "Developer mode" in the top right corner.

Select the "Load unpacked" button that appears in the top left.
Upload the "dist" folder of browser_ext, or upload the unzipped folder of lets-auth-extension-v1.0.0.zip.

## Test on Microsoft Edge

First go to edge://flags
Scroll down to "Enable Extensions Lab functionality" and enable it.

Now go to edge://extensions
Toggle on "Developer mode" in the bottom left corner.
Select the "Load unpacked" button that appears in the top right.
Upload the "dist" folder of browser_ext, or upload the unzipped folder of lets-auth-extension-v1.0.0.zip.
