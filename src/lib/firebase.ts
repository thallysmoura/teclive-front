import { initializeApp, getApps } from "firebase/app";
import { GoogleAuthProvider, getAuth, signInWithPopup, signOut } from "firebase/auth";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** Abre a janela do Google e devolve o token de identidade para a API validar. */
export async function googleIdToken(): Promise<string> {
  const app = getApps()[0] ?? initializeApp(config);
  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const { user } = await signInWithPopup(auth, provider);
  const token = await user.getIdToken();
  await signOut(auth).catch(() => undefined); // a sessão do sistema é nossa; não deixa estado do Firebase no navegador
  return token;
}
