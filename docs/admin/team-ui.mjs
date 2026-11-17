export function createTeamUI({client,member,onPasswordChanged,status}){
 const $=s=>document.querySelector(s);let busy=false;
 const shareUrl=new URL('./',location.href).href;
 const clearCredentials=()=>{$('#member-credentials-text').value='';$('#member-credentials').hidden=true;};
 function showCredentials(username,password){$('#member-credentials-text').value='后台：'+shareUrl+'\n账号：'+username+'\n初始密码：'+password+'\n首次登录请修改密码。';$('#member-credentials').hidden=false;}
 $('#member-credentials-clear').addEventListener('click',clearCredentials);
 $('#member-credentials-copy').addEventListener('click',async()=>{const box=$('#member-credentials-text');try{await navigator.clipboard.writeText(box.value);status('账号信息已复制，请单独发给该成员。');}catch{box.focus();box.select();status('请复制已选中的账号信息。');}});
 const failure=error=>status(error.message,true);
 async function work(action){if(busy)return;busy=true;$('#view-team').inert=true;try{await action();}catch(error){failure(error);}finally{busy=false;$('#view-team').inert=false;}}
 function row(m){const tr=document.createElement('tr');
  for(const value of [m.display_name,m.username,m.role==='owner'?'管理员':'编辑人员',m.active?(m.must_change_password?'待修改初始密码':'可用'):'已停用']){const td=document.createElement('td');td.textContent=value;tr.append(td);}
  const controls=document.createElement('td');
  if(m.role!=='owner'){
   const toggle=document.createElement('button');toggle.textContent=m.active?'停用':'启用';toggle.type='button';toggle.addEventListener('click',()=>{if(m.active&&!confirm('停用 '+m.username+'？该账号将无法继续修改网站。'))return;work(async()=>{await client.setActive(m.user_id,!m.active);await refresh();status('账号状态已更新。');});});
   const reset=document.createElement('button');reset.textContent='重设密码';reset.type='button';reset.addEventListener('click',()=>{$('#reset-member-id').value=m.user_id;$('#reset-member-name').textContent=m.username;$('#reset-member-password').value='';$('#member-reset').hidden=false;$('#reset-member-password').focus();});controls.append(toggle,reset);
  }else controls.textContent='本人账号';tr.append(controls);return tr;
 }
 async function refresh(){if(member.role!=='owner')return;const result=await client.members();const body=$('#members-body');body.replaceChildren(...result.members.map(row));}
 $('#team-nav').hidden=member.role!=='owner';$('#password-nav').hidden=false;
 $('#team-share').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(shareUrl);status('后台链接已复制，可发给已开通账号的同事。');}catch{$('#team-link').focus();$('#team-link').select();status('请复制已选中的后台链接。');}});$('#team-link').value=shareUrl;
 $('#member-create').addEventListener('submit',event=>{event.preventDefault();const form=event.currentTarget;if(!form.reportValidity())return;work(async()=>{const username=form.elements.username.value.trim().toLowerCase(),password=form.elements.password.value;await client.createMember({username,displayName:form.elements.displayName.value.trim(),password});showCredentials(username,password);form.reset();form.elements.password.type='password';await refresh();status('已开通 '+username+'。请复制下方账号信息，单独发给该成员。');});});
 document.querySelectorAll('[data-generate-password]').forEach(button=>button.addEventListener('click',()=>{const input=document.getElementById(button.dataset.generatePassword),bytes=crypto.getRandomValues(new Uint8Array(16)),alphabet='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';input.value='Tl!'+[...bytes].map(b=>alphabet[b%alphabet.length]).join('');input.type='text';input.focus();input.select();}));
 $('#member-reset').addEventListener('submit',event=>{event.preventDefault();if(!event.currentTarget.reportValidity())return;work(async()=>{const password=$('#reset-member-password').value;await client.resetPassword($('#reset-member-id').value,password);showCredentials($('#reset-member-name').textContent,password);$('#reset-member-password').value='';$('#reset-member-password').type='password';$('#member-reset').hidden=true;await refresh();status('初始密码已重设，请将下方账号信息单独发给该成员。');});});
 $('#cancel-reset').addEventListener('click',()=>{$('#member-reset').hidden=true;$('#reset-member-password').value='';});
 $('#own-password-form').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget;if(!form.reportValidity())return;if(form.elements.newPassword.value!==form.elements.confirmPassword.value){status('两次输入的新密码不一致。',true);return;}
  const button=form.querySelector('button');button.disabled=true;try{await client.changePassword(form.elements.currentPassword.value,form.elements.newPassword.value);form.reset();await client.logout();onPasswordChanged();}catch(error){failure(error);}finally{button.disabled=false;}
 });
 return {refresh};
}
