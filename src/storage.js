// AsyncStorage 안전 래퍼 — 네이티브 모듈이 없는 구버전 빌드(1.0.0)에서는
// 조용히 no-op (세션 유지만 비활성화되고 앱은 정상 동작)
let AS = null;
try {
  // eslint-disable-next-line global-require
  AS = require('@react-native-async-storage/async-storage').default;
} catch (e) { AS = null; }

export const hasStorage = !!AS;
export const storage = {
  getItem: async (k) => { try { return AS ? await AS.getItem(k) : null; } catch (e) { return null; } },
  setItem: async (k, v) => { try { if (AS) await AS.setItem(k, v); } catch (e) { /* no-op */ } },
  removeItem: async (k) => { try { if (AS) await AS.removeItem(k); } catch (e) { /* no-op */ } },
};
export default AS;
