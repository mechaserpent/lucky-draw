<template>
  <div>
    <header>
      <h1>{{ dynamicConfig.settings.value.siteIconLeft }} {{ dynamicConfig.settings.value.siteTitle }} {{ dynamicConfig.settings.value.siteIconRight }}</h1>
      <p>
        <span class="mode-badge solo">🖥️ 主持模式</span>
        主持人控制
      </p>
    </header>

    <!-- 設定階段 -->
    <template v-if="state.phase === 'setup'">
      <!-- 參與者管理 -->
      <div class="card">
        <h2>👥 參與者名單 <span class="count-badge">({{ state.participants.length }}人)</span></h2>
        
        <div class="participants-grid">
          <div 
            v-for="(p, idx) in state.participants" 
            :key="p.id"
            class="participant-item"
          >
            <span class="number">{{ idx + 1 }}</span>
            <input 
              type="text" 
              :value="p.name"
              @change="(e) => updateParticipant(p.id, (e.target as HTMLInputElement).value)"
              autocomplete="off"
            >
            <button class="btn-icon" @click="removeParticipant(p.id)" title="刪除">🗑️</button>
          </div>
        </div>
        
        <div class="add-participant">
          <input 
            type="text" 
            class="input"
            v-model="newParticipantName" 
            placeholder="輸入新參與者姓名..."
            @keypress.enter="handleAddParticipant"
            autocomplete="off"
          >
          <button class="btn btn-secondary" @click="handleAddParticipant">➕ 新增</button>
        </div>
      </div>

      <!-- 抽獎設定 -->
      <div class="card">
        <h2>⚙️ 抽獎設定</h2>
        
        <div class="start-options">
          <label>
            <input type="radio" v-model="state.startMode" value="random">
            隨機決定第一位抽獎者
          </label>
          <label>
            <input type="radio" v-model="state.startMode" value="manual">
            手動指定：
          </label>
          <select v-model="state.manualStarterId" :disabled="state.startMode !== 'manual'">
            <option :value="null">選擇參與者</option>
            <option v-for="(p, idx) in state.participants" :key="p.id" :value="p.id">
              {{ idx + 1 }}. {{ p.name }}
            </option>
          </select>
        </div>

        <!-- 進階選項入口 -->
        <div class="advanced-toggle" @click="showAdvancedModal = true">
          🔧 進階選項
        </div>

        <!-- 進階選項區（隱藏） -->
        <div class="advanced-section" v-if="showAdvanced">
          <div class="fixed-pair-item">
            <select v-model="fixedDrawerId">
              <option :value="null">選擇 A</option>
              <option v-for="(p, idx) in state.participants" :key="p.id" :value="p.id">
                #{{ idx + 1 }}
              </option>
            </select>
            <span>→</span>
            <select v-model="fixedGiftId">
              <option :value="null">選擇 B</option>
              <option v-for="(p, idx) in state.participants" :key="p.id" :value="p.id">
                #{{ idx + 1 }}
              </option>
            </select>
            <button class="btn btn-secondary" @click="handleAddFixedPair">➕</button>
          </div>
          
          <div class="fixed-pairs-list">
            <span 
              v-for="fp in state.fixedPairs" 
              :key="fp.drawerId"
              class="fixed-pair-tag"
            >
              #{{ getParticipantIndex(fp.drawerId) }} → #{{ getParticipantIndex(fp.giftOwnerId) }}
              <span class="remove" @click="removeFixedPair(fp.drawerId)">✕</span>
            </span>
            <p v-if="state.fixedPairs.length === 0" style="opacity: 0.6; font-size: 0.9rem;">無設定</p>
          </div>
        </div>

        <div class="seed-display">
          🎲 Seed: {{ state.seed }}
          <button class="btn btn-secondary btn-sm" @click="showResetSeedModal = true">重設 Seed</button>
        </div>

        <div class="controls">
          <button class="btn btn-primary" @click="handleStartDraw">
            🎲 開始抽獎
          </button>
          <button class="btn btn-danger" @click="showResetAllModal = true">
            🗑️ 重置全部
          </button>
          <button class="btn btn-secondary" @click="showClearCacheModal = true">
            🧹 清除緩存
          </button>
          <button class="btn btn-secondary" @click="router.push('/')">
            🏠 返回首頁
          </button>
        </div>
      </div>
    </template>

    <!-- 抽獎階段 -->
    <template v-if="state.phase === 'drawing'">
      <div class="card">
        <h2>
          🎰 抽獎進行中
          <span class="status-badge in-progress">
            {{ state.currentIndex + 1 }} / {{ state.participants.length }}
          </span>
        </h2>
        
        <div class="draw-area">
          <div class="current-drawer">
            現在由 <span class="name">{{ getCurrentDrawer()?.name || '-' }}</span> 抽獎
          </div>
          
          <div class="draw-box" :class="{ drawing: isDrawing }">
            <span class="content">{{ drawBoxContent }}</span>
          </div>
          
          <div class="draw-result" :class="{ show: showResult }">
            抽到了 <span class="gift-owner">{{ resultGiftOwner }}</span> 的禮物！
          </div>
          
          <button 
            v-if="!hasDrawnCurrent" 
            class="btn btn-primary btn-lg" 
            @click="handlePerformDraw"
            :disabled="isDrawing"
          >
            🎲 抽獎！
          </button>
          <button 
            v-else-if="state.currentIndex < state.participants.length - 1"
            class="btn btn-success btn-lg" 
            @click="handleNextDraw"
          >
            ➡️ 下一位
          </button>
        </div>
      </div>

      <!-- 結果列表 -->
      <div class="card">
        <h2>📋 抽獎結果</h2>
        <div class="results-list">
          <div v-if="state.results.length === 0" style="opacity: 0.6; text-align: center;">
            尚無抽獎結果
          </div>
          <div 
            v-for="r in state.results" 
            :key="r.order"
            class="result-item"
          >
            <span class="order">{{ r.order }}</span>
            <span class="drawer">{{ getParticipant(r.drawerId)?.name }}</span>
            <span class="arrow">➡️</span>
            <span class="gift">{{ getParticipant(r.giftOwnerId)?.name }} 的禮物</span>
          </div>
        </div>
      </div>

      <div class="controls">
        <button class="btn btn-secondary" @click="showViewSettingsModal = true">
          👁️ 查看設定
        </button>
        <button class="btn btn-danger" @click="showResetAllModal = true">
          🔄 重新開始
        </button>
      </div>
    </template>

    <!-- 進度側邊面板 -->
    <div class="progress-panel" v-if="state.phase === 'drawing' || state.phase === 'complete'">
      <h4>📊 抽獎進度</h4>
      <div class="progress-bar">
        <div 
          class="progress-fill" 
          :style="{ width: `${(state.results.length / state.participants.length) * 100}%` }"
        ></div>
      </div>
      <div class="progress-text">
        {{ state.results.length }} / {{ state.participants.length }}
      </div>
      <div class="player-status-list">
        <div 
          v-for="(p, idx) in state.participants" 
          :key="p.id"
          class="player-status-item"
          :class="{ 
            'is-current': state.drawOrder[state.currentIndex] === p.id,
            'has-drawn': state.results.some(r => r.drawerId === p.id)
          }"
        >
          <span class="status-icon">
            {{ state.results.some(r => r.drawerId === p.id) ? '✅' : 
               state.drawOrder[state.currentIndex] === p.id ? '🎯' : '⏳' }}
          </span>
          <span class="player-name">{{ idx + 1 }}. {{ p.name }}</span>
        </div>
      </div>
    </div>

    <!-- 完成階段 - 全新慶祝畫面 -->
    <template v-if="state.phase === 'complete'">
      <div class="celebration-container">
        <!-- 慶祝橫幅 -->
        <div class="celebration-banner">
          <div class="confetti-animation">🎉</div>
          <h1 class="celebration-title">🎊 抽獎結果揭曉！</h1>
          <div class="confetti-animation">🎉</div>
        </div>

        <!-- 結果卡片網格 -->
        <div class="result-cards-grid">
          <div 
            v-for="r in state.results" 
            :key="r.order"
            class="result-card"
            :style="{ animationDelay: `${r.order * 0.1}s` }"
          >
            <div class="card-badge">#{r.order}</div>
            <div class="card-body">
              <div class="player-section drawer-section">
                <div class="player-avatar">👤</div>
                <div class="player-name">{{ getParticipant(r.drawerId)?.name }}</div>
                <div class="player-label">抽獎者</div>
              </div>
              <div class="arrow-icon">➡️</div>
              <div class="player-section gift-section">
                <div class="gift-icon">🎁</div>
                <div class="player-name">{{ getParticipant(r.giftOwnerId)?.name }}</div>
                <div class="player-label">禮物擁有者</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 底部操作按鈕 -->
        <div class="celebration-actions">
          <button class="celebration-btn primary-btn" @click="shareResults">
            <span class="btn-icon">📤</span>
            <span class="btn-text">分享結果</span>
          </button>
          <button class="celebration-btn restart-btn" @click="showResetAllModal = true">
            <span class="btn-icon">🔄</span>
            <span class="btn-text">重新開始新一輪</span>
          </button>
          <button class="celebration-btn leave-btn" @click="router.push('/')">
            <span class="btn-icon">🏠</span>
            <span class="btn-text">返回首頁</span>
          </button>
        </div>
      </div>
    </template>

    <!-- 彈窗們 -->
    
    <!-- 進階選項密碼驗證 -->
    <div class="modal-overlay" v-if="showAdvancedModal" @click.self="showAdvancedModal = false">
      <div class="modal-content">
        <h3>🔐 進階選項驗證</h3>
        <input 
          type="password" 
          class="input" 
          v-model="advancedPassword"
          placeholder="輸入密碼..."
          @keypress.enter="confirmAdvanced"
          autocomplete="new-password"
          data-lpignore="true"
          data-form-type="other"
          autofocus
        >
        <div class="modal-buttons">
          <button class="btn btn-secondary" @click="showAdvancedModal = false">取消</button>
          <button class="btn btn-primary" @click="confirmAdvanced">確認</button>
        </div>
      </div>
    </div>

    <!-- 重設 Seed -->
    <div class="modal-overlay" v-if="showResetSeedModal" @click.self="showResetSeedModal = false">
      <div class="modal-content">
        <h3>🔐 重設 Seed</h3>
        <input 
          type="password" 
          class="input" 
          v-model="resetPassword"
          placeholder="輸入密碼..."
          @keypress.enter="confirmResetSeed"
          autocomplete="new-password"
          data-lpignore="true"
          data-form-type="other"
        >
        <div class="modal-buttons">
          <button class="btn btn-secondary" @click="showResetSeedModal = false">取消</button>
          <button class="btn btn-danger" @click="confirmResetSeed">確認重設</button>
        </div>
      </div>
    </div>

    <!-- 重置全部 -->
    <div class="modal-overlay" v-if="showResetAllModal" @click.self="showResetAllModal = false">
      <div class="modal-content">
        <h3>🔐 重置全部</h3>
        <p style="font-size: 0.9rem; margin-bottom: 15px; opacity: 0.8;">
          這將清除所有資料並回到設定頁面
        </p>
        <input 
          type="password" 
          class="input" 
          v-model="resetPassword"
          placeholder="輸入密碼..."
          @keypress.enter="confirmResetAll"
          autocomplete="new-password"
          data-lpignore="true"
          data-form-type="other"
        >
        <div class="modal-buttons">
          <button class="btn btn-secondary" @click="showResetAllModal = false">取消</button>
          <button class="btn btn-danger" @click="confirmResetAll">確認重置</button>
        </div>
      </div>
    </div>

    <!-- 清除緩存 -->
    <div class="modal-overlay" v-if="showClearCacheModal" @click.self="showClearCacheModal = false">
      <div class="modal-content">
        <h3>🧹 清除緩存</h3>
        <p style="font-size: 0.9rem; margin-bottom: 15px; opacity: 0.8;">
          這將清除所有本地儲存資料，包括密碼設定。
        </p>
        <input 
          type="password" 
          class="input" 
          v-model="resetPassword"
          placeholder="輸入密碼..."
          @keypress.enter="confirmClearCache"
          autocomplete="new-password"
          data-lpignore="true"
          data-form-type="other"
        >
        <div class="modal-buttons">
          <button class="btn btn-secondary" @click="showClearCacheModal = false">取消</button>
          <button class="btn btn-danger" @click="confirmClearCache">確認清除</button>
        </div>
      </div>
    </div>

    <!-- 查看設定 -->
    <div class="modal-overlay" v-if="showViewSettingsModal" @click.self="showViewSettingsModal = false">
      <div class="modal-content" style="max-width: 600px;">
        <h3>📋 目前設定</h3>
        <div style="text-align: left; max-height: 400px; overflow-y: auto; margin: 20px 0;">
          <p><strong>🎲 Seed:</strong> {{ state.seed }}</p>
          <p><strong>👥 參與者 ({{ state.participants.length }}人):</strong></p>
          <div style="display: flex; flex-wrap: wrap; gap: 5px; margin: 10px 0;">
            <span 
              v-for="(p, i) in state.participants" 
              :key="p.id"
              style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px;"
            >
              {{ i + 1 }}. {{ p.name }}
            </span>
          </div>
          <p><strong>🎯 起始模式:</strong> {{ state.startMode === 'random' ? '隨機' : '手動指定' }}</p>
          <p><strong>📊 目前進度:</strong> {{ state.results.length }} / {{ state.participants.length }}</p>
        </div>
        <div class="modal-buttons">
          <button class="btn btn-primary" @click="showViewSettingsModal = false">返回抽獎</button>
        </div>
      </div>
    </div>

    <!-- 分享選單 -->
    <div class="modal-overlay" v-if="showShareModal" @click.self="showShareModal = false">
      <div class="modal-content share-modal">
        <h3>📤 分享結果</h3>
        
        <div class="share-options">
          <button class="share-option-btn" @click="handleShareText">
            <span class="icon">📝</span>
            <span class="text">文字版</span>
          </button>
          <button class="share-option-btn" @click="handleShareImage">
            <span class="icon">🖼️</span>
            <span class="text">圖片版</span>
          </button>
          <button class="share-option-btn" @click="handleDownloadImage">
            <span class="icon">💾</span>
            <span class="text">下載圖片</span>
          </button>
        </div>

        <div class="social-share-section">
          <p class="section-title">快速分享至：</p>
          <div class="social-buttons">
            <button class="social-share-btn" @click="shareToSocial('facebook')" title="Facebook">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </button>
            <button class="social-share-btn" @click="shareToSocial('twitter')" title="X (Twitter)">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </button>
            <button class="social-share-btn" @click="shareToSocial('threads')" title="Threads">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.019-5.093.896-6.48 2.608-1.37 1.693-2.061 4.163-2.053 7.34-.008 3.177.684 5.648 2.054 7.342 1.387 1.711 3.57 2.588 6.479 2.607 2.24-.02 4.077-.543 5.458-1.553 1.304-1.014 1.955-2.395 1.936-4.1-.015-1.255-.427-2.23-1.226-2.898-.797-.667-1.885-1.006-3.235-.998h-.011c-1.255 0-2.283.325-3.056.966-.776.643-1.169 1.515-1.169 2.591 0 .869.24 1.56.714 2.053.474.494 1.13.74 1.95.74.819 0 1.476-.246 1.95-.74.475-.494.714-1.184.714-2.053 0-.439-.12-.827-.36-1.153a2.074 2.074 0 0 0-.975-.655c.215-.465.569-.846 1.028-1.106.481-.273 1.046-.411 1.683-.411 1.313 0 2.381.428 3.173 1.273.793.845 1.189 2.007 1.189 3.458 0 2.095-.84 3.749-2.497 4.915-1.659 1.167-3.863 1.755-6.546 1.755z"/>
              </svg>
            </button>
            <button class="social-share-btn" @click="shareToSocial('line')" title="LINE">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
              </svg>
            </button>
            <button class="social-share-btn" @click="shareToSocial('telegram')" title="Telegram">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
            </button>
            <button class="social-share-btn" @click="shareToSocial('whatsapp')" title="WhatsApp">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
            </button>
            <button class="social-share-btn" @click="copyShareLink" title="複製連結">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M10.59 13.41c.41.39.41 1.03 0 1.42-.39.39-1.03.39-1.42 0a5.003 5.003 0 0 1 0-7.07l3.54-3.54a5.003 5.003 0 0 1 7.07 0 5.003 5.003 0 0 1 0 7.07l-1.49 1.49c.01-.82-.12-1.64-.4-2.42l.47-.48a2.982 2.982 0 0 0 0-4.24 2.982 2.982 0 0 0-4.24 0l-3.53 3.53a2.982 2.982 0 0 0 0 4.24zm2.82-4.24c.39-.39 1.03-.39 1.42 0a5.003 5.003 0 0 1 0 7.07l-3.54 3.54a5.003 5.003 0 0 1-7.07 0 5.003 5.003 0 0 1 0-7.07l1.49-1.49c-.01.82.12 1.64.4 2.43l-.47.47a2.982 2.982 0 0 0 0 4.24 2.982 2.982 0 0 0 4.24 0l3.53-3.53a2.982 2.982 0 0 0 0-4.24.973.973 0 0 1 0-1.42z"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="modal-buttons" style="margin-top: 20px;">
          <button class="btn btn-secondary" @click="showShareModal = false">取消</button>
        </div>
      </div>
    </div>

    <!-- 首次使用設定密碼 -->
    <div class="modal-overlay" v-if="showPasswordSetup">
      <div class="modal-content">
        <h3>🔐 設定管理員密碼</h3>
        <p style="font-size: 0.9rem; margin-bottom: 15px; opacity: 0.8;">
          此密碼用於保護重置功能，防止誤操作
        </p>
        
        <input 
          type="password" 
          class="input" 
          v-model="newPassword" 
          placeholder="設定新密碼..."
          style="margin-bottom: 10px;"
          autocomplete="new-password"
          data-lpignore="true"
          data-form-type="other"
        >
        <input 
          type="password" 
          class="input" 
          v-model="confirmPassword" 
          placeholder="確認密碼..."
          @keypress.enter="setupPassword"
          autocomplete="new-password"
          data-lpignore="true"
          data-form-type="other"
        >
        
        <div class="modal-buttons">
          <button class="btn btn-primary" @click="setupPassword">設定密碼</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const router = useRouter()
