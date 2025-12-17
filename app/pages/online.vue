<template>
  <div>
    <header>
      <h1>{{ dynamicConfig.settings.value.siteIconLeft }} {{ dynamicConfig.settings.value.siteTitle }} {{ dynamicConfig.settings.value.siteIconRight }}</h1>
      <p>
        <span class="mode-badge online">🌐 連線模式</span>
        用自己的裝置參與
      </p>      
    </header>

    <!-- 連線中 -->
    <div v-if="!isConnected" class="card" style="text-align: center;">
      <p>⏳ 正在連線...</p>
    </div>

    <!-- 等待階段 -->
    <template v-else-if="roomState?.gameState === 'waiting'">
      <div class="card">
        <h2>🏠 房間資訊</h2>
        
        <div class="room-info">
          <div class="room-code">
            <span class="label">房間代碼</span>
            <span class="code">{{ roomState.id }}</span>
          </div>
          
          <div class="room-stats">
            <span>👥 {{ roomState.players.length }} / {{ roomState.settings.maxPlayers }} 人</span>
            <span>🎲 Seed: {{ roomState.seed }}</span>
          </div>
        </div>

        <div class="share-hint">
          <p>📱 分享房間代碼給朋友加入！</p>
          <div class="share-buttons">
            <button class="btn btn-secondary" @click="copyRoomLink">📋 複製連結</button>
            <button 
              v-if="roomState.settings.allowSpectators" 
              class="btn btn-secondary" 
              @click="copySpectatorLink"
            >👁️ 觀眾連結</button>
          </div>
        </div>
      </div>

      <div class="card">
        <h2>👥 玩家列表</h2>
        
        <div class="players-list">
          <div 
            v-for="player in roomState.players" 
            :key="player.id"
            class="player-item"
            :class="{ 'is-me': player.id === playerId, 'is-host': player.isHost }"
          >
            <span class="player-number">{{ player.participantId }}</span>
            <span class="player-name">
              {{ player.name }}
              <span v-if="player.isHost" class="host-badge">👑</span>
              <span v-if="player.id === playerId" class="me-badge">(你)</span>
              <button 
                v-if="player.id === playerId && roomState.gameState === 'waiting'"
                class="btn-edit-name"
                @click="openRenameModal"
                title="更改名稱"
              >✏️</button>
            </span>
            <span class="ready-status" :class="{ ready: player.isReady }">
              {{ player.isReady ? '✅ 準備' : '⏳ 等待' }}
            </span>
          </div>
        </div>
      </div>

      <div class="card" v-if="!isHost()">
        <h2>🎮 準備狀態</h2>
        <div class="controls">
          <button 
            class="btn btn-lg"
            :class="getCurrentPlayer()?.isReady ? 'btn-danger' : 'btn-success'"
            @click="toggleReady"
          >
            {{ getCurrentPlayer()?.isReady ? '❌ 取消準備' : '✅ 我準備好了' }}
          </button>
        </div>
      </div>

      <div class="card" v-if="isHost()">
        <h2>👑 主機控制</h2>
        
        <!-- 人數顯示 -->
        <div class="room-player-count">
          👥 目前人數: {{ roomState.players.length }} / {{ roomState.settings.maxPlayers }}
        </div>
        
        <!-- 協助加入玩家 -->
        <div class="add-player-section">
          <h4>➕ 協助加入玩家</h4>
          <div class="add-player-form">
            <input 
              type="text" 
              class="input" 
              v-model="addPlayerName" 
              placeholder="輸入玩家名字..."
              autocomplete="off"
              @keypress.enter="handleAddPlayer"
            >
            <button class="btn btn-secondary" @click="handleAddPlayer" :disabled="!addPlayerName.trim()">
              新增
            </button>
          </div>
        </div>
        
        <!-- 抽獎設定 -->
        <div class="draw-settings-section">
          <h4>⚙️ 抽獎設定</h4>
          <div class="start-options">
            <label>
              <input type="radio" v-model="firstDrawerMode" value="random">
              隨機決定第一位抽獎者
            </label>
            <div class="manual-select-row">
              <label>
                <input type="radio" v-model="firstDrawerMode" value="manual">
                手動指定：
              </label>
              <select v-model="firstDrawerId" :disabled="firstDrawerMode !== 'manual'">
                <option :value="undefined">選擇參與者</option>
                <option v-for="player in roomState.players" :key="player.id" :value="player.participantId">
                  {{ player.participantId }}. {{ player.name }}
                </option>
              </select>
            </div>
          </div>
          
          <!-- 進階選項入口 -->
          <div class="advanced-toggle" @click="showAdvancedSettings = true">
            🔧 進階選項
          </div>
          
          <!-- 允許觀眾 -->
          <div class="spectator-toggle">
            <label>
              <input type="checkbox" v-model="allowSpectators">
              允許觀眾加入
            </label>
          </div>
        </div>
        
        <div class="host-buttons">
          <button 
            class="btn btn-primary btn-lg"
            @click="handleStartGame"
            :disabled="roomState.players.length < 2"
          >
            🎲 {{ allPlayersReady ? '開始遊戲' : '強制開始' }}
          </button>
          <button class="btn btn-warning" @click="openSettingsModal">
            ⚙️ 設定
          </button>
          <button class="btn btn-danger" @click="showLeaveConfirmModal = true">
            🚪 離開房間
          </button>
        </div>
        
        <p v-if="!allPlayersReady" style="opacity: 0.7; font-size: 0.85rem; margin-top: 10px;">
          ⚠️ 有玩家尚未準備，強制開始將忽略未準備狀態
        </p>
      </div>

      <div class="controls" v-if="!isHost()">
        <button class="btn btn-secondary" @click="handleLeaveRoom">
          🚪 離開房間
        </button>
      </div>
    </template>

    <!-- 遊戲進行中 -->
    <template v-else-if="roomState?.gameState === 'playing'">
      <div class="card">
        <h2>
          🎰 抽獎進行中
          <span class="status-badge in-progress">
            {{ roomState.results.length + 1 }} / {{ roomState.players.length }}
          </span>
        </h2>
        
        <div class="draw-area">
          <div class="current-drawer">
            現在由 <span class="name">{{ currentDrawerName }}</span> 抽獎
            <span v-if="isCurrentDrawer()" class="your-turn">（輪到你了！）</span>
          </div>
          
          <div class="draw-box" :class="{ drawing: isDrawing }">
            <span class="content">{{ drawBoxContent }}</span>
          </div>
          
          <div class="draw-result" :class="{ show: showResult }">
            抽到了 <span class="gift-owner">{{ resultGiftOwner }}</span> 的禮物！
          </div>
          
          <!-- 自己是當前抽獎者 -->
          <button 
            v-if="isCurrentDrawer() && !hasDrawnCurrent" 
            class="btn btn-primary btn-lg" 
            @click="handlePerformDraw"
            :disabled="isDrawing"
          >
            🎲 抽獎！
          </button>
          
          <!-- 主機可以幫忙抽 -->
          <button 
            v-else-if="isHost() && !hasDrawnCurrent" 
            class="btn btn-secondary btn-lg" 
            @click="handleHostDraw"
            :disabled="isDrawing"
          >
            🎲 代替抽獎
          </button>
          
          <!-- 主機控制下一位 -->
          <button 
            v-if="isHost() && hasDrawnCurrent && roomState.currentIndex < roomState.players.length - 1"
            class="btn btn-success btn-lg" 
            @click="handleNextDrawer"
          >
            ➡️ 下一位
          </button>
        </div>
      </div>

      <!-- 結果列表 -->
      <div class="card">
        <h2>📋 抽獎結果</h2>
        <div class="results-list">
          <div v-if="roomState.results.length === 0" style="opacity: 0.6; text-align: center;">
            尚無抽獎結果
          </div>
          <div 
            v-for="r in roomState.results" 
            :key="r.order"
            class="result-item"
          >
            <span class="order">{{ r.order }}</span>
            <span class="drawer">{{ getPlayerName(r.drawerId) }}</span>
            <span class="arrow">➡️</span>
            <span class="gift">{{ getPlayerName(r.giftOwnerId) }} 的禮物</span>
          </div>
        </div>
      </div>

      <!-- 遊戲進行中控制按鈕 -->
      <div class="controls" v-if="isHost()">
        <button class="btn btn-warning" @click="openSettingsModal">
          ⚙️ 查看設定
        </button>
        <button class="btn btn-danger" @click="handleRestartGame">
          🔄 重新開始
        </button>
      </div>
    </template>

    <!-- 遊戲完成 -->
    <template v-else-if="roomState?.gameState === 'complete'">
      <div class="card" style="text-align: center;">
        <h2>🎉 抽獎完成！</h2>
        <p style="font-size: 1.2rem; margin: 20px 0;">所有人都已完成抽獎</p>
      </div>
      
      <div class="card">
        <h2>📋 最終結果</h2>
        <div class="results-list">
          <div 
            v-for="r in roomState.results" 
            :key="r.order"
            class="result-item"
          >
            <span class="order">{{ r.order }}</span>
            <span class="drawer">{{ getPlayerName(r.drawerId) }}</span>
            <span class="arrow">➡️</span>
            <span class="gift">{{ getPlayerName(r.giftOwnerId) }} 的禮物</span>
          </div>
        </div>
      </div>

      <div class="controls">
        <button class="btn btn-success" @click="shareResults">
          📤 分享結果
        </button>
        <button v-if="isHost()" class="btn btn-primary" @click="handleRestartGame">
          🔄 重新開始（保持設定）
        </button>
        <button class="btn btn-secondary" @click="handleLeaveRoom">
          🏠 離開房間
        </button>
      </div>
    </template>

    <!-- 進度側邊面板 -->
    <div class="progress-panel" v-if="roomState?.gameState === 'playing' || roomState?.gameState === 'complete'">
      <h4>📊 抽獎進度</h4>
      <div class="progress-bar">
        <div 
          class="progress-fill" 
          :style="{ width: `${(roomState.results.length / roomState.players.length) * 100}%` }"
        ></div>
      </div>
      <div class="progress-text">
        {{ roomState.results.length }} / {{ roomState.players.length }}
      </div>
      <div class="player-status-list">
        <div 
          v-for="p in roomState.players" 
          :key="p.id"
          class="player-status-item"
          :class="{ 
            'is-current': roomState.drawOrder[roomState.currentIndex] === p.participantId,
            'has-drawn': roomState.results.some(r => r.drawerId === p.participantId)
          }"
        >
          <span class="status-icon">
            {{ roomState.results.some(r => r.drawerId === p.participantId) ? '✅' : 
               roomState.drawOrder[roomState.currentIndex] === p.participantId ? '🎯' : '⏳' }}
          </span>
          <span class="player-name">{{ p.name }}</span>
        </div>
      </div>
    </div>

    <!-- 離開確認彈窗 -->
    <div class="modal-overlay" v-if="showLeaveConfirmModal" @click.self="showLeaveConfirmModal = false">
      <div class="modal-content">
        <h3>⚠️ 確認離開</h3>
        <p style="margin: 15px 0;">
          {{ isHost() ? '你是主機，離開後房間將解散！' : '確定要離開房間嗎？' }}
        </p>
        <div class="modal-buttons">
          <button class="btn btn-secondary" @click="showLeaveConfirmModal = false">取消</button>
          <button class="btn btn-danger" @click="confirmLeaveRoom">確認離開</button>
        </div>
      </div>
    </div>

    <!-- 改名彈窗 -->
    <div class="modal-overlay" v-if="showRenameModal" @click.self="showRenameModal = false">
      <div class="modal-content">
        <h3>✏️ 更改名稱</h3>
        <div style="margin: 15px 0;">
          <input 
            type="text" 
            class="input" 
            v-model="newPlayerName" 
            placeholder="輸入新名稱..."
            maxlength="20"
            @keypress.enter="handleRename"
            autofocus
          >
        </div>
        <div class="modal-buttons">
          <button class="btn btn-secondary" @click="showRenameModal = false">取消</button>
          <button class="btn btn-primary" @click="handleRename" :disabled="!newPlayerName.trim()">確認</button>
        </div>
      </div>
    </div>

    <!-- 分享選項彈窗 -->
    <div class="modal-overlay" v-if="showShareModal" @click.self="showShareModal = false">
      <div class="modal-content" style="max-width: 500px;">
        <h3>📤 分享結果</h3>
        <div style="margin: 20px 0;">
          <div class="share-options">
            <button class="share-option-btn" @click="handleShareText">
              <span class="share-icon">📝</span>
              <span>文字版分享</span>
            </button>
            <button class="share-option-btn" @click="handleShareImage">
              <span class="share-icon">🖼️</span>
              <span>圖片版分享</span>
            </button>
            <button class="share-option-btn" @click="handleDownloadImage">
              <span class="share-icon">⬇️</span>
              <span>下載圖片</span>
            </button>
          </div>
          
          <div class="social-share-section" style="margin-top: 25px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
            <h4 style="margin-bottom: 15px; font-size: 0.95rem; opacity: 0.9;">快速分享至：</h4>
            <div class="social-share-buttons">
              <button class="social-share-btn" @click="shareToSocial('facebook')" title="Facebook">
                <svg viewBox="0 0 24 24"><path fill="currentColor" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </button>
              <button class="social-share-btn" @click="shareToSocial('twitter')" title="X (Twitter)">
                <svg viewBox="0 0 24 24"><path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </button>
              <button class="social-share-btn" @click="shareToSocial('threads')" title="Threads">
                <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.781 3.631 2.695 6.541 2.717 2.623-.02 4.653-.787 6.03-2.28 1.044-1.133 1.743-2.64 2.08-4.48-.453-.107-.997-.21-1.61-.31-2.464-.403-5.37-.872-7.052-2.622-1.315-1.366-1.97-3.254-1.948-5.614.024-2.48.753-4.463 2.168-5.895C13.284 1.247 15.245.623 17.5.6c1.732.019 3.202.43 4.37 1.223 1.16.788 2.017 1.931 2.547 3.396l-1.936.734c-.824-2.225-2.534-3.359-5.086-3.373-1.73.015-3.164.497-4.26 1.432-1.095.936-1.65 2.354-1.667 4.267-.014 1.874.48 3.315 1.47 4.286 1.14 1.12 3.355 1.467 5.452 1.813.665.11 1.312.22 1.917.357 1.242.282 2.325.678 3.225 1.178 1.16.645 2.023 1.484 2.563 2.494.54 1.01.805 2.224.79 3.61-.016 1.613-.453 3.066-1.301 4.323-1.04 1.542-2.532 2.757-4.436 3.613-1.905.856-4.128 1.292-6.612 1.292z"/></svg>
              </button>
              <button class="social-share-btn" @click="shareToSocial('line')" title="LINE">
                <svg viewBox="0 0 24 24"><path fill="currentColor" d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
              </button>
              <button class="social-share-btn" @click="shareToSocial('telegram')" title="Telegram">
                <svg viewBox="0 0 24 24"><path fill="currentColor" d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
              </button>
              <button class="social-share-btn" @click="shareToSocial('whatsapp')" title="WhatsApp">
                <svg viewBox="0 0 24 24"><path fill="currentColor" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
              </button>
              <button class="social-share-btn" @click="copyShareLink" title="複製連結">
                <svg viewBox="0 0 24 24"><path fill="currentColor" d="M10.59 13.41c.41.39.41 1.03 0 1.42-.39.39-1.03.39-1.42 0a5.003 5.003 0 0 1 0-7.07l3.54-3.54a5.003 5.003 0 0 1 7.07 0 5.003 5.003 0 0 1 0 7.07l-1.49 1.49c.01-.82-.12-1.64-.4-2.42l.47-.48a2.982 2.982 0 0 0 0-4.24 2.982 2.982 0 0 0-4.24 0l-3.53 3.53a2.982 2.982 0 0 0 0 4.24zm2.82-4.24c.39-.39 1.03-.39 1.42 0a5.003 5.003 0 0 1 0 7.07l-3.54 3.54a5.003 5.003 0 0 1-7.07 0 5.003 5.003 0 0 1 0-7.07l1.49-1.49c-.01.82.12 1.64.4 2.43l-.47.47a2.982 2.982 0 0 0 0 4.24 2.982 2.982 0 0 0 4.24 0l3.53-3.53a2.982 2.982 0 0 0 0-4.24.973.973 0 0 1 0-1.42z"/></svg>
              </button>
            </div>
          </div>
        </div>
        <div class="modal-buttons">
          <button class="btn btn-secondary" @click="showShareModal = false">關閉</button>
        </div>
      </div>
    </div>

    <!-- 設定彈窗 -->
    <div class="modal-overlay" v-if="showSettingsModal" @click.self="showSettingsModal = false">
      <div class="modal-content" style="max-width: 600px;">
        <h3>{{ isHost() && roomState?.gameState === 'waiting' ? '⚙️ 房間設定' : '📋 查看設定' }}</h3>
        <div style="margin: 15px 0; text-align: left; max-height: 400px; overflow-y: auto;">
          <p><strong>🎲 Seed:</strong> {{ roomState?.seed }}</p>
          <p><strong>🏠 房間代碼:</strong> {{ roomState?.id }}</p>
          
          <!-- 參與者名單 -->
          <p><strong>👥 參與者 ({{ roomState?.players.length }}人):</strong></p>
          <div style="display: flex; flex-wrap: wrap; gap: 5px; margin: 10px 0;">
            <span 
              v-for="(player, i) in roomState?.players" 
              :key="player.id"
              style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px;"
            >
              {{ player.participantId }}. {{ player.name }}
              <span v-if="player.isHost">👑</span>
            </span>
          </div>
          
          <p><strong>🎯 起始模式:</strong> {{ roomState?.settings.firstDrawerMode === 'random' ? '隨機' : roomState?.settings.firstDrawerMode === 'manual' ? '手動指定' : '主機優先' }}</p>
          <p><strong>📊 目前進度:</strong> {{ roomState?.results.length || 0 }} / {{ roomState?.players.length }}</p>
          <p><strong>👁️ 允許觀眾加入:</strong> {{ roomState?.settings.allowSpectators ? '是' : '否' }}</p>
          
          <!-- 觀眾連結按鈕 -->
          <div v-if="roomState?.settings.allowSpectators" style="margin-top: 10px;">
            <button class="btn btn-secondary btn-sm" @click="copySpectatorLink">
              👁️ 複製觀眾連結
            </button>
          </div>
          
          <!-- 主機在等待階段可編輯人數上限 -->
          <template v-if="isHost() && roomState?.gameState === 'waiting'">
            <div class="setting-row" style="margin-top: 15px;">
              <label><strong>👥 人數上限:</strong></label>
              <div class="max-players-input">
                <button class="btn btn-sm" @click="decreaseMaxPlayers" :disabled="newMaxPlayers <= (roomState?.players.length || 2)">-</button>
                <span class="max-players-value">{{ newMaxPlayers }}</span>
                <button class="btn btn-sm" @click="increaseMaxPlayers" :disabled="newMaxPlayers >= 100">+</button>
              </div>
            </div>
            <p v-if="newMaxPlayers < (roomState?.players.length || 0)" class="warning-text">
              ⚠️ 人數上限不能小於目前人數 ({{ roomState?.players.length }})
            </p>
          </template>
        </div>
        <div class="modal-buttons">
          <button class="btn btn-secondary" @click="showSettingsModal = false">{{ isHost() && roomState?.gameState === 'waiting' ? '取消' : '關閉' }}</button>
          <button v-if="isHost() && roomState?.gameState === 'waiting'" class="btn btn-primary" @click="saveRoomSettings" :disabled="newMaxPlayers < (roomState?.players.length || 2)">儲存設定</button>
        </div>
      </div>
    </div>

    <!-- 房間解散提示 -->
    <div class="modal-overlay" v-if="showRoomDisbandModal">
      <div class="modal-content">
        <h3>❌ 房間已解散</h3>
        <p style="margin: 15px 0;">主機已離開，房間已解散。</p>
        <div class="modal-buttons">
          <button class="btn btn-primary" @click="goHome">返回首頁</button>
        </div>
      </div>
    </div>

    <!-- 進階設定區 -->
    <div class="modal-overlay" v-if="showAdvancedSettings" @click.self="showAdvancedSettings = false">
      <div class="modal-content">
        <h3>🔧 進階設定</h3>
        <div style="text-align: left; margin: 15px 0;">
          <p style="margin-bottom: 10px;">🎯 指定配對：</p>
          <div class="fixed-pair-item">
            <select v-model="fixedDrawerId">
              <option :value="undefined">選擇 A</option>
              <option v-for="player in roomState?.players" :key="player.id" :value="player.participantId">
                #{{ player.participantId }}
              </option>
            </select>
            <span>→</span>
            <select v-model="fixedGiftId">
              <option :value="undefined">選擇 B</option>
              <option v-for="player in roomState?.players" :key="player.id" :value="player.participantId">
                #{{ player.participantId }}
              </option>
            </select>
            <button class="btn btn-secondary btn-sm" @click="handleAddFixedPair">➕</button>
          </div>
          <div class="fixed-pairs-list" style="margin-top: 10px;">
            <span 
              v-for="fp in fixedPairs" 
              :key="fp.drawerId"
              class="fixed-pair-tag"
            >
              #{{ fp.drawerId }} → #{{ fp.giftOwnerId }}
              <span class="remove" @click="removeFixedPair(fp.drawerId)">✕</span>
            </span>
            <p v-if="fixedPairs.length === 0" style="opacity: 0.6; font-size: 0.9rem;">無設定</p>
          </div>
        </div>
        <div class="modal-buttons">
          <button class="btn btn-secondary" @click="showAdvancedSettings = false">關閉</button>
        </div>
      </div>
    </div>

    <!-- 錯誤提示 -->
    <Transition name="toast">
      <div v-if="showErrorToast" class="toast-error">
        ❌ {{ errorMessage }}
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
const router = useRouter()
const dynamicConfig = useDynamicConfig()
const { addRecord: addHistoryRecord } = useHistory()
const { 
  isConnected, 
  playerId, 
  roomState, 
  error,
  connect,
  disconnect,
  on,
  off,
  send,
  leaveRoom,
  setReady,
  renamePlayer,
  startGame,
  performDraw,
  hostPerformDraw,
  nextDrawer,
  getCurrentPlayer,
  isCurrentDrawer,
  isHost
} = useWebSocket()

