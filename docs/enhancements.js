(() => {
  'use strict';
  const en=document.documentElement.lang==='en';
  const t=(zh,english)=>en?english:zh;
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];

  const panel=$('#wechat-panel');
  if(panel){
    const triggers=$$('[data-wechat-open]');
    const number=$('#wechat-number');
    const status=$('[data-wechat-status]');
    let opener=null;
    function close(restoreFocus=true){
      panel.hidden=true;triggers.forEach(b=>b.setAttribute('aria-expanded','false'));
      if(restoreFocus){const target=opener?.isConnected&&!opener.closest('[hidden],[inert]')?opener:$('[data-wechat-fab]');target?.focus();}
    }
    async function copy(){
      let copied=false;
      try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(number.value);copied=true;}}
      catch{/* Use the visible number field when clipboard access is unavailable. */}
      if(!copied){
        const previous=document.activeElement;
        number.focus();number.select();number.setSelectionRange(0,number.value.length);
        try{copied=Boolean(document.execCommand?.('copy'));}catch{}
        if(copied&&previous)previous.focus();
      }
      status.classList.toggle('is-copied',copied);
      const copyLabel=$('[data-copy-label]');if(copyLabel)copyLabel.textContent=copied?t('已复制','Copied'):t('复制','Copy');
      status.textContent=copied?t('微信号码已复制，打开微信「添加朋友」粘贴搜索。','Number copied. Open WeChat → Add Contacts and paste to search.'):t('请长按或选中上方号码复制，再到微信「添加朋友」中搜索。','Select and copy the number above, then search in WeChat → Add Contacts.');
      return copied;
    }
    triggers.forEach(button=>{
      button.setAttribute('aria-controls','wechat-panel');
      button.setAttribute('aria-expanded','false');
      button.addEventListener('click',()=>{
        if(button.hasAttribute('data-wechat-fab')&&!panel.hidden){close();return;}
        opener=button;panel.hidden=false;triggers.forEach(b=>b.setAttribute('aria-expanded','true'));
        $('[data-wechat-close]').focus();
        void copy();
      });
    });
    $('[data-wechat-copy]').addEventListener('click',()=>void copy());
    $('[data-wechat-close]').addEventListener('click',()=>close());
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden){event.preventDefault();close();}});
    document.addEventListener('pointerdown',event=>{if(!panel.hidden&&!panel.contains(event.target)&&!event.target.closest('[data-wechat-open]'))close(false);});
  }

  const documentButtons=$$('[data-document-filter]');
  if(documentButtons.length){
    const input=$('#document-search');let category='all';
    function filter(){const query=input.value.trim().toLowerCase();let count=0;$$('[data-document-kind]').forEach(card=>{const visible=(category==='all'||card.dataset.documentKind===category)&&(!query||card.dataset.documentSearch.toLowerCase().includes(query));card.hidden=!visible;if(visible)count++;});documentButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.documentFilter===category)));$('#document-result-count').textContent=t(`${count} 份资料`,`${count} documents`);$('#document-empty').hidden=count!==0;}
    documentButtons.forEach(button=>button.addEventListener('click',()=>{category=button.dataset.documentFilter;filter();}));
    input.addEventListener('input',filter);filter();
  }
})();
