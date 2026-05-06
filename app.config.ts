import type { ExpoConfig } from "expo/config";

// আপনার দেওয়া ডাইনামিক আইডি এবং টাইমস্ট্যাম্প লজিক
const rawBundleId = "space.manus.ecommerce.phone.app.t20260422075038";
const bundleId =
  rawBundleId
    .replace(/[-_]/g, ".") 
    .replace(/[^a-zA-Z0-9.]/g, "") 
    .replace(/\.+/g, ".") 
    .replace(/^\.+|\.+$/g, "") 
    .toLowerCase()
    .split(".")
    .map((segment) => {
      return /^[a-zA-Z]/.test(segment) ? segment : "x" + segment;
    })
    .join(".") || "space.manus.app";

const timestamp = bundleId.split(".").pop()?.replace(/^t/, "") ?? "";
const schemeFromBundleId = `manus${timestamp}`;

const env = {
  appName: "BHStock",
  appSlug: "BHStock",
  scheme: "bhstock",
  androidPackage: "com.ishahruk96.BHStock",
};

const config: ExpoConfig = {
  name: env.appName,
  slug: env.appSlug,
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: env.scheme,
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  
  ios: {
    supportsTablet: true,
    bundleIdentifier: env.androidPackage, 
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false
    }
  },

  android: {
    package: env.androidPackage,
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    permissions: ["POST_NOTIFICATIONS"], 
  },

  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },

  plugins: [
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
        },
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          buildArchs: ["armeabi-v7a", "arm64-v8a"],
          minSdkVersion: 24,
          usesCleartextTraffic: true, // HTTP API support
          permissions: ["INTERNET"]
        },
      },
    ],
  ],

  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },

  extra: {
    eas: {
      projectId: "ae4aefd6-3586-4119-bec9-d68117d76da6",
    },
   
    bundleId: bundleId,
    timestamp: timestamp,
    dynamicScheme: schemeFromBundleId
  },
};

export default config;