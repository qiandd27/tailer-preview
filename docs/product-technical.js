(() => {
  const en = document.documentElement.lang === 'en';
  document.querySelectorAll('[data-technical-specs]').forEach(root => {
    const tabs = [...root.querySelectorAll('[data-spec-tab]')];
    const panels = [...root.querySelectorAll('[data-spec-panel]')];
    const measureOverflow = () => panels.forEach(panel => {
      const scroll = panel.querySelector('.spec-table-scroll');
      panel.dataset.overflow = String(scroll.scrollWidth > scroll.clientWidth + 1);
    });
    const activate = (tab,focus = false) => {
      tabs.forEach(t => {
        const selected = t === tab;
        t.setAttribute('aria-selected',String(selected));
        t.tabIndex = selected ? 0 : -1;
      });
      panels.forEach(p => {p.hidden = p.dataset.specPanel !== tab.dataset.specTab;});
      if (focus) tab.focus();
      measureOverflow();
    };
    tabs.forEach((tab,i) => {
      tab.addEventListener('click',() => {
        activate(tab);
        history.replaceState(null,'','#spec-panel-'+tab.dataset.specTab);
      });
      tab.addEventListener('keydown',event => {
        const index = event.key === 'ArrowRight' ? (i+1)%tabs.length
          : event.key === 'ArrowLeft' ? (i-1+tabs.length)%tabs.length
          : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length-1 : -1;
        if (index >= 0) {event.preventDefault();activate(tabs[index],true);}
      });
    });
    panels.forEach(panel => {
      const select = panel.querySelector('[data-spec-model]');
      const rows = [...panel.querySelectorAll('[data-spec-row]')];
      select.addEventListener('change',() => {
        let visible = 0;
        rows.forEach(row => {
          row.hidden = !!select.value && row.dataset.specRow !== select.value;
          if (!row.hidden) visible++;
        });
        panel.querySelector('[data-spec-count]').textContent = en
          ? `Showing ${visible} / ${rows.length} sizes` : `显示 ${visible} / ${rows.length} 个规格`;
        measureOverflow();
      });
    });
    const followHash = (scroll = false) => {
      const target = document.getElementById(location.hash.slice(1));
      const panel = target?.closest('[data-spec-panel]');
      if (!panel || !root.contains(panel)) return false;
      const tab = tabs.find(t => t.dataset.specTab === panel.dataset.specPanel);
      if (tab) activate(tab);
      const select = panel.querySelector('[data-spec-model]');
      select.value = target.dataset.specRow || '';
      select.dispatchEvent(new Event('change'));
      if (scroll) requestAnimationFrame(() => panel.scrollIntoView({block:'start'}));
      return true;
    };
    if (!followHash(true) && tabs.length) activate(tabs[0]);
    window.addEventListener('hashchange',() => followHash(true));
    window.addEventListener('resize',measureOverflow,{passive:true});
    measureOverflow();
  });

  document.querySelectorAll('[data-drawing-viewer]').forEach(viewer => {
    const stage = viewer.querySelector('[data-drawing-stage]');
    const expand = viewer.querySelector('[data-drawing-expand]');
    const dialog = viewer.querySelector('[data-drawing-dialog]');
    const title = viewer.querySelector('[data-drawing-title]');
    const content = dialog.querySelector('[data-lightbox-content]');
    const zoomIn = dialog.querySelector('[data-drawing-zoom="in"]');
    const zoomOut = dialog.querySelector('[data-drawing-zoom="out"]');
    const zoomFit = dialog.querySelector('[data-drawing-zoom="fit"]');
    let opener, scale = 1;
    const setZoom = value => {
      scale = Math.max(1,Math.min(3,value));
      const padding = parseFloat(getComputedStyle(content).paddingLeft) || 0;
      const base = Math.min(1200,content.clientWidth - padding*2 || 1200);
      if (content.firstElementChild) content.firstElementChild.style.width = `${Math.max(1,base)*scale}px`;
      zoomFit.textContent = `${scale*100}%`;
      zoomOut.disabled = scale === 1;
      zoomIn.disabled = scale === 3;
      if (scale === 1) {content.scrollTop = 0;content.scrollLeft = 0;}
    };
    zoomIn.addEventListener('click',() => setZoom(scale+.5));
    zoomOut.addEventListener('click',() => setZoom(scale-.5));
    zoomFit.addEventListener('click',() => setZoom(1));
    viewer.querySelectorAll('[data-drawing-page]').forEach(page => {
      page.addEventListener('click',event => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        viewer.querySelectorAll('[data-drawing-page]').forEach(p => p.setAttribute('aria-current',String(p === page)));
        stage.replaceChildren(page.firstElementChild.cloneNode(true));
        stage.href = page.href;
        expand.href = page.href;
        title.textContent = page.dataset.drawingLabel;
      });
    });
    const open = event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || typeof dialog.showModal !== 'function') return;
      event.preventDefault();
      opener = event.currentTarget;
      content.replaceChildren(stage.firstElementChild.cloneNode(true));
      dialog.querySelector('[data-lightbox-title]').textContent = title.textContent;
      dialog.querySelector('[data-lightbox-original]').href = stage.href;
      dialog.showModal();
      setZoom(1);
      dialog.querySelector('[data-lightbox-close]').focus();
    };
    stage.addEventListener('click',open);
    expand.addEventListener('click',open);
    dialog.querySelector('[data-lightbox-close]').addEventListener('click',() => dialog.close());
    dialog.addEventListener('close',() => opener?.focus());
    window.addEventListener('resize',() => {if (dialog.open) setZoom(scale);},{passive:true});
    dialog.addEventListener('click',event => {
      if (event.target !== dialog) return;
      const box = dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
    });
  });
})();
