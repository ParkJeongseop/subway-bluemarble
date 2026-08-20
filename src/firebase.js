// Firebase 설정 — Firebase 콘솔 > 프로젝트 설정 > 웹 앱에서 복사해서 붙여넣기
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyDosBD626HrO4dPEq1fpnn0CysoA-1UcFM',
  authDomain: 'subway-bluemarble.firebaseapp.com',
  projectId: 'subway-bluemarble',
  storageBucket: 'subway-bluemarble.firebasestorage.app',
  messagingSenderId: '738381350860',
  appId: '1:738381350860:web:cef271e4696644c927ff69',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
// 이벤트 1회 = 방 1개 (games/{방코드}/...). 익명 인증 후 보안 규칙으로 쓰기 권한 통제.

// 앱 시작 시 익명 로그인, uid 콜백
export function ensureAuth(onReady) {
  return onAuthStateChanged(auth, (user) => {
    if (user) onReady(user.uid);
    else signInAnonymously(auth).catch((e) => console.log('auth failed:', e.message));
  });
}
