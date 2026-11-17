export const repository='qiandd27/tailer-preview';
export const contentPath='docs/content/site-content.json';
export function validateContent(value,schema){
 const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
 const fail=message=>{throw new Error(message);};
 const text=(x,max=6000)=>typeof x==='string'&&x.length<=max&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(x);
 const keys=(x,allowed)=>object(x)&&Object.keys(x).every(k=>allowed.includes(k)&&!['__proto__','constructor','prototype'].includes(k));
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
  if(!keys(n,['id','date','category','titleZh','titleEn','summaryZh','summaryEn','bodyZh','bodyEn'])||!Object.keys(n).length)fail('资讯格式无效。');
  if(!/^[a-z0-9][a-z0-9-]{0,79}$/.test(n.id)||ids.has(n.id))fail('资讯编号必须唯一。');ids.add(n.id);
  if(!['company','product','guide','service'].includes(n.category)||!/^\d{4}-\d{2}-\d{2}$/.test(n.date)||new Date(n.date).toISOString().slice(0,10)!==n.date)fail('请填写有效的分类与日期。');
  for(const k of ['titleZh','titleEn','summaryZh','summaryEn','bodyZh','bodyEn'])if(!text(n[k],k.startsWith('body')?30000:k.startsWith('title')?200:600))fail('资讯文字无效或过长。');
  if(!n.titleZh.trim()||!n.bodyZh.trim())fail('请填写中文标题与正文。');
 }
 return value;
}
