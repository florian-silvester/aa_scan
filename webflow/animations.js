
console.log('🚀🚀🚀 ANIMATIONS.JS FILE LOADED 🚀🚀🚀');

// (Initial hide now controlled by user CSS: .page_wrap.is-hidden { opacity: 0 }
//  We only reveal + animate when that combo class is present.)

// ================================================================================
// 🚫 TEMPORARY DISABLE FLAG FOR NEW CREATOR FEATURES
// ================================================================================
const ENABLE_CREATOR_ANIMATIONS = true; // Set to true to re-enable

// ================================================================================
// 🚀 SMART NAV - Hide/Show with scroll intent (only on index_wrap pages)
// Uses Headroom.js for reliable scroll detection
// ================================================================================
function initSmartNav() {
  const nav = document.querySelector('.nav_component');
  const indexWrap = document.querySelector('.index_wrap');
  
  console.log('🔍 Smart Nav Debug:', {
    navFound: !!nav,
    indexWrapFound: !!indexWrap,
    navClasses: nav ? nav.className : 'N/A',
    alreadyBound: nav ? nav.dataset.smartNavBound : 'N/A'
  });
  
  // Only activate on pages with .index_wrap
  if (!nav || !indexWrap) {
    console.log('⏭️ Smart nav: Not on index page, skipping');
    return;
  }
  
  if (nav.dataset.smartNavBound === 'true') {
    console.log('⏭️ Smart nav already bound, skipping');
    return;
  }
  nav.dataset.smartNavBound = 'true';
  
  if (!window.Headroom) {
    console.warn('⚠️ Headroom.js not loaded');
    return;
  }
  
  console.log('🚀 Initializing Smart Nav (Headroom) for index_wrap section');
  
  const headroom = new Headroom(nav, {
    offset: 100,        // Start hiding after scrolling down 100px
    tolerance: {
      up: 100,         // Need 100px scroll up to show nav (intent threshold)
      down: 10         // Hide after 10px scroll down
    },
    classes: {
      initial: "headroom",
      pinned: "headroom--pinned",
      unpinned: "headroom--unpinned",
      top: "headroom--top",
      notTop: "headroom--not-top"
    }
  });
  
  headroom.init();
  console.log('✅ Smart Nav (Headroom) initialized');
}

