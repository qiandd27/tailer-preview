(() => {
  'use strict';
  const en=document.documentElement.lang==='en';
  const t=(zh,english)=>en?english:zh;
  const $=(selector,root=document)=>root.querySelector(selector);
  const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
  let toastTimer;
  function toast(message){const box=$('.toast');box.textContent=message;box.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>box.classList.remove('visible'),3200);}
  const menu=$('.menu-toggle');
  menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?t('关闭导航','Close menu'):t('打开导航','Open menu'));$('.main-nav').classList.toggle('is-open',open);});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu?.getAttribute('aria-expanded')==='true'){menu.click();menu.focus();}});
  const langLink=$('.lang-switch');
  if(langLink){const base='/tailer-preview';let path=location.pathname;if(path===base)path='/';else if(path.startsWith(base+'/'))path=path.slice(base.length);path=en?path.replace(/^\/en\//,'/'):'/en'+path;langLink.href=base+path+location.search+location.hash;}
  $$('[data-back-top]').forEach(b=>b.addEventListener('click',()=>window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})));
  const search=$('#search-dialog');
  $$('[data-open-search]').forEach(b=>b.addEventListener('click',()=>{search.showModal();document.body.classList.add('dialog-open');$('#global-search').focus();}));
  $('.close-dialog')?.addEventListener('click',()=>search.close());
  search?.addEventListener('close',()=>document.body.classList.remove('dialog-open'));
  search?.addEventListener('click',e=>{if(e.target===search){const r=search.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)search.close();}});

  const filterButtons=$$('[data-filter]');
  if(filterButtons.length){
    const params=new URLSearchParams(location.search);
    let category=filterButtons.some(b=>b.dataset.filter===params.get('category'))?params.get('category'):'all';
    let group=(params.get('categories')||'').split(',').filter(id=>filterButtons.some(b=>b.dataset.filter===id&&id!=='all'));
    const input=$('#catalogue-query');input.value=params.get('q')||'';
    function filter(updateURL=true){
      const q=input.value.trim().toLowerCase();let count=0;
      $$('.catalogue-grid .product-card').forEach(card=>{const visible=(group.length?group.includes(card.dataset.category):(category==='all'||card.dataset.category===category))&&(!q||card.dataset.search.toLowerCase().includes(q));card.hidden=!visible;if(visible)count++;});
      filterButtons.forEach(b=>{const active=group.length?group.includes(b.dataset.filter):b.dataset.filter===category;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});
      $('#result-count').textContent=t(`${count} 个产品系列`,`${count} product ${count===1?'family':'families'}`);
      $('#empty-products').hidden=count!==0;
      if(updateURL){const next=new URLSearchParams();if(group.length)next.set('categories',group.join(','));else if(category!=='all')next.set('category',category);if(q)next.set('q',input.value.trim());history.replaceState(null,'',location.pathname+(next.size?'?'+next:''));}
    }
    filterButtons.forEach(b=>b.addEventListener('click',()=>{category=b.dataset.filter;group=[];filter();}));
    input.addEventListener('input',()=>filter());
    $('#reset-filters').addEventListener('click',()=>{category='all';group=[];input.value='';filter();input.focus();});
    filter(false);
  }
  const tabs=$$('[data-industry]');
  if(tabs.length){
    function activate(id,focus=false){tabs.forEach(b=>{const active=b.dataset.industry===id;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;if(active&&focus)b.focus();});$$('.industry-panel').forEach(p=>p.hidden=p.id!=='panel-'+id);}
    tabs.forEach((b,i)=>{b.addEventListener('click',()=>activate(b.dataset.industry));b.addEventListener('keydown',e=>{let n;if(e.key==='ArrowRight')n=(i+1)%tabs.length;if(e.key==='ArrowLeft')n=(i+tabs.length-1)%tabs.length;if(e.key==='Home')n=0;if(e.key==='End')n=tabs.length-1;if(n!==undefined){e.preventDefault();activate(tabs[n].dataset.industry,true);}});});
    if(tabs.some(b=>b.dataset.industry===location.hash.slice(1)))activate(location.hash.slice(1));
  }
  const form=$('#inquiry-form');
  if(form){
    const params=new URLSearchParams(location.search);
    if(params.get('product')){const value=params.get('product');const option=[...form.elements.product.options].find(o=>o.value===value);if(option)form.elements.product.value=value;}
    if(params.get('application')){const value=params.get('application');const option=[...form.elements.application.options].find(o=>o.value===value);if(option)form.elements.application.value=value;}
    if(params.get('request'))form.elements.requirements.value=t('需要索取资料：','Documentation requested: ')+(params.get('request')==='documentation'?t('对应型号样本与技术图纸','Catalogue and drawings for this model'):params.get('request'))+'\n'+t('设备型号 / 用途：','Machine / application: ');
    let summary='';
    form.addEventListener('submit',e=>{
      e.preventDefault();
      if(!form.reportValidity())return;
      const values=Object.fromEntries(new FormData(form));
      for(const key of ['name','contact','requirements']){if(!values[key].trim()){form.elements[key].setCustomValidity(t('请填写有效内容','Please enter a valid value'));form.elements[key].reportValidity();return;}}
      summary=[t('泰乐液压产品询价','Tailer hydraulic product enquiry'),'',[t('称呼','Name'),values.name],[t('公司','Company'),values.company||'—'],[t('联系方式','Contact'),values.contact],[t('产品系列','Product'),values.product||t('需要选型支持','Selection support needed')],[t('应用领域','Application'),values.application||'—'],'',t('设备与需求：','Equipment & requirements:'),values.requirements].map(x=>Array.isArray(x)?x.join(': '):x).join('\n');
      $('#inquiry-summary').textContent=summary;
      $('#email-enquiry').href='mailto:tailer002@flutekchina.com.cn?subject='+encodeURIComponent(t('液压产品询价','Hydraulic enquiry')+' | '+(values.product||'TAILER'))+'&body='+encodeURIComponent(summary);
      form.hidden=true;$('#inquiry-result').hidden=false;$('#inquiry-result').focus();
    });
    $$('input, textarea',form).forEach(input=>input.addEventListener('input',()=>input.setCustomValidity('')));
    $('#edit-enquiry').addEventListener('click',()=>{form.hidden=false;$('#inquiry-result').hidden=true;form.elements.name.focus();});
    $('#copy-enquiry').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(summary);toast(t('询价内容已复制','Enquiry copied'));}catch{toast(t('请选中摘要内容后手动复制','Select the summary and copy it manually'));}});
    $('#download-enquiry').addEventListener('click',()=>{const file=new Blob(['\uFEFF'+summary],{type:'text/plain;charset=utf-8'});const href=URL.createObjectURL(file);const a=document.createElement('a');a.href=href;a.download='TAILER-enquiry.txt';a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);toast(t('询价单已生成','Enquiry file prepared'));});
  }
})();