const { generateResultImage, downloadImage, shareImage, getSocialShareLinks, copyImageToClipboard } = useShareImage()

// 彈窗控制
const showLeaveConfirmModal = ref(false)
const showRenameModal = ref(false)
const newPlayerName = ref('')
const showSettingsModal = ref(false)
const showRoomDisbandModal = ref(false)
const showAdvancedSettings = ref(false)
const showShareModal = ref(false)

// 表單數據
const addPlayerName = ref('')
const newMaxPlayers = ref(20)

// 抽獎設定
const firstDrawerMode = ref<'random' | 'manual'>('random')
const firstDrawerId = ref<number | undefined>(undefined)
const allowSpectators = ref(true)

// 進階設定
const fixedDrawerId = ref<number | undefined>(undefined)
const fixedGiftId = ref<number | undefined>(undefined)
const fixedPairs = ref<{drawerId: number, giftOwnerId: number}[]>([])

// 錯誤提示
const showErrorToast = ref(false)
const errorMessage = ref('')

// 抽獎動畫狀態
const isDrawing = ref(false)
const autoProgressTimeout = ref<number | null>(null)
const showResult = ref(false)
const drawBoxContent = ref('🎁')
const resultGiftOwner = ref('')
const hasDrawnCurrent = ref(false)

// 計算屬性
const allPlayersReady = computed(() => {
  if (!roomState.value) return false
  return roomState.value.players.every(p => p.isReady || p.isHost)
})
const canStartGame = computed(() => {
  if (!roomState.value) return false
  return roomState.value.players.length >= 2 && 
         roomState.value.players.every(p => p.isReady || p.isHost)
})