// ================================================================================
// 🎨 NAV BACKGROUND PER SECTION
// ================================================================================
function initNavBackgroundPerSection() {
  if (!window.gsap || !window.ScrollTrigger) return;
  
  const navDesktopContain = document.querySelector('.nav_desktop_contain');
  if (!navDesktopContain) {
    console.warn('⚠️ .nav_desktop_contain not found');
    return;
  }
  
  const sections = document.querySelectorAll('[data-nav-background="on"]');
  console.log(`🎨 Found ${sections.length} section(s) with data-nav-background="on"`);
  
  if (sections.length === 0) {
    // No sections with background attribute, ensure background is removed
    navDesktopContain.classList.remove('u-background-1');
    return;
  }
  
  sections.forEach((section) => {
    ScrollTrigger.create({
      trigger: section,
      start: 'top 80px', // When section reaches bottom of nav
      end: 'bottom 80px',
      onEnter: () => {
        navDesktopContain.classList.add('u-background-1');
        console.log('✅ Nav background added (entering section)');
      },
      onLeave: () => {
        navDesktopContain.classList.remove('u-background-1');
        console.log('🧹 Nav background removed (leaving section)');
      },
      onEnterBack: () => {
        navDesktopContain.classList.add('u-background-1');
        console.log('✅ Nav background added (entering back)');
      },
      onLeaveBack: () => {
        navDesktopContain.classList.remove('u-background-1');
        console.log('🧹 Nav background removed (leaving back)');
      }
    });
  });
  
  console.log('✅ Nav background per section initialized');
}

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
// 🔁 LIST ↔ GRID TOGGLE (GSAP Flip)
// - Toggle buttons: [toggle="is-grid"] and [toggle="is-list"]
// - Toggles classes on .index_collection and nested elements
// - Grid view: .index_layout.u-grid-autofit, .index_item.is-in-grid
// - List view: .index_layout.u-flex-vertical-wrap, .index_item.is-in-row
// ================================================================================
function initCreatorGridToggle() {
  console.log('🔁 initCreatorGridToggle called');
  if (!ENABLE_CREATOR_ANIMATIONS) {
    console.log('⏭️ ENABLE_CREATOR_ANIMATIONS is false, skipping');
    return;
  }
  
  const activeContainer = document.querySelector('[data-barba="container"]:not([aria-hidden="true"])') || document;
  const collection = activeContainer.querySelector('.index_collection');
  console.log('🔍 Looking for .index_collection:', collection ? '✅ Found' : '❌ Not found');
  if (!collection) return;

  const gridBtn = activeContainer.querySelector('[toggle="is-grid"]');
  const listBtn = activeContainer.querySelector('[toggle="is-list"]');
  console.log('🔍 Grid button:', gridBtn ? '✅ Found' : '❌ Not found');
  console.log('🔍 List button:', listBtn ? '✅ Found' : '❌ Not found');
  if (!gridBtn || !listBtn) return;
  
  if (gridBtn.dataset.gridToggleBound === 'true') {
    console.log('⏭️ Buttons already bound, skipping');
    return;
  }
  gridBtn.dataset.gridToggleBound = 'true';
  listBtn.dataset.gridToggleBound = 'true';

  const layout = collection.querySelector('.index_layout');
  const items = () => Array.from(collection.querySelectorAll('.index_item'));

  // Helper: robustly detect current view from DOM
  const detectViewFromDom = () => {
    // 1) Explicit flags on collection
    if (collection.classList.contains('is-list-view')) return 'list';
    if (collection.classList.contains('is-grid-view')) return 'grid';

    // 2) Layout classes
    const layoutHasFlexWrap = layout && layout.classList.contains('u-flex-vertical-wrap');
    const layoutHasGridAutofit = layout && layout.classList.contains('u-grid-autofit');
    if (layoutHasFlexWrap && !layoutHasGridAutofit) return 'list';
    if (layoutHasGridAutofit && !layoutHasFlexWrap) return 'grid';

    // 3) Item-level markers
    const anyRow = collection.querySelector('.index_item.is-in-row');
    const anyGrid = collection.querySelector('.index_item.is-in-grid');
    if (anyRow && !anyGrid) return 'list';
    if (anyGrid && !anyRow) return 'grid';

    // 4) Fallback – prefer list as default per current design
    return 'list';
  };

  // Detect and save initial view state from DOM
  if (!collection.dataset.currentView) {
    const detected = detectViewFromDom();
    collection.dataset.currentView = detected;
    console.log('📌 Initial view detected:', detected.toUpperCase());
  }

  console.log('✅ Grid toggle initialized, buttons bound');

  // ============================================================================
  // 🎯 CLASS CONFIGURATION - All class changes defined here in one place
  // ============================================================================
  const classConfig = {
    // Parent collection
    '.index_collection': {
      grid: ['is-grid-view'],
      list: ['is-list-view']
    },
    // Layout wrapper
    '.index_layout': {
      grid: ['u-grid-autofit'],
      list: ['u-flex-vertical-wrap']
    },
    // Each item
    '.index_item': {
      grid: ['is-in-grid'],
      list: ['is-in-row', 'u-flex-horizontal-wrap', 'u-padding-block-1', 'u-position-relative', 'u-width-full', 'u-gap-1']
    },
    // Item name/heading
    '.index_name': {
      grid: ['u-text-style-h2'], // Add u-text-style-h2 for consistent styling
      list: ['u-flex-grow', 'u-text-style-h2', 'is-first', 'u-alignment-start']
    },
    // Description wrapper (NOTE: it's "decription" not "description" - missing 's'!)
    '.index_decription_wrap': {
      grid: ['is-hidden'],
      list: ['u-max-width-20ch', 'u-flex-grow']
    },
    // Utility group wrappers
    '.g_medium': {
      grid: ['u-display-none'],
      list: []
    },
    '.g_view': {
      grid: ['u-display-none'],
      list: []
    },
    // Image - remove padding in list view
    '.index_item img, .index_item picture': {
      grid: ['u-padding-7'],
      list: []
    },
    // First u-content-wrapper (image wrapper)
    '.index_item > [data-wf--content-wrapper--alignment="inherit"]:nth-child(4) .u-content-wrapper': {
      grid: [],
      list: ['u-max-width-16ch']
    },
    // Second u-content-wrapper (text wrapper with heading)
    '.index_item > [data-wf--content-wrapper--alignment="inherit"]:nth-child(5) .u-content-wrapper': {
      grid: ['u-display-none'],
      list: []
    }
  };

  // Extra cleanup classes to always remove for certain selectors
  const cleanupClassesBySelector = {
    '.index_item': ['u-align-items-start']
  };

  // ============================================================================
  // 🔄 APPLY CLASSES - Universal function that applies config
  // ============================================================================
  const applyViewClasses = (view) => {
    console.log(`🎨 Applying ${view.toUpperCase()} view classes`);
    
    Object.keys(classConfig).forEach(selector => {
      const config = classConfig[selector];
      
      // Special handling for .index_collection (the parent container)
      let elements;
      if (selector === '.index_collection') {
        elements = [collection];
      } else {
        elements = Array.from(collection.querySelectorAll(selector));
      }
      
      elements.forEach(el => {
        // Remove ALL classes from both views (to avoid duplicates)
        const cleanup = cleanupClassesBySelector[selector] || [];
        const allClasses = [...config.grid, ...config.list, ...cleanup];
        el.classList.remove(...allClasses);
        
        // Add classes for current view
        const classesToAdd = config[view];
        if (classesToAdd && classesToAdd.length > 0) {
          el.classList.add(...classesToAdd);
        }
      });
    });
    
    console.log(`✅ ${view.toUpperCase()} view classes applied`);
  };

  // Normalize initial classes now that helper is defined
  {
    const initialView = collection.dataset.currentView || detectViewFromDom();
    collection.dataset.currentView = initialView;
    applyViewClasses(initialView);
  }

  const showGridView = () => {
    const elItems = items();
    console.log('🎨 Switching to GRID view');
    // Save state
    collection.dataset.currentView = 'grid';
    // Fade out quickly
    gsap.to(elItems, { opacity: 0, duration: 0.15, ease: 'power1.inOut', onComplete: () => {
      applyViewClasses('grid');
      // Fade in with minimal stagger
      gsap.to(elItems, { opacity: 1, duration: 0.25, ease: 'power1.out', stagger: 0.01, onComplete: () => {
        // Reapply image fade animations after view change
        resetAndReapplyImageFades();
      }});
    }});
  };

  const showListView = () => {
    const elItems = items();
    console.log('🎨 Switching to LIST view');
    // Save state
    collection.dataset.currentView = 'list';
    // Fade out quickly
    gsap.to(elItems, { opacity: 0, duration: 0.15, ease: 'power1.inOut', onComplete: () => {
      applyViewClasses('list');
      // Fade in with minimal stagger
      gsap.to(elItems, { opacity: 1, duration: 0.25, ease: 'power1.out', stagger: 0.01, onComplete: () => {
        // Reapply image fade animations after view change
        resetAndReapplyImageFades();
      }});
    }});
  };
  
  // ============================================================================
  // 🔄 RESET AND REAPPLY IMAGE FADES - For view toggle
  // ============================================================================
  const resetAndReapplyImageFades = () => {
    const images = collection.querySelectorAll('img, picture img');
    
    // Kill existing ScrollTriggers and reset flags
    images.forEach((img) => {
      // Find and kill any ScrollTriggers associated with this image
      ScrollTrigger.getAll().forEach(trigger => {
        if (trigger.trigger === img) {
          trigger.kill();
        }
      });
      
      // Reset the bound flag so initScrollImageFadesForFinsweet can rebind
      delete img.dataset.finsweetScrollBound;
    });
    
    // Reapply the fade animations
    try {
      initScrollImageFadesForFinsweet();
    } catch (e) {
      console.warn('Failed to reapply image fades:', e);
    }
  };
  
  // ============================================================================
  // 🔄 FINSWEET PAGINATION FIX - Reapply view after Finsweet updates DOM
  // ============================================================================
  const observeFinsweet = () => {
    const listContainer = collection.querySelector('.w-dyn-items');
    if (!listContainer) return;
    
    const observer = new MutationObserver((mutations) => {
      const hasChanges = mutations.some(m => m.type === 'childList');
      if (hasChanges) {
        // Get saved view state
        const currentView = collection.dataset.currentView || detectViewFromDom();
        collection.dataset.currentView = currentView;
        console.log(`🔄 Finsweet updated DOM, reapplying ${currentView} view and hover effects`);
        
        // Reapply classes without animation (instant)
        applyViewClasses(currentView);
        
        // Reinitialize hover effects for new items
        try { initImageHoverEffects(); } catch (e) { console.warn('Hover reinit failed', e); }
      }
    });
    
    observer.observe(listContainer, { childList: true, subtree: false });
    console.log('✅ Finsweet observer attached');
  };
  
  observeFinsweet();

  // Handle clicks on button_main_wrap and its children (Clickable component)
  const handleGridClick = (e) => {
    console.log('🖱️ Grid button clicked');
    e.preventDefault();
    e.stopPropagation();
    showGridView();
  };
  
  const handleListClick = (e) => {
    console.log('🖱️ List button clicked');
    e.preventDefault();
    e.stopPropagation();
    showListView();
  };
  
  gridBtn.addEventListener('click', handleGridClick, true);
  listBtn.addEventListener('click', handleListClick, true);
  
  console.log('✅ Click listeners attached');
}

