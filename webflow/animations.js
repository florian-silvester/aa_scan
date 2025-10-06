
console.log('🚀🚀🚀 ANIMATIONS.JS FILE LOADED 🚀🚀🚀');

// (Initial hide now controlled by user CSS: .page_wrap.is-hidden { opacity: 0 }
//  We only reveal + animate when that combo class is present.)

// ================================================================================
// 🚫 TEMPORARY DISABLE FLAG FOR NEW CREATOR FEATURES
// ================================================================================
const ENABLE_CREATOR_ANIMATIONS = false; // Set to true to re-enable

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

// ================================================================================
// 🖱️ CREATOR HOVER PREVIEW (port of working pattern)
// ================================================================================
function initCreatorHoverPreviews() {
  if (!ENABLE_CREATOR_ANIMATIONS) return;
  if (!window.gsap) return;

  const items = document.querySelectorAll('.creators_item');
  if (!items.length) return;

  // Only hide previews if in list view (not grid view)
  const list = document.querySelector('.creators_list');
  const isGridView = list && list.dataset.view === 'grid';
  
  if (!isGridView) {
    document.querySelectorAll('.creator_sticky_inner').forEach((el) => {
      // Don't hide if element has .is-visible class (grid mode)
      if (!el.classList.contains('is-visible')) {
        gsap.set(el, { opacity: 0, visibility: 'hidden' });
      }
    });
  }

  let lastPreview = null;

  // Deduplicate bindings across Barba calls
  items.forEach((item) => {
    if (item.dataset.creatorHoverBound) return;
    item.dataset.creatorHoverBound = 'true';

    const preview = item.querySelector('.creator_sticky_inner');
    if (!preview) return;

    const onEnter = () => {
      // Skip hover animation if in grid view
      const list = item.closest('.creators_list');
      if (list && list.dataset.view === 'grid') return;
      
      if (lastPreview && lastPreview !== preview) {
        gsap.to(lastPreview, { opacity: 0, visibility: 'hidden', duration: 0.9, ease: 'circ.out' });
      }
      gsap.to(preview, { opacity: 1, visibility: 'visible', duration: 0.9, ease: 'circ.out' });
      lastPreview = preview;
    };

    const onLeave = () => {
      // Skip hover animation if in grid view
      const list = item.closest('.creators_list');
      if (list && list.dataset.view === 'grid') return;
      
      gsap.to(preview, { opacity: 0, visibility: 'hidden', duration: 0.9, ease: 'circ.out' });
      if (lastPreview === preview) lastPreview = null;
    };

    item.addEventListener('mouseenter', onEnter);
    item.addEventListener('mouseleave', onLeave);
  });

  // Hide on scroll (bind once) - but ONLY in list view, not grid
  if (!window.__creatorHoverHideOnScroll) {
    window.__creatorHoverHideOnScroll = () => {
      // Skip if in grid view
      const list = document.querySelector('.creators_list');
      if (list && list.dataset.view === 'grid') return;
      
      const all = document.querySelectorAll('.creator_sticky_inner');
      all.forEach((el) => gsap.to(el, { opacity: 0, visibility: 'hidden', duration: 0.5, ease: 'power1.out' }));
      try { window.__creatorLastPreview = null; } catch (_) {}
    };
    window.addEventListener('scroll', window.__creatorHoverHideOnScroll, { passive: true });
  }
}