const currentDrawerName = computed(() => {
  if (!roomState.value) return '-'
  const currentId = roomState.value.drawOrder[roomState.value.currentIndex]
  const player = roomState.value.players.find(p => p.participantId === currentId)
  return player?.name || '-'
})

// WebSocket 事件處理函數（定義在外部以便清理）
function onWsDrawPerformed(result: any) {
  playDrawAnimation(result)
}

function onWsNextDrawer() {
  hasDrawnCurrent.value = false
  showResult.value = false
  drawBoxContent.value = '🎁'
}

function onWsGameComplete() {
  celebrate()
}

function onWsRoomDisbanded() {
  showRoomDisbandModal.value = true
}

function onWsGameRestarted() {
  hasDrawnCurrent.value = false
  showResult.value = false
  drawBoxContent.value = '🎁'
  displayError('✅ 遊戲已重新開始！')
}

function onWsError(msg: string) {
  displayError(msg)
}

onMounted(() => {
  // 確保連線
  if (!isConnected.value) {
    connect()
  }
  
  // 如果沒有房間狀態，回到首頁
  setTimeout(() => {
    if (!roomState.value) {
      router.push('/')
    }
  }, 2000)
  
  // 先清除舊的事件監聽器，再註冊新的
  off('drawPerformed')
  off('nextDrawer')
  off('gameComplete')
  off('roomDisbanded')
  off('gameRestarted')
  off('playerDisconnected')
  off('error')
  
  // 監聽事件
  on('drawPerformed', onWsDrawPerformed)
  on('nextDrawer', onWsNextDrawer)
  on('gameComplete', onWsGameComplete)
  on('roomDisbanded', onWsRoomDisbanded)
  on('gameRestarted', onWsGameRestarted)
  on('playerDisconnected', (payload: any) => {
    if (payload.hostTransferred) {
      const newHost = roomState.value?.players.find(p => p.id === payload.newHostId)
      if (newHost) {
        displayError(`⚠️ 原主機已斷線，主機權限已移交給 ${newHost.name}`)
      }
    } else if (payload.isHost) {
      displayError('⚠️ 主機已斷線，但房間保留，您可以繼續遊戲')
    }
  })
  on('error', onWsError)
})

