// Banco falso para os testes de navegador: dados inventados, nenhum dado real de pessoa.
window.__store = {};
const now = Date.now();
const S = window.__store;
S["pedidos/u_ana"] = {itens:{a1:{texto:"Sou caloura de Eng. Civil e não sei onde fica o Bloco 05 do CT.", lugar:"p:ct", curso:"Eng. Civil", papel:"c", status:"aberto", helper:null, criado:now-25*60e3, atualizado:now-25*60e3, notas:[]}}};
S["pedidos/u_bia"] = {itens:{b1:{texto:"Onde fica a sala 305 do CCHL? Tenho aula às 14h.", lugar:"p:cchl", curso:"Letras", papel:"c", status:"aberto", helper:null, criado:now-6*60e3, atualizado:now-6*60e3, notas:[]}}};
S["pedidos/u_me"] = {itens:{m1:{texto:"Como faço para pegar o cartão do RU?", lugar:"p:ru2", curso:"Eng. Mecânica", papel:"c", status:"aberto", helper:null, criado:now-40*60e3, atualizado:now-40*60e3, notas:[]}}};
S["ajudando/u_davi"] = {ofertas:{"u_me:m1":{at:now-30*60e3, msgs:[{t:"Vai na PRAEC, perto do RU I, com o comprovante de matrícula.", at:now-30*60e3}], encontro:"p:praec"}}};
// past helps by me to lia (confirmed) -> my XP
S["pedidos/u_lia"] = {itens:{l1:{texto:"Onde é a biblioteca?", lugar:"p:bccb", curso:"Pedagogia", papel:"c", status:"resolvido", helper:"u_me", criado:now-3*86400e3, atualizado:now-3*86400e3, notas:[]},
  l2:{texto:"E o RU II?", lugar:"p:ru2", curso:"Pedagogia", papel:"c", status:"resolvido", helper:"u_me", criado:now-2*86400e3, atualizado:now-2*86400e3, notas:[]}}};
S["ajudando/u_me"] = {ofertas:{"u_lia:l1":{at:now-3*86400e3+60e3, msgs:[{t:"Fica do lado do RU II.", at:now-3*86400e3+60e3}]}, "u_lia:l2":{at:now-2*86400e3+60e3, msgs:[{t:"Colado na biblioteca.", at:now-2*86400e3+60e3}]}}};
S["confirmacoes/u_lia"] = {itens:{l1:{helper:"u_me", util:true, at:now-3*86400e3+3600e3}, l2:{helper:"u_me", util:null, at:now-2*86400e3+3600e3}}};
S["perfis/u_me"] = {ranking:true, centro:"CT"};
const listeners = [];
function snapCol(col){ const docs = Object.keys(S).filter(k => k.startsWith(col+"/") && k.split("/").length===2).map(k => ({id:k.split("/")[1], exists:true, data:()=>JSON.parse(JSON.stringify(S[k]))})); return {docs, size:docs.length, empty:!docs.length}; }
function fire(){ for (const l of listeners){ if (l.col) l.f(snapCol(l.col)); else { const v=S[l.doc]; l.f({exists:!!v, data:()=>v&&JSON.parse(JSON.stringify(v))}); } } }
const dbm = {
  collection:(c)=>({ onSnapshot:(f)=>{ listeners.push({col:c,f}); setTimeout(()=>f(snapCol(c)),20); return ()=>{}; }, doc:(id)=>dbm.doc(c+"/"+id) }),
  doc:(p)=>({ get:async()=>({exists:!!S[p], data:()=>S[p]&&JSON.parse(JSON.stringify(S[p]))}), set:async(d)=>{ S[p]=JSON.parse(JSON.stringify(d)); setTimeout(fire,10); }, delete:async()=>{ delete S[p]; setTimeout(fire,10); },
    onSnapshot:(f)=>{ listeners.push({doc:p,f}); setTimeout(()=>{const v=S[p]; f({exists:!!v, data:()=>v});},20); return ()=>{}; } })
};
const names={u_me:"Pessoa de Teste",u_ana:"Ana Lima",u_bia:"Bia Souza",u_davi:"Davi Rocha",u_lia:"Lia Melo"};
window.claude={use:async(n)=>{
 if(n==='user')return{me:async()=>({name:'Pessoa de Teste',id:'u_me'}),id:async()=>'u_me',profiles:async(ids)=>Object.fromEntries((Array.isArray(ids)?ids:[ids]).map(i=>[i,{name:names[i]||''}])),canEdit:async()=>true,isOwner:async()=>true,can:async()=>true};
 if(n==='db')return dbm;
 if(n==='room'){const peers=[{peer:'me1',by:'u_me',isMe:true,sameTab:true,kind:'viewer',presence:{}},{peer:'a',by:'u_ana',isMe:false,kind:'viewer',presence:{on:true,n:'Ana',r:'c',cu:'Eng. Civil',m:'',h:true,x:1000,y:640}}];
  return{presence:async()=>{},onConnection:(f)=>{setTimeout(()=>f(true),10);return()=>{}},onPeers:(f)=>{setTimeout(()=>f({peers}),20);return()=>{}}};}
 return null;}};
