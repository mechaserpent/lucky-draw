# UAT Test Plan - Lucky Draw Application

## Version: 0.11.0

## Date: 2025-12-19

## Status: Ready for Testing

---

## Critical Bug Fixes Applied ✅

### 1. **useWebSocket.ts - reconnect_success Handler**

**Bug**: `updateSessionId(odId)` called with undefined `odId` variable
**Fix**: Changed to `updateSessionId(reconnectedPlayer.id)`
**Impact**: Critical - Prevents reconnection from working properly
**File**: `app/composables/useWebSocket.ts:312`

### 2. **useWebSocket.ts - connect() Re-entry Protection**

**Bug**: WebSocket could be created multiple times if called during CONNECTING state
**Fix**: Added checks for CONNECTING state and proper cleanup
**Impact**: Medium - Could cause duplicate connections
**File**: `app/composables/useWebSocket.ts:73-92`

### 3. **online.vue - Timer Cleanup on Unmount**

**Bug**: `animationTimeout` not cleared in `onUnmounted()`
**Fix**: Added cleanup for `animationTimeout`
**Impact**: Low - Memory leak on page navigation
**File**: `app/pages/online.vue:1446-1471`

### 4. **Server Cleanup - Shutdown Hooks**

**Bug**: Pending broadcasts and DB operations not flushed on shutdown
**Fix**: Added `flushPendingBroadcasts()` and `dbBatchUpdater.cleanup()`
**Impact**: Low - Edge case on server restart
**Files**:

- `server/utils/broadcast-optimizer.ts`
- `server/plugins/cleanup.ts`

---

## UAT Test Scenarios

### Test Suite 1: Reconnection Flow ⚡ **Priority: HIGH**

#### Test 1.1: Basic Reconnection

**Steps**:

1. Player A creates a room
2. Player B joins the room
3. Player B closes browser tab (simulates disconnect)
4. Player B reopens and joins same room
5. Verify Player B is recognized and reconnected

**Expected Result**:

- ✅ Player B reconnects with same name and role
- ✅ Player B sees correct room state
- ✅ No error in console about `updateSessionId(undefined)`
- ✅ localStorage has correct sessionId

**Test Data**:

- Room Code: Auto-generated
- Player Names: "Alice", "Bob"

---

#### Test 1.2: Token Expiration

**Steps**:

1. Player A creates room and saves reconnect token
2. Wait 2+ hours (or manually modify token expiry in DB)
3. Player A tries to reconnect

**Expected Result**:

- ✅ Reconnection fails with "Token expired" message
- ✅ Player is prompted to join as new player
- ✅ Old reconnect info is cleared from localStorage

---

#### Test 1.3: Invalid Token

**Steps**:

1. Player A creates room
2. Manually modify reconnectToken in localStorage to invalid value
3. Player A tries to reconnect

**Expected Result**:

- ✅ Reconnection fails
- ✅ Clear error message shown
- ✅ No console errors or crashes

---

### Test Suite 2: Host Transfer on Disconnect ⚡ **Priority: HIGH**

#### Test 2.1: Host Disconnects During Waiting

**Steps**:

1. Player A (host) creates room
2. Player B joins
3. Player C joins
4. Player A closes browser (disconnect, not leave)
5. Wait 30 seconds

**Expected Result**:

- ✅ Player B becomes new host (first in line)
- ✅ All players see host transfer message
- ✅ Player A's creator badge (🏠) remains
- ✅ Player B gets host badge (👑)
- ✅ Room not disbanded

**Test with Creator Distinction (v0.9.0)**:

- ✅ Player A is still `isCreator: true` (even when disconnected)
- ✅ Player B is `isHost: true` but `isCreator: false`

---

#### Test 2.2: Host Leaves (Not Disconnect)

**Steps**:

1. Player A (host) creates room
2. Player B joins
3. Player A clicks "Leave Room" button

**Expected Result**:

- ✅ Room is disbanded immediately
- ✅ Player B sees "Host left, room disbanded" message
- ✅ Player B is redirected to home page

---

#### Test 2.3: All Players Disconnect

**Steps**:

1. Create room with 3 players
2. All 3 players close browser (simulate network failure)
3. Wait 30 minutes

**Expected Result**:

- ✅ Room is NOT immediately deleted (reconnect window)
- ✅ After 30 min, cleanup job removes room from DB
- ✅ No memory leaks or hung processes

**How to Test**:

