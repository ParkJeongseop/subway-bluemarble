import { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, useWindowDimensions, FlatList,
  AppState, Animated, ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  collection, doc, onSnapshot, setDoc, getDoc, updateDoc, addDoc, serverTimestamp,
  query, orderBy, limit,
} from 'firebase/firestore';
import { db, ensureAuth } from './src/firebase';
import { STATIONS, FINISH, WANGSIMNI, SEOLLEUNG, JAIL, TEAM_COLORS } from './src/stations';
import { RANDOM_MISSIONS, STATION_MISSIONS } from './src/missions';
import { ITEMS, itemById, IS_ATTACK, CATS } from './src/items';
import { registerPush, sendPush, applyUpdateIfAny } from './src/push';
import { QUIZZES } from './src/quiz';

const teamsCol = (gameId) => collection(db, 'games', gameId, 'teams');
const logCol = (gameId) => collection(db, 'games', gameId, 'log');

const NEW_TEAM = {
  position: 0, coins: 0, items: [], shield: false,
  doneMissions: [], inJail: false, finishedAt: null,
};

export default function App() {
  const [uid, setUid] = useState(null);
  const [session, setSession] = useState(null); // { gameId, role, teamId }
  useEffect(() => ensureAuth(setUid), []);
  if (!uid) {
    return (
      <View style={st.entry}>
        <StatusBar style="light" />
        <Text style={st.sub}>연결 중...</Text>
      </View>
    );
  }
  return session
    ? <Board session={session} uid={uid} />
    : <Entry uid={uid} onJoin={setSession} />;
}

function Entry({ uid, onJoin }) {
  const [mode, setMode] = useState('home'); // home | create | join | pick
  const [teamCount, setTeamCount] = useState(5);
  const [room, setRoom] = useState('');
  const [asStaff, setAsStaff] = useState(false);
  const [staffKeyIn, setStaffKeyIn] = useState('');
  const [roomInfo, setRoomInfo] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const createRoom = async () => {
    if (busy) return;
    setBusy(true); setErr('');
    try {
      const gameId = String(Math.floor(100000 + Math.random() * 900000));
      const sKey = Math.random().toString(36).slice(2, 8).toUpperCase();
      await setDoc(doc(db, 'games', gameId), {
        ownerUid: uid, teamCount, createdAt: serverTimestamp(),
      });
      await setDoc(doc(db, 'games', gameId, 'private', 'keys'), { staffKey: sKey });
      await setDoc(doc(db, 'games', gameId, 'members', uid), { role: 'hq' });
      for (let i = 1; i <= teamCount; i += 1) {
        await setDoc(doc(teamsCol(gameId), String(i)), { name: `${i}팀`, ...NEW_TEAM });
      }
      registerPush(gameId, null, 'hq');
      onJoin({ gameId, role: 'hq', teamId: null });
    } catch (e) { setErr(`방 생성 실패: ${e.message}`); }
    setBusy(false);
  };

  const findRoom = async () => {
    setErr('');
    const gameId = room.trim();
    if (!gameId) { setErr('방 코드를 입력하세요'); return; }
    const snap = await getDoc(doc(db, 'games', gameId));
    if (!snap.exists()) { setErr('방을 찾을 수 없습니다'); return; }
    setRoomInfo({ gameId, teamCount: snap.data().teamCount || 5, ownerUid: snap.data().ownerUid });
    setMode('pick');
  };

  const pickTeam = async (teamId) => {
    setErr('');
    const { gameId } = roomInfo;
    const role = asStaff ? 'staff' : 'player';
    try {
      await setDoc(doc(db, 'games', gameId, 'members', uid), {
        role, teamId, ...(asStaff && { key: staffKeyIn.trim().toUpperCase() }),
      });
      registerPush(gameId, teamId, role);
      onJoin({ gameId, role, teamId });
    } catch (e) {
      setErr(asStaff ? '스태프키가 올바르지 않습니다' : `입장 실패: ${e.message}`);
    }
  };

  const joinAsHq = async () => { // 방 생성자가 재접속할 때
    setErr('');
    try {
      await setDoc(doc(db, 'games', roomInfo.gameId, 'members', uid), { role: 'hq' });
      onJoin({ gameId: roomInfo.gameId, role: 'hq', teamId: null });
    } catch (e) { setErr('본부 입장은 방을 만든 기기에서만 가능합니다'); }
  };

  return (
    <View style={st.entry}>
      <StatusBar style="light" />
      <Text style={st.title}>2호선 부루마블</Text>
      <Text style={st.sub}>홍대입구 → 강남</Text>

      {mode === 'home' && (
        <>
          <TouchableOpacity style={st.btn} onPress={() => setMode('create')}>
            <Text style={st.btnText}>➕ 방 만들기</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[st.btn, st.btnAlt]} onPress={() => setMode('join')}>
            <Text style={st.btnText}>🚪 방 참가</Text>
          </TouchableOpacity>
        </>
      )}

      {mode === 'create' && (
        <>
          <Text style={st.label}>팀 수</Text>
          <View style={st.stepper}>
            <TouchableOpacity style={st.stepBtn} onPress={() => setTeamCount(Math.max(2, teamCount - 1))}>
              <Text style={st.btnText}>−</Text>
            </TouchableOpacity>
            <Text style={st.stepValue}>{teamCount}팀</Text>
            <TouchableOpacity style={st.stepBtn} onPress={() => setTeamCount(Math.min(8, teamCount + 1))}>
              <Text style={st.btnText}>＋</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={[st.btn, busy && st.disabled]} onPress={createRoom}>
            <Text style={st.btnText}>{busy ? '생성 중...' : '방 만들기 (내가 본부)'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode('home')}>
            <Text style={st.linkText}>← 뒤로</Text>
          </TouchableOpacity>
        </>
      )}

      {mode === 'join' && (
        <>
          <TextInput
            style={st.input} value={room} onChangeText={setRoom}
            placeholder="방 코드 6자리" placeholderTextColor="#567"
            keyboardType="number-pad" onSubmitEditing={findRoom}
          />
          <TouchableOpacity style={st.btn} onPress={findRoom}>
            <Text style={st.btnText}>다음</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode('home')}>
            <Text style={st.linkText}>← 뒤로</Text>
          </TouchableOpacity>
        </>
      )}

      {mode === 'pick' && roomInfo && (
        <>
          <Text style={st.label}>팀 선택 — 방 {roomInfo.gameId}</Text>
          <View style={st.teamGrid}>
            {Array.from({ length: roomInfo.teamCount }, (_, i) => String(i + 1)).map((id) => (
              <TouchableOpacity
                key={id}
                style={[st.teamBtn, { backgroundColor: TEAM_COLORS[id] || '#607d8b' }]}
                onPress={() => pickTeam(id)}>
                <Text style={st.btnText}>{id}팀</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={st.staffToggle} onPress={() => setAsStaff(!asStaff)}>
            <Text style={st.linkText}>{asStaff ? '☑' : '☐'} 스태프로 입장</Text>
          </TouchableOpacity>
          {asStaff && (
            <TextInput
              style={st.input} value={staffKeyIn} onChangeText={setStaffKeyIn}
              placeholder="스태프키" placeholderTextColor="#567" autoCapitalize="characters"
            />
          )}
          <TouchableOpacity onPress={joinAsHq}>
            <Text style={st.linkText}>본부(HQ)로 재입장</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode('join')}>
            <Text style={st.linkText}>← 뒤로</Text>
          </TouchableOpacity>
        </>
      )}

      {!!err && <Text style={st.err}>{err}</Text>}
    </View>
  );
}

