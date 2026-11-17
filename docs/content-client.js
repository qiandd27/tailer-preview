(() => {
 'use strict';
 const script=document.currentScript, base=new URL('./',script.src), en=document.documentElement.lang==='en';
 const t=(z,e)=>en?e:z, page=document.body.dataset.cmsPage;
 const url=p=>new URL((en?'en/':'')+p,base).href;
 const setText=(element,value)=>{element.replaceChildren();String(value).split('\n').forEach((line,i)=>{if(i)element.append(document.createElement('br'));element.append(document.createTextNode(line));});};
 const categories={company:['公司动态','Company'],product:['产品资讯','Products'],guide:['选型指南','Guides'],service:['服务说明','Service']};
 let current,activeFilter='all';
 const originalText=new Map([...document.querySelectorAll('[data-cms-key],[data-product-field]')].map(el=>[el,[...el.childNodes].map(n=>n.nodeName==='BR'?'\n':n.textContent).join('')]));
 const originalSearch=new Map([...document.querySelectorAll('[data-search]')].map(el=>[el,el.dataset.search]));
 function renderNews(data){
  for(const root of document.querySelectorAll('[data-news-list]')){
   const items=root.querySelector('[data-news-items]'),limit=Number(root.dataset.newsLimit);items.replaceChildren();
   let list=[...data.news].filter(n=>activeFilter==='all'||n.category===activeFilter).sort((a,b)=>b.date.localeCompare(a.date));if(limit)list=list.slice(0,limit);
   root.querySelector('[data-news-empty]').hidden=!!list.length;
   for(const n of list){const a=document.createElement('a');a.className='news-card';a.href=url('news-detail.html?id='+encodeURIComponent(n.id));
    const date=document.createElement('time');date.dateTime=n.date;date.textContent=n.date.replaceAll('-','.');
    const category=document.createElement('span');category.className='news-category';category.textContent=t(...categories[n.category]);
    const h=document.createElement('h3');h.textContent=(en?n.titleEn:n.titleZh)||n.titleZh;
    const p=document.createElement('p');p.textContent=(en?n.summaryEn:n.summaryZh)||n.summaryZh;
    const more=document.createElement('span');more.className='news-more';more.append(document.createTextNode(t('阅读文章','Read article')));const arrow=document.createElementNS('http://www.w3.org/2000/svg','svg');arrow.setAttribute('viewBox','0 0 24 24');arrow.setAttribute('aria-hidden','true');const path=document.createElementNS(arrow.namespaceURI,'path');path.setAttribute('d','M5 12h13m-5-5 5 5-5 5');path.setAttribute('fill','none');path.setAttribute('stroke','currentColor');path.setAttribute('stroke-width','1.85');arrow.append(path);more.append(arrow);
    a.append(date,category,h,p,more);items.append(a);
   }
  }
  const article=document.querySelector('[data-news-article]');if(article){
   const n=data.news.find(n=>n.id===new URLSearchParams(location.search).get('id'));article.replaceChildren();
   if(!n){const h=document.createElement('h1');h.textContent=t('未找到这篇资讯','Article not found');article.append(h);return;}
   const meta=document.createElement('p');meta.className='section-kicker';meta.textContent=n.date+' / '+t(...categories[n.category]);
   const h=document.createElement('h1');h.textContent=(en?n.titleEn:n.titleZh)||n.titleZh;document.title=h.textContent+' | TAILER';
   const intro=document.createElement('p');intro.className='news-standfirst';intro.textContent=(en?n.summaryEn:n.summaryZh)||n.summaryZh;
   const body=document.createElement('div');body.className='news-body';for(const paragraph of ((en?n.bodyEn:n.bodyZh)||n.bodyZh).split(/\n\s*\n/)){const p=document.createElement('p');setText(p,paragraph);body.append(p);}article.append(meta,h,intro,body);
  }
 }
 function apply(data){current=data;
  for(const el of document.querySelectorAll('[data-cms-key]')){const value=data.pages?.[page]?.[el.dataset.cmsKey];setText(el,typeof value==='string'?value:originalText.get(el));}
  for(const el of document.querySelectorAll('[data-product-id]')){const p=data.products?.[el.dataset.productId]||{};
   for(const field of el.querySelectorAll('[data-product-field]')){let key=field.dataset.productField;if(key==='name')key=en?'en':'zh';if(key==='description')key=en?'descriptionEn':'descriptionZh';setText(field,typeof p[key]==='string'?p[key]:originalText.get(field));}
   if(el.hasAttribute('data-search'))el.dataset.search=[originalSearch.get(el),...Object.values(p)].join(' ');
   if(p.model)for(const link of el.querySelectorAll('a[href*="?product="]')){const u=new URL(link.href);u.searchParams.set('product',p.model);link.href=u.href;}
  }
  for(const option of document.querySelectorAll('[data-product-option]')){const p=data.products?.[option.dataset.productOption];if(p?.model){option.value=p.model;option.textContent=p.model;}}
  const productSelect=document.querySelector('#inquiry-form select[name=product]'),selectedProduct=new URLSearchParams(location.search).get('product');if(productSelect&&selectedProduct&&[...productSelect.options].some(o=>o.value===selectedProduct))productSelect.value=selectedProduct;
  document.querySelector('#catalogue-query')?.dispatchEvent(new Event('input'));renderNews(data);
  document.dispatchEvent(new CustomEvent('tailer:content-ready',{detail:{revision:data.revision}}));
 }
 document.querySelectorAll('[data-news-filter]').forEach(button=>button.addEventListener('click',()=>{activeFilter=button.dataset.newsFilter;document.querySelectorAll('[data-news-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));if(current)renderNews(current);}));
 fetch(new URL('content/site-content.json',base),{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('content');return r.json();}).then(apply).catch(()=>{document.querySelectorAll('.news-loading').forEach(p=>{p.textContent=t('资讯暂时无法载入，请稍后刷新。','News could not be loaded. Please refresh.');});});
 if(window.parent!==window&&new URLSearchParams(location.search).get('cms-edit')==='1'){
  let editing=false;
  addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==parent)return;
   if(event.data?.type==='tailer:edit-ready'){editing=true;document.body.classList.add('cms-edit-mode');}
   if(editing&&event.data?.type==='tailer:preview')apply(event.data.content);
  });
  document.addEventListener('click',event=>{if(!editing)return;const el=event.target.closest('[data-cms-key]');if(el){event.preventDefault();event.stopImmediatePropagation();parent.postMessage({type:'tailer:field',page,key:el.dataset.cmsKey},location.origin);}else if(event.target.closest('a'))event.preventDefault();},true);
  parent.postMessage({type:'tailer:page-ready',page},location.origin);
 }
})();