// ================================================================================
// 🖱️ IMAGE HOVER EFFECTS - Subtle fade on hover
// ================================================================================
function initImageHoverEffects() {
  if (!window.gsap) return;
  
  // Find all index items
  const items = document.querySelectorAll('.index_item');
  
  items.forEach(item => {
    // Find the image inside .u-display-contents that has .clickable_wrap as sibling
    const clickable = item.querySelector('.clickable_wrap');
    if (!clickable) return;
    
    // Find image in the same item
    const image = item.querySelector('.u-display-contents img, .u-display-contents picture img');
    if (!image) return;
    
    // Make sure the image container has overflow hidden
    const imageContainer = image.closest('.u-display-contents');
    if (imageContainer) {
      imageContainer.style.overflow = 'hidden';
    }
    
    // Set initial state
    gsap.set(image, { scale: 1 });
    
    // Find the index_name element
    const indexName = item.querySelector('.index_name');
    
    // Set initial opacity for index_name (full opacity)
    if (indexName) {
      gsap.set(indexName, { opacity: 1 });
    }
    
    // Hover in - zoom in image + fade DOWN index_name
    const onEnter = () => {
      gsap.to(image, { 
        scale: 1.05, 
        duration: 0.4, 
        ease: 'power3.out' 
      });
      
      // Fade index_name to 30% opacity on hover (only in list view)
      if (indexName) {
        const collection = item.closest('.index_collection');
        const isListView = collection && !collection.classList.contains('is-grid-view');
        if (isListView) {
          gsap.to(indexName, {
            opacity: 0.3,
            duration: 0.4,
            ease: 'power3.out'
          });
        }
      }
    };
    
    // Hover out - zoom back + fade UP index_name
    const onLeave = () => {
      gsap.to(image, { 
        scale: 1, 
        duration: 0.4, 
        ease: 'power3.out' 
      });
      
      // Fade index_name back to full opacity (only in list view)
      if (indexName) {
        const collection = item.closest('.index_collection');
        const isListView = collection && !collection.classList.contains('is-grid-view');
        if (isListView) {
          gsap.to(indexName, {
            opacity: 1,
            duration: 0.4,
            ease: 'power3.out'
          });
        }
      }
    };
    
    // Bind to the item (entire row is hoverable)
    item.addEventListener('mouseenter', onEnter);
    item.addEventListener('mouseleave', onLeave);
  });
  
  console.log('✅ Image hover effects initialized');
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
  
  // Add 'is-current' class to current pagination button
  const updatePaginationCurrent = () => {
    // Remove is-current from all pagination buttons
    document
      .querySelectorAll('[fs-list-element="page-button"]')
      .forEach(el => el.classList.remove('is-current'));
    
    // Add is-current to the active one
    document
      .querySelectorAll('[fs-list-element="page-button"][aria-current="page"]')
      .forEach(el => el.classList.add('is-current'));
    
    console.log('🔄 Updated pagination current class');
  };
  
  // Run on init
  document.addEventListener('fsAttributesInit', updatePaginationCurrent);
  
  // Also run whenever pagination changes
  const paginationWrapper = document.querySelector('.w-pagination-wrapper');
  if (paginationWrapper) {
    const observer = new MutationObserver(updatePaginationCurrent);
    observer.observe(paginationWrapper, { 
      attributes: true, 
      attributeFilter: ['aria-current'],
      subtree: true 
    });
    console.log('✅ Pagination observer attached');
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
      
      // Set all images inside visible items to opacity 0 FIRST (for scroll trigger)
      visibleItems.forEach(item => {
        const images = item.querySelectorAll('img, picture img');
        images.forEach(img => gsap.set(img, { opacity: 0 }));
      });
      
      // Fade in containers immediately (but images stay at 0)
      gsap.fromTo(visibleItems,
        { opacity: 0 },
        { 
          opacity: 1, 
          duration: 0.35, 
          ease: 'sine.out',
          stagger: 0.02,
          delay: 0.05,
          onComplete: () => {
            isAnimating = false;
            // After containers are visible, add scroll triggers for images
            initScrollImageFadesForFinsweet();
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
      
      // Wait a bit for Finsweet to update results count, then scroll
      setTimeout(() => {
        const scrollTarget = document.querySelector('.index_wrap');
        if (scrollTarget) {
          // Scroll to very top of index_wrap (0 offset)
          const targetY = scrollTarget.getBoundingClientRect().top + window.scrollY;
          window.scrollTo(0, targetY);
        }
      }, 100);
      
      // Trigger animation
      setTimeout(animateItems, 150);
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
// 📜 SCROLL FADE FOR FINSWEET IMAGES - Images fade on scroll
// ================================================================================
function initScrollImageFadesForFinsweet() {
  if (!window.gsap || !window.ScrollTrigger) return;
  
  const images = document.querySelectorAll('.index_collection img, .index_collection picture img');
  const aboveFold = [];
  const belowFold = [];
  
  images.forEach((img) => {
    // Clear the bound flag to allow re-binding
    delete img.dataset.finsweetScrollBound;
    
    const rect = img.getBoundingClientRect();
    const visibleNow = rect.top < window.innerHeight * 0.85;
    
    if (visibleNow) {
      aboveFold.push(img);
    } else {
      belowFold.push(img);
      // Set to 0 for scroll trigger
      const parent = img.parentElement;
      const hasOverlaySibling = parent && parent.querySelector('.overlay_wrap.u-nav-theme-overlay');
      if (hasOverlaySibling) {
        gsap.set(img, { opacity: 0, scale: 1.05 });
      } else {
        gsap.set(img, { opacity: 0 });
      }
    }
  });
  
  console.log(`📊 Above fold: ${aboveFold.length}, Below fold: ${belowFold.length}`);
  
  // Animate above-fold images with stagger
  if (aboveFold.length > 0) {
    // Check if images have overlay sibling (need scale animation)
    aboveFold.forEach(img => {
      const parent = img.parentElement;
      const hasOverlaySibling = parent && parent.querySelector('.overlay_wrap.u-nav-theme-overlay');
      
      if (hasOverlaySibling) {
        gsap.fromTo(img, 
          { opacity: 0, scale: 1.05 },
          { opacity: 1, scale: 1, duration: 0.6, ease: 'sine.out' }
        );
      } else {
        gsap.to(img, { opacity: 1, duration: 0.6, ease: 'sine.out' });
      }
    });
  }
  
  // Add scroll triggers for below-fold images
  belowFold.forEach((img) => {
    img.dataset.finsweetScrollBound = 'true';
    
    const parent = img.parentElement;
    const hasOverlaySibling = parent && parent.querySelector('.overlay_wrap.u-nav-theme-overlay');
    
    // Listen for image load to refresh ScrollTrigger positions
    const refreshOnLoad = () => {
      ScrollTrigger.refresh();
    };
    
    // If image is not yet loaded, wait for it
    if (!img.complete) {
      img.addEventListener('load', refreshOnLoad, { once: true });
      img.addEventListener('error', refreshOnLoad, { once: true });
    }
    
    ScrollTrigger.create({
      trigger: img,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        if (hasOverlaySibling) {
          gsap.to(img, { opacity: 1, scale: 1, duration: 0.8, ease: 'sine.inOut' });
        } else {
          gsap.to(img, { opacity: 1, duration: 0.8, ease: 'sine.inOut' });
        }
      }
    });
  });
  
  console.log(`✅ Scroll triggers: ${aboveFold.length} immediate, ${belowFold.length} on scroll`);
  
  // Watch for lazy-loaded images being added to DOM
  if (!window._finsweetImageObserver) {
    const collection = document.querySelector('.index_collection');
    if (collection) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          // Handle new nodes being added
          mutation.addedNodes.forEach((node) => {
            // Check if added node is an image or contains images
            const images = [];
            if (node.nodeName === 'IMG') {
              images.push(node);
            } else if (node.querySelectorAll) {
              images.push(...node.querySelectorAll('img'));
            }
            
            // Bind ScrollTriggers to new images
            images.forEach((img) => {
              if (img.dataset.finsweetScrollBound) return;
              img.dataset.finsweetScrollBound = 'true';
              
              const parent = img.parentElement;
              const hasOverlaySibling = parent && parent.querySelector('.overlay_wrap.u-nav-theme-overlay');
              
              // Set initial state
              if (hasOverlaySibling) {
                gsap.set(img, { opacity: 0, scale: 1.05 });
              } else {
                gsap.set(img, { opacity: 0 });
              }
              
              // Listen for image load to refresh ScrollTrigger
              const refreshOnLoad = () => {
                ScrollTrigger.refresh();
              };
              
              if (!img.complete) {
                img.addEventListener('load', refreshOnLoad, { once: true });
                img.addEventListener('error', refreshOnLoad, { once: true });
              }
              
              // Create trigger
              ScrollTrigger.create({
                trigger: img,
                start: 'top 85%',
                once: true,
                onEnter: () => {
                  if (hasOverlaySibling) {
                    gsap.to(img, { opacity: 1, scale: 1, duration: 0.8, ease: 'sine.inOut' });
                  } else {
                    gsap.to(img, { opacity: 1, duration: 0.8, ease: 'sine.inOut' });
                  }
                }
              });
            });
          });
          
          // Handle attribute changes (Webflow lazy loading changes src)
          if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
            const img = mutation.target;
            if (img.nodeName === 'IMG' && !img.dataset.finsweetScrollBound) {
              img.dataset.finsweetScrollBound = 'true';
              
              const parent = img.parentElement;
              const hasOverlaySibling = parent && parent.querySelector('.overlay_wrap.u-nav-theme-overlay');
              
              // Set initial state
              if (hasOverlaySibling) {
                gsap.set(img, { opacity: 0, scale: 1.05 });
              } else {
                gsap.set(img, { opacity: 0 });
              }
              
              // Listen for image load to refresh ScrollTrigger
              const refreshOnLoad = () => {
                ScrollTrigger.refresh();
              };
              
              if (!img.complete) {
                img.addEventListener('load', refreshOnLoad, { once: true });
                img.addEventListener('error', refreshOnLoad, { once: true });
              }
              
              // Create trigger
              ScrollTrigger.create({
                trigger: img,
                start: 'top 85%',
                once: true,
                onEnter: () => {
                  if (hasOverlaySibling) {
                    gsap.to(img, { opacity: 1, scale: 1, duration: 0.8, ease: 'sine.inOut' });
                  } else {
                    gsap.to(img, { opacity: 1, duration: 0.8, ease: 'sine.inOut' });
                  }
                }
              });
            }
            
            // Refresh ScrollTrigger when src changes
            ScrollTrigger.refresh();
          }
        });
      });
      
      observer.observe(collection, { 
        childList: true, 
        subtree: true, 
        attributes: true, 
        attributeFilter: ['src', 'srcset'] 
      });
      window._finsweetImageObserver = observer;
      console.log('👀 Watching for lazy-loaded images in Finsweet collection');
    }
  }
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
    initSmartNav();
  } catch (e) {
    console.error('Smart nav failed', e);
  }
  try {
    initNavColorChange();
  } catch (e) {
    console.error('Nav color change failed', e);
  }
  try {
    initNavBackgroundPerSection();
  } catch (e) {
    console.error('Nav background per section failed', e);
  }
  
  // DON'T call initAccordions or initScrollImageFades here - they're defined inside Barba IIFE
  // Barba hooks will handle them
  
  // If this page has the hidden wrapper, run the entrance animation
  if (document.querySelector('.page_wrap.is-hidden')) {
    console.log('🎬 Finsweet page detected, applying entrance animation...');
    try { 
      const animationTimeline = initFinsweetPageAnimation();
      // Wait for animation to complete before initializing other features
      if (animationTimeline) {
        animationTimeline.eventCallback('onComplete', () => {
          initFinsweetFeatures();
        });
      } else {
        initFinsweetFeatures();
      }
    } catch (e) { 
      console.warn('Finsweet page animation failed', e);
      initFinsweetFeatures();
    }
  } else {
    // Not a Finsweet page, init features normally
    initFinsweetFeatures();
  }
}

