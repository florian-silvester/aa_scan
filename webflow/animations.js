
// ================================================================================
// 🎨 NAV COLOR CHANGE ON SCROLL
// ================================================================================
function initNavColorChange() {
  console.log('🎨 ===== INITIALIZING NAV COLOR CHANGE =====');
  
  if (!window.gsap || !window.ScrollTrigger) {
    console.error('❌ GSAP or ScrollTrigger not available');
    return;
  }
  
  gsap.registerPlugin(ScrollTrigger);
  console.log('✅ ScrollTrigger registered');

  const nav = document.querySelector('.nav_links_component');
  console.log('🔍 Looking for nav element (.nav_links_component):', nav ? '✅ Found' : '❌ Not found');
  
  if (!nav) {
    console.error('❌ Nav element not found! Check your Webflow class name.');
      return;
    }
    
  function setNav(mode){
    console.log(`🎨 Setting nav to: ${mode}`);
    nav.classList.remove('u-nav-normal','u-nav-invert');
    nav.classList.add(mode === 'invert' ? 'u-nav-invert' : 'u-nav-normal');
  }

  function checkNavState() {
    // Scope to the active Barba container if present, otherwise the whole document
    const activeContainer = document.querySelector('[data-barba="container"]:not([aria-hidden="true"])') || document;
    const overlays = activeContainer.querySelectorAll('.u-nav-theme-overlay[data-nav-theme="invert"]');
    console.log(`🔍 Found ${overlays.length} overlay element(s) in active container with data-nav-theme="invert"`);

    // Use the bottom of the nav as the detection line so we test what actually sits behind the nav
    const navEl = document.querySelector('.nav_component');
    const anchorY = navEl ? Math.max(0, navEl.getBoundingClientRect().bottom) : 0;
    const probeY = Math.max(0, Math.floor(anchorY));
    
    let shouldInvert = false;
    
    overlays.forEach((el, index) => {
      const rect = el.getBoundingClientRect();
      const isCovering = rect.top <= probeY && rect.bottom >= probeY; // overlay intersects nav area line
      console.log(`  Overlay ${index + 1}: top=${rect.top.toFixed(0)}, bottom=${rect.bottom.toFixed(0)}, navY=${probeY}, covering=${isCovering}`);
      if (isCovering) shouldInvert = true;
    });
    
    console.log(`🎨 Should invert: ${shouldInvert}`);
    setNav(shouldInvert ? 'invert' : 'normal');
  }

  // Create a single ScrollTrigger that fires on every scroll update
  ScrollTrigger.create({
    trigger: 'body',
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: checkNavState,
    onRefresh: checkNavState
  });

  // Also listen to scroll events directly
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        checkNavState();
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  // Multiple initialization attempts to catch layout shifts
  const init = () => {
    ScrollTrigger.refresh();
    checkNavState();
  };

  // Immediate
  init();
  
  // After a tick
  requestAnimationFrame(init);
  
  // After load event
  window.addEventListener('load', init);
  
  // After images load (catches late-loading images)
  setTimeout(init, 100);
  setTimeout(init, 500);
  setTimeout(init, 1000);
  
  console.log('✅ Nav color change initialized successfully!');
  try { window.__updateNavTheme = checkNavState; } catch (e) {}
}

// Initialize nav color change on initial page load
console.log('📌 Adding DOMContentLoaded listener for nav color change...');
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 DOMContentLoaded fired - initializing nav color change');
  initNavColorChange();
});

// ================================================================================
// 🎭 BASIC BARBA.JS PAGE TRANSITIONS (keeps nav color change as-is)
// ================================================================================
(function setupBarbaTransitions() {
  if (typeof window === 'undefined') return;

  function initBarba() {
    if (!window.barba) {
      console.warn('⚠️ Barba not found; skipping SPA transitions');
      return;
    }

    // Ensure required structure exists (avoid errors on pages without Barba markup)
    const wrapper = document.querySelector('[data-barba="wrapper"]');
    const container = document.querySelector('[data-barba="container"]');
    if (!wrapper || !container) {
      console.warn('⚠️ Missing data-barba wrapper/container; skipping SPA transitions');
      return;
    }

    try {
      barba.init({
        transitions: [
          {
            name: 'fade',
            async leave(data) {
              if (window.gsap && data.current && data.current.container) {
                await gsap.to(data.current.container, { y: '20vh', opacity: 0, duration: 0.8, ease: 'sine.inOut' });
              }
            },
            async enter(data) {
              window.scrollTo(0, 0);
              if (window.gsap && data.next && data.next.container) {
                gsap.fromTo(
                  data.next.container,
                  { y: '20vh', opacity: 0 },
                  { y: 0, opacity: 1, duration: 0.8, ease: 'sine.inOut' }
                );
              }
            },
            async once(data) {
              if (window.gsap && data && data.next && data.next.container) {
                gsap.set(data.next.container, { y: 0, opacity: 1 });
              }
            }
          }
        ]
      });

      // Refresh ScrollTrigger and recalc nav theme on new content
      if (window.barba) {
        function scheduleRecalc() {
          try { if (window.ScrollTrigger) ScrollTrigger.refresh(); } catch (e) {}
          try { if (window.__updateNavTheme) window.__updateNavTheme(); } catch (e) {}
        }
        barba.hooks.afterEnter(() => {
          scheduleRecalc();
          setTimeout(scheduleRecalc, 50);
          setTimeout(scheduleRecalc, 150);
          setTimeout(scheduleRecalc, 350);
          setTimeout(scheduleRecalc, 700);
        });
      }

      // Play animation even when clicking a link to the current page (no navigation)
      document.addEventListener('click', function (e) {
        const link = e.target.closest('a[href]');
        if (!link) return;
        const href = link.getAttribute('href');
        if (!href || href.startsWith('#')) return;
        // Build absolute URL for comparison
        const temp = document.createElement('a');
        temp.href = href;
        const isSame = temp.pathname.replace(/\/$/, '') === location.pathname.replace(/\/$/, '') && (temp.search || '') === (location.search || '');
        if (!isSame) return;
        // Prevent default and run the same out-and-in animation
        e.preventDefault();
        const current = document.querySelector('[data-barba="container"]');
        if (!window.gsap || !current) return;
        gsap.to(current, { y: '20vh', opacity: 0, duration: 0.8, ease: 'sine.inOut', onComplete: () => {
          gsap.fromTo(current, { y: '20vh', opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'sine.inOut', onComplete: () => {
            const scheduleRecalc = () => {
              try { if (window.ScrollTrigger) ScrollTrigger.refresh(); } catch (_) {}
              try { if (window.__updateNavTheme) window.__updateNavTheme(); } catch (_) {}
            };
            scheduleRecalc();
            setTimeout(scheduleRecalc, 50);
            setTimeout(scheduleRecalc, 150);
            setTimeout(scheduleRecalc, 350);
            setTimeout(scheduleRecalc, 700);
          }});
        }});
      }, true);

      // Minimal base styles to keep containers visible by default
      if (!document.getElementById('barba-base-styles')) {
        const style = document.createElement('style');
        style.id = 'barba-base-styles';
        style.innerHTML = '[data-barba="container"]{opacity:1}';
        document.head.appendChild(style);
      }

      console.log('✅ Barba basic transitions initialized');
    } catch (err) {
      console.error('❌ Failed to init Barba:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBarba);
  } else {
    initBarba();
  }
})();