const dynamicConfig = useDynamicConfig()
const { addRecord: addHistoryRecord } = useHistory()
const { 
  state, 
  loadState, 
  saveState,
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
  resetSeed,
  resetAll,
  clearAllCache,
  verifyPassword,
  getPassword,
  setPassword
} = useGameState()

const { generateResultImage, downloadImage, shareImage, getSocialShareLinks, copyImageToClipboard } = useShareImage()

// 彈窗控制
const showAdvancedModal = ref(false)
const showResetSeedModal = ref(false)
const showResetAllModal = ref(false)
const showClearCacheModal = ref(false)
const showViewSettingsModal = ref(false)
const showAdvanced = ref(false)
const showPasswordSetup = ref(false)
const showShareModal = ref(false)

// 表單數據
const newParticipantName = ref('')
const fixedDrawerId = ref<number | null>(null)
const fixedGiftId = ref<number | null>(null)
const advancedPassword = ref('')
const resetPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

// 抽獎動畫
const isDrawing = ref(false)
const showResult = ref(false)
const drawBoxContent = ref('🎁')
const resultGiftOwner = ref('')
const hasDrawnCurrent = ref(false)

onMounted(() => {
  loadState()
  
  // 檢查是否需要設定密碼
  if (!getPassword()) {
    showPasswordSetup.value = true
  }
  
  // 恢復抽獎狀態
  if (state.value.phase === 'drawing' && state.value.results.length > state.value.currentIndex) {
    hasDrawnCurrent.value = true
    const lastResult = state.value.results[state.value.currentIndex]
    const giftOwner = getParticipant(lastResult.giftOwnerId)
    if (giftOwner) {
      drawBoxContent.value = giftOwner.name.charAt(0)
      resultGiftOwner.value = giftOwner.name
      showResult.value = true
    }
  }
})