// ================================================================================
// 🔁 LIST ↔ GRID TOGGLE (GSAP Flip)
// - CTA selector: [data-id="grid-toggle"] (preferred) or .grid_toggle_btn
// - Toggles classes on .creators_list and each .creator_thumb_wrap
// - Grid view: all .creator_sticky_inner are visible (opacity 1)
// ================================================================================
function initCreatorGridToggle() {
  if (!ENABLE_CREATOR_ANIMATIONS) return;
  const activeContainer = document.querySelector('[data-barba="container"]:not([aria-hidden="true"])') || document;
  const list = activeContainer.querySelector('.creators_list');
  if (!list) return;

  const cta = activeContainer.querySelector('[data-id="grid-toggle"], .grid_toggle_btn');
  if (!cta || cta.dataset.gridToggleBound === 'true') return;
  cta.dataset.gridToggleBound = 'true';

  const items = () => Array.from(list.querySelectorAll('.creators_item'));

  const showGridView = () => {
    const elItems = items();
    // Fade out quickly
    gsap.to(elItems, { opacity: 0, duration: 0.15, ease: 'power1.inOut', onComplete: () => {
      list.classList.add('u-grid-custom');
      list.classList.remove('u-flex-vertical-wrap','u-width-full','u-position-relative');
      list.dataset.view = 'grid';
      list.querySelectorAll('.creator_thumb_wrap').forEach(el => el.classList.add('is-grid'));
      // In grid: add .is-visible class AND clear GSAP inline styles so CSS can work
      list.querySelectorAll('.creator_sticky_inner').forEach(el => {
        el.classList.add('is-visible');
        gsap.set(el, { clearProps: 'opacity,visibility' }); // Clear GSAP inline styles
      });
      // Fade in with minimal stagger, no transforms that affect positioning
      gsap.to(elItems, { opacity: 1, duration: 0.25, ease: 'power1.out', stagger: 0.01 });
    }});
  };

  const showListView = () => {
    const elItems = items();
    // Fade out quickly
    gsap.to(elItems, { opacity: 0, duration: 0.15, ease: 'power1.inOut', onComplete: () => {
      list.classList.remove('u-grid-custom');
      list.classList.add('u-flex-vertical-wrap','u-width-full','u-position-relative');
      delete list.dataset.view;
      list.querySelectorAll('.creator_thumb_wrap').forEach(el => el.classList.remove('is-grid'));
      // Back to hover behavior: remove .is-visible class and reset GSAP styles
      list.querySelectorAll('.creator_sticky_inner').forEach(el => {
        el.classList.remove('is-visible');
        gsap.set(el, { opacity: 0, visibility: 'hidden' }); // Reset for hover animation
      });
      try { initCreatorHoverPreviews(); } catch (_) {}
      // Fade in with minimal stagger, no transforms that affect positioning
      gsap.to(elItems, { opacity: 1, duration: 0.25, ease: 'power1.out', stagger: 0.01 });
    }});
  };

  cta.addEventListener('click', (e) => {
    e.preventDefault();
    if (list.dataset.view === 'grid') showListView(); else showGridView();
  });
}

// ================================================================================
// 🎯 FINSWEET CMS FILTERS - Simple check (no Barba reinit needed)
// ================================================================================
function initFinsweetFilters() {
  // Finsweet page is excluded from Barba, so it always loads fresh
  // Just log for debugging
  if (typeof window.fsAttributes !== 'undefined') {
    console.log('✅ Finsweet is available on this page');
  }
}

