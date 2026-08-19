// Firebase 설정 — Firebase 콘솔 > 프로젝트 설정 > 웹 앱에서 복사해서 붙여넣기
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

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

// 이벤트 1회 = 게임 1개. 당일 게임 ID
export const GAME_ID = 'demo';