// 設定密碼
function setupPassword() {
  if (!newPassword.value) {
    alert('請輸入密碼！')
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    alert('兩次密碼不一致！')
    return
  }
  
  setPassword(newPassword.value)
  showPasswordSetup.value = false
  alert('密碼設定成功！')
}

// 獲取參與者索引
function getParticipantIndex(id: number): number {
  return state.value.participants.findIndex(p => p.id === id) + 1
}

// 新增參與者
function handleAddParticipant() {
  if (!newParticipantName.value.trim()) return
  addParticipant(newParticipantName.value.trim())
  newParticipantName.value = ''
}

// 新增進階配對
function handleAddFixedPair() {
  if (!fixedDrawerId.value || !fixedGiftId.value) {
    alert('請選擇 A 和 B')
    return
  }
  if (fixedDrawerId.value === fixedGiftId.value) {
    alert('A 和 B 不能相同！')
    return
  }
  
  if (!addFixedPair(fixedDrawerId.value, fixedGiftId.value)) {
    alert('此項目已存在設定')
    return
  }
  
  fixedDrawerId.value = null
  fixedGiftId.value = null
}

// 確認進階選項
function confirmAdvanced() {
  if (!verifyPassword(advancedPassword.value)) {
    alert('密碼錯誤！')
    advancedPassword.value = ''
    return
  }
  
  showAdvancedModal.value = false
  showAdvanced.value = true
  advancedPassword.value = ''
}

