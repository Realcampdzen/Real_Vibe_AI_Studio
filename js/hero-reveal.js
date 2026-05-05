// Hero clip-path reveal animation - COLUMN BY COLUMN from left to right


function initHeroReveal() {
  const video = document.getElementById('hero-reel-video');
  
  if (!video) {
    console.error('VIDEO ELEMENT NOT FOUND!');
    setTimeout(initHeroReveal, 100);
    return;
  }



  // Remove any conflicting classes
  video.classList.remove('hero-bg-clip');
  
  // Force remove any existing clip-path from CSS
  video.style.clipPath = '';
  video.style.webkitClipPath = '';
  video.style.animation = 'none'; // Disable any CSS animations
  
  // Start completely hidden - use inset for reliability
  video.style.setProperty('clip-path', 'inset(0 100% 0 0)', 'important');
  video.style.setProperty('-webkit-clip-path', 'inset(0 100% 0 0)', 'important');

  const columns = 5; // 5 rectangular columns
  const columnWidth = 100 / columns; // 20% width per column
  const totalDuration = 1000; // 1 second total
  const columnDuration = totalDuration / columns; // 200ms per column

  const start = Date.now();

  function frame() {
    const elapsed = Date.now() - start;
    const t = Math.min(elapsed / totalDuration, 1);
    
    // Apply cubic-bezier easing (0.33, 0.01, 0.17, 1)
    function cubicBezier(t) {
      const p1 = 0.33, p3 = 0.17;
      let low = 0, high = 1;
      for (let i = 0; i < 14; i++) {
        const mid = (low + high) / 2;
        const value = 3 * (1 - mid) * (1 - mid) * mid * p1 + 
                      3 * (1 - mid) * mid * mid * p3 + 
                      mid * mid * mid;
        if (value < t) low = mid;
        else high = mid;
      }
      return (low + high) / 2;
    }
    
    const easedT = cubicBezier(t);
    
    // Calculate reveal width (0% to 100%)
    // For column-by-column: reveal from left, hiding right side
    const revealPercent = easedT * 100;
    const hiddenRight = 100 - revealPercent;
    
    // Use inset for clean rectangular reveal: top right bottom left
    // Hide right side, reveal from left
    const clipPath = `inset(0 ${hiddenRight}% 0 0)`;
    
    // Force apply with !important
    video.style.setProperty('clip-path', clipPath, 'important');
    video.style.setProperty('-webkit-clip-path', clipPath, 'important');

    if (t < 1) {
      requestAnimationFrame(frame);
    } else {
      // Animation complete - full reveal
      video.style.setProperty('clip-path', 'inset(0 0 0 0)', 'important');
      video.style.setProperty('-webkit-clip-path', 'inset(0 0 0 0)', 'important');

    }
  }

  requestAnimationFrame(frame);
}

// Force immediate initialization with multiple fallbacks
function tryInit() {
  const video = document.getElementById('hero-reel-video');
  if (video) {

    initHeroReveal();
  } else {

    setTimeout(tryInit, 50);
  }
}

// Try immediately
tryInit();

// Also try on DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {

    tryInit();
  });
}

// And on window load
window.addEventListener('load', function() {

  tryInit();
});