- Check DB using `npm run db:studio`
- Verify room has `lastActivityAt` timestamp
- Wait for cleanup interval or manually run cleanup function

---

### Test Suite 3: Edge Cases ⚡ **Priority: MEDIUM**

#### Test 3.1: Rapid Button Clicks - Draw Button

**Steps**:

1. Start game with 2 players
2. Current drawer rapidly clicks "Draw" button 10 times in 1 second

**Expected Result**:

- ✅ Only ONE draw is processed
- ✅ No duplicate results in DB
- ✅ UI button is disabled during draw animation
- ✅ No console errors

**Verify**: Check `drawResults` table - should only have 1 entry for this order

---

#### Test 3.2: Rapid Button Clicks - Next Drawer

**Steps**:

1. Host performs draw for current player
2. Host rapidly clicks "Next Drawer" 10 times

**Expected Result**:

- ✅ Only moves to next drawer once
- ✅ `currentIndex` increments by 1 only
- ✅ No skip of players

---

#### Test 3.3: Max Players (50 Online)

**Steps**:

1. Create room with maxPlayers=50
2. Use automation or multiple browser instances to join 50 players
3. Verify all 50 can join and ready up
4. Start game and perform 1-2 draws
5. Try to join 51st player

**Expected Result**:

- ✅ First 50 players join successfully
- ✅ Game can start with 50 players
- ✅ Draw sequence generates correctly
- ✅ 51st player: if `allowSpectators=true` → becomes spectator
- ✅ 51st player: if `allowSpectators=false` → "Room full" error

**Performance Check**:

- ✅ No significant lag on state updates
- ✅ WebSocket broadcasts complete within 500ms
- ✅ Memory usage < 300MB on server

---

#### Test 3.4: Page Navigation Cleanup

**Steps**:

1. Open online.vue page → check browser console for event registrations
2. Navigate to index.vue (home)
3. Navigate back to online.vue
4. Check event handlers count

**Expected Result**:

- ✅ Event handlers are properly deregistered on unmount
- ✅ No duplicate `on()` registrations
- ✅ Timers (animationTimeout, autoProgressTimeout) are cleared
- ✅ WebSocket connection is properly closed

**How to Verify**:

- Add debug logs to `on()` and `off()` functions
- Check `eventHandlers` Map size before/after navigation

---

#### Test 3.5: WebSocket Re-connection Protection

**Steps**:

1. Open online.vue
2. In browser console, call `connect()` multiple times rapidly
3. Monitor WebSocket connection count

**Expected Result**:

- ✅ Only ONE WebSocket connection is established
- ✅ Console shows "Already connecting, skipping connect()" messages
- ✅ No errors about "WebSocket is already in CONNECTING state"

---

### Test Suite 4: Game Flow Integrity ⚡ **Priority: HIGH**

#### Test 4.1: Complete Game with 5 Players

**Steps**:

1. Create room with 5 players (A, B, C, D, E)
2. All players ready
3. Host starts game
4. Play through entire game (5 draws)
5. Verify game complete screen

**Expected Result**:

- ✅ Each player draws exactly once
- ✅ Draw order is consistent with seed
- ✅ Results page shows all 5 draws
- ✅ No one drew their own gift
- ✅ All players see same final results

**Data Integrity Check**:

- Check `drawResults` table: should have exactly 5 entries
- Check `results` array length: should be 5
- Verify `isRevealed` flags are all true at end

---

#### Test 4.2: Restart Game After Completion

**Steps**:

1. Complete a game with 3 players
2. Host clicks "Restart Game"
3. Verify back to lobby

**Expected Result**:

- ✅ `gameState` changes to "waiting"
- ✅ All players' `isReady` reset to false (except host)
- ✅ `drawResults`, `drawSequences`, `drawOrders` tables cleared
- ✅ `results` array is empty
- ✅ New seed is generated
- ✅ Players can ready up and start new game

---

### Test Suite 5: Migration Cleanup 🗑️

#### Test 5.1: Check Old Migration File Usage

**File**: `server/api/room/[id].get.old.ts`

**Steps**:

1. Search codebase for any imports of `.old.ts`
2. Verify new `[id].get.ts` is used everywhere

**Expected Result**:

- ✅ No references to `.old.ts` found
- ✅ Safe to delete `server/api/room/[id].get.old.ts`

**Status**: ✅ **VERIFIED** - No imports found, safe to remove

---

## Performance Benchmarks

