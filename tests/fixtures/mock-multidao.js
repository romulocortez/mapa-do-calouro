// Simula muitas pessoas com o mapa aberto (?n=1000) para medir desempenho. Dados inventados.
(function(){
  const N = +(new URLSearchParams(location.search).get('n') || 300);
  let seed=7; const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
  const peers=[{peer:'me1',by:'u_me',isMe:true,sameTab:true,kind:'viewer',presence:{}}];
  const names=['Ana','Bia','Caio','Davi','Eva','Fábio','Gabi','Hugo','Iara','João','Kiko','Lia','Mel','Nina','Otto','Paulo'];
  for(let i=0;i<N;i++){ const cx=1000+rnd()*1200, cy=500+rnd()*600; peers.push({peer:'p'+i,by:'u'+i,isMe:false,kind:'viewer',presence:{on:true,n:names[i%16]+' '+i,r:rnd()<.6?'c':'v',cu:'Curso',m:'',h:rnd()<.1,x:cx,y:cy}}); }
  window.__stress={updates:0};
  window.claude={use:async(n)=>{
    if(n==='user')return{me:async()=>({name:'Teste',id:'u_me'}),id:async()=>'u_me',profiles:async(ids)=>({}),canEdit:async()=>false,isOwner:async()=>false,can:async()=>false};
    if(n==='room')return{presence:async()=>{},onConnection:(f)=>{setTimeout(()=>f(true),10);return()=>{}},onPeers:(f)=>{
      setInterval(()=>{ // a cada 100 ms, 1/30 das pessoas se move (cada pessoa ~a cada 3 s)
        for(let i=1;i<peers.length;i++){ if(rnd()<1/30){ const p=peers[i].presence; peers[i]={...peers[i],presence:{...p,x:p.x+(rnd()-.5)*12,y:p.y+(rnd()-.5)*12}}; } }
        window.__stress.updates++; f({peers:[...peers]}); },100);
      return()=>{}}};
    return null;}};
})();