// ================================================================================
// 🎨 FINSWEET ANIMATIONS - Simple MutationObserver approach
// ================================================================================
function initFinsweetAnimations() {
  if (!window.gsap) return;
  
  // Find the pagination wrapper - it should be on every page with Finsweet
  const paginationWrapper = document.querySelector('.w-pagination-wrapper');
  if (!paginationWrapper) {
    console.log('ℹ️ No pagination found, skipping Finsweet animations');
    return;
  }
  
  // Find the CMS list container
  const listContainer = document.querySelector('.w-dyn-items');
  if (!listContainer) {
    console.log('⚠️ No .w-dyn-items found');
    return;
  }
  
  // Note: Items are hidden by CSS (.index_collection .w-dyn-item { opacity: 0; })
  // added to the page head. GSAP just animates them to visible.
  
  // Animate initial items on page load
  requestAnimationFrame(() => {
    const initialItems = listContainer.querySelectorAll('.w-dyn-item');
    if (initialItems.length > 0) {
      gsap.to(initialItems, {
        opacity: 1,
        duration: 0.4,
        ease: 'sine.out',
        stagger: 0.05
        // DON'T clearProps - let inline style override CSS
      });
    }
  });
  
  console.log('✅ Setting up Finsweet animation observer');
  
  let isAnimating = false;
  let lastItemCount = listContainer.querySelectorAll('.w-dyn-item').length;
  
  // Initialize visible count
  let lastVisibleCount = Array.from(listContainer.querySelectorAll('.w-dyn-item')).filter(item => {
    const style = window.getComputedStyle(item);
    return style.display !== 'none' && style.visibility !== 'hidden';
  }).length;
  
  console.log(`📊 Initial: ${lastItemCount} total items, ${lastVisibleCount} visible`);
  
  // Function to animate items
  const animateItems = () => {
    if (isAnimating) {
      console.log('⏭️ Already animating, skipping...');
      return;
    }
    
    isAnimating = true;
    
    // Get ALL items
    const allItems = listContainer.querySelectorAll('.w-dyn-item');
    
    // Filter to ONLY visible items (not display:none or hidden by Finsweet)
    const visibleItems = Array.from(allItems).filter(item => {
      const style = window.getComputedStyle(item);
      return style.display !== 'none' && 
             style.visibility !== 'hidden' && 
             !item.classList.contains('w-condition-invisible');
    });
    
    console.log(`🎬 Animating ${visibleItems.length} visible items (${allItems.length} total)`);
    
    if (visibleItems.length > 0) {
      // Kill any existing animations
      const allItems = listContainer.querySelectorAll('.w-dyn-item');
      gsap.killTweensOf(allItems);
      
      // Use fromTo to set and animate in one step (no flash)
      // Delay: 0.05s pause before first item animates in
      gsap.fromTo(visibleItems,
        { opacity: 0 },
        { 
          opacity: 1, 
          duration: 0.35, 
          ease: 'sine.out',
          stagger: 0.02, // Reduced from 0.05 for tighter wave
          delay: 0.05, // Tiny pause so old items disappear first
          onComplete: () => {
            isAnimating = false;
          }
        }
      );
      
      // Ensure hidden items stay hidden
      const hiddenItems = Array.from(allItems).filter(item => !visibleItems.includes(item));
      if (hiddenItems.length > 0) {
        gsap.set(hiddenItems, { opacity: 0 });
      }
    } else {
      isAnimating = false;
    }
  };
  
  // Watch for changes to the list
  const observer = new MutationObserver((mutations) => {
    // Check current item count
    const currentItemCount = listContainer.querySelectorAll('.w-dyn-item').length;
    
    // Trigger animation if item count changed OR if items were added/removed
    const itemsChanged = mutations.some(m => 
      m.type === 'childList' && (m.addedNodes.length > 0 || m.removedNodes.length > 0)
    );
    
    if (itemsChanged || currentItemCount !== lastItemCount) {
      console.log(`🎬 Finsweet changed items: ${lastItemCount} → ${currentItemCount}`);
      lastItemCount = currentItemCount;
      
      // Scroll to top of list (instant)
      const scrollTarget = document.querySelector('.index_wrap') || document.querySelector('.index_collection') || listContainer;
      if (scrollTarget) {
        // Simple 4rem offset
        const offset = 64; // 4rem (16px base)
        const targetY = scrollTarget.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo(0, targetY);
      }
      
      // Trigger animation
      setTimeout(animateItems, 50);
    }
  });
  
  observer.observe(listContainer, { 
    childList: true,
    subtree: true, // Watch deeper to catch more changes
    attributes: false // Don't care about attribute changes
  });
  
  console.log('✅ Finsweet animations ready');
}

