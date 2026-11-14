import { initializeApp } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js";
import { getAuth, signInAnonymously, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCDh02-Eb7qpWavevk9xrt3h0Jbwb5vI8s",
  authDomain: "ultimate-mind-games-by-dachi78.firebaseapp.com",
  databaseURL: "https://ultimate-mind-games-by-dachi78-default-rtdb.firebaseio.com",
  projectId: "ultimate-mind-games-by-dachi78",
  storageBucket: "ultimate-mind-games-by-dachi78.firebasestorage.app",
  messagingSenderId: "37380071346",
  appId: "1:37380071346:web:89ca4df227787ea27b4eab"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

console.log("Firebase initialized successfully!");

// Test Guest Login Click
document.getElementById("guest-login-btn").onclick = () => {
  alert("Guest button was clicked! Connecting to Firebase...");
  
  signInAnonymously(auth)
    .then((result) => {
      const user = result.user;
      alert("Guest login success! UID: " + user.uid);
      
      // Hide auth screen, show lobby
      document.getElementById("auth-screen").classList.add("hidden");
      document.getElementById("lobby-screen").classList.remove("hidden");
      document.getElementById("profile-name").innerText = "Guest-" + user.uid.slice(0, 4);
      document.getElementById("user-profile-bar").classList.remove("hidden");
    })
    .catch((error) => {
      alert("Firebase Guest Error: " + error.message);
    });
};

// Test Google Login Click
document.getElementById("google-login-btn").onclick = () => {
  alert("Google button was clicked!");
  signInWithPopup(auth, new GoogleAuthProvider())
    .then((result) => {
      const user = result.user;
      alert("Google login success: " + user.displayName);
      document.getElementById("auth-screen").classList.add("hidden");
      document.getElementById("lobby-screen").classList.remove("hidden");
      document.getElementById("profile-name").innerText = user.displayName;
      if(user.photoURL) document.getElementById("user-avatar").src = user.photoURL;
      document.getElementById("user-profile-bar").classList.remove("hidden");
    })
    .catch((error) => {
      alert("Google Login Error: " + error.message);
    });
};
