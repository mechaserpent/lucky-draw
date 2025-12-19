// 遊戲狀態類型定義
export interface Participant {
  id: number;
  name: string;
  odfinerId?: string; // 連線模式下的玩家 ID
  isOnline?: boolean;
}

export interface GameDrawResult {
  order: number;
  drawerId: number;
  giftOwnerId: number;
}

export interface FixedPair {
  drawerId: number;
  giftOwnerId: number;
}

export interface GameState {
  seed: number;
  participants: Participant[];
  fixedPairs: FixedPair[];
  drawSequence: Record<number, number>;
  drawOrder: number[];
  currentIndex: number;
  results: GameDrawResult[];
  phase: "setup" | "drawing" | "complete";
  startMode: "random" | "manual";
  manualStarterId: number | null;
  maxPlayers: number;
}

// Mulberry32 PRNG
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 建立預設狀態
function createDefaultState(maxPlayers: number = 20): GameState {
  const participants: Participant[] = [];
  for (let i = 1; i <= maxPlayers; i++) {
    participants.push({
      id: i,
      name: `參與者 ${i}`,
    });
  }

  return {
    seed: Date.now(),
    participants,
    fixedPairs: [],
    drawSequence: {},
    drawOrder: [],
    currentIndex: 0,
    results: [],
    phase: "setup",
    startMode: "random",
    manualStarterId: null,
    maxPlayers,
  };
}

const STORAGE_KEY = "christmas_draw_2024";
const PASSWORD_KEY = "christmas_draw_admin_pwd";

