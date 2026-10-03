import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail, signOut, updateProfile, setPersistence, browserLocalPersistence } from "firebase/auth";
import { auth } from "../firebase";

export async function signUp(name: string, email: string, password: string) {
  await setPersistence(auth, browserLocalPersistence);
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name }); // Firestore user doc is created server-side by onUserCreated
  return cred.user;
}
export async function logIn(email: string, password: string) { await setPersistence(auth, browserLocalPersistence); return signInWithEmailAndPassword(auth, email, password); }
export async function googleLogin() { await setPersistence(auth, browserLocalPersistence); return signInWithPopup(auth, new GoogleAuthProvider()); }
export const resetPassword = (email: string) => sendPasswordResetEmail(auth, email);
export const logOut = () => signOut(auth);