// ================================================================================
// 🔄 WEBFLOW PAGINATION REINIT (for native Webflow pagination only)
// ================================================================================
function initPaginationReinit() {
  // Note: Finsweet pagination is now handled by Finsweet itself (Barba ignores it)
  // This function only handles native Webflow pagination (non-Finsweet)
  
  if (!ENABLE_CREATOR_ANIMATIONS) return;
  
  const activeContainer = document.querySelector('[data-barba="container"]:not([aria-hidden="true"])') || document;
  const paginationButtons = activeContainer.querySelectorAll('.pagination a, .pagination button, .w-pagination-next, .w-pagination-previous, .w-page-link');
  
  paginationButtons.forEach(btn => {
    // Skip if this is a Finsweet element (handled by Finsweet)
    if (btn.closest('[fs-cmsfilter-element]')) return;
    
    if (btn.dataset.paginationReinitBound === 'true') return;
    btn.dataset.paginationReinitBound = 'true';
    
    btn.addEventListener('click', () => {
      // Give Webflow time to load new content
      setTimeout(() => {
        try { initCreatorHoverPreviews(); } catch (e) { console.warn('Pagination reinit: hover previews failed', e); }
        try { initCreatorGridToggle(); } catch (e) { console.warn('Pagination reinit: grid toggle failed', e); }
      }, 350);
    });
  });
  
  // MutationObserver for native Webflow CMS lists (not Finsweet)
  const cmsLists = activeContainer.querySelectorAll('.w-dyn-items');
  cmsLists.forEach(list => {
    // Skip if this is inside a Finsweet filtered list
    if (list.closest('[fs-cmsfilter-element="list"]')) return;
    
    if (list.dataset.paginationObserverBound === 'true') return;
    list.dataset.paginationObserverBound = 'true';
    
    const observer = new MutationObserver((mutations) => {
      const hasChildListChanges = mutations.some(m => m.type === 'childList' && (m.addedNodes.length > 0 || m.removedNodes.length > 0));
      if (hasChildListChanges) {
        setTimeout(() => {
          try { initCreatorHoverPreviews(); } catch (e) {}
          try { initCreatorGridToggle(); } catch (e) {}
        }, 100);
      }
    });
    observer.observe(list, { childList: true, subtree: false });
  });
}

// (Removed hover JS; using pure CSS hover now)

// Initialize nav color change on initial page load
console.log('📌 Adding DOMContentLoaded listener for nav color change...');

function initAll() {
  console.log('🚀 Initializing all components');
  try {
    initNavColorChange();
  } catch (e) {
    console.error('Nav color change failed', e);
  }
  
  // DON'T call initAccordions or initScrollImageFades here - they're defined inside Barba IIFE
  // Barba hooks will handle them
  
  // If this page has the hidden wrapper, run the entrance animation
  if (document.querySelector('.page_wrap.is-hidden')) {
    console.log('🎬 Finsweet page detected, applying entrance animation...');
    try { initFinsweetPageAnimation(); } catch (e) { console.warn('Finsweet page animation failed', e); }
  }
  
  // Initialize Finsweet Filters (always)
  try { initFinsweetFilters(); } catch (e) { console.warn('Finsweet init failed', e); }
  
  // Initialize Finsweet Animations (smooth transitions on filter/pagination)
  try { initFinsweetAnimations(); } catch (e) { console.warn('Finsweet animations init failed', e); }
  
  // Initialize pagination reinit (always, not just for creators)
  try { initPaginationReinit(); } catch (e) { console.warn('Pagination reinit failed', e); }
  
  // Only init creator animations if elements exist
  if (document.querySelector('.creators_item')) {
    try { initCreatorHoverPreviews(); } catch (e) { console.warn('Creator hover preview init failed', e); }
    try { initCreatorGridToggle(); } catch (e) { console.warn('Creator grid toggle init failed', e); }
  }
}

