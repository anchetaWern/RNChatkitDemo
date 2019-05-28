# RNChatkitDemo
A demo chat app built with React Native and Chatkit which has the following features:

-  Public and private chat rooms
-  Roles and permissions
-  Typing indicators
-  Read receipt
-  File uploads
-  Show online and offline users

You can read the full tutorial at: [Build a demo chat app with React Native and Chatkit](https://pusher.com/tutorials/chatroom-app-react-native)

### Prerequisites

-   React Native development environment
-   [Node.js](https://nodejs.org/en/)
-   [Yarn](https://yarnpkg.com/en/)
-   [Chatkit app instance](https://pusher.com/chatkit)
-   [ngrok account](https://ngrok.com/)

## Getting Started

1.  Clone the repo:

```
git clone https://github.com/anchetaWern/RNChatkitDemo.git
cd RNChatkitDemo
```

2.  Install the app dependencies:

```
yarn
```

3.  Eject the project (re-creates the `ios` and `android` folders):

```
react-native eject
```

4.  Link the packages:

```
react-native link react-native-gesture-handler
react-native link react-native-permissions
react-native link react-native-document-picker
react-native link react-native-fs
react-native link react-native-config
react-native link react-native-vector-icons
react-native link rn-fetch-blob
```

5.  Update `android/app/build.gradle` file:

```
apply from: "../../node_modules/react-native/react.gradle"

// add these:
apply from: "../../node_modules/react-native-vector-icons/fonts.gradle"
apply from: project(':react-native-config').projectDir.getPath() + "/dotenv.gradle"
```

6. Update `android/app/src/main/AndroidManifest.xml` to add permission to read from external storage:

```
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
  package="com.rnchatkitdemo">
  <uses-permission android:name="android.permission.INTERNET" />
  <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
  ...
</manifest>
```

7.  Update `.env` file with your Chatkit credentials.

8.  Set up the server:

```
cd server
yarn
```

9.  Update the `server/.env` file with your Chatkit credentials.

10.  Run the server:

```
yarn start
```

11. Run ngrok:

```
./ngrok http 5000
```

12. Update the `src/screens/Login.js`, `src/screens/Group.js`, and `src/screens/Chat.js` file with your ngrok https URL.

13. Run the app:

```
react-native run-android
react-native run-ios
```

14. Log in to the app on two separate devices (or emulator).

## Built With

-   [React Native](http://facebook.github.io/react-native/)
-   [Chatkit](https://pusher.com/chatkit)

## Donation

If this project helped you reduce time to develop, please consider buying me a cup of coffee :)

<a href="https://www.buymeacoffee.com/wernancheta" target="_blank"><img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png" alt="Buy Me A Coffee" style="height: 41px !important;width: 174px !important;box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;-webkit-box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;" ></a>
