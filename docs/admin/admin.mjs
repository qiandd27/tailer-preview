import {createCloudClient} from './cloud-api.mjs';
import {createTeamUI} from './team-ui.mjs';
import {createNewsEditor} from './news-editor.mjs';
import {repository,contentPath,validateContent} from '../content-model.mjs';
const $=s=>document.querySelector(s),clone=x=>structuredClone(x),local=location.hostname==='127.0.0.1';
let cloud=null,cloudMember=null,team=null,mediaBusy=false;
const configReady=fetch('../content/backend-config.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('账号服务暂时无法连接，请刷新后重试。');return r.json();});
let token='',csrf='',schema,data,saved,sha='',dirty=false,busy=false,currentView='products';
const decode=base64=>new TextDecoder().decode(Uint8Array.from(atob(base64.replace(/\s/g,'')),c=>c.charCodeAt(0)));
const encode=text=>{const bytes=new TextEncoder().encode(text);let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s);};
async function github(path,options={}){
 const r=await fetch('https://api.github.com'+path,{...options,headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',Authorization:'Bearer '+token,...options.headers}});
 if(!r.ok){if(r.status===409)throw Error('网站内容已被另一处更新。请先备份当前文字，再重新连接载入最新内容。');throw Error(r.status===401?'授权失效，请重新连接。':r.status===403?'授权不足，请检查当前仓库的 Contents 写入权限。':'连接失败（'+r.status+'），未确认保存，请刷新核对后再操作。');}return r.json();
}
async function api(path,options={}){const r=await fetch('/api/'+path,{...options,headers:{'Content-Type':'application/json','X-Cms-CSRF':csrf,...options.headers}});const body=await r.json();if(!r.ok)throw Error(body.error||'管理服务连接失败');return body;}
async function readContent(){return cloud?cloud.content():local?api('content'):github('/repos/'+repository+'/contents/'+contentPath+'?ref=main');}
function message(text,error=false){$('#status').textContent=text;$('.save-status').classList.toggle('is-error',error);}
function changed(){dirty=true;$('#publish').disabled=busy||mediaBusy;$('#dirty-label').textContent='有未发布的修改';$('.save-status').classList.add('is-dirty');preview();}
function clean(){dirty=false;$('#publish').disabled=true;$('#dirty-label').textContent='内容已同步';$('.save-status').classList.remove('is-dirty');}
function preview(){const frame=$('#page-frame');if(frame.contentWindow)frame.contentWindow.postMessage({type:'tailer:preview',content:data},location.origin);}
function options(select,items,selected){select.replaceChildren();for(const [value,label] of items){const o=document.createElement('option');o.value=value;o.textContent=label;select.append(o);}if(items.some(x=>x[0]===selected))select.value=selected;}
function product(){const id=$('#product-select').value,p={...schema.products[id],...data.products[id]};for(const [key,v] of Object.entries(p))$('#product-form').elements[key].value=v;$('#product-preview').href='../products/'+encodeURIComponent(id)+'.html';}
function fieldList(selected){const page=$('#page-select').value,q=$('#field-search').value.trim().toLowerCase();options($('#field-select'),Object.entries(schema.pages[page].fields).filter(([k,v])=>(data.pages[page]?.[k]??v.value).toLowerCase().includes(q)).map(([k,v])=>[k,(data.pages[page]?.[k]??v.value).replaceAll('\n',' / ').slice(0,90)]),selected);field();}
function field(){const page=$('#page-select').value,key=$('#field-select').value;$('#field-value').disabled=!key;$('#field-reset').disabled=!key;$('#field-value').value=key?(data.pages[page]?.[key]??schema.pages[page].fields[key].value):'';}
function page(){fieldList();$('#page-frame').src='../'+$('#page-select').value+'?cms-edit=1';}
function newsList(selected){options($('#news-select'),data.news.map(n=>[n.id,n.titleZh||'未命名资讯']),selected);news();}
const newsEditor=createNewsEditor({root:$('#news-media-editor'),getArticle:()=>data?.news.find(x=>x.id===$('#news-select').value),getSchema:()=>schema,onChange:changed,status:message,onBusy:value=>{mediaBusy=value;$('#workspace').inert=value;$('#publish').disabled=busy||mediaBusy||!dirty;}});
function news(){const n=data.news.find(x=>x.id===$('#news-select').value);$('#news-form').hidden=!n;$('#news-delete').disabled=!n;if(n)for(const el of $('#news-form').elements)if(el.name)el.value=n[el.name]||'';newsEditor.render();}
function initialize(){
 options($('#product-select'),Object.entries(schema.products).map(([id,p])=>[id,p.model+' · '+p.zh]));
 options($('#page-select'),Object.entries(schema.pages).map(([id,p])=>[id,(id.startsWith('en/')?'EN · ':'中文 · ')+p.title+' / '+id]));
 product();page();newsList();$('#login').hidden=true;$('#workspace').hidden=false;clean();
}
async function connect(){
 $('#login-status').textContent='正在核对管理权限…';
 if(cloud){$('#account-label').textContent=cloudMember.display_name+' · '+(cloudMember.role==='owner'?'管理员':'编辑人员');}
 else if(local){const session=await api('session');csrf=session.csrf;$('#account-label').textContent='本机管理 · '+session.login;}
 else {const user=await github('/user'),repo=await github('/repos/'+repository);if(!repo.permissions?.push)throw Error('当前账号没有这个网站的写入权限。');$('#account-label').textContent=user.login;}
 const [definition,content]=await Promise.all([fetch('../content/editor-schema.json',{cache:'no-cache'}).then(r=>r.json()),readContent()]);schema=definition;data=validateContent(cloud?content.document:JSON.parse(decode(content.content)),schema);sha=cloud?String(content.revision):content.sha;saved=clone(data);initialize();$('#access-token').value='';
}
$('#login-form').addEventListener('submit',async event=>{event.preventDefault();token=$('#access-token').value.trim();const b=event.submitter;b.disabled=true;try{await connect();}catch(error){token='';$('#login-status').textContent=error.message;}finally{b.disabled=false;}});
function chooseView(view){currentView=view;document.querySelectorAll('[data-view]').forEach(b=>{if(b.dataset.view===view)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});document.querySelectorAll('.editor-view').forEach(s=>s.hidden=s.id!=='view-'+view);$('#view-title').textContent={products:'产品管理',pages:'页面文字',news:'新闻资讯',team:'成员管理',password:'账号设置'}[view];if(view==='team')team?.refresh().catch(e=>message(e.message,true));}
async function readyCloud(){
 team=createTeamUI({client:cloud,member:cloudMember,status:message,onPasswordChanged:()=>{dirty=false;location.reload();}});
 if(cloudMember.must_change_password){$('#login').hidden=true;$('#workspace').hidden=false;$('#account-label').textContent=cloudMember.display_name;$('#password-reason').textContent='首次登录，请先把初始密码改为自己的密码。完成后即可编辑网站。';document.querySelectorAll('[data-view]').forEach(b=>b.hidden=b.dataset.view!=='password');$('#publish').hidden=true;$('#discard').hidden=true;chooseView('password');return;}
 await connect();
}
configReady.then(config=>{if(config.provider==='supabase'){cloud=createCloudClient(config);$('#password-login-form').hidden=false;$('.login-help').textContent='使用管理员为你开通的账号登录。在任何设备上编辑产品、页面文字和新闻。';}else if(config.provider==='github'){if(local){$('#local-progress').hidden=false;connect().catch(error=>{$('#login-status').textContent=error.message;$('#local-progress').hidden=true;});}else{$('#login-form').hidden=false;$('#legacy-auth-help').hidden=false;}$('.login-help').textContent='旧版管理入口，使用仓库授权登录。';}else throw Error('账号服务配置无效，请联系管理员。');}).catch(error=>{$('.login-help').textContent='暂时无法载入登录入口。';$('#login-status').textContent=error.message;});
$('#password-login-form').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget,button=form.querySelector('button');button.disabled=true;$('#login-status').textContent='正在登录…';try{const result=await cloud.login(form.elements.username.value,form.elements.password.value);form.elements.password.value='';cloudMember=result.member;await readyCloud();}catch(error){$('#login-status').textContent=error.message;}finally{button.disabled=false;}});