// 確認重設 Seed
function confirmResetSeed() {
  if (!verifyPassword(resetPassword.value)) {
    alert('密碼錯誤！')
    resetPassword.value = ''
    return
  }
  
  resetSeed()
  showResetSeedModal.value = false
  resetPassword.value = ''
  alert('Seed 已重設為: ' + state.value.seed)
}

// 確認重置全部
function confirmResetAll() {
  if (!verifyPassword(resetPassword.value)) {
    alert('密碼錯誤！')
    resetPassword.value = ''
    return
  }
  
  resetAll()
  showResetAllModal.value = false
  showAdvanced.value = false
  resetPassword.value = ''
  
  // 重置抽獎 UI 狀態
  isDrawing.value = false
  showResult.value = false
  drawBoxContent.value = '🎁'
  hasDrawnCurrent.value = false
}

// 確認清除緩存
function confirmClearCache() {
  if (!verifyPassword(resetPassword.value)) {
    alert('密碼錯誤！')
    resetPassword.value = ''
    return
  }
  
  clearAllCache()
  showClearCacheModal.value = false
  alert('緩存已清除！頁面將重新載入。')
  window.location.reload()
}

// 開始抽獎
function handleStartDraw() {
  if (state.value.participants.length < 2) {
    alert('至少需要 2 位參與者！')
    return
  }
  
  if (state.value.startMode === 'manual' && !state.value.manualStarterId) {
    alert('請選擇起始抽獎者！')
    return
  }
  
  if (!startDraw()) {
    alert('無法生成有效的抽獎序列，請檢查進階設定是否造成衝突')
    return
  }
  
  hasDrawnCurrent.value = false
  showResult.value = false
  drawBoxContent.value = '🎁'
}

