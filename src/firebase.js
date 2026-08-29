// Firebase 설정 — Firebase 콘솔 > 프로젝트 설정 > 웹 앱에서 복사해서 붙여넣기
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import * as fbAuth from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { signInAnonymously, onAuthStateChanged } = fbAuth;

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
// uid 영속화: 앱을 껐다 켜도 같은 익명 계정 유지 (HQ/스태프 재입장에 필수)
// RN 번들에서만 getReactNativePersistence가 존재 — 웹(react-native-web)은 기본 영속 사용
export const auth = fbAuth.getReactNativePersistence
  ? fbAuth.initializeAuth(app, {
    persistence: fbAuth.getReactNativePersistence(AsyncStorage),
  })
  : fbAuth.getAuth(app);
// 이벤트 1회 = 방 1개 (games/{방코드}/...). 익명 인증 후 보안 규칙으로 쓰기 권한 통제.

// 앱 시작 시 익명 로그인, uid 콜백
export function ensureAuth(onReady) {
  return onAuthStateChanged(auth, (user) => {
    if (user) onReady(user.uid);
    else signInAnonymously(auth).catch((e) => console.log('auth failed:', e.message));
  });
}