$('#logout').addEventListener('click',async()=>{if(dirty&&!confirm('还有未发布的修改，确定退出？'))return;token='';data=null;if(cloud)await cloud.logout();dirty=false;location.reload();});
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>chooseView(button.dataset.view)));
$('#product-select').addEventListener('change',product);
$('#product-form').addEventListener('submit',e=>e.preventDefault());
$('#product-form').addEventListener('input',event=>{const id=$('#product-select').value;if(event.target.name){data.products[id]??={};data.products[id][event.target.name]=event.target.value;changed();}});
$('#page-select').addEventListener('change',()=>{$('#field-search').value='';page();});$('#field-search').addEventListener('input',()=>fieldList());$('#field-select').addEventListener('change',field);
$('#field-value').addEventListener('input',()=>{const p=$('#page-select').value,k=$('#field-select').value;if(!k)return;data.pages[p]??={};data.pages[p][k]=$('#field-value').value;changed();});
$('#field-reset').addEventListener('click',()=>{const p=$('#page-select').value,k=$('#field-select').value;if(data.pages[p])delete data.pages[p][k];field();changed();});
addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==$('#page-frame').contentWindow)return;const m=event.data;if(m?.type==='tailer:page-ready'){event.source.postMessage({type:'tailer:edit-ready'},location.origin);preview();}if(m?.type==='tailer:field'&&m.page===$('#page-select').value&&Object.hasOwn(schema.pages[m.page].fields,m.key)){$('#field-search').value='';fieldList(m.key);$('#field-value').focus();}});
$('#news-select').addEventListener('change',news);$('#news-form').addEventListener('submit',e=>e.preventDefault());
$('#news-form').addEventListener('input',event=>{const n=data.news.find(x=>x.id===$('#news-select').value);if(n&&event.target.name){n[event.target.name]=event.target.value;if(event.target.name==='titleZh')$('#news-select').selectedOptions[0].textContent=n.titleZh||'未命名资讯';changed();}});
$('#news-add').addEventListener('click',()=>{const n={id:'news-'+Date.now().toString(36),date:new Date().toLocaleDateString('sv-SE'),category:'company',titleZh:'',titleEn:'',summaryZh:'',summaryEn:'',bodyZh:'',bodyEn:''};data.news.unshift(n);newsList(n.id);changed();$('#news-form').elements.titleZh.focus();});
$('#news-delete').addEventListener('click',()=>{const id=$('#news-select').value;if(!confirm('删除这篇资讯？点击“保存并发布”后生效。'))return;data.news=data.news.filter(n=>n.id!==id);newsList();changed();});
$('#discard').addEventListener('click',()=>{if(!dirty||confirm('放弃本次尚未发布的所有修改？')){data=clone(saved);product();fieldList();newsList();clean();preview();message('已恢复至上次保存的内容。');}});
$('#publish').addEventListener('click',async()=>{if(busy||mediaBusy||!dirty)return;try{validateContent(data,schema);busy=true;$('#workspace').inert=true;$('#publish').disabled=true;message('正在保存并提交发布…');const next={...clone(data),revision:data.revision+1};
 const result=cloud?await cloud.save(next,Number(sha)):local?await api('content',{method:'PUT',body:JSON.stringify({sha,data:next})}):await github('/repos/'+repository+'/contents/'+contentPath,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'Update website content from Tailer CMS',branch:'main',sha,content:encode(JSON.stringify(next,null,2)+'\n')})});
 sha=cloud?String(result.revision):result.content.sha;data=next;saved=clone(next);clean();news();message(cloud?'已发布版本 '+next.revision+'，刷新网站即可查看。':'已保存版本 '+next.revision+'，公开站点正在更新。完成部署后刷新查看。');
 }catch(error){message(error.message,true);}finally{busy=false;$('#workspace').inert=false;$('#publish').disabled=!dirty;}});
addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