// Initialize Finsweet features (called after page animation completes)
function initFinsweetFeatures() {
  console.log('🎨 Initializing Finsweet features after animation');
  
  // Initialize tabs first (before other features)
  try { initTabs(); } catch (e) { console.warn('Tabs init failed', e); }
  
  // Initialize Finsweet Filters (always)
  try { initFinsweetFilters(); } catch (e) { console.warn('Finsweet init failed', e); }
  
  // Initialize Finsweet Animations (smooth transitions on filter/pagination)
  try { initFinsweetAnimations(); } catch (e) { console.warn('Finsweet animations init failed', e); }
  
  // Initialize scroll fades for Finsweet images (after items are loaded)
  setTimeout(() => {
    try { initScrollImageFadesForFinsweet(); } catch (e) { console.warn('Finsweet scroll fades init failed', e); }
  }, 100);
  
  // Initialize pagination reinit (always, not just for creators)
  try { initPaginationReinit(); } catch (e) { console.warn('Pagination reinit failed', e); }
  
  // Only init creator animations if elements exist
  if (document.querySelector('.index_collection')) {
    try { initCreatorGridToggle(); } catch (e) { console.warn('Creator grid toggle init failed', e); }
    try { initImageHoverEffects(); } catch (e) { console.warn('Image hover effects init failed', e); }
  }
}

