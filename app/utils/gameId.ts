/**
 * 遊戲識別碼生成器
 * 
 * 生成格式：GAME-YYYYMMDD-RANDOM (例如：GAME-20241217-A3F9K2)
 */

export function generateGameId(): string {
  const date = new Date()
  
  // 格式化日期 YYYYMMDD
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const dateStr = `${year}${month}${day}`
  
  // 生成隨機字符串（6位，大寫字母和數字）
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let randomStr = ''
  for (let i = 0; i < 6; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  return `GAME-${dateStr}-${randomStr}`
}

export function parseGameId(gameId: string): { date: Date | null; id: string } {
  const match = gameId.match(/^GAME-(\d{4})(\d{2})(\d{2})-([A-Z0-9]{6})$/)
  
  if (!match) {
    return { date: null, id: gameId }
  }
  
  const [, year, month, day, randomPart] = match
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
  
  return { date, id: randomPart }
}

export function formatGameId(gameId: string, includeDate: boolean = true): string {
  if (!includeDate) {
    return gameId
  }
  
  const parsed = parseGameId(gameId)
  if (!parsed.date) {
    return gameId
  }
  
  const dateStr = parsed.date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  
  return `${dateStr} #${parsed.id}`
}
