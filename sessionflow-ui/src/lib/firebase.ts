import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyA-yC4rP5NH0G_7yAs1d59obmnJwLOw-Bc",
  authDomain: "sessionflow-a55b2.firebaseapp.com",
  databaseURL: "https://sessionflow-a55b2-default-rtdb.firebaseio.com",
  projectId: "sessionflow-a55b2",
  storageBucket: "sessionflow-a55b2.firebasestorage.app",
  messagingSenderId: "769175078368",
  appId: "1:769175078368:web:5592779ca5898881b7d785",
  measurementId: "G-MZDW24H6ME"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
