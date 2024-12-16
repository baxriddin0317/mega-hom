// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"
import { getAuth } from "firebase/auth"
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB-ur8xVWMrRDD_-YFKwnLCrxN2PSDYfak",
  authDomain: "megahome-a139c.firebaseapp.com",
  projectId: "megahome-a139c",
  storageBucket: "megahome-a139c.firebasestorage.app",
  messagingSenderId: "514613682150",
  appId: "1:514613682150:web:c9b1dcca2cad6a317a4027"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const fireDB = getFirestore(app);
const auth = getAuth(app)
const fireStorage = getStorage(app);

export { fireDB, auth, fireStorage }