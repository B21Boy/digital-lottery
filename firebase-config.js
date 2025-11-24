// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDpOM68RHQDrSij_Uj--og7eri_lhjfBFM",
  authDomain: "lottery-app-ad206.firebaseapp.com",
  projectId: "lottery-app-ad206",
  storageBucket: "lottery-app-ad206.firebasestorage.app",
  messagingSenderId: "277797180262",
  appId: "1:277797180262:web:62bceca868d8cd13826ea7",
  measurementId: "G-8FXY4CMG81"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);