const loginPattern=/^[a-z0-9][a-z0-9_.-]{2,31}$/;
export function validateCloudConfig(config){
 if(config?.provider!=='supabase'||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.url)||typeof config.publishableKey!=='string'||config.publishableKey.length<20||config.publishableKey.startsWith('sb_secret_'))throw Error('账号服务尚未配置。');
 // Refuse a legacy service-role JWT even if it was accidentally supplied as a public key.
 if(config.publishableKey.includes('.')){try{const body=JSON.parse(atob(config.publishableKey.split('.')[1].replaceAll('-','+').replaceAll('_','/')));if(body.role!=='anon')throw Error();}catch{throw Error('账号服务公开配置无效。');}}
 return config;
}
export function createCloudClient(config,{fetchImpl=fetch,now=()=>Date.now()}={}){
 validateCloudConfig(config);let session=null,refreshing=null;
 const authHeaders=token=>({apikey:config.publishableKey,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})});
 async function result(response){const body=await response.json().catch(()=>null);if(!response.ok){const error=new Error(body?.error||'请求未完成，请检查网络后再试。');error.status=response.status;throw error;}return body;}
 function remember(body){if(!body?.access_token||!body?.refresh_token)throw Error('登录状态无效。');session={access:body.access_token,refresh:body.refresh_token,expires:now()+body.expires_in*1000};}
 async function access(){
  if(!session)throw Error('请先登录。');
  if(session.expires-now()<60000){
   if(!refreshing)refreshing=(async()=>{const r=await fetchImpl(config.url+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:authHeaders(),body:JSON.stringify({refresh_token:session.refresh})});remember(await result(r));})().finally(()=>{refreshing=null;});
   await refreshing;
  }return session.access;
 }
 async function request(path,method='GET',body){const token=await access();return result(await fetchImpl(config.url+'/functions/v1/tailer-cms'+path,{method,headers:authHeaders(token),body:body===undefined?undefined:JSON.stringify(body)}));}
 return {
  async login(username,password){const name=username.trim().toLowerCase();if(!loginPattern.test(name))throw Error('账号为 3–32 位字母、数字、点、下划线或短横线。');
   const r=await fetchImpl(config.url+'/auth/v1/token?grant_type=password',{method:'POST',headers:authHeaders(),body:JSON.stringify({email:name+'@cms.tailer.invalid',password})});
   if(!r.ok){session=null;throw Error(r.status===429?'登录尝试过多，请稍后再试。':'账号或密码不正确，或账号不可用。');}
   remember(await r.json());try{return await request('/session');}catch(error){session=null;throw error;}
  },
  request,
  async logout(){const previous=session;session=null;if(previous)try{await fetchImpl(config.url+'/auth/v1/logout',{method:'POST',headers:authHeaders(previous.access)});}catch{}},
  content:()=>request('/content'),
  save:(document,revision)=>request('/content','PUT',{document,expectedRevision:revision}),
  members:()=>request('/members'),
  createMember:body=>request('/members','POST',body),
  setActive:(id,active)=>request('/members/'+encodeURIComponent(id)+'/status','POST',{active}),
  resetPassword:(id,password)=>request('/members/'+encodeURIComponent(id)+'/password','POST',{password}),
  changePassword:(currentPassword,newPassword)=>request('/password','POST',{currentPassword,newPassword})
 };
}