// 執行抽獎
function handlePerformDraw() {
  if (isDrawing.value) return
  
  isDrawing.value = true
  showResult.value = false
  
  // 動畫：快速切換名字
  let shuffleCount = 0
  const maxShuffles = 20
  
  const shuffleInterval = setInterval(() => {
    const randomP = state.value.participants[Math.floor(Math.random() * state.value.participants.length)]
    drawBoxContent.value = randomP.name.charAt(0)
    shuffleCount++
    
    if (shuffleCount >= maxShuffles) {
      clearInterval(shuffleInterval)
      
      // 記錄結果
      const result = performDraw()
      if (result) {
        const giftOwner = getParticipant(result.giftOwnerId)
        if (giftOwner) {
          drawBoxContent.value = giftOwner.name.charAt(0)
          resultGiftOwner.value = giftOwner.name
        }
      }
      
      isDrawing.value = false
      showResult.value = true
      hasDrawnCurrent.value = true
      
      // 如果是最後一個人，自動觸發完成特效
      if (state.value.currentIndex >= state.value.participants.length - 1) {
        // 延遲一下讓結果先顯示
        setTimeout(() => {
          state.value.phase = 'complete'
          celebrate()
        }, 500)
      }
    }
  }, 80)
}

// 下一位抽獎
function handleNextDraw() {
  if (nextDraw()) {
    hasDrawnCurrent.value = false
    showResult.value = false
    drawBoxContent.value = '🎁'
  } else {
    // 遊戲完成，觸發慶祝動畫
    celebrate()
  }
}

