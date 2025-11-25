// Firebase initialization and exports for Firestore + Storage
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import {
	getFirestore, collection, getDoc, getDocs, setDoc, doc, addDoc, updateDoc, deleteDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import {
	getStorage, ref as storageRef, getDownloadURL, uploadBytes
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js";

// Firebase config
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
const db = getFirestore(app);
const storage = getStorage(app);

// Export Firestore helpers
export {
db,
collection,
getDoc,
getDocs,
setDoc,
doc,
addDoc,
updateDoc,
deleteDoc,
onSnapshot,
// Firebase Storage helpers
storage,
storageRef,
getDownloadURL,
uploadBytes
};
