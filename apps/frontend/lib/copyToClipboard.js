/**
 * copyToClipboard — works on both HTTPS and plain HTTP (mobile LAN access).
 *
 * Strategy:
 *  1. navigator.clipboard.writeText() — modern API, requires HTTPS or localhost.
 *  2. execCommand('copy') fallback — works on HTTP, supported on all mobile browsers.
 *
 * Returns true on success, false on failure.
 */
export async function copyToClipboard(text) {
  // Modern API — available on HTTPS / localhost
  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Falls through to legacy fallback (e.g. permission denied)
    }
  }

  // Legacy fallback — works on plain HTTP mobile browsers
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;

    // Keep the element out of view but still in the DOM and focusable
    textarea.setAttribute('readonly', '');
    textarea.style.cssText = [
      'position:fixed',
      'top:0',
      'left:0',
      'width:1px',
      'height:1px',
      'padding:0',
      'border:none',
      'outline:none',
      'box-shadow:none',
      'background:transparent',
      'opacity:0',
    ].join(';');

    document.body.appendChild(textarea);

    // iOS Safari requires a range selection, not just textarea.select()
    if (navigator.userAgent.match(/ipad|iphone/i)) {
      const range = document.createRange();
      range.selectNodeContents(textarea);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      textarea.setSelectionRange(0, text.length);
    } else {
      textarea.select();
    }

    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch {
    return false;
  }
}
