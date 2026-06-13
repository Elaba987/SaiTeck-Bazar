// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDM8ZHaYI7UAbOhF8xK7H853EWwMbem_O8",
  authDomain: "saiteck-bazar.firebaseapp.com",
  projectId: "saiteck-bazar",
  storageBucket: "saiteck-bazar.firebasestorage.app",
  messagingSenderId: "801683968411",
  appId: "1:801683968411:web:803c5895b3125f20b4d13e",
  measurementId: "G-B484L070KT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);