// 分享結果
// 分享結果 - 打開分享選單
async function shareResults() {
  showShareModal.value = true
}

// 分享文字版
async function handleShareText() {
  // 產生文字結果
  const lines = ['🎁 交換禮物抽籤結果 🎁', '']
  state.value.results.forEach(r => {
    const drawer = getParticipant(r.drawerId)?.name || '?'
    const giftOwner = getParticipant(r.giftOwnerId)?.name || '?'
    lines.push(`${r.order}. ${drawer} ➡️ ${giftOwner} 的禮物`)
  })
  lines.push('')
  lines.push(`🎲 Seed: ${state.value.seed}`)
  
  const text = lines.join('\n')
  
  // 直接複製到剪貼簿
  try {
    await navigator.clipboard.writeText(text)
    alert('✅ 結果已複製到剪貼簿！')
    showShareModal.value = false
  } catch (e) {
    alert('❌ 複製失敗，請手動複製')
  }
}

// 分享圖片版
async function handleShareImage() {
  const results = state.value.results.map(r => ({
    order: r.order,
    drawerName: getParticipant(r.drawerId)?.name || '?',
    giftOwnerName: getParticipant(r.giftOwnerId)?.name || '?'
  }))
  
  const blob = await generateResultImage(results, state.value.seed, 'solo')
  
  if (blob) {
    const success = await shareImage(
      blob,
      '交換禮物抽籤結果',
      '🎁 看看我的交換禮物抽籤結果！'
    )
    
    if (success) {
      showShareModal.value = false
    } else {
      alert('分享失敗，請嘗試下載圖片')
    }
  }
}

