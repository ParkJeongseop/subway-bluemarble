// Firebase 설정 — Firebase 콘솔 > 프로젝트 설정 > 웹 앱에서 복사해서 붙여넣기
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import * as fbAuth from 'firebase/auth';
import AsyncStorage from './storage';

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
// RN 번들에서만 getReactNativePersistence 존재. AsyncStorage 네이티브가 없는
// 구버전 빌드(1.0.0)나 웹은 기본(메모리/브라우저) 영속으로 폴백
export const auth = (fbAuth.getReactNativePersistence && AsyncStorage)
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