onUnmounted(() => {
  // 清除自動進入下一位的計時器
  if (autoProgressTimeout.value) {
    clearTimeout(autoProgressTimeout.value)
    autoProgressTimeout.value = null
  }
  
  // 清除事件監聯器
  off('drawPerformed')
  off('nextDrawer')
  off('gameComplete')
  off('roomDisbanded')
  off('gameRestarted')
  off('error')
})

// 顯示錯誤提示
function displayError(msg: string) {
  errorMessage.value = msg
  showErrorToast.value = true
  setTimeout(() => {
    showErrorToast.value = false
  }, 3000)
}

// 返回首頁
function goHome() {
  showRoomDisbandModal.value = false
  router.push('/')
}

// 獲取玩家名稱
function getPlayerName(participantId: number): string {
  const player = roomState.value?.players.find(p => p.participantId === participantId)
  return player?.name || '?'
}

// 複製房間連結
function copyRoomLink() {
  const url = `${window.location.origin}?room=${roomState.value?.id}`
  navigator.clipboard.writeText(url)
  displayError('✅ 已複製連結！')
}

// 複製觀眾連結
function copySpectatorLink() {
  const url = `${window.location.origin}?room=${roomState.value?.id}&spectator=true`
  navigator.clipboard.writeText(url)
  displayError('✅ 已複製觀眾連結！')
}