export function useGameState() {
  const state = useState<GameState>("gameState", () => createDefaultState());
  const isLoaded = useState("gameStateLoaded", () => false);

  // 🚀 性能優化：使用 computed 緩存計算結果
  const participantIds = computed(() =>
    state.value.participants.map((p) => p.id),
  );
  const participantCount = computed(() => state.value.participants.length);
  const isGameStarted = computed(() => state.value.phase !== "setup");
  const isGameComplete = computed(() => state.value.phase === "complete");
  const hasFixedPairs = computed(() => state.value.fixedPairs.length > 0);
  const currentDrawer = computed(() => {
    if (state.value.currentIndex >= state.value.drawOrder.length) return null;
    const drawerId = state.value.drawOrder[state.value.currentIndex];
    return state.value.participants.find((p) => p.id === drawerId);
  });

  // 載入狀態
  function loadState() {
    if (import.meta.client) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          state.value = { ...createDefaultState(), ...parsed };
        } catch (e) {
          console.error("Failed to parse saved state:", e);
        }
      }
      isLoaded.value = true;
    }
  }

  // 儲存狀態
  function saveState() {
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.value));
    }
  }

  // 初始化遊戲（設定人數）
  function initGame(maxPlayers: number) {
    state.value = createDefaultState(maxPlayers);
    saveState();
  }

  // 重置為設定階段
  function resetToSetup() {
    state.value.phase = "setup";
    state.value.drawSequence = {};
    state.value.drawOrder = [];
    state.value.currentIndex = 0;
    state.value.results = [];
    saveState();
  }

  // 完全重置
  function resetAll() {
    state.value = createDefaultState(state.value.maxPlayers);
    saveState();
  }

  // 重設 Seed
  function resetSeed() {
    state.value.seed = Date.now();
    resetToSetup();
  }

  // 清除所有緩存
  function clearAllCache() {
    if (import.meta.client) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(PASSWORD_KEY);
    }
  }

  // 參與者管理
  function addParticipant(name: string) {
    const maxId = state.value.participants.reduce(
      (max, p) => Math.max(max, p.id),
      0,
    );
    state.value.participants.push({
      id: maxId + 1,
      name,
    });
    saveState();
  }

  function updateParticipant(id: number, name: string) {
    const p = state.value.participants.find((p) => p.id === id);
    if (p) {
      p.name = name;
      saveState();
    }
  }

  function removeParticipant(id: number) {
    state.value.participants = state.value.participants.filter(
      (p) => p.id !== id,
    );
    state.value.fixedPairs = state.value.fixedPairs.filter(
      (fp) => fp.drawerId !== id && fp.giftOwnerId !== id,
    );
    saveState();
  }

  // 進階配對管理
  function addFixedPair(drawerId: number, giftOwnerId: number): boolean {
    if (drawerId === giftOwnerId) return false;
    if (state.value.fixedPairs.some((fp) => fp.drawerId === drawerId))
      return false;
    if (state.value.fixedPairs.some((fp) => fp.giftOwnerId === giftOwnerId))
      return false;

    state.value.fixedPairs.push({ drawerId, giftOwnerId });
    saveState();
    return true;
  }

  function removeFixedPair(drawerId: number) {
    state.value.fixedPairs = state.value.fixedPairs.filter(
      (fp) => fp.drawerId !== drawerId,
    );
    saveState();
  }

  // 生成抽獎序列
  function generateDrawSequence(): boolean {
    const random = mulberry32(state.value.seed);
    const ids = state.value.participants.map((p) => p.id);

    let result: Record<number, number> = {};
    let attempts = 0;
    const maxAttempts = 10000;

    while (attempts < maxAttempts) {
      attempts++;
      result = {};

      let availableGifts = [...ids];
      let success = true;

      // 先處理進階配對
      for (const fp of state.value.fixedPairs) {
        result[fp.drawerId] = fp.giftOwnerId;
        availableGifts = availableGifts.filter((g) => g !== fp.giftOwnerId);
      }

      const remainingDrawers = ids.filter((id) => !result[id]);

      // Fisher-Yates 洗牌
      for (let i = availableGifts.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [availableGifts[i], availableGifts[j]] = [
          availableGifts[j],
          availableGifts[i],
        ];
      }

      for (let i = 0; i < remainingDrawers.length; i++) {
        const drawerId = remainingDrawers[i];
        const giftOwnerId = availableGifts[i];

        if (drawerId === giftOwnerId) {
          success = false;
          break;
        }
        result[drawerId] = giftOwnerId;
      }

      if (success && ids.every((id) => result[id] !== id)) {
        break;
      }
    }

    if (attempts >= maxAttempts) {
      return false;
    }

    state.value.drawSequence = result;
    return true;
  }

  // 開始抽獎
  function startDraw(starterId?: number): boolean {
    if (state.value.participants.length < 2) return false;

    // 決定起始者
    let actualStarterId: number;
    if (starterId) {
      actualStarterId = starterId;
    } else if (
      state.value.startMode === "manual" &&
      state.value.manualStarterId
    ) {
      actualStarterId = state.value.manualStarterId;
    } else {
      const random = mulberry32(state.value.seed);
      const idx = Math.floor(random() * state.value.participants.length);
      actualStarterId = state.value.participants[idx].id;
    }

    if (!generateDrawSequence()) {
      return false;
    }

    // 建立連鎖順序
    state.value.drawOrder = [];
    let currentId = actualStarterId;
    const visited = new Set<number>();

    while (
      !visited.has(currentId) &&
      state.value.drawOrder.length < state.value.participants.length
    ) {
      visited.add(currentId);
      state.value.drawOrder.push(currentId);
      currentId = state.value.drawSequence[currentId];
    }

    // 處理多個連通分量
    const remaining = state.value.participants
      .filter((p) => !visited.has(p.id))
      .map((p) => p.id);
    while (remaining.length > 0) {
      const nextStart = remaining.shift()!;
      let curr = nextStart;
      while (!visited.has(curr)) {
        visited.add(curr);
        state.value.drawOrder.push(curr);
        const idx = remaining.indexOf(state.value.drawSequence[curr]);
        if (idx > -1) remaining.splice(idx, 1);
        curr = state.value.drawSequence[curr];
      }
    }

    state.value.currentIndex = 0;
    state.value.results = [];
    state.value.phase = "drawing";
    state.value.manualStarterId = actualStarterId;

    saveState();
    return true;
  }

  // 執行抽獎（記錄結果）
  function performDraw(): GameDrawResult | null {
    if (state.value.currentIndex >= state.value.drawOrder.length) return null;

    const currentDrawerId = state.value.drawOrder[state.value.currentIndex];
    const giftOwnerId = state.value.drawSequence[currentDrawerId];

    const result: GameDrawResult = {
      order: state.value.currentIndex + 1,
      drawerId: currentDrawerId,
      giftOwnerId,
    };

    state.value.results.push(result);
    saveState();

    return result;
  }

  // 進入下一位
  function nextDraw(): boolean {
    if (state.value.currentIndex >= state.value.drawOrder.length - 1) {
      state.value.phase = "complete";
      saveState();
      return false;
    }

    state.value.currentIndex++;
    saveState();
    return true;
  }

  // 獲取當前抽獎者
  function getCurrentDrawer() {
    if (state.value.currentIndex >= state.value.drawOrder.length) return null;
    const id = state.value.drawOrder[state.value.currentIndex];
    return state.value.participants.find((p) => p.id === id);
  }

  // 獲取參與者 by ID
  function getParticipant(id: number) {
    return state.value.participants.find((p) => p.id === id);
  }

  // 密碼管理
  function getPassword(): string | null {
    if (import.meta.client) {
      return localStorage.getItem(PASSWORD_KEY);
    }
    return null;
  }

  function setPassword(pwd: string) {
    if (import.meta.client) {
      localStorage.setItem(PASSWORD_KEY, pwd);
    }
  }

  function verifyPassword(pwd: string): boolean {
    return pwd === getPassword();
  }

  return {
    state,
    isLoaded,
    // 🚀 Computed 緩存值
    participantIds,
    participantCount,
    isGameStarted,
    isGameComplete,
    hasFixedPairs,
    currentDrawer,
    // 方法
    loadState,
    saveState,
    initGame,
    resetToSetup,
    resetAll,
    resetSeed,
    clearAllCache,
    addParticipant,
    updateParticipant,
    removeParticipant,
    addFixedPair,
    removeFixedPair,
    startDraw,
    performDraw,
    nextDraw,
    getCurrentDrawer,
    getParticipant,
    getPassword,
    setPassword,
    verifyPassword,
  };
}