// ================================================================================
// 🎬 FINSWEET PAGE LOAD ANIMATION (mimics Barba transition)
// ================================================================================
function initFinsweetPageAnimation() {
  if (!window.gsap) return;
  
  const pageWrap = document.querySelector('.page_wrap.is-hidden') || document.querySelector('.page_wrap');
  const container = document.querySelector('[data-barba="container"]') || document.querySelector('main');
  if (!container || !pageWrap) return;
  
  // Target specific sections
  const firstSection = container.querySelector('.u-section'); // Header section
  const finsweetList = container.querySelector('.index_wrap'); // Finsweet list container
  
  const tl = gsap.timeline();
  
  // Reveal only the page wrapper that actually contains the Finsweet list
  tl.to(pageWrap, { opacity: 1, duration: 0.25, ease: 'sine.out' }, 0);
  
  // First section: fade + upward movement (like Barba)
  if (firstSection) {
    const sectionChildren = firstSection.querySelectorAll('h1, h2, h3, h4, h5, h6, p, .button_main_wrap, img, picture');
    if (sectionChildren.length > 0) {
      tl.fromTo(sectionChildren,
        { opacity: 0, y: '1vh' },
        { 
          opacity: 1, 
          y: 0, 
          duration: 0.6, 
          ease: 'sine.out',
          stagger: 0.03
        },
        0
      );
    }
  }
  
  // Finsweet list: just fade in (no movement)
  if (finsweetList) {
    tl.fromTo(finsweetList,
      { opacity: 0 },
      { 
        opacity: 1, 
        duration: 0.4, 
        ease: 'sine.out'
      },
      0.2 // Slight delay after header starts
    );
  }
  
  console.log('✅ Finsweet page entrance animation complete');
}

// Ensure initAll only runs once
let hasInitialized = false;
function initAllOnce() {
  if (hasInitialized) {
    console.log('⏭️ initAll already ran, skipping duplicate call');
    return;
  }
  hasInitialized = true;
  initAll();
}