// 切換準備狀態
function toggleReady() {
  const current = getCurrentPlayer()
  if (current) {
    setReady(!current.isReady)
  }
}

// 協助加入玩家
function handleAddPlayer() {
  if (!addPlayerName.value.trim()) return
  
  send({
    type: 'host_add_player',
    payload: { playerName: addPlayerName.value.trim() }
  })
  addPlayerName.value = ''
}

// 開始遊戲（強制或正常）
function handleStartGame() {
  startGame()
}

// 執行抽獎
function handlePerformDraw() {
  performDraw()
}

// 主機代替抽獎
function handleHostDraw() {
  if (!roomState.value) return
  const currentId = roomState.value.drawOrder[roomState.value.currentIndex]
  hostPerformDraw(currentId)
}

// 下一位
function handleNextDrawer() {
  // 清除自動進入下一位的計時器，避免重複觸發
  if (autoProgressTimeout.value) {
    clearTimeout(autoProgressTimeout.value)
    autoProgressTimeout.value = null
  }
  nextDrawer()
}

// 打開設定彈窗
function openSettingsModal() {
  if (roomState.value) {
    newMaxPlayers.value = roomState.value.settings.maxPlayers
    firstDrawerMode.value = roomState.value.settings.firstDrawerMode === 'host' ? 'random' : roomState.value.settings.firstDrawerMode
    firstDrawerId.value = roomState.value.settings.firstDrawerId
    allowSpectators.value = roomState.value.settings.allowSpectators
  }
  showSettingsModal.value = true
}

// 離開房間（主機需確認）
function handleLeaveRoom() {
  if (isHost()) {
    showLeaveConfirmModal.value = true
  } else {
    leaveRoom()
    router.push('/')
  }
}

// 確認離開房間
function confirmLeaveRoom() {
  showLeaveConfirmModal.value = false
  leaveRoom()
  router.push('/')
}

// 打開改名彈窗
function openRenameModal() {
  const currentPlayer = getCurrentPlayer()
  newPlayerName.value = currentPlayer?.name || ''
  showRenameModal.value = true
}

// 確認改名
function handleRename() {
  if (newPlayerName.value.trim()) {
    renamePlayer(newPlayerName.value.trim())
    showRenameModal.value = false
  }
}

// 增加人數上限
function increaseMaxPlayers() {
  if (newMaxPlayers.value < 100) {
    newMaxPlayers.value++
  }
}

// 減少人數上限
function decreaseMaxPlayers() {
  const minPlayers = roomState.value?.players.length || 2
  if (newMaxPlayers.value > minPlayers) {
    newMaxPlayers.value--
  }
}

