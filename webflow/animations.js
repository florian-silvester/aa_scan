
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
  // Initialize interactive UI components
  try { initAccordions(); } catch (e) { console.warn('Accordion init failed at DOMContentLoaded', e); }
  try { initScrollImageFades(); } catch (e) { console.warn('Scroll image fades init failed at DOMContentLoaded', e); }
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
      // ============================================================================
      // 🔽 ACCORDION INITIALIZER (idempotent)
      // ============================================================================
      function initAccordions() {
        if (!window.gsap) return;
        document.querySelectorAll('.accordion_wrap').forEach((component, listIndex) => {
          if (component.dataset.scriptInitialized) return;
          component.dataset.scriptInitialized = 'true';

          const closePrevious = component.getAttribute('data-close-previous') !== 'false';
          const closeOnSecondClick = component.getAttribute('data-close-on-second-click') !== 'false';
          const openOnHover = component.getAttribute('data-open-on-hover') === 'true';
          const openByDefault = component.getAttribute('data-open-by-default') !== null && !isNaN(+component.getAttribute('data-open-by-default')) ? +component.getAttribute('data-open-by-default') : false;
          const list = component.querySelector('.accordion_list');
          let previousIndex = null, closeFunctions = [];

          function removeCMSList(slot) {
            const dynList = Array.from(slot.children).find((child) => child.classList.contains('w-dyn-list'));
            if (!dynList) return;
            const nestedItems = dynList?.firstElementChild?.children;
            if (!nestedItems) return;
            const staticWrapper = [...slot.children];
            [...nestedItems].forEach(el => el.firstElementChild && slot.appendChild(el.firstElementChild));
            staticWrapper.forEach((el) => el.remove());
          }
          if (list) removeCMSList(list);

          component.querySelectorAll('.accordion_component').forEach((card, cardIndex) => {
            const button = card.querySelector('.accordion_toggle_button');
            const content = card.querySelector('.accordion_content_wrap');
            const icon = card.querySelector('.accordion_toggle_icon');
            if (!button || !content || !icon) return;

            button.setAttribute('aria-expanded', 'false');
            button.setAttribute('id', 'accordion_button_' + listIndex + '_' + cardIndex);
            content.setAttribute('id', 'accordion_content_' + listIndex + '_' + cardIndex);
            button.setAttribute('aria-controls', content.id);
            content.setAttribute('aria-labelledby', button.id);
            content.style.display = 'none';

            const refresh = () => {
              tl.invalidate();
              if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
            };
            const tl = gsap.timeline({ paused: true, defaults: { duration: 0.3, ease: 'power1.inOut' }, onComplete: refresh, onReverseComplete: refresh });
            tl.set(content, { display: 'block' });
            tl.fromTo(content, { height: 0 }, { height: 'auto' });
            tl.fromTo(icon, { rotate: 0 }, { rotate: -180 }, '<');

            const closeAccordion = () => card.classList.contains('is-opened') && (card.classList.remove('is-opened'), tl.reverse(), button.setAttribute('aria-expanded', 'false'));
            closeFunctions[cardIndex] = closeAccordion;

            const openAccordion = (instant = false) => {
              if (closePrevious && previousIndex !== null && previousIndex !== cardIndex) closeFunctions[previousIndex]?.();
              previousIndex = cardIndex;
              button.setAttribute('aria-expanded', 'true');
              card.classList.add('is-opened');
              instant ? tl.progress(1) : tl.play();
            };
            if (openByDefault === cardIndex + 1) openAccordion(true);

            button.addEventListener('click', () => (card.classList.contains('is-opened') && closeOnSecondClick ? (closeAccordion(), (previousIndex = null)) : openAccordion()));
            if (openOnHover) button.addEventListener('mouseenter', () => openAccordion());
          });
        });
      }

      // ============================================================================
      // 🖼️ SCROLL FADE FOR MEDIA (idempotent)
      // ============================================================================
      function initScrollImageFades(root) {
        if (!window.gsap || !window.ScrollTrigger) return;
        const scope = (root && root.querySelector && (root.querySelector('main') || root)) || document;
        const mediaEls = scope.querySelectorAll('img, picture, video, [data-animate-media]');
        mediaEls.forEach((el) => {
          if (el.dataset.scrollFadeBound) return;
          const rect = el.getBoundingClientRect();
          const visibleNow = rect.top < window.innerHeight * 0.9 && rect.bottom > 0;
          el.dataset.scrollFadeBound = 'true';
          if (!visibleNow) gsap.set(el, { opacity: 0 });
          ScrollTrigger.create({
            trigger: el,
            start: 'top 85%',
            once: true,
            onEnter: () => gsap.to(el, { opacity: 1, duration: 0.8, ease: 'sine.inOut' })
          });
        });
      }

      // Helper: combined reveal – container fade plus media-then-text sequence
      function revealContainerWithMediaThenText(root) {
        if (!window.gsap) return null;
        const scope = (root && root.querySelector && (root.querySelector('main') || root)) || document;
        const mediaEls = scope.querySelectorAll('img, picture, video, [data-animate-media]');
        const textEls = scope.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption,[data-animate-text]');
        const tl = gsap.timeline();
        // Prepare inner elements first so we don't see a second fade after container appears
        tl.set(mediaEls, { opacity: 0 }, 0);
        tl.set(textEls, { opacity: 0, y: '1vh' }, 0);
        // Container enters (fade only)
        tl.fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'sine.inOut' }, 0);
        // Media first (fade only) only for visible items now, hidden ones will fade on scroll
        const visibleMedia = Array.from(mediaEls).filter((el) => {
          const r = el.getBoundingClientRect();
          return r.top < window.innerHeight * 0.9 && r.bottom > 0;
        });
        if (visibleMedia.length) {
          tl.to(visibleMedia, { opacity: 1, duration: 0.5, ease: 'sine.inOut', stagger: 0.05 }, 0.05);
        }
        tl.to(textEls, { opacity: 1, y: 0, duration: 0.6, ease: 'sine.inOut', stagger: 0.03 }, '-=0.2');
        // Bind scroll fades for non-visible media after reveal
        tl.call(() => { try { initScrollImageFades(root); } catch (e) {} });
        return tl;
      }

      // Helper: leave – fade images, fade+move text down, then fade container
      function leaveMediaAndText(root) {
        if (!window.gsap) return null;
        const scope = (root && root.querySelector && (root.querySelector('main') || root)) || document;
        const mediaEls = scope.querySelectorAll('img, picture, video, [data-animate-media]');
        const textEls = scope.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption,[data-animate-text]');
        const tl = gsap.timeline();
        tl.to(mediaEls, { opacity: 0, duration: 0.2, ease: 'sine.inOut', stagger: 0.03 }, 0);
        tl.to(textEls, { y: '0.5vh', opacity: 0, duration: 0.25, ease: 'sine.inOut', stagger: 0.02 }, 0);
        tl.to(root, { opacity: 0, duration: 0.2, ease: 'sine.inOut' }, '-=0.12');
        return tl;
      }

      barba.init({
        transitions: [
          {
            name: 'fade',
            async leave(data) {
              if (window.gsap && data.current && data.current.container) {
                const root = data.current.container;
                await new Promise((resolve) => {
                  const tl = leaveMediaAndText(root);
                  if (tl && tl.eventCallback) tl.eventCallback('onComplete', resolve); else resolve();
                });
              }
            },
            async enter(data) {
              window.scrollTo(0, 0);
              if (window.gsap && data.next && data.next.container) {
                const nextRoot = data.next.container;
                const tl = revealContainerWithMediaThenText(nextRoot);
                try { initScrollImageFades(nextRoot); } catch (e) {}
                // Initialize accordions in new container
                try { initAccordions(); } catch (e) { console.warn('Accordion init failed on enter', e); }
              }
            },
            async once(data) {
              if (window.gsap && data && data.next && data.next.container) {
                revealContainerWithMediaThenText(data.next.container);
                try { initScrollImageFades(data.next.container); } catch (e) {}
                try { initAccordions(); } catch (e) { console.warn('Accordion init failed on once', e); }
              }
            }
          }
        ]
      });

      // Refresh ScrollTrigger and recalc nav theme on new content
      if (window.barba) {
        function scheduleRecalc() {
          try { initAccordions(); } catch (e) {}
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
        const outTl = leaveMediaAndText(current);
        if (outTl && outTl.eventCallback) {
          outTl.eventCallback('onComplete', () => {
            const inTl = revealContainerWithMediaThenText(current);
            const scheduleRecalc = () => {
              try { if (window.ScrollTrigger) ScrollTrigger.refresh(); } catch (_) {}
              try { if (window.__updateNavTheme) window.__updateNavTheme(); } catch (_) {}
            };
            if (inTl && inTl.eventCallback) {
              inTl.eventCallback('onComplete', () => {
                scheduleRecalc();
                setTimeout(scheduleRecalc, 50);
                setTimeout(scheduleRecalc, 150);
                setTimeout(scheduleRecalc, 350);
                setTimeout(scheduleRecalc, 700);
              });
            } else {
              scheduleRecalc();
              setTimeout(scheduleRecalc, 50);
              setTimeout(scheduleRecalc, 150);
              setTimeout(scheduleRecalc, 350);
              setTimeout(scheduleRecalc, 700);
            }
          });
        }
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