// ================================================================================
// 🎯 TABS INITIALIZATION
// ================================================================================
function initTabs() {
  document.querySelectorAll(".tab_wrap").forEach((tabWrap, componentIndex) => {
    if (tabWrap.dataset.scriptInitialized) return;
    tabWrap.dataset.scriptInitialized = "true";
    let loopControls = tabWrap.getAttribute("data-loop-controls") === "true",
      slideTabs = tabWrap.getAttribute("data-slide-tabs") === "true",
      pauseOnHover = tabWrap.getAttribute("data-pause-on-hover") === "true",
      autoplay = Number(tabWrap.getAttribute("data-autoplay-duration")) || 0,
      duration = Number(tabWrap.getAttribute("data-duration")) || 0.3,
      buttonList = tabWrap.querySelector(".tab_button_list"),
      panelList = tabWrap.querySelector(".tab_content_list"),
      previousButton = tabWrap.querySelector("[data-tab='previous'] button"),
      nextButton = tabWrap.querySelector("[data-tab='next'] button"),
      toggleWrap = tabWrap.querySelector("[data-tab-button='toggle']"),
      toggleButton = tabWrap.querySelector("[data-tab-button='toggle'] button"),
      animating = false,
      autoplayTl;

    function removeCMSList(slot) {
      const dynList = Array.from(slot.children).find((child) => child.classList.contains("w-dyn-list"));
      if (!dynList) return;
      const nestedItems = dynList?.firstElementChild?.children;
      if (!nestedItems) return;
      const staticWrapper = [...slot.children];
      [...nestedItems].forEach(el => el.firstElementChild && slot.appendChild(el.firstElementChild));
      staticWrapper.forEach((el) => el.remove());
    }
    removeCMSList(buttonList);
    removeCMSList(panelList);

    let buttonItems = Array.from(buttonList.children);
    let panelItems = Array.from(panelList.children);

    if (!buttonList || !panelList || !buttonItems.length || !panelItems.length) {
      console.warn("Missing elements in:", tabWrap);
      return;
    }

    panelItems.forEach((panel, i) => {panel.style.display = "none"; panel.setAttribute("role", "tabpanel");});
    buttonItems.forEach((button, i) => {button.setAttribute("role", "tab");});

    panelList.removeAttribute("role");
    buttonList.setAttribute("role", "tablist");
    buttonItems.forEach((btn) => btn.setAttribute("role", "tab"));
    panelItems.forEach((panel) => panel.setAttribute("role", "tabpanel"));

    let activeIndex = 0;
    const makeActive = (index, focus = false, animate = true, pause = true) => {
      if (animating) return;
      buttonItems.forEach((btn, i) => {
        btn.classList.toggle("is-active", i === index);
        btn.setAttribute("aria-selected", i === index ? "true" : "false");
        btn.setAttribute("tabindex", i === index ? "0" : "-1");
      });
      panelItems.forEach((panel, i) => panel.classList.toggle("is-active", i === index));
      if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();
      if (nextButton) nextButton.disabled = index === buttonItems.length - 1 && !loopControls;
      if (previousButton) previousButton.disabled = index === 0 && !loopControls;
      if (focus) buttonItems[index].focus();
      const previousPanel = panelItems[activeIndex];
      const currentPanel = panelItems[index];
      let direction = 1;
      if (activeIndex > index) direction = -1;
      
      if (typeof gsap !== "undefined" && animate && activeIndex !== index) {
        animating = true;
        let tl = gsap.timeline({ 
          onComplete: () => {
            animating = false;
          }, 
          defaults: { ease: "sine.out" } 
        });
        
        // Get media and text elements FIRST (before hiding previous panel)
        const mediaEls = currentPanel.querySelectorAll('img, picture, video, [data-animate-media]');
        const textEls = currentPanel.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, .button_main_wrap, [data-animate-text]');
        
        // Prepare current panel children (set to invisible)
        if (mediaEls.length > 0) {
          mediaEls.forEach(el => {
            const parent = el.parentElement;
            const hasOverlaySibling = parent && parent.querySelector('.overlay_wrap.u-nav-theme-overlay');
            if (hasOverlaySibling) {
              tl.set(el, { opacity: 0, scale: 1.05 }, 0);
            } else {
              tl.set(el, { opacity: 0 }, 0);
            }
          });
        }
        if (textEls.length > 0) {
          tl.set(textEls, { opacity: 0, y: '1vh' }, 0);
        }
        
        // Fade out previous panel
        if (previousPanel) {
          tl.to(previousPanel, { opacity: 0, duration: 0.2 });
          tl.set(previousPanel, { display: "none" });
        }
        
        // Show current panel (but children are still invisible)
        tl.set(currentPanel, { display: "block", opacity: 1 });
        
        // Animate media first
        if (mediaEls.length > 0) {
          mediaEls.forEach((el, i) => {
            const parent = el.parentElement;
            const hasOverlaySibling = parent && parent.querySelector('.overlay_wrap.u-nav-theme-overlay');
            if (hasOverlaySibling) {
              tl.to(el, { opacity: 1, scale: 1, duration: 0.8, ease: 'sine.out' }, 0.05 + (i * 0.05));
            } else {
              tl.to(el, { opacity: 1, duration: 0.8, ease: 'sine.out' }, 0.05 + (i * 0.05));
            }
          });
        }
        
        // Animate text with overlap
        if (textEls.length > 0) {
          tl.to(textEls, { opacity: 1, y: 0, duration: 0.6, ease: 'sine.out', stagger: 0.03 }, '-=0.2');
        }
      } else {
        if (previousPanel) previousPanel.style.display = "none";
        if (currentPanel) currentPanel.style.display = "block";
      }
      buttonList.scrollTo({ left: buttonItems[index].offsetLeft, behavior: 'smooth' });
      activeIndex = index;
    };

    makeActive(0, false, false);

    const updateIndex = (delta, focus = false, pause = true) => makeActive((activeIndex + delta + buttonItems.length) % buttonItems.length, focus, true, pause);
    nextButton?.addEventListener("click", () => updateIndex(1));
    previousButton?.addEventListener("click", () => updateIndex(-1));

    buttonItems.forEach((btn, index) => {
      let tabId = tabWrap.getAttribute("data-tab-component-id");
      tabId = tabId ? tabId.toLowerCase().replaceAll(" ", "-") : componentIndex + 1;
      let itemId = btn.getAttribute("data-tab-item-id");
      itemId = itemId ? itemId.toLowerCase().replaceAll(" ", "-") : index + 1;

      btn.setAttribute("id", "tab-button-" + tabId + "-" + itemId);
      btn.setAttribute("aria-controls", "tab-panel-" + tabId + "-" + itemId);
      panelItems[index].setAttribute("id", "tab-panel-" + tabId + "-" + itemId);
      panelItems[index].setAttribute("aria-labelledby", btn.id);
      
      if (new URLSearchParams(location.search).get("tab-id") === tabId + "-" + itemId) makeActive(index), autoplay = 0, tabWrap.scrollIntoView({behavior: "smooth", block: "start"}), history.replaceState({}, "", ((u) => (u.searchParams.delete("tab-id"), u))(new URL(location.href)));
      btn.addEventListener("click", () => makeActive(index));
      btn.addEventListener("keydown", (e) => {
        if (["ArrowRight", "ArrowDown"].includes(e.key)) updateIndex(1, true);
        else if (["ArrowLeft", "ArrowUp"].includes(e.key)) updateIndex(-1, true);
      });
    });

    if (autoplay !== 0 && typeof gsap !== "undefined") {
      autoplayTl = gsap.timeline({ repeat: -1 }).fromTo(tabWrap, {"--progress": 0}, { 
        onComplete: () => {
          // Restart autoplay timeline BEFORE changing tab (so progress restarts immediately)
          if (autoplayTl) autoplayTl.restart();
          updateIndex(1, false, false);
        }, 
        "--progress": 1, 
        ease: "none", 
        duration: autoplay 
      });
      let isHovered = false, hasFocusInside = false, prefersReducedMotion = false, inView = true, canPlay = true;
      function updateAuto() { if (prefersReducedMotion || !inView || canPlay || isHovered || hasFocusInside) autoplayTl.pause(); else autoplayTl.play(); }
      function setButton() {
        canPlay = !canPlay;
        toggleButton?.setAttribute("aria-pressed", !canPlay ? "true" : "false");
        toggleWrap?.classList.toggle("is-pressed", !canPlay);
        if (!canPlay) isHovered = hasFocusInside = prefersReducedMotion = false;
        updateAuto();
      }
      setButton();
      toggleButton?.addEventListener("click", function () {
        setButton();
      });
      function handleMotionChange(e) { prefersReducedMotion = e.matches; updateAuto(); }
      handleMotionChange(window.matchMedia("(prefers-reduced-motion: reduce)"));
      window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", handleMotionChange);
      if (pauseOnHover) tabWrap.addEventListener("mouseenter", () => { isHovered = true; updateAuto() });
      if (pauseOnHover) tabWrap.addEventListener("mouseleave", () => { hasFocusInside = false; isHovered = false; updateAuto() });
      tabWrap.addEventListener("focusin", () => { hasFocusInside = true; updateAuto() });
      tabWrap.addEventListener("focusout", e => { if (!e.relatedTarget || !tabWrap.contains(e.relatedTarget)) { hasFocusInside = false; updateAuto() } });
      new IntersectionObserver(e => { inView = e[0].isIntersecting; updateAuto(); }, { threshold: 0 }).observe(tabWrap);
    }
  });
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
  // Separate media and text for two-stage animation
  if (firstSection) {
    const mediaEls = firstSection.querySelectorAll('img, picture, video, [data-animate-media]');
    const textEls = firstSection.querySelectorAll('h1, h2, h3, h4, h5, h6, p, .button_main_wrap, [data-animate-text]');
    
    // Prepare elements
    tl.set(mediaEls, { opacity: 0 }, 0);
    tl.set(textEls, { opacity: 0, y: '1vh' }, 0);
    
    // Media first
    if (mediaEls.length > 0) {
      tl.to(mediaEls, { 
        opacity: 1, 
        duration: 0.5, 
        ease: 'sine.out',
        stagger: 0.05
      }, 0.05);
    }
    
    // Text follows with overlap
    if (textEls.length > 0) {
      tl.to(textEls, { 
        opacity: 1, 
        y: 0, 
        duration: 0.6, 
        ease: 'sine.out',
        stagger: 0.03
      }, '-=0.2');
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
  return tl; // Return timeline so we can wait for completion
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
        
        // Group images by vertical position (grid rows)
        const rows = {};
        
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
          
          // Skip if already visible
          if (visibleNow) return;
          
          // Set initial state for scroll trigger
          const parent = el.parentElement;
          const hasOverlaySibling = parent && parent.querySelector('.overlay_wrap.u-nav-theme-overlay');
          if (hasOverlaySibling) {
            gsap.set(el, { opacity: 0, scale: 1.05 });
          } else {
            gsap.set(el, { opacity: 0 });
          }
          
          // Group by vertical position (±30px tolerance for same row)
          const rowKey = Math.round(rect.top / 30) * 30;
          if (!rows[rowKey]) rows[rowKey] = [];
          rows[rowKey].push({ el, hasOverlaySibling });
        });
        
        // Create ScrollTriggers for each row
        Object.values(rows).forEach((row) => {
          if (row.length === 0) return;
          
          // Sort by horizontal position (left to right)
          row.sort((a, b) => a.el.getBoundingClientRect().left - b.el.getBoundingClientRect().left);
          
          if (row.length === 1) {
            // Single image - no stagger needed
            const { el, hasOverlaySibling } = row[0];
            
            // Listen for image load to refresh ScrollTrigger
            const refreshOnLoad = () => {
              ScrollTrigger.refresh();
            };
            
            if (el.nodeName === 'IMG' && !el.complete) {
              el.addEventListener('load', refreshOnLoad, { once: true });
              el.addEventListener('error', refreshOnLoad, { once: true });
            }
            
            ScrollTrigger.create({
              trigger: el,
              start: 'top 85%',
              once: true,
              onEnter: () => {
                if (hasOverlaySibling) {
                  gsap.to(el, { opacity: 1, scale: 1, duration: 0.8, ease: 'sine.inOut' });
                } else {
                  gsap.to(el, { opacity: 1, duration: 0.8, ease: 'sine.inOut' });
                }
              }
            });
          } else {
            // Multiple images in row - animate with stagger (grid detected)
            // Add load listeners for all images in the row
            row.forEach(({ el }) => {
              if (el.nodeName === 'IMG' && !el.complete) {
                const refreshOnLoad = () => {
                  ScrollTrigger.refresh();
                };
                el.addEventListener('load', refreshOnLoad, { once: true });
                el.addEventListener('error', refreshOnLoad, { once: true });
              }
            });
            
            ScrollTrigger.create({
              trigger: row[0].el,
              start: 'top 85%',
              once: true,
              onEnter: () => {
                row.forEach(({ el, hasOverlaySibling }, index) => {
                  const delay = index * 0.12; // Stagger delay
                  if (hasOverlaySibling) {
                    gsap.to(el, { opacity: 1, scale: 1, duration: 0.8, ease: 'sine.inOut', delay });
                  } else {
                    gsap.to(el, { opacity: 1, duration: 0.8, ease: 'sine.inOut', delay });
                  }
                });
              }
            });
          }
        });
        
        // Watch for lazy-loaded images being added to DOM (Webflow lazy loading)
        if (!scope._regularImageObserver) {
          const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              // Handle new nodes being added
              mutation.addedNodes.forEach((node) => {
                // Check if added node is an image or contains images
                const images = [];
                if (node.nodeName === 'IMG') {
                  images.push(node);
                } else if (node.querySelectorAll) {
                  images.push(...node.querySelectorAll('img, picture, video'));
                }
                
                // Bind ScrollTriggers to new images
                images.forEach((el) => {
                  if (el.dataset.scrollFadeBound) return;
                  if (el.closest('.creators_wrap')) return; // Skip Finsweet images
                  
                  el.dataset.scrollFadeBound = 'true';
                  
                  const parent = el.parentElement;
                  const hasOverlaySibling = parent && parent.querySelector('.overlay_wrap.u-nav-theme-overlay');
                  
                  // Set initial state
                  if (hasOverlaySibling) {
                    gsap.set(el, { opacity: 0, scale: 1.05 });
                  } else {
                    gsap.set(el, { opacity: 0 });
                  }
                  
                  // Listen for image load to refresh ScrollTrigger
                  if (el.nodeName === 'IMG' && !el.complete) {
                    const refreshOnLoad = () => {
                      ScrollTrigger.refresh();
                    };
                    el.addEventListener('load', refreshOnLoad, { once: true });
                    el.addEventListener('error', refreshOnLoad, { once: true });
                  }
                  
                  // Create trigger
                  ScrollTrigger.create({
                    trigger: el,
                    start: 'top 85%',
                    once: true,
                    onEnter: () => {
                      if (hasOverlaySibling) {
                        gsap.to(el, { opacity: 1, scale: 1, duration: 0.8, ease: 'sine.inOut' });
                      } else {
                        gsap.to(el, { opacity: 1, duration: 0.8, ease: 'sine.inOut' });
                      }
                    }
                  });
                });
              });
              
              // Handle attribute changes (Webflow lazy loading changes src)
              if (mutation.type === 'attributes' && (mutation.attributeName === 'src' || mutation.attributeName === 'srcset')) {
                const el = mutation.target;
                if (el.nodeName === 'IMG' && !el.dataset.scrollFadeBound && !el.closest('.creators_wrap')) {
                  el.dataset.scrollFadeBound = 'true';
                  
                  const parent = el.parentElement;
                  const hasOverlaySibling = parent && parent.querySelector('.overlay_wrap.u-nav-theme-overlay');
                  
                  // Set initial state
                  if (hasOverlaySibling) {
                    gsap.set(el, { opacity: 0, scale: 1.05 });
                  } else {
                    gsap.set(el, { opacity: 0 });
                  }
                  
                  // Listen for image load to refresh ScrollTrigger
                  const refreshOnLoad = () => {
                    ScrollTrigger.refresh();
                  };
                  
                  if (!el.complete) {
                    el.addEventListener('load', refreshOnLoad, { once: true });
                    el.addEventListener('error', refreshOnLoad, { once: true });
                  }
                  
                  // Create trigger
                  ScrollTrigger.create({
                    trigger: el,
                    start: 'top 85%',
                    once: true,
                    onEnter: () => {
                      if (hasOverlaySibling) {
                        gsap.to(el, { opacity: 1, scale: 1, duration: 0.8, ease: 'sine.inOut' });
                      } else {
                        gsap.to(el, { opacity: 1, duration: 0.8, ease: 'sine.inOut' });
                      }
                    }
                  });
                }
                
                // Refresh ScrollTrigger when src changes
                if (el.nodeName === 'IMG') {
                  ScrollTrigger.refresh();
                }
              }
            });
          });
          
          observer.observe(scope, { 
            childList: true, 
            subtree: true,
            attributes: true,
            attributeFilter: ['src', 'srcset']
          });
          scope._regularImageObserver = observer;
          console.log('👀 Watching for lazy-loaded images on regular pages');
        }
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
        mediaElsFiltered.forEach(el => {
          const parent = el.parentElement;
          const hasOverlaySibling = parent && parent.querySelector('.overlay_wrap.u-nav-theme-overlay');
          if (hasOverlaySibling) {
            tl.set(el, { opacity: 0, scale: 1.05 }, 0);
          } else {
            tl.set(el, { opacity: 0 }, 0);
          }
        });
        tl.set(textElsFiltered, { opacity: 0, y: '1vh' }, 0);
        // Container enters (fade only)
        tl.fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'sine.inOut' }, 0);
        // Media first (fade only) only for visible items now, hidden ones will fade on scroll
        const visibleMedia = mediaElsFiltered.filter((el) => {
          const r = el.getBoundingClientRect();
          return r.top < window.innerHeight * 0.9 && r.bottom > 0;
        });
        if (visibleMedia.length) {
          visibleMedia.forEach((el, index) => {
            const parent = el.parentElement;
            const hasOverlaySibling = parent && parent.querySelector('.overlay_wrap.u-nav-theme-overlay');
            if (hasOverlaySibling) {
              tl.to(el, { opacity: 1, scale: 1, duration: 0.5, ease: 'sine.inOut' }, 0.05 + (index * 0.05));
            } else {
              tl.to(el, { opacity: 1, duration: 0.5, ease: 'sine.inOut' }, 0.05 + (index * 0.05));
            }
          });
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
        if (href && (href.includes('/creator-list') || href.includes('creator-list'))) {
          // Let the browser handle this normally (full page load)
          // Don't preventDefault - we want the normal navigation
          console.log('⚡ Early intercept: Finsweet page detected, allowing normal navigation');
        }
      }, true); // Use capture phase to run before Barba
      
      barba.init({
        prevent: ({ el, href }) => {
          const isGoingToFinsweetPage = typeof href === 'string' && (href.includes('/creator-list') || href.includes('creator-list'));

          // Detect Finsweet environment/controls from DOM
          const isFinsweetEnv = !!document.querySelector('[fs-cmsfilter-element]') || !!document.querySelector('.w-pagination-wrapper');
          const hrefHasPageParam = typeof href === 'string' && href.includes('_page=');

          let isFsPageButton = false;
          if (el) {
            if (el.getAttribute && el.getAttribute('fs-list-element') === 'page-button') isFsPageButton = true;
            else if (el.closest && el.closest('[fs-list-element="page-button"]')) isFsPageButton = true;
          }

          let isPrevNextBtn = false;
          if (el) {
            if (el.classList && (el.classList.contains('w-pagination-previous') || el.classList.contains('w-pagination-next'))) isPrevNextBtn = true;
            else if (el.closest && (el.closest('.w-pagination-previous') || el.closest('.w-pagination-next'))) isPrevNextBtn = true;
          }

          const isFsControl = isFsPageButton || isPrevNextBtn || hrefHasPageParam;

          if (isGoingToFinsweetPage) {
            console.log('🚫 Barba: Preventing Finsweet page (full reload)');
            return true;
          }

          if (isFinsweetEnv && isFsControl) {
            console.log('🚫 Barba: Preventing Finsweet filter/pagination');
            return true;
          }

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
              if (window.gsap && data.next && data.next.container) {
                const nextRoot = data.next.container;
                // Prefer scrolling to .index_wrap when present
                const indexWrap = nextRoot.querySelector && nextRoot.querySelector('.index_wrap');
                if (indexWrap) {
                  const targetY = indexWrap.getBoundingClientRect().top + window.scrollY;
                  window.scrollTo(0, targetY);
                } else {
                  window.scrollTo(0, 0);
                }
                
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
                try { initCreatorGridToggle(); } catch (e) { console.warn('Creator grid toggle init failed on enter', e); }
                
                // Reinitialize nav background per section
                try { initNavBackgroundPerSection(); } catch (e) { console.warn('Nav background per section init failed on enter', e); }
              } else {
                window.scrollTo(0, 0);
              }
            },
            async once(data) {
              console.log('🎬 Barba ONCE hook fired');
              
              // Skip Barba animation on Finsweet page (it has its own animation)
              const isOnFinsweetPage = window.location.href.includes('/creator-list') || window.location.href.includes('creator-list');
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
                try { initCreatorGridToggle(); } catch (e) { console.warn('Creator grid toggle init failed on once', e); }
              } else {
                console.warn('⚠️ Barba once hook: no GSAP or container');
                try { initAccordions(); } catch (e) {}
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
