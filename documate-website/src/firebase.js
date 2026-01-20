import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth"; 

const firebaseConfig = {
  apiKey: "AIzaSyCeQW23J2V1yiS6rCvMShkQHMYGzGzudWo",
  authDomain: "documate-cb843.firebaseapp.com",
  projectId: "documate-cb843",
  storageBucket: "documate-cb843.appspot.com", 
  messagingSenderId: "437549209246",
  appId: "1:437549209246:web:b04374d617eeb4eabbcd8f",
  measurementId: "G-56G7SPYVS9"
};


const app = initializeApp(firebaseConfig);


export const auth = getAuth(app);
