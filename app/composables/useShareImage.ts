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
      
      // 設定畫布大小（適合社交媒體分享）
      const width = 1080
      const padding = 60
      const lineHeight = 50
      const titleHeight = 120
      const footerHeight = 100
      const contentHeight = results.length * lineHeight + 40
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
      ctx.font = 'bold 56px Arial, "Microsoft YaHei", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('🎁 交換禮物抽籤結果', width / 2, padding + 70)
      
      // 模式標籤
      const modeText = mode === 'solo' ? '🖥️ 主持模式' : '🌐 連線模式'
      ctx.font = '32px Arial, "Microsoft YaHei", sans-serif'
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
      ctx.fillText(modeText, width / 2, padding + 110)
      
      // 結果列表背景
      const listY = titleHeight + padding
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'
      ctx.fillRect(padding, listY, width - padding * 2, contentHeight)
      
      // 繪製結果
      ctx.textAlign = 'left'
      results.forEach((r, index) => {
        const y = listY + 40 + index * lineHeight
        const isHighlight = highlightPlayer && (r.drawerName === highlightPlayer || r.giftOwnerName === highlightPlayer)
        
        // 高亮背景
        if (isHighlight) {
          ctx.fillStyle = 'rgba(255, 215, 0, 0.3)'
          ctx.fillRect(padding + 10, y - 35, width - padding * 2 - 20, lineHeight - 10)
        }
        
        // 序號
        ctx.fillStyle = isHighlight ? '#ffd700' : '#ffffff'
        ctx.font = 'bold 32px Arial'
        ctx.fillText(`${r.order}.`, padding + 30, y)
        
        // 抽獎者和結果
        ctx.font = '32px Arial, "Microsoft YaHei", sans-serif'
        const text = `${r.drawerName} ➡️ ${r.giftOwnerName} 的禮物`
        ctx.fillText(text, padding + 100, y)
      })
      
      // 底部資訊
      const footerY = listY + contentHeight + 50
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
      ctx.font = '28px Arial, "Microsoft YaHei", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`🎲 Seed: ${seed}`, width / 2, footerY)
      
      // 生成時間
      const now = new Date()
      const timeText = now.toLocaleString('zh-TW', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
      ctx.font = '24px Arial, "Microsoft YaHei", sans-serif'
      ctx.fillText(timeText, width / 2, footerY + 40)
      
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
