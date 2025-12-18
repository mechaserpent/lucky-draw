/**
 * 剪貼簿複製功能，支援不支援 navigator.clipboard 的瀏覽器
 */
export function useClipboard() {
  /**
   * 複製文字到剪貼簿
   * @param text 要複製的文字
   * @returns Promise<boolean> 是否成功
   */
  async function copyToClipboard(text: string): Promise<boolean> {
    // 優先使用 navigator.clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (e) {
        console.warn("Clipboard API failed, falling back to execCommand:", e);
      }
    }

    // Fallback: 使用 document.execCommand('copy')
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;

      // 避免滾動
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "-9999px";
      textArea.style.opacity = "0";

      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);

      return successful;
    } catch (e) {
      console.error("Fallback copy failed:", e);
      return false;
    }
  }

  return {
    copyToClipboard,
  };
}