// 下載圖片
async function handleDownloadImage() {
  const results = state.value.results.map(r => ({
    order: r.order,
    drawerName: getParticipant(r.drawerId)?.name || '?',
    giftOwnerName: getParticipant(r.giftOwnerId)?.name || '?'
  }))
  
  const blob = await generateResultImage(results, state.value.seed, 'solo')
  
  if (blob) {
    downloadImage(blob, `交換禮物結果_${state.value.seed}.png`)
    alert('圖片已下載！')
    showShareModal.value = false
  }
}

// 分享到社交媒體
async function shareToSocial(platform: string) {
  const text = `🎁 交換禮物抽籤結果！Seed: ${state.value.seed}`
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
  alert('連結已複製！')
  showShareModal.value = false
}

// 慶祝動畫
function celebrate() {
  // 保存歷史紀錄
  if (state.value.results.length > 0) {
    addHistoryRecord({
      mode: 'solo',
      seed: state.value.seed,
      participantCount: state.value.participants.length,
      results: state.value.results.map(r => ({
        order: r.order,
        drawerName: getParticipant(r.drawerId)?.name || '?',
        giftOwnerName: getParticipant(r.giftOwnerId)?.name || '?'
      }))
    })
  }
  
  const colors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7']
  const container = document.createElement('div')
  container.className = 'celebration'
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

  // 添加動畫 keyframes
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

.count-badge {
  font-size: 0.9rem;
  opacity: 0.8;
}

.participants-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
  max-height: 300px;
  overflow-y: auto;
  padding: 10px 0;
}

.participant-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255,255,255,0.1);
  padding: 8px 12px;
  border-radius: 8px;
  transition: all 0.2s;
}

.participant-item:hover {
  background: rgba(255,255,255,0.2);
}

.participant-item .number {
  background: #c41e3a;
  color: #fff;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.participant-item input {
  flex: 1;
  background: transparent;
  border: none;
  color: #fff;
  font-size: 0.95rem;
  padding: 4px;
  border-bottom: 1px solid transparent;
  min-width: 0;
}

.participant-item input:focus {
  outline: none;
  border-bottom-color: rgba(255,255,255,0.5);
}

.btn-icon {
  background: none;
  border: none;
  color: rgba(255,255,255,0.6);
  cursor: pointer;
  padding: 4px;
  font-size: 1rem;
  transition: color 0.2s;
}

.btn-icon:hover {
  color: #ff6b6b;
}

.add-participant {
  margin-top: 10px;
  display: flex;
  gap: 10px;
}

.start-options {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  align-items: center;
  margin-bottom: 20px;
}

.start-options label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.start-options input[type="radio"] {
  accent-color: #c41e3a;
  width: 18px;
  height: 18px;
}

.start-options select {
  padding: 8px 12px;
  border-radius: 6px;
  border: none;
  background: rgba(255,255,255,0.15);
  color: #fff;
  font-size: 1rem;
}

.start-options select option {
  background: #2d5a3f;
  color: #fff;
}

.advanced-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  opacity: 0.7;
  font-size: 0.9rem;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid rgba(255,255,255,0.2);
}

.advanced-toggle:hover {
  opacity: 1;
}

.advanced-section {
  margin-top: 15px;
}

.fixed-pair-item {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.fixed-pair-item select {
  padding: 8px 12px;
  border-radius: 6px;
  border: none;
  background: rgba(255,255,255,0.15);
  color: #fff;
  font-size: 0.9rem;
}

.fixed-pair-item select option {
  background: #2d5a3f;
}

.fixed-pairs-list {
  margin-top: 10px;
}

.fixed-pair-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(196, 30, 58, 0.3);
  padding: 6px 12px;
  border-radius: 20px;
  margin: 4px;
  font-size: 0.9rem;
}

.fixed-pair-tag .remove {
  cursor: pointer;
  opacity: 0.7;
}

.fixed-pair-tag .remove:hover {
  opacity: 1;
}