// 儲存房間設定
function saveRoomSettings() {
  if (!roomState.value) return
  
  // 遊戲開始後不可修改設定
  if (roomState.value.gameState !== 'waiting') {
    displayError('遊戲進行中無法修改設定')
    return
  }
  
  const minPlayers = roomState.value.players.length
  if (newMaxPlayers.value < minPlayers) {
    displayError('人數上限不能小於目前人數')
    return
  }
  
  send({
    type: 'update_settings',
    payload: { 
      maxPlayers: newMaxPlayers.value,
      firstDrawerMode: firstDrawerMode.value,
      firstDrawerId: firstDrawerMode.value === 'manual' ? firstDrawerId.value : undefined,
      allowSpectators: allowSpectators.value
    }
  })
  
  showSettingsModal.value = false
}

// 新增指定配對
function handleAddFixedPair() {
  if (fixedDrawerId.value === undefined || fixedGiftId.value === undefined) {
    displayError('請選擇 A 和 B')
    return
  }
  if (fixedDrawerId.value === fixedGiftId.value) {
    displayError('A 和 B 不能相同')
    return
  }
  // 檢查是否已存在
  if (fixedPairs.value.some(fp => fp.drawerId === fixedDrawerId.value)) {
    displayError('此抽獎者已有指定配對')
    return
  }
  
  fixedPairs.value.push({
    drawerId: fixedDrawerId.value,
    giftOwnerId: fixedGiftId.value
  })
  
  fixedDrawerId.value = undefined
  fixedGiftId.value = undefined
}

// 移除指定配對
function removeFixedPair(drawerId: number) {
  fixedPairs.value = fixedPairs.value.filter(fp => fp.drawerId !== drawerId)
}

// 防止重複觸發抽獎動畫
let animationInProgress = false

// 播放抽獎動畫
function playDrawAnimation(result: any) {
  // 防止重複觸發
  if (animationInProgress) {
    console.log('Animation already in progress, ignoring duplicate trigger')
    return
  }
  
  animationInProgress = true
  isDrawing.value = true
  showResult.value = false
  
  let shuffleCount = 0
  const maxShuffles = 20
  
  const shuffleInterval = setInterval(() => {
    if (!roomState.value) {
      clearInterval(shuffleInterval)
      animationInProgress = false
      return
    }
    const randomP = roomState.value.players[Math.floor(Math.random() * roomState.value.players.length)]
    drawBoxContent.value = randomP.name.charAt(0)
    shuffleCount++
    
    if (shuffleCount >= maxShuffles) {
      clearInterval(shuffleInterval)
      
      const giftOwner = getPlayerName(result.giftOwnerId)
      drawBoxContent.value = giftOwner.charAt(0)
      resultGiftOwner.value = giftOwner
      
      isDrawing.value = false
      showResult.value = true
      hasDrawnCurrent.value = true
      animationInProgress = false
      
      // Auto-progress to next drawer after a delay (only if host and game not complete)
      if (isHost() && roomState.value && 
          roomState.value.gameState === 'playing' &&
          roomState.value.results.length < roomState.value.players.length) {
        autoProgressTimeout.value = window.setTimeout(() => {
          autoProgressTimeout.value = null
          handleNextDrawer()
        }, 2000) // 2 second delay to show the result
      } else if (roomState.value && roomState.value.results.length >= roomState.value.players.length) {
        // 遊戲完成，觸發慶祝動畫
        setTimeout(() => {
          celebrate()
        }, 500)
      }
    }
  }, 80)
}

// 重新開始遊戲（保持設定，更新 seed）
function handleRestartGame() {
  send({
    type: 'restart_game',
    payload: {}
  })
}

// 分享結果 - 打開分享選單
async function shareResults() {
  showShareModal.value = true
}

// 分享文字版
async function handleShareText() {
  if (!roomState.value) return
  
  // 產生文字結果
  const lines = ['🎁 交換禮物抽籤結果 🎁', '']
  roomState.value.results.forEach(r => {
    const drawer = getPlayerName(r.drawerId)
    const giftOwner = getPlayerName(r.giftOwnerId)
    lines.push(`${r.order}. ${drawer} ➡️ ${giftOwner} 的禮物`)
  })
  lines.push('')
  lines.push(`🎲 Seed: ${roomState.value.seed}`)
  
  const text = lines.join('\n')
  
  // 直接複製到剪貼簿
  try {
    await navigator.clipboard.writeText(text)
    displayError('✅ 結果已複製到剪貼簿！')
    showShareModal.value = false
  } catch (e) {
    displayError('❌ 複製失敗，請手動複製')
  }
}

// 分享圖片版
async function handleShareImage() {
  if (!roomState.value) return
  
  const results = roomState.value.results.map(r => ({
    order: r.order,
    drawerName: getPlayerName(r.drawerId),
    giftOwnerName: getPlayerName(r.giftOwnerId)
  }))
  
  const currentPlayer = getCurrentPlayer()
  const blob = await generateResultImage(results, roomState.value.seed, 'online', currentPlayer?.name)
  
  if (blob) {
    const success = await shareImage(
      blob,
      '交換禮物抽籤結果',
      '🎁 看看我的交換禮物抽籤結果！'
    )
    
    if (success) {
      showShareModal.value = false
    } else {
      displayError('❌ 分享失敗，請嘗試下載圖片')
    }
  }
}

// 下載圖片
async function handleDownloadImage() {
  if (!roomState.value) return
  
  const results = roomState.value.results.map(r => ({
    order: r.order,
    drawerName: getPlayerName(r.drawerId),
    giftOwnerName: getPlayerName(r.giftOwnerId)
  }))
  
  const currentPlayer = getCurrentPlayer()
  const blob = await generateResultImage(results, roomState.value.seed, 'online', currentPlayer?.name)
  
  if (blob) {
    downloadImage(blob, `交換禮物結果_${roomState.value.seed}.png`)
    displayError('✅ 圖片已下載！')
    showShareModal.value = false
  }
}

// 分享到社交媒體
async function shareToSocial(platform: string) {
  if (!roomState.value) return
  
  const text = `🎁 交換禮物抽籤結果！Seed: ${roomState.value.seed}`
  const url = window.location.href
  const links = getSocialShareLinks(text, url)
  
  const socialUrl = links[platform]
  if (socialUrl) {
    window.open(socialUrl, '_blank', 'width=600,height=400')
    showShareModal.value = false
  }
}

