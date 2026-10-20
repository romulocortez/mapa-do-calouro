// Relatos de exemplo para testar a fila da coordenação (dados inventados).
(function(){ const S = window.__store, now = Date.now();
 // relato pendente de lugar novo com foto (foto num documento separado) e uma atualização aprovada minha
 const c=document.createElement('canvas'); c.width=120; c.height=80; const g=c.getContext('2d'); g.fillStyle='#8a6'; g.fillRect(0,0,120,80); g.fillStyle='#fff'; g.fillRect(30,20,60,40);
 S["reportes/u_ana"]={items:{r1:{kind:"mapa",type:"novo",nome:"Laboratório de Robótica",detail:"Abriu um laboratório novo no térreo do Bloco 08, na segunda porta depois do banheiro.",x:1150,y:640,onde:"no CT",created:now-3600e3,foto:true}}};
 S["reportes/u_ana/fotos/r1"]={data:c.toDataURL('image/jpeg',.8),at:now-3600e3};
 S["reportes/u_me"]={items:{m9:{kind:"mapa",type:"atualizacao",nome:"Sala 512",detail:"A sala 512 agora é laboratório de informática do CT.",x:1100,y:600,onde:"no CT",created:now-86400e3,foto:false}}};
 S["moderacao/estado"]={ocultos:{},suspensos:{},arquivadas:{},contrib:{"u_me:m9":{ok:true,at:now-80000e3,novo:false,foto:false}}};
})();
