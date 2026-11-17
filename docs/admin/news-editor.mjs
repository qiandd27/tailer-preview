// Images are stored in the same revisioned document; no separate credentials or uploads bucket.
export function createNewsEditor({root,getArticle,getSchema,onChange,onBusy,status}){
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
 const field=(label,value,change,{type='text',max=600}={})=>{const wrap=el('label',label),input=el(type==='textarea'?'textarea':'input');if(type!=='textarea')input.type=type;else input.rows=2;input.value=value??'';input.maxLength=max;input.addEventListener('input',()=>{change(input.value);onChange();});wrap.append(input);return wrap;};
 const button=(text,action)=>{const b=el('button',text);b.type='button';b.addEventListener('click',action);return b;};
 const blank=()=>({src:'',width:1,height:1,altZh:'',altEn:'',captionZh:'',captionEn:''});
 function preview(m){const img=el('img');img.className='news-image-preview';img.alt=m.altZh||'所选图片预览';img.src=m.src?.startsWith('assets/')?'../'+m.src:m.src;img.width=m.width;img.height=m.height;return img;}
 async function photo(file){
  if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('请选择 JPG、PNG 或 WebP 图片。');
  if(file.size>15*1024*1024)throw Error('原图请小于 15 MB。');
  const uri=URL.createObjectURL(file),img=new Image();
  try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('无法读取这张图片，请重新导出后上传。'));img.src=uri;});
   if(img.naturalWidth*img.naturalHeight>40000000)throw Error('图片像素过大，请使用不超过 4000 万像素的照片。');
   let scale=Math.min(1,1400/Math.max(img.naturalWidth,img.naturalHeight));
   for(let attempt=0;attempt<5;attempt++){
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
    canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
    const src=canvas.toDataURL('image/webp',.84);
    if(src.length<=360000)return {...blank(),src,width:canvas.width,height:canvas.height,altZh:file.name.replace(/\.[^.]+$/,'')};
    scale*=.76;
   }throw Error('压缩后图片仍过大，请换用更小的图片。');
  }finally{URL.revokeObjectURL(uri);}
 }
 function imageEditor(n,m,replace,{inline=false,index=0}={}){
  const card=el('div',null,'news-image-editor'),controls=el('div',null,'news-image-controls');card.dataset[inline?'newsInline':'newsCover']=String(index);
  const label=el('label','从现有素材库选择'),select=el('select');select.append(new Option('请选择产品图片',''));
  for(const asset of getSchema().newsMedia||[])select.append(new Option(asset.altZh,asset.src));
  select.value=m?.src?.startsWith('assets/')?m.src:'';
  select.addEventListener('change',()=>{const asset=getSchema().newsMedia.find(x=>x.src===select.value);if(!asset){render();return;}replace({...structuredClone(asset),...(inline?{afterParagraph:m?.afterParagraph||1}:{})});onChange();render();});label.append(select);controls.append(label);
  const uploadLabel=el('label','或上传照片（JPG / PNG / WebP）'),upload=el('input');upload.type='file';upload.accept='image/jpeg,image/png,image/webp';upload.dataset.newsUpload='true';
  upload.addEventListener('change',async()=>{if(!upload.files?.[0])return;onBusy(true);status('正在处理图片…');try{const next=await photo(upload.files[0]);replace({...next,...(inline?{afterParagraph:m?.afterParagraph||1}:{})});onChange();status('图片已加入草稿，保存并发布后上线。');render();}catch(error){status(error.message,true);}finally{onBusy(false);upload.value='';}});uploadLabel.append(upload);controls.append(uploadLabel);
  if(m?.src){card.append(preview(m));const grid=el('div',null,'field-grid');
   for(const [key,label] of [['altZh','图片中文描述（用于无障碍阅读）'],['altEn','图片英文描述'],['captionZh','中文图注 / 来源'],['captionEn','英文图注 / 来源']]){const f=field(label,m[key],v=>m[key]=v,{type:key.startsWith('caption')?'textarea':'text'});f.querySelector('input,textarea').dataset.imageField=key;grid.append(f);}controls.append(grid);
   if(inline){const position=field('放在第几段之后（空行分段，含小标题）',m.afterParagraph,v=>m.afterParagraph=Number(v),{type:'number'});const input=position.querySelector('input');input.min='1';input.max='200';input.dataset.imageField='afterParagraph';controls.append(position);}
   controls.append(button(inline?'删除这张正文图':'移除封面',()=>{if(inline)n.images.splice(index,1);else delete n.cover;onChange();render();}));
  }card.append(controls);return card;
 }
 function render(){
  root.replaceChildren();const n=getArticle();root.hidden=!n;if(!n)return;
  const cover=el('section',null,'news-editor-section');cover.append(el('h4','封面图片'),el('p','选用已有产品原图，或上传有权使用的照片。上传会等比压缩；填写准确的图注，不把示意图标成实拍。','help'),imageEditor(n,n.cover,v=>n.cover=v));root.append(cover);
  const gallery=el('section',null,'news-editor-section');gallery.append(el('h4','正文配图'),el('p','最多 6 张。设置图片放在哪个段落之后；中英文按各自的空行段落计数。超过段落数时放在文末。','help'));
  (n.images||[]).forEach((m,index)=>gallery.append(imageEditor(n,m,v=>n.images[index]=v,{inline:true,index})));
  const add=button('添加正文图片',()=>{n.images??=[];n.images.push({...structuredClone(getSchema().newsMedia[0]),afterParagraph:1});onChange();render();});add.disabled=(n.images?.length||0)>=6||!getSchema().newsMedia?.length;gallery.append(add);root.append(gallery);
  const related=el('section',null,'news-editor-section');related.append(el('h4','相关产品'),el('p','最多选择 6 个；公开页面会显示对应语言的产品名称。','help'));const choices=el('div',null,'news-product-options');
  for(const [id,p] of Object.entries(getSchema().products)){const label=el('label'),input=el('input');input.type='checkbox';input.value=id;input.checked=n.relatedProducts?.includes(id)||false;input.addEventListener('change',()=>{const ids=new Set(n.relatedProducts||[]);if(input.checked&&ids.size>=6){input.checked=false;status('每篇最多选择 6 个相关产品。',true);return;}input.checked?ids.add(id):ids.delete(id);n.relatedProducts=[...ids];onChange();});label.append(input,document.createTextNode(p.model+' · '+p.zh));choices.append(label);}related.append(choices);root.append(related);
  const sources=el('section',null,'news-editor-section');sources.append(el('h4','参考来源'),el('p','可添加公开 HTTPS 网页及中英文名称。样本与原厂资料继续通过询盘索取，不添加 PDF 下载链接。','help'));
  (n.sources||[]).forEach((s,index)=>{const row=el('div',null,'news-source-editor');row.append(field('中文来源名称',s.titleZh,v=>s.titleZh=v,{max:200}),field('英文来源名称',s.titleEn,v=>s.titleEn=v,{max:200}),field('来源网页链接',s.url,v=>s.url=v,{type:'url',max:2000}),button('删除来源',()=>{n.sources.splice(index,1);onChange();render();}));sources.append(row);});
  const sourceAdd=button('添加参考来源',()=>{n.sources??=[];n.sources.push({titleZh:'',titleEn:'',url:''});onChange();render();});sourceAdd.disabled=(n.sources?.length||0)>=8;sources.append(sourceAdd);root.append(sources);
 }
 return {render};
}