// 複製分享連結
async function copyShareLink() {
  const url = window.location.href
  await navigator.clipboard.writeText(url)
  displayError('✅ 連結已複製！')
  showShareModal.value = false
}

// 慶祝動畫
function celebrate() {
  // 保存歷史紀錄
  if (roomState.value && roomState.value.results.length > 0) {
    addHistoryRecord({
      mode: 'online',
      seed: roomState.value.seed,
      participantCount: roomState.value.players.length,
      results: roomState.value.results.map(r => ({
        order: r.order,
        drawerName: getPlayerName(r.drawerId),
        giftOwnerName: getPlayerName(r.giftOwnerId)
      }))
    })
  }
  
  const colors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7']
  const container = document.createElement('div')
  container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:100;'
  document.body.appendChild(container)

  for (let i = 0; i < 100; i++) {
    const confetti = document.createElement('div')
    confetti.style.cssText = `
      position:absolute;
      width:${Math.random() * 10 + 5}px;
      height:${Math.random() * 10 + 5}px;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      left:${Math.random() * 100}%;
      top:-20px;
      animation:confetti-fall 3s ease-out forwards;
      animation-delay:${Math.random() * 2}s;
    `
    container.appendChild(confetti)
  }

  if (!document.getElementById('confetti-style')) {
    const style = document.createElement('style')
    style.id = 'confetti-style'
    style.textContent = `
      @keyframes confetti-fall {
        0% { opacity: 1; transform: translateY(0) rotate(0deg); }
        100% { opacity: 0; transform: translateY(100vh) rotate(720deg); }
      }
    `
    document.head.appendChild(style)
  }

  setTimeout(() => container.remove(), 5000)
}
</script>

<style scoped>
.room-info {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: center;
  margin-bottom: 20px;
}

.room-code {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.room-code .label {
  font-size: 0.85rem;
  opacity: 0.7;
}

.room-code .code {
  font-size: 2.5rem;
  font-weight: bold;
  font-family: monospace;
  color: #ffd700;
  letter-spacing: 5px;
}

.room-stats {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 0.9rem;
  opacity: 0.8;
}

.share-hint {
  background: rgba(255,255,255,0.1);
  padding: 15px;
  border-radius: 8px;
  text-align: center;
}

.share-hint p {
  margin-bottom: 10px;
}

.share-buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

.players-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.player-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 12px 16px;
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
  transition: all 0.2s;
}

.player-item.is-me {
  background: rgba(255,215,0,0.15);
  border: 1px solid rgba(255,215,0,0.3);
}

.player-item.is-host {
  border-left: 3px solid #ffd700;
}

.player-number {
  background: #c41e3a;
  color: #fff;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  flex-shrink: 0;
}

.player-name {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.host-badge {
  font-size: 1.2rem;
}

.me-badge {
  font-size: 0.85rem;
  opacity: 0.7;
}

.btn-edit-name {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 2px 5px;
  font-size: 0.9rem;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.btn-edit-name:hover {
  opacity: 1;
}

.ready-status {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  background: rgba(255,255,255,0.1);
}

.ready-status.ready {
  background: rgba(40,167,69,0.3);
  color: #7fff7f;
}

.your-turn {
  color: #ffd700;
  font-weight: bold;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* 抽獎區 */
.draw-area {
  text-align: center;
  padding: 40px 20px;
}

.draw-box {
  background: linear-gradient(135deg, #c41e3a, #8b1528);
  width: 200px;
  height: 200px;
  margin: 0 auto 30px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 4rem;
  box-shadow: 0 10px 40px rgba(0,0,0,0.3);
  position: relative;
  overflow: hidden;
}

.draw-box::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent);
  transform: rotate(45deg);
  animation: shine 3s infinite;
}

@keyframes shine {
  0% { transform: translateX(-100%) rotate(45deg); }
  100% { transform: translateX(100%) rotate(45deg); }
}

.draw-box .content {
  position: relative;
  z-index: 1;
}

.draw-box.drawing .content {
  animation: shuffle 0.08s ease-in-out infinite;
}

@keyframes shuffle {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-10px) scale(1.1); }
}

.current-drawer {
  font-size: 1.5rem;
  margin-bottom: 20px;
}

.current-drawer .name {
  color: #ffd700;
  font-weight: bold;
}