### Metrics to Monitor

| Metric                | Target  | Critical Threshold |
| --------------------- | ------- | ------------------ |
| WebSocket Latency     | < 100ms | > 500ms            |
| State Sync Interval   | 3s      | N/A                |
| Memory Usage (Server) | < 200MB | > 400MB            |
| Memory Usage (Client) | < 100MB | > 200MB            |
| Room Cleanup Interval | 10 min  | N/A                |
| Max Concurrent Rooms  | 50+     | N/A                |
| Max Players per Room  | 50      | N/A                |

### Performance Tests

#### P1: Stress Test - 50 Players

- Create 1 room with 50 players
- Measure: message broadcast time, memory usage

#### P2: Load Test - 20 Rooms

- Create 20 concurrent rooms with 5 players each
- Measure: database query time, CPU usage

#### P3: Memory Leak Test

- Run for 1 hour with continuous join/leave/reconnect cycles
- Monitor: memory growth trend

---

## Automated Testing Recommendations

### Unit Tests to Add

1. `useWebSocket.spec.ts`
   - Test `handleMessage` for all message types
   - Test reconnect_success with correct sessionId update
   - Test connect() re-entry protection

2. `roomService.spec.ts`
   - Test `handleReconnect` with valid/invalid tokens
   - Test `handleDisconnect` and host transfer logic

### E2E Tests to Add

1. `reconnection-flow.spec.ts` (Playwright/Cypress)
2. `host-transfer.spec.ts`
3. `max-players.spec.ts`
4. `game-completion.spec.ts`

**Test Framework**: Vitest + Playwright
**Coverage Target**: > 70% for critical paths

---

## Migration Status Review

### Files to Remove ✅

- `server/api/room/[id].get.old.ts` - **SAFE TO DELETE**
  - Reason: No references found, replaced by new implementation
  - Action: Delete file

### Files to Keep ⚠️

- All other files are in use

---

## Build Validation Checklist

### Pre-Build Checks

- [ ] All TypeScript files compile without errors
- [ ] No ESLint errors
- [ ] Database schema is up to date (`npm run db:push`)
- [ ] Environment variables are set in `.env`

### Build Process

```bash
# 1. Clean install
npm ci

# 2. Run database migration
npm run db:migrate

# 3. Build for production
npm run build

# 4. Check build output
ls -lh .output/
```

### Post-Build Validation

- [ ] Build completes without errors
- [ ] `.output/server/index.mjs` exists
- [ ] Database file is created in `.output/server/`
- [ ] Static assets are in `.output/public/`

### Local Production Test

```bash
# Preview production build
npm run preview

# Open http://localhost:3000
# Test basic functionality:
# - Create room ✓
# - Join room ✓
# - Start game ✓
# - Perform draw ✓
```

---

## Issue Tracking

### Fixed Issues ✅

1. ❌ → ✅ updateSessionId(odId) undefined variable bug
2. ❌ → ✅ WebSocket connect() re-entry issue
3. ❌ → ✅ Timer cleanup on component unmount
4. ❌ → ✅ Server shutdown cleanup hooks missing

### Known Issues (If Any)

- None identified yet

### Regression Risks ⚠️

- Event listener management: If `off(event)` is called too broadly, may affect other components
- WebSocket state: Ensure CONNECTING state check doesn't block legitimate reconnections

---

## Sign-Off

### Development Team

- [ ] All critical bugs fixed
- [ ] Code reviewed
- [ ] Unit tests added (manual validation done)

### QA Team

- [ ] Reconnection flow tested
- [ ] Host transfer tested
- [ ] Edge cases tested
- [ ] Performance benchmarks met

### Product Owner

- [ ] Acceptance criteria met
- [ ] Ready for production deployment

---

## Next Steps After UAT

1. **If All Tests Pass**:
   - Tag release as `v0.11.1` (or `v0.11.0-rc1`)
   - Remove old migration file: `[id].get.old.ts`
   - Deploy to staging environment
   - Final smoke test
   - Deploy to production

2. **If Issues Found**:
   - Document issues in GitHub Issues
   - Prioritize fixes (P0/P1/P2)
   - Create hotfix branch if needed
   - Re-run affected test suites

---

## Contact & Support

**Developer**: Maverick (maverick.hlc)
**Repository**: https://github.com/mechaserpent/lucky-draw
**Version**: 0.11.0
**Last Updated**: 2025-12-19
