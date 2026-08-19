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
// 이벤트 1회 = 방 1개 (games/{방코드}/...). 방 코드는 입장 화면에서 입력.
