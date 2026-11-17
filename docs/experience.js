(() => {
  'use strict';
  const menu = document.querySelector('[data-product-menu]');
  const navToggle = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('#main-navigation');
  if (menu) {
    document.addEventListener('pointerdown', event => {
      if (!menu.contains(event.target)) menu.open = false;
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && menu.open) {
        menu.open = false;
        // The main navigation's Escape handler may have already hidden it.
        (navigation?.classList.contains('is-open') || !window.matchMedia('(max-width: 1120px)').matches
          ? menu.querySelector('summary') : navToggle)?.focus();
      }
    });
    menu.addEventListener('focusout', event => {
      if (!menu.contains(event.relatedTarget)) menu.open = false;
    });
    document.querySelectorAll('[data-open-search]').forEach(button => button.addEventListener('click', () => { menu.open = false; }));
  }
  if (navigation && navToggle) {
    const closeNavigation = () => {
      navigation.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.setAttribute('aria-label', document.documentElement.lang === 'en' ? 'Open menu' : '打开导航');
      if (menu) menu.open = false;
    };
    document.addEventListener('pointerdown', event => {
      if (!event.target.closest('.header-v3') && navigation.classList.contains('is-open')) closeNavigation();
    });
    window.matchMedia('(min-width: 1121px)').addEventListener('change', event => { if (event.matches) closeNavigation(); });
  }
  const grid = document.querySelector('.catalogue-grid');
  const viewButtons = [...document.querySelectorAll('[data-catalogue-view]')];
  if (grid && viewButtons.length) {
    grid.dataset.view = 'grid';
    viewButtons.forEach(button => button.addEventListener('click', () => {
      grid.dataset.view = button.dataset.catalogueView;
      viewButtons.forEach(option => option.setAttribute('aria-pressed', String(option === button)));
    }));
  }
})();

(() => {
  const tabs=[...document.querySelectorAll('[data-showroom-tab]')];
  if(!tabs.length)return;
  const tablist=document.querySelector('.showroom-tabs');
  tablist.setAttribute('aria-orientation','horizontal');
  const activate=(index,focus=false)=>{
    tabs.forEach((tab,i)=>{const selected=i===index;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;document.getElementById(tab.getAttribute('aria-controls')).hidden=!selected;if(selected&&focus)tab.focus();});
  };
  tabs.forEach((tab,index)=>{
    tab.addEventListener('click',()=>activate(index));
    tab.addEventListener('keydown',event=>{
      let next;
      if(['ArrowRight','ArrowDown'].includes(event.key))next=(index+1)%tabs.length;
      if(['ArrowLeft','ArrowUp'].includes(event.key))next=(index+tabs.length-1)%tabs.length;
      if(event.key==='Home')next=0;
      if(event.key==='End')next=tabs.length-1;
      if(next!==undefined){event.preventDefault();activate(next,true);}
    });
  });
})();
