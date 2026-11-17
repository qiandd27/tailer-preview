export const repository='qiandd27/tailer-preview';
export const contentPath='docs/content/site-content.json';
export function validateContent(value,schema){
 const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
 const fail=message=>{throw new Error(message);};
 const text=(x,max=6000)=>typeof x==='string'&&x.length<=max&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(x);
 const keys=(x,allowed)=>object(x)&&Object.keys(x).every(k=>allowed.includes(k)&&!['__proto__','constructor','prototype'].includes(k));
 const image=(m,inline=false)=>{
  if(!keys(m,['src','width','height','altZh','altEn','captionZh','captionEn',...(inline?['afterParagraph']:[])]))fail('图片格式无效。');
  const asset=schema.newsMedia?.find(x=>x.src===m.src);
  const embedded=typeof m.src==='string'&&m.src.length<=360000&&/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(m.src);
  if(!asset&&!embedded)fail('请从素材库选图，或上传 JPG、PNG、WebP 图片。');
  if(embedded){let bytes;try{bytes=atob(m.src.split(',')[1]);}catch{fail('图片编码无效。');}
   const valid=m.src.startsWith('data:image/png;')?bytes.startsWith('\x89PNG\r\n\x1a\n'):m.src.startsWith('data:image/jpeg;')?bytes.startsWith('\xff\xd8\xff'):bytes.startsWith('RIFF')&&bytes.slice(8,12)==='WEBP';
   if(!valid)fail('图片内容与格式不符。');
  }
  if(!Number.isInteger(m.width)||!Number.isInteger(m.height)||m.width<1||m.height<1||m.width>6000||m.height>6000||asset&&(asset.width!==m.width||asset.height!==m.height))fail('图片尺寸无效。');
  for(const k of ['altZh','altEn','captionZh','captionEn'])if(!text(m[k],600))fail('图片说明无效或过长。');
  if(!m.altZh.trim())fail('请填写图片的中文描述。');
  if(inline&&(!Number.isInteger(m.afterParagraph)||m.afterParagraph<1||m.afterParagraph>200))fail('正文图片位置应为 1–200 的段落序号。');
 };
 if(!keys(value,['version','revision','products','pages','news'])||value.version!==1||!Number.isSafeInteger(value.revision)||value.revision<0||!object(value.products)||!object(value.pages)||!Array.isArray(value.news))fail('内容格式无效，请重新载入。');
 if(JSON.stringify(value).length>2000000)fail('内容超过 2 MB 限制。');
 for(const [id,p] of Object.entries(value.products)){
  if(!Object.hasOwn(schema.products,id)||!keys(p,Object.keys(schema.products[id])))fail('产品字段不在允许范围内。');
  for(const [key,v] of Object.entries(p))if(!text(v,key.startsWith('description')?6000:200)||!v.trim())fail('产品文字不能为空或过长。');
 }
 for(const [page,items] of Object.entries(value.pages)){
  if(!Object.hasOwn(schema.pages,page)||!object(items))fail('页面不存在。');
  for(const [id,v] of Object.entries(items))if(!Object.hasOwn(schema.pages[page].fields,id)||!text(v))fail('页面字段无效或文字过长。');
 }
 if(value.news.length>200)fail('最多保留 200 篇资讯。');
 const ids=new Set();
 for(const n of value.news){
  if(!keys(n,['id','date','category','titleZh','titleEn','summaryZh','summaryEn','bodyZh','bodyEn','cover','images','sources','relatedProducts'])||!Object.keys(n).length)fail('资讯格式无效。');
  if(!/^[a-z0-9][a-z0-9-]{0,79}$/.test(n.id)||ids.has(n.id))fail('资讯编号必须唯一。');ids.add(n.id);
  if(!['company','product','guide','service','maintenance','marine','industry'].includes(n.category)||!/^\d{4}-\d{2}-\d{2}$/.test(n.date)||!Number.isFinite(Date.parse(n.date))||new Date(n.date).toISOString().slice(0,10)!==n.date)fail('请填写有效的分类与日期。');
  for(const k of ['titleZh','titleEn','summaryZh','summaryEn','bodyZh','bodyEn'])if(!text(n[k],k.startsWith('body')?30000:k.startsWith('title')?200:600))fail('资讯文字无效或过长。');
  if(!n.titleZh.trim()||!n.bodyZh.trim())fail('请填写中文标题与正文。');
  if(n.cover!==undefined)image(n.cover);
  if(n.images!==undefined){if(!Array.isArray(n.images)||n.images.length>6)fail('每篇最多添加 6 张正文图片。');for(const m of n.images)image(m,true);}
  if(n.relatedProducts!==undefined&&(!Array.isArray(n.relatedProducts)||n.relatedProducts.length>6||new Set(n.relatedProducts).size!==n.relatedProducts.length||n.relatedProducts.some(id=>!Object.hasOwn(schema.products,id))))fail('请选择最多 6 个相关产品。');
  if(n.sources!==undefined){
   if(!Array.isArray(n.sources)||n.sources.length>8)fail('每篇最多添加 8 条参考来源。');
   for(const s of n.sources){
    if(!keys(s,['titleZh','titleEn','url'])||!text(s.titleZh,200)||!s.titleZh.trim()||!text(s.titleEn,200)||!text(s.url,2000))fail('参考来源格式无效。');
    let u;try{u=new URL(s.url);}catch{fail('参考来源需为完整 HTTPS 网页链接。');}
    if(u.protocol!=='https:'||u.username||u.password||/\.pdf(?:$|[?#])/i.test(s.url)||/(^|\.)flutek\.co\.kr$/i.test(u.hostname))fail('参考来源请使用公开 HTTPS 网页；样本与原厂资料仍通过询盘索取。');
   }
  }
 }
 return value;
}
