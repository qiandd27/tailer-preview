(() => {
 'use strict';
 const script=document.currentScript, base=new URL('./',script.src), en=document.documentElement.lang==='en';
 const t=(z,e)=>en?e:z, page=document.body.dataset.cmsPage;
 const url=p=>new URL((en?'en/':'')+p,base).href;
 const setText=(element,value)=>{element.replaceChildren();String(value).split('\n').forEach((line,i)=>{if(i)element.append(document.createElement('br'));element.append(document.createTextNode(line));});};
 const categories={company:['公司动态','Company'],product:['产品资讯','Products'],guide:['选型指南','Guides'],service:['服务说明','Service'],maintenance:['维护知识','Maintenance'],marine:['船用设备','Marine'],industry:['行业资讯','Industry']};
 let current,activeFilter='all',catalogue=[];
 const originalText=new Map([...document.querySelectorAll('[data-cms-key],[data-product-field]')].map(el=>[el,[...el.childNodes].map(n=>n.nodeName==='BR'?'\n':n.textContent).join('')]));
 const originalSearch=new Map([...document.querySelectorAll('[data-search]')].map(el=>[el,el.dataset.search]));
 const localized=(item,key)=>(en?item[key+'En']:item[key+'Zh'])||item[key+'Zh']||'';
 const node=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text)el.textContent=text;return el;};
 function mediaImage(m,eager=false){
  if(!m||typeof m.src!=='string'||!(/^assets\/[a-zA-Z0-9_-]+\.(?:webp|png|jpe?g)$/.test(m.src)||/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(m.src)))return null;
  const img=node('img');img.src=m.src.startsWith('data:')?m.src:new URL(m.src,base).href;img.alt=localized(m,'alt');img.width=m.width;img.height=m.height;img.loading=eager?'eager':'lazy';img.decoding='async';return img;
 }
 function figure(m,eager=false){const img=mediaImage(m,eager);if(!img)return null;const f=node('figure','news-figure');f.append(img);const caption=localized(m,'caption');if(caption)f.append(node('figcaption','',caption));return f;}
 function renderNews(data){
  const all=Array.isArray(data.news)?data.news:[];
  for(const root of document.querySelectorAll('[data-news-list]')){
   const items=root.querySelector('[data-news-items]'),limit=Number(root.dataset.newsLimit);items.replaceChildren();
   for(const button of root.querySelectorAll('[data-news-filter]')){const id=button.dataset.newsFilter,count=all.filter(n=>id==='all'||n.category===id).length;button.hidden=id!=='all'&&!count;}
   let list=[...all].filter(n=>activeFilter==='all'||n.category===activeFilter).sort((a,b)=>b.date.localeCompare(a.date));if(limit)list=list.slice(0,limit);
   root.querySelector('[data-news-empty]').hidden=!!list.length;
   for(const [index,n] of list.entries()){
    const a=node('a','news-card');a.href=url('news-detail.html?id='+encodeURIComponent(n.id));
    const img=mediaImage(n.cover,index<3);if(img){const cover=node('div','news-card-image');cover.append(img);a.append(cover);}
    const copy=node('div','news-card-copy');
    const meta=node('div','news-card-meta'),date=node('time','',n.date.replaceAll('-','.'));date.dateTime=n.date;
    meta.append(date,node('span','news-category',t(...(categories[n.category]||categories.guide))));
    const h=node('h3','',localized(n,'title')),p=node('p','',localized(n,'summary'));
    const more=node('span','news-more',t('阅读文章','Read article'));const arrow=document.createElementNS('http://www.w3.org/2000/svg','svg');arrow.setAttribute('viewBox','0 0 24 24');arrow.setAttribute('aria-hidden','true');const path=document.createElementNS(arrow.namespaceURI,'path');path.setAttribute('d','M5 12h13m-5-5 5 5-5 5');path.setAttribute('fill','none');path.setAttribute('stroke','currentColor');path.setAttribute('stroke-width','1.85');arrow.append(path);more.append(arrow);
    copy.append(meta,h,p,more);a.append(copy);items.append(a);
   }
  }
  const article=document.querySelector('[data-news-article]');if(!article)return;
  const n=all.find(n=>n.id===new URLSearchParams(location.search).get('id'));article.replaceChildren();
  if(!n){article.append(node('h1','',t('未找到这篇资讯','Article not found')));return;}
  const meta=node('p','section-kicker',t('发布于 ','Published ')+n.date+' / '+t(...(categories[n.category]||categories.guide)));
  const h=node('h1','',localized(n,'title'));document.title=h.textContent+' | TAILER';
  const summary=localized(n,'summary'),intro=node('p','news-standfirst',summary);
  for(const selector of ['meta[name="description"]','meta[property="og:description"]'])document.querySelector(selector)?.setAttribute('content',summary);
  document.querySelector('meta[property="og:title"]')?.setAttribute('content',document.title);
  for(const selector of ['link[rel="canonical"]','meta[property="og:url"]']){const el=document.querySelector(selector);if(el){const attr=el.tagName==='LINK'?'href':'content',u=new URL(el.getAttribute(attr));u.searchParams.set('id',n.id);el.setAttribute(attr,u.href);}}
  document.querySelectorAll('link[hreflang]').forEach(el=>{const u=new URL(el.href);u.searchParams.set('id',n.id);el.href=u.href;});
  article.append(meta,h,intro);const cover=figure(n.cover,true);if(cover){cover.classList.add('news-cover');article.append(cover);}
  const body=node('div','news-body'),blocks=localized(n,'body').split(/\n\s*\n/).filter(x=>x.trim());
  blocks.forEach((block,i)=>{
   const lines=block.trim().split('\n');
   if(lines[0].startsWith('## ')){body.append(node('h2','',lines.shift().slice(3)));}
   if(lines.length){const p=node('p');setText(p,lines.join('\n'));body.append(p);}
   for(const m of n.images||[]){if(Math.min(m.afterParagraph,blocks.length)===i+1){const f=figure(m);if(f)body.append(f);}}
  });article.append(body);
  if(n.sources?.length){const section=node('section','news-sources');section.append(node('h2','',t('参考来源','References')));const list=node('ul');
   for(const s of n.sources){let u;try{u=new URL(s.url);}catch{continue;}if(u.protocol!=='https:'||u.username||u.password)continue;const li=node('li'),a=node('a','',localized(s,'title'));a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';li.append(a);list.append(li);}section.append(list);article.append(section);
  }
  if(n.relatedProducts?.length){const section=node('section','news-related');section.append(node('h2','',t('相关产品','Related products')));const links=node('div','news-related-links');
   for(const id of n.relatedProducts){if(!/^[a-z0-9-]+$/.test(id))continue;const p=catalogue.find(p=>p.id===id),overrides=data.products?.[id]||{};const label=p?((overrides.model||p.model)+' · '+(en?overrides.en||p.en:overrides.zh||p.zh)):id;const a=node('a','',label);a.href=url('products/'+id+'.html');links.append(a);}section.append(links);article.append(section);
  }
  const cta=node('div','news-article-cta');cta.append(node('p','',t('准备好型号与工况，继续核对配置。','Bring your model and operating details to the next step.')));const link=node('a','text-link',t('联系选型 / 索取资料 ↗','Enquire / Request documents ↗'));link.href=url('contact.html');cta.append(link);article.append(cta);
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
 async function loadPublicContent(){
  let config;try{const r=await fetch(new URL('content/backend-config.json',base),{cache:'no-cache'});if(r.ok)config=await r.json();}catch{}
  if(config?.provider==='supabase'){
   if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.url)||!config.publishableKey||config.publishableKey.startsWith('sb_secret_'))throw Error('content configuration');
   const r=await fetch(config.url+'/rest/v1/tailer_content?id=eq.website&select=document&limit=1',{headers:{apikey:config.publishableKey},cache:'no-store'});if(!r.ok)throw Error('content');const rows=await r.json();if(!rows[0]?.document)throw Error('content');return rows[0].document;
  }
  const r=await fetch(new URL('content/site-content.json',base),{cache:'no-cache'});if(!r.ok)throw Error('content');return r.json();
 }
 Promise.all([loadPublicContent(),document.querySelector('[data-news-article]')?fetch(new URL('products.json',base)).then(r=>r.json()).catch(()=>[]):[]]).then(([data,products])=>{catalogue=Array.isArray(products)?products:[];apply(data);}).catch(()=>{document.querySelectorAll('.news-loading').forEach(p=>{p.textContent=t('资讯暂时无法载入，请稍后刷新。','News could not be loaded. Please refresh.');});});
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