function Board({ session }) {
  const { width, height } = useWindowDimensions();
  const boardSize = Math.min(width, height * 0.55); // 정사각 보드, 조작부·로그 공간 확보
  const [teams, setTeams] = useState({});
  const [logs, setLogs] = useState([]);
  const [shopOpen, setShopOpen] = useState(false);
  const [pendingUse, setPendingUse] = useState(null); // 대상팀 선택 대기 중인 아이템 id
  const [pendingPick, setPendingPick] = useState(false); // 지정 주사위 숫자 선택 중
  const [hqMsg, setHqMsg] = useState('');
  const [quizIdx, setQuizIdx] = useState(null); // 출제 중인 퀴즈 index
  // 주사위 애니메이션: lastRoll이 생기면 숫자 돌리다가 결과에 멈춤
  const [diceFace, setDiceFace] = useState(null); // 표시 중인 눈 (null = 숨김)
  const diceScale = useRef(new Animated.Value(0)).current;
  const prevRoll = useRef(null);

  const gameId = session.gameId;
  const [hqKeys, setHqKeys] = useState(null);
  const log = (type, teamId, message) =>
    addDoc(logCol(gameId), { type, teamId, message, createdAt: serverTimestamp() });

  useEffect(() => { // HQ만 스태프키 열람 가능 (보안 규칙)
    if (session.role === 'hq') {
      getDoc(doc(db, 'games', gameId, 'private', 'keys')).then((s) => setHqKeys(s.data()));
    }
  }, [gameId]);

  useEffect(() => {
    const u1 = onSnapshot(teamsCol(gameId), (snap) => {
      const t = {};
      snap.forEach((d) => { t[d.id] = d.data(); });
      setTeams(t);
    });
    const u2 = onSnapshot(query(logCol(gameId), orderBy('createdAt', 'desc'), limit(20)),
      (snap) => setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => { u1(); u2(); };
  }, [gameId]);

  // 포그라운드 복귀 시 OTA 업데이트 즉시 적용
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') applyUpdateIfAny();
    });
    return () => sub.remove();
  }, []);

  const canControl = session.role !== 'player';
  const myTeam = session.teamId && teams[session.teamId];

  // 주사위 연출: lastRoll이 새로 생기면 눈이 돌아가다 결과에 멈춤 (참가자 화면도 동일 재생)
  const lastRoll = myTeam ? myTeam.lastRoll : null;
  useEffect(() => {
    if (!lastRoll) { prevRoll.current = null; return undefined; }
    if (lastRoll === prevRoll.current) return undefined;
    prevRoll.current = lastRoll;
    setDiceFace(1);
    diceScale.setValue(0);
    Animated.spring(diceScale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
    let i = 0;
    const iv = setInterval(() => {
      i += 1;
      if (i < 12) {
        setDiceFace(1 + Math.floor(Math.random() * 6)); // 두구두구
      } else {
        clearInterval(iv);
        setDiceFace(lastRoll); // 결과 (더블/트리플이면 합계)
        Animated.sequence([
          Animated.timing(diceScale, { toValue: 1.35, duration: 120, useNativeDriver: true }),
          Animated.spring(diceScale, { toValue: 1, friction: 3, useNativeDriver: true }),
        ]).start();
        setTimeout(() => {
          Animated.timing(diceScale, { toValue: 0, duration: 200, useNativeDriver: true })
            .start(() => setDiceFace(null));
        }, 1600);
      }
    }, 80);
    return () => clearInterval(iv);
  }, [lastRoll]);
  const teamRef = () => doc(teamsCol(gameId), session.teamId);

  const move = async (delta) => {
    const t = teams[session.teamId];
    if (!t) return;
    const pos = Math.max(0, Math.min(FINISH, t.position + delta));
    const finished = pos === FINISH && !t.finishedAt; // 페가수스 도착 경로 포함
    await updateDoc(teamRef(), {
      position: pos,
      ...(finished && { finishedAt: serverTimestamp(), pegasus: false }),
    });
    await log('move', session.teamId,
      `${t.name} → ${STATIONS[pos].name}${finished ? ' 🏁 골인!' : ''}`);
    if (finished) sendPush(gameId, 'all', '🏁 골인!', `${t.name}이 강남역에 도착했습니다!`);
  };

  // 미션 뽑기: 특정역 미션 우선, 아니면 랜덤풀에서 본인 팀이 안 한 것만
  const drawMission = (t, stationName, exclude = []) => {
    if (STATION_MISSIONS[stationName]) return STATION_MISSIONS[stationName];
    const pool = RANDOM_MISSIONS.filter(
      (m) => !(t.doneMissions || []).includes(m) && !exclude.includes(m),
    );
    if (pool.length === 0) return null; // 미션 다 소진 — 미션 없이 진행
    return pool[Math.floor(Math.random() * pool.length)];
  };

  // 스태프가 조작하므로 클라 난수로 충분 (서버 주사위 불필요)
  const roll = async () => {
    const t = teams[session.teamId];
    if (!t || t.lastRoll || t.pendingMission || t.pegasus || t.inJail || t.atShortcut || t.pickMode) return;
    const faces = t.cursed ? 3 : t.diceMod === 'dice9' ? 9 : 6;
    const count = t.diceMod === 'triple' ? 3 : t.diceMod === 'double' ? 2 : 1;
    const rolls = Array.from({ length: count }, () => 1 + Math.floor(Math.random() * faces));
    const sum = rolls.reduce((a, b) => a + b, 0);
    let value = sum;
    let note = '';
    if (t.diceMod === 'oddEven') {
      if (sum % 2 === 1) { value = sum * 2; note = ` — 홀! 🍀 ${value}칸 전진`; }
      else { value = -sum; note = ` — 짝! 💥 ${sum}칸 후진`; }
    }
    if (t.reversed) { value = -Math.abs(value); note += ' (거꾸로 주사위 😵)'; }
    await updateDoc(teamRef(), {
      lastRoll: value, cursed: false, reversed: false, diceMod: null,
    });
    await log('roll', session.teamId,
      `${t.name} 주사위 🎲 ${rolls.join('+')}${count > 1 ? ` = ${sum}` : ''}${note}${t.cursed ? ' (저주 😈)' : ''}`);
  };

  // 지정 주사위: 굴리지 않고 숫자 확정 (아이템 소모는 usePickDice에서)
  const usePickDice = async (n) => {
    const t = teams[session.teamId];
    const mine = [...(t.items || [])];
    const idx = mine.indexOf('pickDice');
    if (idx < 0) return;
    mine.splice(idx, 1);
    await updateDoc(teamRef(), { items: mine, lastRoll: n });
    await log('roll', session.teamId, `${t.name} 지정 주사위 🎯 ${n}`);
  };

  const arrive = async () => {
    const t = teams[session.teamId];
    if (!t || !t.lastRoll) return;
    const pos = Math.max(0, Math.min(FINISH, t.position + t.lastRoll));
    const station = STATIONS[pos].name;
    const finished = pos === FINISH;
    const backward = t.lastRoll < 0;
    const update = { position: pos, lastRoll: null };
    let msg = `${t.name} → ${station} 도착`;
    let mission = null;
    if (finished) {
      update.finishedAt = serverTimestamp();
      msg += ' 🏁 골인!';
    } else if (pos === JAIL && !backward) {
      // 감옥: 다른 모든 팀이 미션 1회씩 성공해야 석방 (도착 시점 기준)
      update.inJail = true;
      update.jailBaseline = Object.fromEntries(
        Object.entries(teams).filter(([id]) => id !== session.teamId)
          .map(([id, tt]) => [id, (tt.doneMissions || []).length]),
      );
      msg += ' — 🔒 감옥!';
    } else if (pos === WANGSIMNI && !backward) {
      update.atShortcut = true; // 정확히 도착 → 지름길 선택권
      msg += ' — 🚇 지름길 선택 가능!';
    } else if (backward) {
      msg += ' (후진 — 미션 없음)';
    } else if (t.skipNextMission) {
      update.skipNextMission = false;
      msg += ' — 미션 면제 🎫';
    } else if (t.pickMode) {
      msg += ' — 미션 고르는 중 🤔'; // 스태프가 목록에서 선택
    } else {
      mission = drawMission(t, station);
      update.pendingMission = mission;
      if (mission) msg += ` / 미션: ${mission}`;
    }
    await updateDoc(teamRef(), update);
    await log('move', session.teamId, msg);
    if (finished) sendPush(gameId, 'all', '🏁 골인!', `${t.name}이 강남역에 도착했습니다!`);
    else if (mission) sendPush(gameId, session.teamId, `📋 ${station} 미션`, mission);
  };

  // 미션 고르기/소생: 목록에서 선택
  const chooseMission = async (m) => {
    const t = teams[session.teamId];
    if (!t) return;
    await updateDoc(teamRef(), { pendingMission: m, pickMode: null });
    await log('mission', session.teamId, `${t.name} 미션 선택: ${m}`);
  };

  // 지름길 선택
  const takeShortcut = async (yes) => {
    const t = teams[session.teamId];
    if (!t || !t.atShortcut) return;
    if (yes) {
      const mission = drawMission(t, STATIONS[SEOLLEUNG].name);
      await updateDoc(teamRef(), { atShortcut: false, position: SEOLLEUNG, pendingMission: mission });
      await log('move', session.teamId,
        `${t.name} 🚇 지름길! 수인분당선 환승 → 선릉 (도착 후 미션: ${mission})`);
      sendPush(gameId, 'all', '🚇 지름길!', `${t.name}이 왕십리→선릉 지름길을 탔습니다!`);
    } else {
      const mission = drawMission(t, STATIONS[WANGSIMNI].name);
      await updateDoc(teamRef(), { atShortcut: false, pendingMission: mission });
      await log('move', session.teamId, `${t.name} 지름길 포기 / 미션: ${mission}`);
    }
  };

  // 감옥 석방 조건: 다른 모든 팀이 감옥行 이후 미션 1회 이상 성공
  const jailProgress = (t) => {
    const base = t.jailBaseline || {};
    const others = Object.entries(teams).filter(([id]) => id !== session.teamId);
    const cleared = others.filter(([id, tt]) => (tt.doneMissions || []).length > (base[id] ?? 0));
    return { cleared: cleared.length, total: others.length };
  };

  const releaseJail = async () => {
    const t = teams[session.teamId];
    if (!t || !t.inJail) return;
    await updateDoc(teamRef(), { inJail: false, jailBaseline: null });
    await log('move', session.teamId, `${t.name} 🔓 감옥 석방!`);
  };

  const judgeMission = async (success) => {
    const t = teams[session.teamId];
    if (!t || !t.pendingMission) return;
    if (success) {
      const done = [...(t.doneMissions || []), t.pendingMission];
      if (t.extraMission) {
        // 미션 2개 시키기: 성공 즉시 다음 미션 발동
        const next = drawMission({ ...t, doneMissions: done }, '');
        await updateDoc(teamRef(), { pendingMission: next, doneMissions: done, extraMission: false });
        await log('mission', session.teamId, `${t.name} 미션 성공 ✅ — 미션 1개 더! ${next}`);
      } else {
        await updateDoc(teamRef(), { pendingMission: null, doneMissions: done });
        await log('mission', session.teamId, `${t.name} 미션 성공 ✅`);
      }
    } else {
      // 다시 뽑기: 현재 미션 제외 (특정역 미션은 재뽑기 없이 유지)
      const redraw = drawMission(t, '', [t.pendingMission]);
      await updateDoc(teamRef(), { pendingMission: redraw ?? t.pendingMission });
      await log('mission', session.teamId, `${t.name} 미션 다시 뽑기 🔄`);
    }
  };

  const addCoins = async (n) => {
    const t = teams[session.teamId];
    if (!t) return;
    await updateDoc(teamRef(), { coins: Math.max(0, (t.coins || 0) + n) });
    await log('coin', session.teamId, `${t.name} 코인 ${n > 0 ? '+' : ''}${n} (보유 ${Math.max(0, (t.coins || 0) + n)})`);
  };

  const buyItem = async (item) => {
    const t = teams[session.teamId];
    if (!t || (t.coins || 0) < item.price) return;
    if (item.id === 'shield') {
      // 천사카드는 인벤토리 없이 구매 즉시 방어 대기 상태
      await updateDoc(teamRef(), { coins: t.coins - item.price, shield: true });
      await log('shop', session.teamId, `${t.name} 천사카드 구매 🛡️`);
    } else if (item.id === 'pegasus') {
      // 페가수스는 구매 즉시 발동 ("그 즉시 직행")
      await updateDoc(teamRef(), {
        coins: t.coins - item.price, pegasus: true, lastRoll: null, pendingMission: null,
      });
      await log('shop', session.teamId, `${t.name} 🐴 페가수스 탑승! 강남 직행`);
      sendPush(gameId, 'all', '🐴 페가수스!', `${t.name}이 페가수스에 탑승! 강남 직행 중 — 떨어트리기로 저격 가능`);
    } else {
      await updateDoc(teamRef(), {
        coins: t.coins - item.price, items: [...(t.items || []), item.id],
      });
      await log('shop', session.teamId, `${t.name} ${item.name} 구매 🛒`);
    }
  };

  const useItem = async (itemId, targetId) => {
    const t = teams[session.teamId];
    const item = itemById(itemId);
    if (!t) return;
    const mine = [...(t.items || [])];
    const idx = mine.indexOf(itemId);
    if (idx < 0) return;

    // 자석: 대상 자동 지정 (말판에서 바로 앞에 있는 팀, 페가수스 제외)
    if (itemId === 'magnet') {
      const ahead = Object.entries(teams)
        .filter(([id, tt]) => id !== session.teamId && !tt.pegasus && tt.position > t.position)
        .sort((a, b) => a[1].position - b[1].position)[0];
      if (!ahead) { await log('item', session.teamId, `${t.name} 자석 실패 — 앞에 팀이 없음 (아이템 유지)`); return; }
      targetId = ahead[0];
    }
    const target = targetId ? teams[targetId] : null;
    const tRef = targetId ? doc(teamsCol(gameId), targetId) : null;

    // 페가수스 탑승 팀은 떨어트리기 외 공격 무효 (아이템 소모 안 함)
    if (target && IS_ATTACK.has(itemId) && itemId !== 'pegasusDrop' && target.pegasus) {
      await log('attack', session.teamId, `${t.name} → ${target.name} ${item.name} 실패 — 🐴 페가수스 탑승 중 (아이템 유지)`);
      return;
    }
    if (itemId === 'pegasusDrop' && !target?.pegasus) {
      await log('attack', session.teamId, `${t.name} 떨어트리기 실패 — 대상이 페가수스 탑승 중이 아님 (아이템 유지)`);
      return;
    }
    mine.splice(idx, 1);

    // 천사카드 자동 방어 (찢기는 IS_ATTACK 미포함이라 안 막힘)
    if (target && IS_ATTACK.has(itemId) && target.shield) {
      await updateDoc(tRef, { shield: false });
      await updateDoc(teamRef(), { items: mine });
      await log('attack', session.teamId, `${t.name} → ${target.name} ${item.name}! → 🛡️ 천사카드 방어됨`);
      sendPush(gameId, targetId, '🛡️ 공격 방어!', `${t.name}의 ${item.name}을(를) 천사카드가 막았습니다`);
      return;
    }

    const myUpdate = { items: mine };
    let extraLog = '';
    switch (itemId) {
      // 주사위 강화 (자기 버프)
      case 'double': myUpdate.diceMod = 'double'; break;
      case 'triple': myUpdate.diceMod = 'triple'; break;
      case 'dice9': myUpdate.diceMod = 'dice9'; break;
      case 'oddEven': myUpdate.diceMod = 'oddEven'; break;
      // 미션 (자기 버프)
      case 'missionSkip': myUpdate.skipNextMission = true; break;
      case 'missionPick': myUpdate.pickMode = 'pool'; break;
      case 'missionRevive': myUpdate.pickMode = 'done'; break;
      // 페가수스
      case 'pegasus':
        myUpdate.pegasus = true; myUpdate.lastRoll = null; myUpdate.pendingMission = null;
        sendPush(gameId, 'all', '🐴 페가수스!', `${t.name}이 페가수스에 탑승! 강남 직행 중 — 떨어트리기로 저격 가능`);
        break;
      case 'pegasusDrop':
        await updateDoc(tRef, { pegasus: false });
        extraLog = ' 다음 정차역에서 하차!';
        sendPush(gameId, 'all', '🪂 격추!', `${target.name}의 페가수스가 격추됐습니다!`);
        break;
      // 공격
      case 'curse': await updateDoc(tRef, { cursed: true }); break;
      case 'reverse': await updateDoc(tRef, { reversed: true }); break;
      case 'doubleMission': await updateDoc(tRef, { extraMission: true }); break;
      case 'shieldTear': await updateDoc(tRef, { shield: false }); break;
      case 'pull3': await updateDoc(tRef, { position: Math.max(0, target.position - 3) }); break;
      case 'pull5': await updateDoc(tRef, { position: Math.max(0, target.position - 5) }); break;
      case 'magnet':
        await updateDoc(tRef, { position: t.position });
        extraLog = ` 🧲 ${target.name}을 ${STATIONS[t.position].name}으로!`;
        break;
      // 기타
      case 'slot': {
        const d = 1 + Math.floor(Math.random() * 6);
        const win = d % 2 === 0;
        myUpdate.coins = Math.floor((t.coins || 0) * (win ? 2 : 0.5));
        extraLog = ` 🎰 ${d} — ${win ? '짝! 코인 2배' : '홀... 코인 절반'} (${myUpdate.coins})`;
        break;
      }
      default: break; // getOff, bike, americano, mychew: 물리 집행 — 로그·푸시가 곧 효과
    }
    await updateDoc(teamRef(), myUpdate);
    await log(target ? 'attack' : 'item', session.teamId,
      `${t.name}${target ? ` → ${target.name}` : ''} ${item.name} 사용!${extraLog || ` ${item.desc}`}`);
    if (target && itemId !== 'pegasusDrop') {
      sendPush(gameId, targetId, '⚔️ 공격 받음!', `${t.name}: ${item.name} — ${item.desc}`);
    }
  };

  // ── 코인 퀴즈 (스태프 출제) ──
  const drawQuiz = () => {
    const t = teams[session.teamId];
    if (!t) return;
    const used = t.usedQuizzes || [];
    const pool = QUIZZES.map((_, i) => i).filter((i) => !used.includes(i));
    if (!pool.length) return; // 퀴즈 소진
    setQuizIdx(pool[Math.floor(Math.random() * pool.length)]);
  };

  const judgeQuiz = async (correct) => {
    const t = teams[session.teamId];
    const quiz = QUIZZES[quizIdx];
    if (!t || !quiz) return;
    setQuizIdx(null);
    await updateDoc(teamRef(), {
      usedQuizzes: [...(t.usedQuizzes || []), quizIdx],
      ...(correct && { coins: (t.coins || 0) + quiz.coins }),
    });
    await log('quiz', session.teamId,
      correct ? `${t.name} 퀴즈 정답! 코인 +${quiz.coins}` : `${t.name} 퀴즈 실패 (통과)`);
  };

  // 골인 순위: finishedAt 순
  const ranking = Object.entries(teams)
    .filter(([, t]) => t.finishedAt)
    .sort((a, b) => (a[1].finishedAt?.seconds || 0) - (b[1].finishedAt?.seconds || 0));

  // ── 본부(HQ) 전용 ──
  const broadcast = async () => {
    const msg = hqMsg.trim();
    if (!msg) return;
    setHqMsg('');
    await log('broadcast', 'HQ', `📢 ${msg}`);
    sendPush(gameId, 'all', '📢 본부 방송', msg);
  };

  const hqAdjust = async (teamId, field, delta) => {
    const t = teams[teamId];
    if (!t) return;
    const value = Math.max(0, Math.min(field === 'position' ? FINISH : 999, (t[field] || 0) + delta));
    await updateDoc(doc(teamsCol(gameId), teamId), { [field]: value });
    await log('hq', teamId,
      `본부 조정: ${t.name} ${field === 'coins' ? `코인 ${value}` : `→ ${STATIONS[value].name}`}`);
  };

  return (
    <View style={st.root}>
      <StatusBar style="light" />
      <View style={st.header}>
        <Text style={st.title}>2호선 부루마블</Text>
        <Text style={st.sub}>
          방 {gameId} · {session.role === 'hq' ? '본부' : `${session.teamId}팀 ${session.role === 'staff' ? '(스태프)' : ''}`}
        </Text>
      </View>

      {/* 보드: 역 칸 + 팀 말 */}
      <View style={{ width: boardSize, height: boardSize }}>
        {/* 중앙 로고 */}
        <View style={st.boardCenter} pointerEvents="none">
          <Text style={st.boardLogoIcon}>🚇</Text>
          <Text style={st.boardLogo}>2호선{'\n'}부루마블</Text>
          <Text style={st.boardLogoSub}>홍대입구 → 강남</Text>
        </View>
        {/* 지름길 점선 경로 (왕십리 ↔ 선릉, 수인분당선) */}
        {Array.from({ length: 9 }, (_, i) => {
          const t = (i + 1) / 10;
          const a = STATIONS[WANGSIMNI];
          const b = STATIONS[SEOLLEUNG];
          return (
            <View
              key={`sc${i}`}
              style={[st.shortcutDot, {
                left: (a.x + (b.x - a.x) * t) * boardSize - 4,
                top: (a.y + (b.y - a.y) * t) * boardSize - 4,
              }]}
            />
          );
        })}
        {/* 주사위 연출 오버레이 */}
        {diceFace !== null && (
          <View style={st.diceLayer} pointerEvents="none">
            <Animated.View style={[st.dice, { transform: [{ scale: diceScale }] }]}>
              <Text style={st.diceNum}>{diceFace}</Text>
            </Animated.View>
          </View>
        )}
        {STATIONS.map((s) => {
          const special = s.index === 0 || s.index === FINISH;
          const targetIdx = myTeam?.lastRoll
            ? Math.max(0, Math.min(FINISH, myTeam.position + myTeam.lastRoll)) : null;
          return (
            <View key={s.index} style={[
              st.station,
              { left: s.x * boardSize - 21, top: s.y * boardSize - 15 },
              s.index === 0 && st.stationStart,
              s.index === FINISH && st.stationFinish,
              s.index === targetIdx && st.stationTarget, // 이동 목적지 하이라이트
            ]}>
              <Text style={[st.stationText, special && st.stationTextSpecial]} numberOfLines={2}>
                {s.index === 0 ? 'START\n홍대입구'
                  : s.index === FINISH ? '🏁 강남\nFINISH'
                  : s.index === JAIL ? '🔒강변'
                  : s.index === WANGSIMNI ? '🚇왕십리'
                  : s.index === SEOLLEUNG ? '🚇선릉'
                  : s.name}
              </Text>
            </View>
          );
        })}
        {Object.entries(teams).map(([id, t], i) => {
          const s = STATIONS[t.position] || STATIONS[0];
          return (
            <View key={id} style={[st.pin, {
              left: s.x * boardSize - 9 + (i % 3) * 8,
              top: s.y * boardSize - 34 - Math.floor(i / 3) * 6,
              backgroundColor: TEAM_COLORS[id] || '#888',
            }]}>
              <Text style={st.pinText}>{id}</Text>
            </View>
          );
        })}
      </View>

      {/* 골인 순위 (전원) */}
      {ranking.length > 0 && (
        <View style={st.rankRow}>
          <Text style={st.rankText}>
            🏁 {ranking.map(([id], i) => `${i + 1}위 ${id}팀`).join(' · ')}
          </Text>
        </View>
      )}

      {/* 팀 상태 + 현재 미션 (참가자·스태프 공통) */}
      {myTeam && (
        <View style={st.statusRow}>
          <Text style={st.pos}>{STATIONS[myTeam.position].name}</Text>
          <Text style={st.coin}>🪙 {myTeam.coins || 0}</Text>
          {myTeam.pegasus && <Text style={st.coin}>🐴 강남 직행 중</Text>}
          {myTeam.inJail && <Text style={st.coin}>🔒 감옥</Text>}
          {myTeam.shield && <Text style={st.coin}>🛡️</Text>}
          {myTeam.cursed && <Text style={st.coin}>😈저주</Text>}
          {myTeam.reversed && <Text style={st.coin}>↩️거꾸로</Text>}
          {myTeam.extraMission && <Text style={st.coin}>📋x2</Text>}
          {myTeam.skipNextMission && <Text style={st.coin}>🎫면제</Text>}
          {!!myTeam.diceMod && <Text style={st.coin}>
            🎲{{ double: 'x2', triple: 'x3', dice9: '1~9', oddEven: '홀짝' }[myTeam.diceMod]}
          </Text>}
          {!!myTeam.lastRoll && (
            <Text style={st.coin}>
              🎲 {myTeam.lastRoll} → {STATIONS[Math.max(0, Math.min(FINISH, myTeam.position + myTeam.lastRoll))].name}
            </Text>
          )}
        </View>
      )}

      {/* 인벤토리 (스태프는 탭해서 사용) */}
      {myTeam && (myTeam.items || []).length > 0 && (
        <View style={st.invRow}>
          {(myTeam.items || []).map((id, i) => (
            <TouchableOpacity
              key={`${id}-${i}`} style={st.invChip} disabled={!canControl}
              onPress={() => {
                const item = itemById(id);
                if (id === 'pickDice') setPendingPick(true);
                else if (item.target) setPendingUse(id);
                else useItem(id, null);
              }}>
              <Text style={st.invChipText}>{itemById(id)?.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* 대상팀 선택 — 떨어트리기는 페가수스 팀만, 다른 공격은 페가수스 팀 제외 */}
      {pendingUse && (
        <View style={st.missionCard}>
          <Text style={st.missionLabel}>{itemById(pendingUse)?.name} — 대상팀 선택</Text>
          <View style={st.row}>
            {Object.entries(teams)
              .filter(([id, tt]) => id !== session.teamId
                && (pendingUse === 'pegasusDrop' ? tt.pegasus
                  : !(IS_ATTACK.has(pendingUse) && tt.pegasus)))
              .map(([id]) => (
                <TouchableOpacity key={id} style={[st.ctrlBtn, { backgroundColor: TEAM_COLORS[id] }]}
                  onPress={() => { useItem(pendingUse, id); setPendingUse(null); }}>
                  <Text style={st.btnText}>{id}팀</Text>
                </TouchableOpacity>
              ))}
            <TouchableOpacity style={st.ctrlBtn} onPress={() => setPendingUse(null)}>
              <Text style={st.btnText}>취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 지정 주사위 — 숫자 선택 */}
      {pendingPick && (
        <View style={st.missionCard}>
          <Text style={st.missionLabel}>🎯 지정 주사위 — 이동할 칸 수 선택</Text>
          <View style={st.row}>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <TouchableOpacity key={n} style={[st.ctrlBtn, st.ok]}
                onPress={() => { usePickDice(n); setPendingPick(false); }}>
                <Text style={st.btnText}>{n}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={st.ctrlBtn} onPress={() => setPendingPick(false)}>
              <Text style={st.btnText}>취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 지름길 선택 (왕십리 정확 도착) */}
      {canControl && myTeam?.atShortcut && (
        <View style={st.missionCard}>
          <Text style={st.missionLabel}>🚇 왕십리 — 수인분당선 지름길</Text>
          <Text style={st.missionText}>선릉까지 환승 직행 가능! (미션 없이 이동, 선릉 도착 후 미션)</Text>
          <View style={st.row}>
            <TouchableOpacity style={[st.ctrlBtn, st.ok]} onPress={() => takeShortcut(true)}>
              <Text style={st.btnText}>🚇 지름길 타기</Text>
            </TouchableOpacity>
            <TouchableOpacity style={st.ctrlBtn} onPress={() => takeShortcut(false)}>
              <Text style={st.btnText}>그냥 진행 (미션)</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 감옥 (강변) */}
      {myTeam?.inJail && (() => {
        const jp = jailProgress(myTeam);
        const canRelease = jp.cleared >= jp.total;
        return (
          <View style={st.missionCard}>
            <Text style={st.missionLabel}>🔒 강변 감옥</Text>
            <Text style={st.missionText}>
              석방 조건: 다른 모든 팀이 미션 1회씩 성공 — {jp.cleared}/{jp.total}팀 완료
            </Text>
            {canControl && (
              <View style={st.row}>
                <TouchableOpacity
                  style={[st.ctrlBtn, st.ok, !canRelease && st.disabled]}
                  onPress={() => canRelease && releaseJail()}>
                  <Text style={st.btnText}>🔓 석방</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })()}

      {/* 미션 고르기 / 죽은자의 소생 */}
      {canControl && myTeam?.pickMode && !myTeam?.pendingMission && !myTeam?.lastRoll && !myTeam?.atShortcut && (
        <View style={st.missionCard}>
          <Text style={st.missionLabel}>
            {myTeam.pickMode === 'done' ? '⚰️ 죽은자의 소생 — 했던 미션 중 선택' : '🤔 미션 고르기'}
          </Text>
          <ScrollView style={{ maxHeight: 220 }}>
            {(myTeam.pickMode === 'done'
              ? (myTeam.doneMissions || [])
              : RANDOM_MISSIONS.filter((m) => !(myTeam.doneMissions || []).includes(m)))
              .map((m) => (
                <TouchableOpacity key={m} style={st.pickRow} onPress={() => chooseMission(m)}>
                  <Text style={st.logLine}>{m}</Text>
                </TouchableOpacity>
              ))}
          </ScrollView>
        </View>
      )}
      {myTeam?.pendingMission && (
        <View style={st.missionCard}>
          <Text style={st.missionLabel}>현재 미션</Text>
          <Text style={st.missionText}>{myTeam.pendingMission}</Text>
          {canControl && (
            <View style={st.row}>
              <TouchableOpacity style={[st.ctrlBtn, st.ok]} onPress={() => judgeMission(true)}>
                <Text style={st.btnText}>성공 ✅</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.ctrlBtn} onPress={() => judgeMission(false)}>
                <Text style={st.btnText}>다시 뽑기 🔄</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* 스태프 조작 */}
      {canControl && session.teamId && myTeam && (
        <View style={st.controls}>
          <TouchableOpacity
            style={[st.ctrlBtn, st.ok,
              (myTeam.lastRoll || myTeam.pendingMission || myTeam.pegasus || myTeam.inJail
                || myTeam.atShortcut || myTeam.pickMode) && st.disabled]}
            onPress={roll}>
            <Text style={st.btnText}>🎲 주사위</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[st.ctrlBtn, !myTeam.lastRoll && st.disabled]} onPress={arrive}>
            <Text style={st.btnText}>도착 등록{myTeam.lastRoll ? ` (+${myTeam.lastRoll})` : ''}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={st.ctrlBtn} onPress={() => addCoins(1)}>
            <Text style={st.btnText}>🪙 +1</Text>
          </TouchableOpacity>
          <TouchableOpacity style={st.ctrlBtn} onPress={() => addCoins(-1)}>
            <Text style={st.btnText}>🪙 -1</Text>
          </TouchableOpacity>
          <TouchableOpacity style={st.ctrlBtn} onPress={() => move(-1)}>
            <Text style={st.btnText}>◀1</Text>
          </TouchableOpacity>
          <TouchableOpacity style={st.ctrlBtn} onPress={() => move(1)}>
            <Text style={st.btnText}>1▶</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[st.ctrlBtn, shopOpen && st.ok]} onPress={() => setShopOpen(!shopOpen)}>
            <Text style={st.btnText}>🛒 상점</Text>
          </TouchableOpacity>
          <TouchableOpacity style={st.ctrlBtn} onPress={drawQuiz}>
            <Text style={st.btnText}>❓ 퀴즈</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 코인 퀴즈 (스태프 출제 화면 — 정답 포함이므로 스태프만) */}
      {canControl && quizIdx !== null && (
        <View style={st.missionCard}>
          <Text style={st.missionLabel}>코인 퀴즈 — 보상 🪙{QUIZZES[quizIdx].coins}</Text>
          <Text style={st.missionText}>{QUIZZES[quizIdx].q}</Text>
          <Text style={st.quizAnswer}>정답: {QUIZZES[quizIdx].a}</Text>
          <View style={st.row}>
            <TouchableOpacity style={[st.ctrlBtn, st.ok]} onPress={() => judgeQuiz(true)}>
              <Text style={st.btnText}>정답 🪙+{QUIZZES[quizIdx].coins}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={st.ctrlBtn} onPress={() => judgeQuiz(false)}>
              <Text style={st.btnText}>실패 (통과)</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 상점 (카테고리별) */}
      {canControl && shopOpen && myTeam && (
        <View style={st.missionCard}>
          <Text style={st.missionLabel}>상점 — 보유 🪙 {myTeam.coins || 0}</Text>
          <ScrollView style={{ maxHeight: 340 }}>
            {CATS.map((cat) => (
              <View key={cat.key}>
                <Text style={st.shopCat}>{cat.label}</Text>
                {ITEMS.filter((i) => i.cat === cat.key).map((item) => (
                  <View key={item.id} style={st.shopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={st.missionText}>{item.name} — 🪙{item.price}</Text>
                      <Text style={st.shopDesc}>{item.desc}</Text>
                    </View>
                    <TouchableOpacity
                      style={[st.ctrlBtn, st.ok, (myTeam.coins || 0) < item.price && st.disabled]}
                      onPress={() => buyItem(item)}>
                      <Text style={st.btnText}>구매</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* 본부 패널 */}
      {session.role === 'hq' && (
        <View style={st.missionCard}>
          <Text style={st.missionLabel}>
            방 코드 <Text style={st.keyText}>{gameId}</Text>
            {'   '}스태프키 <Text style={st.keyText}>{hqKeys?.staffKey || '...'}</Text>
          </Text>
          <View style={st.row}>
            <TextInput
              style={st.hqInput} value={hqMsg} onChangeText={setHqMsg}
              placeholder="전체 방송 메시지..." placeholderTextColor="#567"
              onSubmitEditing={broadcast}
            />
            <TouchableOpacity style={[st.ctrlBtn, st.ok]} onPress={broadcast}>
              <Text style={st.btnText}>📢 발송</Text>
            </TouchableOpacity>
          </View>
          {Object.entries(teams).sort().map(([id, t]) => (
            <View key={id} style={st.shopRow}>
              <Text style={[st.missionText, { color: TEAM_COLORS[id], width: 36 }]}>{id}팀</Text>
              <Text style={[st.logLine, { flex: 1 }]}>
                {STATIONS[t.position]?.name} · 🪙{t.coins || 0}
                {t.shield ? ' 🛡️' : ''}{t.cursed ? ' 😈' : ''}{t.finishedAt ? ' 🏁' : ''}
              </Text>
              <TouchableOpacity style={st.miniBtn} onPress={() => hqAdjust(id, 'coins', -1)}>
                <Text style={st.btnText}>🪙-</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.miniBtn} onPress={() => hqAdjust(id, 'coins', 1)}>
                <Text style={st.btnText}>🪙+</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.miniBtn} onPress={() => hqAdjust(id, 'position', -1)}>
                <Text style={st.btnText}>◀</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.miniBtn} onPress={() => hqAdjust(id, 'position', 1)}>
                <Text style={st.btnText}>▶</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* 실시간 알림 */}
      <FlatList
        style={st.log} data={logs} keyExtractor={(l) => l.id}
        renderItem={({ item }) => (
          <Text style={[st.logLine, item.type === 'broadcast' && st.broadcastLine]}>
            <Text style={{ color: TEAM_COLORS[item.teamId] || '#aaa' }}>
              [{item.teamId === 'HQ' ? '본부' : `${item.teamId}팀`}] </Text>
            {item.message}
          </Text>
        )}
      />
    </View>
  );
}

// 팔레트: 다크그린 펠트 보드 + 아이보리 타일 (컨셉 이미지 기반)
const C = {
  bg: '#0b1a12',        // 배경 (짙은 그린)
  panel: '#12271b',     // 카드/패널
  panelBorder: '#1f4630',
  tile: '#ece8da',      // 역 타일 (아이보리)
  tileText: '#22301f',
  green: '#27ae60',     // 주요 버튼/START
  greenBright: '#2ecc71',
  orange: '#e67e22',    // FINISH/순위
  gold: '#f4c542',      // 코인
  text: '#eef5ee',
  subText: '#8fb89e',
  btn: '#1d3b2a',       // 보조 버튼
};

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, paddingTop: 50 },
  entry: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', padding: 32 },
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  title: { color: C.text, fontSize: 24, fontWeight: 'bold' },
  sub: { color: C.subText, fontSize: 14, marginTop: 2 },
  input: {
    backgroundColor: C.panel, color: C.text, borderRadius: 10, padding: 14,
    fontSize: 18, marginTop: 14, textAlign: 'center',
    borderWidth: 1, borderColor: C.panelBorder,
  },
  err: { color: '#e74c3c', marginTop: 8, textAlign: 'center' },
  btn: { backgroundColor: C.green, borderRadius: 10, padding: 14, marginTop: 12 },
  btnAlt: { backgroundColor: C.btn, borderWidth: 1, borderColor: C.panelBorder },
  label: { color: C.subText, fontSize: 14, marginTop: 20, textAlign: 'center' },
  stepper: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 20, marginTop: 10,
  },
  stepBtn: {
    backgroundColor: C.btn, borderRadius: 10, width: 48, height: 48,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: C.panelBorder,
  },
  stepValue: { color: C.text, fontSize: 24, fontWeight: 'bold', minWidth: 70, textAlign: 'center' },
  linkText: { color: C.subText, fontSize: 14, textAlign: 'center', marginTop: 16 },
  teamGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center',
    marginTop: 12,
  },
  teamBtn: {
    width: 90, paddingVertical: 16, borderRadius: 12, alignItems: 'center',
  },
  staffToggle: { marginTop: 4 },
  keyText: { color: C.gold, fontWeight: 'bold', fontSize: 14 },
  btnText: { color: '#fff', fontWeight: 'bold', textAlign: 'center', fontSize: 16 },
  boardCenter: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
  },
  boardLogoIcon: { fontSize: 30 },
  boardLogo: {
    color: C.text, fontSize: 26, fontWeight: '900', textAlign: 'center',
    lineHeight: 32, opacity: 0.9,
  },
  boardLogoSub: { color: C.subText, fontSize: 11, marginTop: 4 },
  diceLayer: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center', zIndex: 10,
  },
  dice: {
    width: 88, height: 88, borderRadius: 20, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    borderBottomWidth: 5, borderBottomColor: '#c9c4b4',
    elevation: 8, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  diceNum: { color: '#1d2b22', fontSize: 44, fontWeight: '900' },
  station: {
    position: 'absolute', width: 42, height: 32, borderRadius: 6,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 2,
    backgroundColor: C.tile,
    borderBottomWidth: 3, borderBottomColor: '#b9b4a3', // 타일 입체감
  },
  stationStart: { backgroundColor: C.green, borderBottomColor: '#1d8a4a' },
  stationFinish: { backgroundColor: C.orange, borderBottomColor: '#b35f12' },
  stationTarget: { borderWidth: 2, borderColor: C.gold }, // 이동 목적지
  shortcutDot: {
    position: 'absolute', width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#f2c94c', opacity: 0.55, // 수인분당선 노란 계열
  },
  stationText: { color: C.tileText, fontSize: 8, fontWeight: '700', textAlign: 'center' },
  stationTextSpecial: { color: '#fff', fontSize: 8, fontWeight: '900' },
  pin: {
    position: 'absolute', width: 18, height: 18, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff',
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  pinText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  controls: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8,
  },
  row: { flexDirection: 'row', gap: 8, marginTop: 8 },
  ctrlBtn: {
    backgroundColor: C.btn, borderRadius: 8, padding: 12,
    borderWidth: 1, borderColor: C.panelBorder,
  },
  ok: { backgroundColor: C.green, borderColor: C.green },
  disabled: { opacity: 0.35 },
  pos: { color: C.text, fontSize: 16, fontWeight: 'bold' },
  coin: { color: C.gold, fontSize: 15, fontWeight: 'bold' },
  statusRow: {
    flexDirection: 'row', gap: 16, alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 4,
  },
  missionCard: {
    backgroundColor: C.panel, borderRadius: 12, padding: 12,
    marginHorizontal: 16, marginTop: 8,
    borderWidth: 1, borderColor: C.panelBorder,
  },
  missionLabel: { color: C.subText, fontSize: 12, marginBottom: 4 },
  missionText: { color: C.text, fontSize: 15, fontWeight: 'bold' },
  invRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16, paddingTop: 6 },
  invChip: { backgroundColor: '#8e44ad', borderRadius: 14, paddingVertical: 5, paddingHorizontal: 10 },
  invChipText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  shopRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderTopWidth: 1, borderTopColor: C.panelBorder, paddingVertical: 8,
  },
  shopDesc: { color: C.subText, fontSize: 12, marginTop: 2 },
  shopCat: {
    color: C.greenBright, fontSize: 13, fontWeight: 'bold',
    marginTop: 10, marginBottom: 2,
  },
  pickRow: {
    borderTopWidth: 1, borderTopColor: C.panelBorder, paddingVertical: 6,
  },
  log: { flex: 1, marginTop: 8, paddingHorizontal: 16 },
  logLine: { color: '#cfe6d4', fontSize: 13, paddingVertical: 3 },
  broadcastLine: { color: C.gold, fontWeight: 'bold' },
  rankRow: {
    backgroundColor: C.orange, borderRadius: 8, marginHorizontal: 16,
    marginTop: 6, padding: 8,
  },
  rankText: { color: '#fff', fontWeight: 'bold', fontSize: 14, textAlign: 'center' },
  quizAnswer: { color: C.greenBright, fontSize: 13, marginTop: 4 },
  hqInput: {
    flex: 1, backgroundColor: C.bg, color: C.text, borderRadius: 8,
    padding: 10, fontSize: 14, borderWidth: 1, borderColor: C.panelBorder,
  },
  miniBtn: {
    backgroundColor: C.btn, borderRadius: 6, padding: 8,
    borderWidth: 1, borderColor: C.panelBorder,
  },
});
