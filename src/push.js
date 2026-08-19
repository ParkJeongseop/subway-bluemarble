// 푸시: Expo Push API를 클라이언트에서 직접 호출 (조작 주체가 신뢰된 스태프라 서버 불필요)
// ponytail: 토큰이 Firestore에 공개돼 있어 악용 여지 있음 — 일반 배포 앱이면 Cloud Functions로 옮길 것
import { Platform } from 'react-native';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { db, GAME_ID } from './firebase';

const tokensCol = collection(db, 'games', GAME_ID, 'tokens');

// 앱 시작 시 호출 — 네이티브에서만 동작, 웹은 조용히 무시
export async function registerPush(teamId, role) {
  if (Platform.OS === 'web') return;
  try {
    const Notifications = await import('expo-notifications');
    // 에뮬레이터도 Play 서비스 이미지면 푸시 수신 가능 — 차단하지 않고 실패 시 catch로 넘김
    // 앱이 켜져 있을 때도 알림 배너 표시
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true, shouldShowList: true,
        shouldPlaySound: true, shouldSetBadge: false,
      }),
    });
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default', importance: Notifications.AndroidImportance.MAX,
      });
    }
    const { data: token } = await Notifications.getExpoPushTokenAsync();
    // 토큰을 문서 ID로 쓰면 중복 등록이 자연히 merge됨
    await setDoc(doc(tokensCol, token.replace(/[/\\]/g, '_')), { token, teamId, role });
  } catch (e) {
    console.log('push register skipped:', e.message);
  }
}

// teamId: 'all'이면 전체 발송
export async function sendPush(teamId, title, body) {
  try {
    const snap = await getDocs(tokensCol);
    const targets = [];
    snap.forEach((d) => {
      const t = d.data();
      if (teamId === 'all' || t.teamId === teamId) targets.push(t.token);
    });
    if (!targets.length) return;
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(targets.map((to) => ({ to, title, body, sound: 'default' }))),
    });
  } catch (e) {
    console.log('push send failed:', e.message);
  }
}

// 포그라운드 복귀 시 OTA 업데이트 즉시 적용 — 네이티브 전용
export async function applyUpdateIfAny() {
  if (Platform.OS === 'web' || __DEV__) return;
  try {
    const Updates = await import('expo-updates');
    const { isAvailable } = await Updates.checkForUpdateAsync();
    if (isAvailable) {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    }
  } catch (e) {
    console.log('update check failed:', e.message);
  }
}
