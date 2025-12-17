/**
 * 分享圖片生成 Composable
 * 用於生成遊戲結果的圖片並分享到社交媒體
 */

export interface ShareResult {
  order: number
  drawerName: string
  giftOwnerName: string
}

export function useShareImage() {
  /**
   * 生成結果圖片
   */
  function generateResultImage(
    results: ShareResult[],
    seed: number,
    mode: 'solo' | 'online',
    highlightPlayer?: string
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        reject(new Error('無法創建 canvas context'))
        return
      }
      
      // 如果有指定玩家，找到該玩家的結果並截取前後各3筆
      let displayResults = results
      let highlightIndex = -1
      
      if (highlightPlayer) {
        const playerIndex = results.findIndex(r => 
          r.drawerName === highlightPlayer || r.giftOwnerName === highlightPlayer
        )
        
        if (playerIndex !== -1) {
          highlightIndex = playerIndex
          // 截取該玩家前後各3筆（共7筆），如果不足則顯示全部
          const start = Math.max(0, playerIndex - 3)
          const end = Math.min(results.length, playerIndex + 4)
          displayResults = results.slice(start, end)
          
          // 調整高亮索引
          highlightIndex = playerIndex - start
        }
      }
      
      // 設定畫布大小（適合社交媒體分享）
      const width = 1080
      const padding = 60
      const lineHeight = 60
      const titleHeight = 180
      const footerHeight = 120
      const contentHeight = displayResults.length * lineHeight + 60
      const height = titleHeight + contentHeight + footerHeight + padding * 2
      
      canvas.width = width
      canvas.height = height
      
      // 背景漸層
      const gradient = ctx.createLinearGradient(0, 0, 0, height)
      gradient.addColorStop(0, '#667eea')
      gradient.addColorStop(1, '#764ba2')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)
      
      // 標題
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 64px Arial, "Microsoft YaHei", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('🎁 交換禮物抽籤結果', width / 2, padding + 70)
      
      // 副標題 - 如果有高亮玩家，顯示個人化訊息
      ctx.font = 'bold 36px Arial, "Microsoft YaHei", sans-serif'
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
      if (highlightPlayer) {
        const funnyTexts = [
          '✨ 我的命運已經決定啦！',
          '🎯 看看我抽到了什麼！',
          '🎪 我的抽獎結果出爐囉！',
          '🌟 天選之人就是我！',
          '🎲 幸運女神眷顧的結果'
        ]
        const randomText = funnyTexts[Math.floor(Math.random() * funnyTexts.length)]
        ctx.fillText(randomText, width / 2, padding + 115)
      } else {
        const modeText = mode === 'solo' ? '🖥️ 主持模式' : '🌐 連線模式'
        ctx.fillText(modeText, width / 2, padding + 115)
      }
      
      // 結果列表背景
      const listY = titleHeight + padding
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
      ctx.fillRect(padding, listY, width - padding * 2, contentHeight)
      
      // 繪製結果
      ctx.textAlign = 'left'
      displayResults.forEach((r, index) => {
        const y = listY + 50 + index * lineHeight
        const isHighlight = highlightIndex === index
        
        // 高亮背景
        if (isHighlight) {
          ctx.fillStyle = 'rgba(255, 215, 0, 0.4)'
          ctx.fillRect(padding + 20, y - 40, width - padding * 2 - 40, lineHeight - 10)
          
          // 高亮邊框
          ctx.strokeStyle = '#ffd700'
          ctx.lineWidth = 3
          ctx.strokeRect(padding + 20, y - 40, width - padding * 2 - 40, lineHeight - 10)
          
          // 加上特效文字
          ctx.fillStyle = '#ffd700'
          ctx.font = 'bold 28px Arial'
          ctx.fillText('👉', padding + 35, y)
        }
        
        // 序號
        ctx.fillStyle = isHighlight ? '#ffd700' : '#ffffff'
        ctx.font = isHighlight ? 'bold 38px Arial' : 'bold 36px Arial'
        ctx.fillText(`${r.order}.`, padding + (isHighlight ? 80 : 50), y)
        
        // 抽獎者和結果 - 簡化顯示
        ctx.font = isHighlight ? 'bold 36px Arial, "Microsoft YaHei", sans-serif' : '36px Arial, "Microsoft YaHei", sans-serif'
        const arrow = isHighlight ? '🎁' : '➡️'
        const text = `${r.drawerName} ${arrow} ${r.giftOwnerName}`
        ctx.fillText(text, padding + 160, y)
      })
      
      // 底部資訊
      const footerY = listY + contentHeight + 50
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
      ctx.font = 'bold 32px Arial, "Microsoft YaHei", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`🎲 種子碼: ${seed}`, width / 2, footerY)
      
      // 生成時間
      const now = new Date()
      const timeText = now.toLocaleString('zh-TW', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
      ctx.font = '28px Arial, "Microsoft YaHei", sans-serif'
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
      ctx.fillText(timeText, width / 2, footerY + 45)
      
      // 轉換為 Blob
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('無法生成圖片'))
        }
      }, 'image/png')
    })
  }
  
  /**
   * 下載圖片
   */
  function downloadImage(blob: Blob, filename: string = 'lucky-draw-result.png') {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  
  /**
   * 分享圖片到社交媒體
   */
  async function shareImage(
    blob: Blob,
    title: string = '交換禮物抽籤結果',
    text: string = '我的抽籤結果'
  ): Promise<boolean> {
    try {
      const file = new File([blob], 'lucky-draw-result.png', { type: 'image/png' })
      
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title,
          text,
          files: [file]
        })
        return true
      } else {
        // 降級為下載
        downloadImage(blob)
        return false
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        console.error('分享失敗:', e)
      }
      return false
    }
  }
  
  /**
   * 生成社交媒體分享連結
   */
  function getSocialShareLinks(text: string) {
    const encodedText = encodeURIComponent(text)
    const url = encodeURIComponent(window.location.origin)
    
    return {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${encodedText}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${url}`,
      threads: `https://threads.net/intent/post?text=${encodedText}`,
      line: `https://line.me/R/msg/text/?${encodedText}`,
      telegram: `https://t.me/share/url?url=${url}&text=${encodedText}`,
      whatsapp: `https://wa.me/?text=${encodedText}%20${url}`
    }
  }
  
  /**
   * 複製圖片到剪貼簿
   */
  async function copyImageToClipboard(blob: Blob): Promise<boolean> {
    try {
      if (navigator.clipboard && navigator.clipboard.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': blob
          })
        ])
        return true
      }
      return false
    } catch (e) {
      console.error('複製圖片失敗:', e)
      return false
    }
  }
  
  return {
    generateResultImage,
    downloadImage,
    shareImage,
    getSocialShareLinks,
    copyImageToClipboard
  }
}