.seed-display {
  font-size: 0.85rem;
  opacity: 0.7;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid rgba(255,255,255,0.2);
  font-family: monospace;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.btn-sm {
  padding: 4px 10px;
  font-size: 0.8rem;
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

@media (max-width: 600px) {
  .participants-grid {
    grid-template-columns: 1fr;
  }
  
  .draw-box {
    width: 150px;
    height: 150px;
    font-size: 3rem;
  }
  
  .progress-panel {
    position: relative;
    width: 100%;
    right: auto;
    top: auto;
    margin: 20px 0;
  }
}

/* 進度側邊面板 */
.progress-panel {
  position: fixed;
  right: 20px;
  top: 100px;
  width: 200px;
  background: rgba(0,0,0,0.8);
  border-radius: 12px;
  padding: 15px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.1);
  z-index: 100;
}

.progress-panel h4 {
  margin: 0 0 10px 0;
  font-size: 0.9rem;
}

.progress-panel .progress-bar {
  height: 8px;
  background: rgba(255,255,255,0.1);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-panel .progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4caf50, #8bc34a);
  transition: width 0.5s ease;
}

.progress-panel .progress-text {
  font-size: 0.85rem;
  text-align: center;
  margin-bottom: 10px;
  opacity: 0.8;
}

.player-status-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
  max-height: 300px;
  overflow-y: auto;
}

.player-status-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  border-radius: 6px;
  font-size: 0.85rem;
  background: rgba(255,255,255,0.05);
  transition: all 0.3s;
}

.player-status-item.is-current {
  background: rgba(255, 193, 7, 0.3);
  border: 1px solid #ffc107;
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

/* 慶祝畫面樣式 */
.celebration-container {
  min-height: 100vh;
  padding: 40px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
}

.celebration-banner {
  text-align: center;
  margin-bottom: 40px;
  animation: slideDown 0.6s ease-out;
}

.celebration-title {
  font-size: 2.5rem;
  color: #fff;
  text-shadow: 0 4px 12px rgba(0,0,0,0.3);
  margin: 20px 0;
  font-weight: 800;
  letter-spacing: 2px;
}

.confetti-animation {
  font-size: 3rem;
  display: inline-block;
  animation: bounce 1s infinite ease-in-out;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  25% { transform: translateY(-20px) rotate(-10deg); }
  75% { transform: translateY(-15px) rotate(10deg); }
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-50px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.result-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
  max-width: 1400px;
  margin: 0 auto 40px;
  padding: 0 10px;
}

.result-card {
  position: relative;
  background: rgba(255, 255, 255, 0.98);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: fadeInUp 0.6s ease-out backwards;
}

.result-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.35);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card-badge {
  position: absolute;
  top: -12px;
  left: -12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 1.3rem;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.5);
  border: 3px solid #fff;
}

.card-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.player-section {
  flex: 1;
  text-align: center;
  padding: 12px;
  border-radius: 12px;
  transition: all 0.3s;
}

.drawer-section {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
}

.gift-section {
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
}

.player-avatar, .gift-icon {
  font-size: 3rem;
  margin-bottom: 8px;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
}

.player-name {
  font-size: 1.2rem;
  font-weight: 700;
  color: #333;
  margin-bottom: 4px;
  word-break: break-word;
}

.player-label {
  font-size: 0.85rem;
  color: #666;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.arrow-icon {
  font-size: 2.5rem;
  color: #667eea;
  animation: pulse 2s infinite;
  flex-shrink: 0;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.8; }
}

.celebration-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
  max-width: 800px;
  margin: 0 auto;
  padding: 0 20px;
}

.celebration-btn {
  padding: 16px 32px;
  font-size: 1.1rem;
  border-radius: 16px;
  border: none;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
  min-width: 180px;
  justify-content: center;
}

.celebration-btn:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.celebration-btn:active {
  transform: translateY(-2px);
}

.primary-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.restart-btn {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: #fff;
}

.leave-btn {
  background: rgba(255, 255, 255, 0.95);
  color: #667eea;
  border: 2px solid #667eea;
}

.btn-icon {
  font-size: 1.4rem;
}

.btn-text {
  font-size: 1.1rem;
}

@media (max-width: 768px) {
  .celebration-title {
    font-size: 2rem;
  }
  
  .result-cards-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .card-body {
    flex-direction: column;
    gap: 12px;
  }
  
  .arrow-icon {
    transform: rotate(90deg);
    font-size: 2rem;
  }
  
  .celebration-actions {
    flex-direction: column;
    gap: 12px;
  }
  
  .celebration-btn {
    width: 100%;
    min-width: auto;
  }
}
</style>
