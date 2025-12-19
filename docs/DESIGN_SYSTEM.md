# 🎨 設計系統 Design System

## 配色方案 Color Palette

### 主要色彩 Primary Colors

基於提供的參考色系 (#BF092F, #132440, #16476A, #3B9797, #62B6B7, #102A43) 設計

```css
--theme-primary: #bf092f /* 深紅色 - 主要行動按鈕、重要元素 */
  --theme-secondary: #3b9797 /* 青綠色 - 次要行動、輔助元素 */
  --theme-accent: #62b6b7 /* 亮青色 - 強調、高亮、懸停效果 */;
```

### 背景色彩 Background Colors

深藍色漸層背景，營造深邃神秘的氛圍

```css
--theme-bg-start: #102a43 /* 深藍色 - 漸層起始 */ --theme-bg-end: #16476a
  /* 中藍色 - 漸層結束 */ --theme-bg-deep: #132440
  /* 極深藍 - 深色背景、模態框 */;
```

### 表面色彩 Surface Colors

使用半透明白色層次，搭配毛玻璃效果 (backdrop-filter)

```css
--theme-surface: rgba(255, 255, 255, 0.08) /* 卡片基礎表面 */
  --theme-surface-light: rgba(255, 255, 255, 0.12) /* 較亮表面 */
  --theme-surface-hover: rgba(255, 255, 255, 0.16) /* 懸停效果 */;
```

### 文字色彩 Text Colors

```css
--theme-text: #ffffff /* 主要文字 - 純白 */
  --theme-text-secondary: rgba(255, 255, 255, 0.8) /* 次要文字 */
  --theme-text-muted: rgba(255, 255, 255, 0.5) /* 弱化文字 */;
```

### 狀態色彩 State Colors

```css
--theme-success: #3b9797 /* 成功 - 青綠色 */ --theme-warning: #f59e0b
  /* 警告 - 琥珀色 */ --theme-danger: #bf092f /* 危險/錯誤 - 深紅色 */
  --theme-info: #62b6b7 /* 資訊 - 亮青色 */;
```

## 視覺效果 Visual Effects

### 1. 光暈效果 Glow Effects

- 背景徑向漸層 (radial-gradient) 營造環境光
- 動態浮動動畫 (float animation)
- 透明度控制 (opacity: 0.08)

### 2. 毛玻璃效果 Glassmorphism

```css
backdrop-filter: blur(20px);
background: var(--theme-surface);
border: 1px solid rgba(255, 255, 255, 0.1);
```

### 3. 陰影系統 Shadow System

```css
/* 基礎陰影 */
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);

/* 懸停陰影 */
box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);

/* 內陰影（高光） */
inset 0 1px 0 rgba(255, 255, 255, 0.1);
```

### 4. 邊框光暈 Border Glow

頂部漸層線條創造光澤感

```css
.card::before {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.2) 50%,
    transparent 100%
  );
}
```

### 5. 按鈕光掃效果 Button Shine

```css
.btn-primary::before {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.2) 50%,
    transparent 100%
  );
  animation: sweep on hover;
}
```

### 6. 雪花特效 Snowflake Effects

```css
filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.5));
animation: fall + fade;
```

## 交互動畫 Interactions

### 過渡曲線 Easing

```css
cubic-bezier(0.4, 0, 0.2, 1)  /* Material Design Standard */
```

### 懸停效果 Hover States

- 卡片: translateY(-2px) + 陰影加深
- 按鈕: 光掃動畫 + scale(1.02)
- FAB: scale(1.1) + rotate(90deg)

### 聚焦效果 Focus States

```css
box-shadow: 0 0 0 3px rgba(98, 182, 183, 0.15);
```

## 主題預設 Theme Presets

### 🎄 聖誕主題 Christmas

- 主色: 聖誕紅 (#c41e3a)
- 次要: 松綠 (#228b22)
- 背景: 深綠漸層

### 🧧 新年主題 New Year

- 主色: 金色 (#d4af37)
- 次要: 中國紅 (#c41e3a)
- 背景: 深紅漸層

### 🎉 派對主題 Party

- 主色: 紫色 (#9c27b0)
- 次要: 靛藍 (#673ab7)
- 背景: 深藍黑漸層

## 響應式設計 Responsive Design

### 斷點 Breakpoints

```css
@media (max-width: 768px) /* 手機 */ @media (max-width: 1366px); /* 平板 */
```

### 適配調整

- 手機: 單列佈局、較小的 FAB
- 平板: 關閉 aspect-ratio 限制
- 桌面: 完整 16:9 視窗比例

## 可訪問性 Accessibility

### 對比度 Contrast

- 文字對比度 ≥ 4.5:1 (WCAG AA)
- 按鈕對比度 ≥ 3:1

### 焦點指示 Focus Indicators

- 明顯的聚焦環 (3px accent color)
- 鍵盤導航支援

### 禁用狀態 Disabled State

```css
opacity: 0.5;
filter: grayscale(0.5);
cursor: not-allowed;
```

## 使用指南 Usage Guidelines

### 引用主題變數

```vue
<style>
.my-component {
  background: var(--theme-surface);
  color: var(--theme-text);
  border: 1px solid var(--theme-accent);
}
</style>
```

### 動態更新

所有主題變數均可透過 `useDynamicConfig` composable 動態修改：

```typescript
const { updateSettings } = useDynamicConfig();

updateSettings({
  themePrimary: "#BF092F",
  themeAccent: "#62B6B7",
});
```

## 擴展建議 Extension Suggestions

### 未來可新增的主題變數

- `--theme-gradient-*` - 漸層預設組合
- `--theme-radius-*` - 圓角尺寸系統
- `--theme-spacing-*` - 間距系統
- `--theme-shadow-*` - 陰影預設組合
- `--theme-animation-*` - 動畫持續時間

### 可新增的主題

- 萬聖節 🎃
- 情人節 💝
- 生日派對 🎂
- 商務簡約 💼
- 賽博龐克 🌃