// Run immediately if DOM already loaded, otherwise wait for DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAllOnce);
} else {
  // DOM already loaded (e.g., if script loads late)
  setTimeout(initAllOnce, 0);
}

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
      // 🖼️ SCROLL FADE FOR MEDIA (idempotent, with stagger for row/grid items)
      // ============================================================================
      function initScrollImageFades(root) {
        if (!window.gsap || !window.ScrollTrigger) return;
        const scope = (root && root.querySelector && (root.querySelector('main') || root)) || document;
        const mediaEls = scope.querySelectorAll('img, picture, video, [data-animate-media]');
        
        // Group media elements by rough vertical position (bucket by ~100px)
        const groups = {};
        mediaEls.forEach((el) => {
          if (el.dataset.scrollFadeBound) return;
          
          // EXCLUDE items inside .creators_wrap from stagger animation
          if (el.closest('.creators_wrap')) {
            el.dataset.scrollFadeBound = 'true';
            return;
          }
          
          const rect = el.getBoundingClientRect();
          const visibleNow = rect.top < window.innerHeight * 0.9 && rect.bottom > 0;
          el.dataset.scrollFadeBound = 'true';
          if (!visibleNow) gsap.set(el, { opacity: 0 });
          
          // Bucket by vertical center rounded to nearest 100px
          const bucket = Math.round((rect.top + rect.height / 2) / 100) * 100;
          if (!groups[bucket]) groups[bucket] = [];
          groups[bucket].push(el);
        });
        
        // For each group, create one ScrollTrigger that staggers the items
        Object.values(groups).forEach((group) => {
          if (group.length === 0) return;
          // Use the first element as the trigger for the whole group
          ScrollTrigger.create({
            trigger: group[0],
            start: 'top 85%',
            once: true,
            onEnter: () => {
              gsap.to(group, { opacity: 1, duration: 0.8, ease: 'sine.inOut', stagger: 0.08 });
            }
          });
        });
      }

      // Helper: combined reveal – container fade plus media-then-text sequence
      function revealContainerWithMediaThenText(root) {
        if (!window.gsap) return null;
        const scope = (root && root.querySelector && (root.querySelector('main') || root)) || document;
        const mediaEls = scope.querySelectorAll('img, picture, video, [data-animate-media]');
        const textEls = scope.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption,.button_main_wrap,[data-animate-text]');
        
        // EXCLUDE items inside .creators_wrap from page transition stagger
        const mediaElsFiltered = Array.from(mediaEls).filter(el => !el.closest('.creators_wrap'));
        const textElsFiltered = Array.from(textEls).filter(el => !el.closest('.creators_wrap'));
        
        const tl = gsap.timeline();
        // Prepare inner elements first so we don't see a second fade after container appears
        tl.set(mediaElsFiltered, { opacity: 0 }, 0);
        tl.set(textElsFiltered, { opacity: 0, y: '1vh' }, 0);
        // Container enters (fade only)
        tl.fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'sine.inOut' }, 0);
        // Media first (fade only) only for visible items now, hidden ones will fade on scroll
        const visibleMedia = mediaElsFiltered.filter((el) => {
          const r = el.getBoundingClientRect();
          return r.top < window.innerHeight * 0.9 && r.bottom > 0;
        });
        if (visibleMedia.length) {
          tl.to(visibleMedia, { opacity: 1, duration: 0.5, ease: 'sine.inOut', stagger: 0.05 }, 0.05);
        }
        tl.to(textElsFiltered, { opacity: 1, y: 0, duration: 0.6, ease: 'sine.inOut', stagger: 0.03 }, '-=0.2');
        // Bind scroll fades for non-visible media after reveal
        tl.call(() => { try { initScrollImageFades(root); } catch (e) {} });
        return tl;
      }

      // Helper: leave – fade images+overlays, fade+move text down, then fade container
      function leaveMediaAndText(root) {
        if (!window.gsap) return null;
        const scope = (root && root.querySelector && (root.querySelector('main') || root)) || document;
        const mediaEls = scope.querySelectorAll('img, picture, video, .overlay_wrap, [data-animate-media]');
        const textEls = scope.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption,.button_main_wrap,[data-animate-text]');
        
        // EXCLUDE items inside .creators_wrap from page transition stagger
        const mediaElsFiltered = Array.from(mediaEls).filter(el => !el.closest('.creators_wrap'));
        const textElsFiltered = Array.from(textEls).filter(el => !el.closest('.creators_wrap'));
        
        const tl = gsap.timeline();
        tl.to(mediaElsFiltered, { opacity: 0, duration: 0.2, ease: 'sine.inOut', stagger: 0.01 }, 0);
        tl.to(textElsFiltered, { y: '0.5vh', opacity: 0, duration: 0.25, ease: 'sine.inOut', stagger: 0.01 }, 0);
        tl.to(root, { opacity: 0, duration: 0.2, ease: 'sine.inOut' }, '-=0.12');
        return tl;
      }

      // EARLY INTERCEPTION: Catch clicks to Finsweet page BEFORE Barba processes them
      // This prevents the flicker from Barba starting its transition
      document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href]');
        if (!link) return;
        
        const href = link.getAttribute('href');
        if (href && (href.includes('/creator-grid-fin') || href.includes('creator-grid-fin'))) {
          // Let the browser handle this normally (full page load)
          // Don't preventDefault - we want the normal navigation
          console.log('⚡ Early intercept: Finsweet page detected, allowing normal navigation');
        }
      }, true); // Use capture phase to run before Barba
      
      barba.init({
        prevent: ({ el, href }) => {
          const currentUrl = window.location.href;
          const isOnFinsweetPage = currentUrl.includes('/creator-grid-fin') || currentUrl.includes('creator-grid-fin');
          const isGoingToFinsweetPage = href && (href.includes('/creator-grid-fin') || href.includes('creator-grid-fin'));
          
          // If going TO Finsweet page, prevent Barba (do full reload)
          if (isGoingToFinsweetPage) {
            console.log('🚫 Barba: Preventing Finsweet page (full reload)');
            return true;
          }
          
          // If ON Finsweet page, only prevent pagination/filter clicks
          if (isOnFinsweetPage) {
            console.log('✅ On Finsweet page, checking if it\'s pagination/filter...');
            
            // Check if URL has pagination params
            if (href && href.includes('_page=')) {
              console.log('🚫 Barba: Finsweet pagination URL');
              return true;
            }
            
            // Check if it's a pagination button (not a link inside a list item)
            if ((el.hasAttribute('fs-list-element') && el.getAttribute('fs-list-element') === 'page-button') ||
                (el.closest('[fs-list-element="page-button"]'))) {
              console.log('🚫 Barba: Finsweet pagination button');
              return true;
            }
            
            // Check if it's prev/next buttons
            if (el.classList.contains('w-pagination-previous') || 
                el.classList.contains('w-pagination-next') ||
                el.closest('.w-pagination-previous') ||
                el.closest('.w-pagination-next')) {
              console.log('🚫 Barba: Prev/Next pagination');
              return true;
            }
            
            // Allow all other links (including links to leave the page)
            console.log('✅ Allowing Barba transition');
            return false;
          }
          
          // On other pages, allow Barba
          return false;
        },
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
                
                // Reinitialize Finsweet Filters after Barba transition
                try { 
                  initFinsweetFilters(); 
                  // Wait a bit for Finsweet to finish, then init animations
                  setTimeout(() => {
                    try { initFinsweetAnimations(); } catch (e) { console.warn('Finsweet animations init failed', e); }
                  }, 200);
                } catch (e) { 
                  console.warn('Finsweet init failed on enter', e); 
                }
                
                try { initPaginationReinit(); } catch (e) { console.warn('Pagination reinit failed on enter', e); }
                try { initCreatorHoverPreviews(); } catch (e) { console.warn('Creator hover preview init failed on enter', e); }
                try { initCreatorGridToggle(); } catch (e) { console.warn('Creator grid toggle init failed on enter', e); }
              }
            },
            async once(data) {
              console.log('🎬 Barba ONCE hook fired');
              
              // Skip Barba animation on Finsweet page (it has its own animation)
              const isOnFinsweetPage = window.location.href.includes('/creator-grid-fin') || window.location.href.includes('creator-grid-fin');
              if (isOnFinsweetPage) {
                console.log('ℹ️ Finsweet page - skipping Barba animation (already animated)');
                return;
              }
              
              if (window.gsap && data && data.next && data.next.container) {
                const tl = revealContainerWithMediaThenText(data.next.container);
                try { initScrollImageFades(data.next.container); } catch (e) {}
                try { initAccordions(); } catch (e) { console.warn('Accordion init failed on once', e); }
                // Wait for reveal animation to complete
                if (tl && tl.then) {
                  await tl;
                } else if (tl && tl.duration) {
                  await new Promise(resolve => setTimeout(resolve, tl.duration() * 1000 + 100));
                }
                try { initCreatorHoverPreviews(); } catch (e) { console.warn('Creator hover preview init failed on once', e); }
                try { initCreatorGridToggle(); } catch (e) { console.warn('Creator grid toggle init failed on once', e); }
              } else {
                console.warn('⚠️ Barba once hook: no GSAP or container');
                try { initAccordions(); } catch (e) {}
                try { initCreatorHoverPreviews(); } catch (e) {}
                try { initCreatorGridToggle(); } catch (e) {}
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
          try { initFinsweetFilters(); } catch (e) {}
          try { initPaginationReinit(); } catch (e) {}
          try { initCreatorHoverPreviews(); } catch (e) {}
          try { initCreatorGridToggle(); } catch (e) {}
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
