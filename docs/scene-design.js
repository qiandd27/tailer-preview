(() => {
  'use strict';
  const en = document.documentElement.lang === 'en';
  const t = (zh, english) => en ? english : zh;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.querySelector('[data-scene-carousel]');
  if (root && window.Swiper) {
    const slides = [...root.querySelectorAll('[data-scene-slide]')];
    const tabs = [...root.querySelectorAll('[data-scene-index]')];
    const toggle = root.querySelector('[data-scene-toggle]');
    const interval = 4000;
    let userPaused = reduced.matches, focused = false, inView = true;
    let swiper;
    const shouldPlay = () => !userPaused && !focused && inView && !document.hidden;
    function playback() {
      if (!swiper || swiper.destroyed) return;
      const play = shouldPlay();
      if (play && !swiper.autoplay.running) swiper.autoplay.start();
      if (!play && swiper.autoplay.running) swiper.autoplay.stop();
      root.dataset.playing = String(play);
      toggle.setAttribute('aria-pressed', String(userPaused));
      toggle.setAttribute('aria-label', userPaused ? t('继续自动轮播','Resume slideshow') : t('暂停自动轮播','Pause slideshow'));
      toggle.querySelector('[data-pause-icon]').hidden = userPaused;
      toggle.querySelector('[data-play-icon]').hidden = !userPaused;
    }
    function reflect(instance) {
      const index = instance.activeIndex;
      const oldFocus = slides.some((slide,i) => i !== index && slide.contains(document.activeElement));
      slides.forEach((slide,i) => {
        slide.toggleAttribute('inert', i !== index);
        slide.setAttribute('aria-hidden',String(i !== index));
        slide.classList.toggle('is-current',i === index);
      });
      tabs.forEach((tab,i) => {
        tab.setAttribute('aria-pressed',String(i === index));
        tab.style.setProperty('--scene-progress','0');
      });
      root.querySelector('[data-scene-current]').textContent = String(index + 1).padStart(2,'0');
      // Bring the selected item into the horizontal strip without scrolling the page.
      const strip = root.querySelector('.scene-nav-list'), tab = tabs[index];
      if (tab.offsetLeft < strip.scrollLeft || tab.offsetLeft + tab.offsetWidth > strip.scrollLeft + strip.clientWidth) {
        strip.scrollLeft = Math.max(0,tab.offsetLeft - (strip.clientWidth - tab.offsetWidth) / 2);
      }
      if (oldFocus) tab.focus({preventScroll:true});
    }
    swiper = new window.Swiper(root.querySelector('.scene-swiper'), {
      init:false, slidesPerView:1, effect:'fade', fadeEffect:{crossFade:true},
      speed:reduced.matches ? 0 : 450, rewind:true, loop:false, watchOverflow:false,
      allowTouchMove:true, threshold:12, preventInteractionOnTransition:false,
      autoplay:{enabled:false,delay:interval,disableOnInteraction:false,waitForTransition:false},
      a11y:{enabled:false}, // Localized semantics, inert slides and announcements are handled below.
      on:{
        init:reflect,
        slideChange:reflect,
        autoplayTimeLeft(instance,_ms,remaining) {
          if (shouldPlay()) tabs[instance.activeIndex].style.setProperty('--scene-progress',String(Math.max(0,Math.min(1,1-remaining))));
        },
        touchEnd() { requestAnimationFrame(playback); }
      }
    });
    swiper.init();
    function select(index) {
      const next = (index + slides.length) % slides.length;
      swiper.slideTo(next,reduced.matches ? 0 : 450);
      root.querySelector('[data-scene-status]').textContent = t(`第 ${next+1} 屏，共 7 屏：`,`Slide ${next+1} of 7: `) + tabs[next].textContent.trim().replace(/^0\d\s*/, '');
      playback();
    }
    tabs.forEach((tab,i) => tab.addEventListener('click',()=>select(i)));
    root.querySelector('[data-scene-prev]').addEventListener('click',()=>select(swiper.activeIndex-1));
    root.querySelector('[data-scene-next]').addEventListener('click',()=>select(swiper.activeIndex+1));
    toggle.addEventListener('click',()=>{
      userPaused = !userPaused;
      if (!userPaused) focused = false;
      playback();
    });
    // Pointer hover leaves the four-second cadence running; keyboard focus still pauses.
    root.addEventListener('focusin',event=>{focused = event.target.matches(':focus-visible');playback();});
    root.addEventListener('focusout',event=>{if(!root.contains(event.relatedTarget)){focused=false;playback();}});
    root.addEventListener('click',event=>{if(event.target.closest('[data-wechat-open]')){userPaused=true;playback();}});
    root.querySelector('.scene-navigation').addEventListener('keydown',event=>{
      const keys={ArrowRight:swiper.activeIndex+1,ArrowLeft:swiper.activeIndex-1,Home:0,End:slides.length-1};
      if(!(event.key in keys))return;
      event.preventDefault();userPaused=true;select(keys[event.key]);tabs[swiper.activeIndex].focus();
    });
    document.addEventListener('visibilitychange',playback);
    reduced.addEventListener('change',()=>{
      swiper.params.speed=reduced.matches?0:450;
      if(reduced.matches)userPaused=true;
      playback();
    });
    if('IntersectionObserver' in window) new IntersectionObserver(([entry])=>{inView=entry.isIntersecting;playback();},{threshold:.15}).observe(root);
    // Prepare the next scene after the first image, leaving the rest lazily loaded.
    const first = slides[0].querySelector('img');
    const warmNext = () => { slides[1].querySelector('img').loading='eager'; };
    if(first.complete)warmNext();else first.addEventListener('load',warmNext,{once:true});
    swiper.on('slideChange',instance=>{slides[(instance.activeIndex+1)%slides.length].querySelector('img').loading='eager';});
    playback();
  }

  const atlasTabs = [...document.querySelectorAll('[data-atlas-tab]')];
  function selectApplication(index,focus=false) {
    atlasTabs.forEach((tab,i)=>{
      tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden=i!==index;
    });
    if(focus)atlasTabs[index].focus();
  }
  atlasTabs.forEach((tab,index)=>{
    tab.addEventListener('click',()=>selectApplication(index));
    tab.addEventListener('keydown',event=>{
      const keys={ArrowDown:(index+1)%atlasTabs.length,ArrowUp:(index+atlasTabs.length-1)%atlasTabs.length,Home:0,End:atlasTabs.length-1};
      if(!(event.key in keys))return;
      event.preventDefault();selectApplication(keys[event.key],true);
    });
  });
  if(!reduced.matches && 'IntersectionObserver' in window) {
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(entry.isIntersecting){entry.target.classList.add('is-revealed');observer.unobserve(entry.target);}
    }),{threshold:.12});
    document.querySelectorAll('[data-reveal]').forEach(node=>{node.classList.add('reveal-ready');observer.observe(node);});
  }
})();