.draw-result {
  font-size: 1.8rem;
  margin: 20px 0;
  opacity: 0;
  transform: scale(0.5);
  transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.draw-result.show {
  opacity: 1;
  transform: scale(1);
}

.draw-result .gift-owner {
  color: #ffd700;
  font-weight: bold;
}

/* 結果列表 */
.results-list {
  max-height: 400px;
  overflow-y: auto;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 12px 16px;
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.result-item .order {
  background: #ffd700;
  color: #1a472a;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  flex-shrink: 0;
}

.result-item .arrow {
  font-size: 1.5rem;
}

.result-item .drawer,
.result-item .gift {
  padding: 4px 12px;
  border-radius: 6px;
}

.result-item .drawer {
  background: rgba(196, 30, 58, 0.3);
}

.result-item .gift {
  background: rgba(255, 215, 0, 0.2);
  color: #ffd700;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  margin-left: 10px;
}

.status-badge.in-progress {
  background: #ffc107;
  color: #000;
}

.toast-error {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: #dc3545;
  color: #fff;
  padding: 12px 24px;
  border-radius: 8px;
  z-index: 1000;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

/* 主機控制區 */
.room-player-count {
  background: rgba(255,255,255,0.1);
  padding: 10px 15px;
  border-radius: 8px;
  margin-bottom: 15px;
  font-size: 1.1rem;
}

.add-player-section {
  background: rgba(255,255,255,0.05);
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 15px;
}

.add-player-section h4 {
  margin-bottom: 10px;
  font-size: 0.95rem;
  opacity: 0.9;
}

.add-player-form {
  display: flex;
  gap: 10px;
}

.add-player-form .input {
  flex: 1;
}

/* 抽獎設定區 */
.draw-settings-section {
  background: rgba(255,255,255,0.05);
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 15px;
}

.draw-settings-section h4 {
  margin-bottom: 10px;
  font-size: 0.95rem;
  opacity: 0.9;
}

.start-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
}

.start-options label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.start-options select {
  padding: 6px 10px;
  border-radius: 6px;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
  color: #fff;
  margin-left: 20px;
}

.advanced-toggle {
  padding: 8px 12px;
  background: rgba(255,255,255,0.1);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  margin-bottom: 10px;
  transition: all 0.2s;
}

.advanced-toggle:hover {
  background: rgba(255,255,255,0.15);
}

/* 進階設定 - 指定配對 */
.fixed-pair-item {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.fixed-pair-item select {
  padding: 6px 10px;
  border-radius: 6px;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
  color: #fff;
}

.fixed-pairs-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.fixed-pair-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: rgba(255, 193, 7, 0.2);
  border: 1px solid rgba(255, 193, 7, 0.5);
  border-radius: 20px;
  font-size: 0.85rem;
}

.fixed-pair-tag .remove {
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.fixed-pair-tag .remove:hover {
  opacity: 1;
}

.spectator-toggle {
  padding: 8px 0;
}

.spectator-toggle label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.host-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.btn-warning {
  background: #ffc107;
  color: #000;
}

.btn-warning:hover {
  background: #e0a800;
}

/* 進度面板 */
.progress-panel {
  position: fixed;
  right: 20px;
  top: 100px;
  width: 200px;
  background: rgba(26, 71, 42, 0.95);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 12px;
  padding: 15px;
  z-index: 50;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
}

.progress-panel h4 {
  margin-bottom: 12px;
  font-size: 0.95rem;
}

.progress-bar {
  background: rgba(255,255,255,0.2);
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  background: linear-gradient(90deg, #ffd700, #ff6b6b);
  height: 100%;
  transition: width 0.3s ease;
}

.progress-text {
  text-align: center;
  font-size: 0.9rem;
  margin-bottom: 12px;
  opacity: 0.8;
}

.player-status-list {
  max-height: 300px;
  overflow-y: auto;
}

.player-status-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 0.85rem;
  margin-bottom: 4px;
  background: rgba(255,255,255,0.05);
  transition: all 0.2s;
}

.player-status-item.is-current {
  background: rgba(255,215,0,0.2);
  border: 1px solid rgba(255,215,0,0.4);
}

.player-status-item.has-drawn {
  opacity: 0.6;
}

.player-status-item .status-icon {
  font-size: 0.9rem;
}

.player-status-item .player-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 彈窗樣式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-content {
  background: linear-gradient(135deg, #1a472a, #2d5a3f);
  padding: 30px;
  border-radius: 16px;
  max-width: 400px;
  width: 90%;
  text-align: center;
  border: 1px solid rgba(255,255,255,0.2);
}

.modal-buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 20px;
}

/* 人數上限設定 */
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.max-players-input {
  display: flex;
  align-items: center;
  gap: 10px;
}

.max-players-input .btn-sm {
  width: 36px;
  height: 36px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  background: rgba(255,255,255,0.2);
  border: none;
  border-radius: 50%;
  color: #fff;
  cursor: pointer;
}

.max-players-input .btn-sm:hover:not(:disabled) {
  background: rgba(255,255,255,0.3);
}

.max-players-input .btn-sm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.max-players-value {
  font-size: 1.5rem;
  font-weight: bold;
  min-width: 50px;
  text-align: center;
}

.warning-text {
  color: #ffc107;
  font-size: 0.85rem;
  margin-top: 10px;
}

@media (max-width: 768px) {
  .progress-panel {
    position: static;
    width: 100%;
    margin-bottom: 20px;
  }
}

@media (max-width: 600px) {
  .room-code .code {
    font-size: 2rem;
  }
  
  .draw-box {
    width: 150px;
    height: 150px;
    font-size: 3rem;
  }
  
  .host-buttons {
    flex-direction: column;
  }
}

/* 模式標記 */
.mode-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: bold;
  margin-right: 8px;
}

.mode-badge.online {
  background: linear-gradient(135deg, #2196f3, #1976d2);
  color: #fff;
}

.mode-badge.solo {
  background: linear-gradient(135deg, #ff9800, #f57c00);
  color: #fff;
}

/* 抽獎進度視覺化 */
.progress-bar {
  width: 100%;
  height: 12px;
  background: rgba(255,255,255,0.1);
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 10px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4caf50, #8bc34a);
  border-radius: 6px;
  transition: width 0.5s ease;
}

.progress-text {
  text-align: center;
  font-size: 0.9rem;
  opacity: 0.8;
  margin-bottom: 20px;
}

.draw-order-visual {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.draw-order-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.85rem;
  background: rgba(255,255,255,0.05);
  transition: all 0.3s;
}

.draw-order-item.completed {
  background: rgba(76, 175, 80, 0.3);
  opacity: 0.8;
}

.draw-order-item.current {
  background: rgba(255, 193, 7, 0.3);
  border: 2px solid #ffc107;
  animation: pulse 1s infinite;
}

.draw-order-item.pending {
  opacity: 0.5;
}

.draw-order-item .order-num {
  background: rgba(255,255,255,0.2);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.75rem;
}

.draw-order-item .order-name {
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}

/* 分享模態框 */
.share-modal {
  max-width: 500px;
}

.share-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  margin: 20px 0;
}

.share-option-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 20px 10px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: white;
}

.share-option-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
  transform: translateY(-2px);
}

.share-option-btn .icon {
  font-size: 2rem;
}

.share-option-btn .text {
  font-size: 0.9rem;
  font-weight: 500;
}

.social-share-section {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 20px;
  margin-top: 10px;
}

.section-title {
  font-size: 0.9rem;
  opacity: 0.8;
  margin-bottom: 15px;
  text-align: center;
}

.social-buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.social-share-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.social-share-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.social-share-btn svg {
  width: 24px;
  height: 24px;
}

@media (max-width: 600px) {
  .share-options {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  
  .share-option-btn {
    padding: 15px;
  }
  
  .social-buttons {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
