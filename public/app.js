const $=id=>document.getElementById(id);
const socket=io({autoConnect:false});
let stream=null,pc=null,partner=false,searching=false,initiator=false, pendingCandidates=[];
const rtcConfig={iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}]};
function toast(msg){$('toast').textContent=msg;$('toast').style.display='block';setTimeout(()=>$('toast').style.display='none',4500)}
function status(title,desc,show=true){$('emptyTitle').textContent=title;$('emptyDesc').textContent=desc;$('empty').style.display=show?'flex':'none'}
function controls(){const active=!!stream;$('micBtn').disabled=!active;$('camBtn').disabled=!active;$('nextBtn').disabled=!active;$('stopBtn').disabled=!active;$('chatInput').disabled=!partner;$('sendBtn').disabled=!partner;$('reportBtn').disabled=!partner}
function resetPeer(){if(pc){pc.onicecandidate=null;pc.ontrack=null;pc.close();pc=null}pendingCandidates=[];$('remoteVideo').srcObject=null;partner=false;$('remoteLabel').textContent='Aguardando conexão';controls()}
function messagesClear(){$('messages').replaceChildren();const p=document.createElement('p');p.className='hint';p.textContent='Diga olá para começar a conversa!';$('messages').append(p)}
function addMessage(name,message,me){const hint=$('messages').querySelector('.hint');if(hint)hint.remove();const bubble=document.createElement('div');bubble.className='bubble'+(me?' me':'');const who=document.createElement('small');who.textContent=name;const text=document.createElement('span');text.textContent=message;bubble.append(who,text);$('messages').append(bubble);$('messages').scrollTop=$('messages').scrollHeight}
async function begin(){try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:{echoCancellation:true,noiseSuppression:true}});$('localVideo').srcObject=stream;$('localPlaceholder').style.display='none';$('startOverlay').classList.add('hidden');socket.connect();controls();search()}catch(e){toast('Permita o acesso à câmera e ao microfone nas configurações do navegador.');}}
function search(){if(!stream)return;resetPeer();searching=true;status('Procurando alguém...','Aguarde enquanto encontramos uma pessoa para você.');messagesClear();if(socket.connected)socket.emit('join',{name:$('name').value});else socket.once('connect',()=>socket.emit('join',{name:$('name').value}))}
async function createPeer(){pc=new RTCPeerConnection(rtcConfig);for(const track of stream.getTracks())pc.addTrack(track,stream);pc.ontrack=e=>{$('remoteVideo').srcObject=e.streams[0];status('','',false)};pc.onicecandidate=e=>{if(e.candidate)socket.emit('signal',{type:'candidate',candidate:e.candidate})};pc.onconnectionstatechange=()=>{if(pc && pc.connectionState==='failed')toast('Falha de conexão. Tente a próxima pessoa.')};}
async function handleSignal(data){if(!partner)return;try{if(data.type==='offer'){if(!pc)await createPeer();await pc.setRemoteDescription(data.description);for(const c of pendingCandidates)await pc.addIceCandidate(c);pendingCandidates=[];await pc.setLocalDescription(await pc.createAnswer());socket.emit('signal',{type:'answer',description:pc.localDescription})}else if(data.type==='answer'){if(!pc)return;await pc.setRemoteDescription(data.description);for(const c of pendingCandidates)await pc.addIceCandidate(c);pendingCandidates=[]}else if(data.type==='candidate' && data.candidate){if(pc?.remoteDescription)await pc.addIceCandidate(data.candidate);else pendingCandidates.push(data.candidate)}}catch(e){console.error(e);toast('Não foi possível estabelecer a chamada.')}}
$('startForm').addEventListener('submit',e=>{e.preventDefault();begin()});
$('nextBtn').onclick=()=>{socket.emit('next');search()};
$('stopBtn').onclick=()=>{socket.emit('next');resetPeer();searching=false;status('Conversa encerrada','Clique em Próxima pessoa para iniciar outra conversa.');};
$('micBtn').onclick=()=>{const t=stream?.getAudioTracks()[0];if(t){t.enabled=!t.enabled;$('micBtn').textContent=t.enabled?'🎙️ Microfone':'🔇 Silenciado'}};
$('camBtn').onclick=()=>{const t=stream?.getVideoTracks()[0];if(t){t.enabled=!t.enabled;$('camBtn').textContent=t.enabled?'📷 Câmera':'🚫 Sem câmera';$('localPlaceholder').style.display=t.enabled?'none':'grid'}};
$('chatForm').onsubmit=e=>{e.preventDefault();const message=$('chatInput').value.trim();if(!message||!partner)return;socket.emit('chat',message);addMessage('Você',message,true);$('chatInput').value=''};
$('reportBtn').onclick=()=>{if(confirm('Denunciar este participante por comportamento inadequado?')){socket.emit('report','Comportamento inadequado');socket.emit('next');search();toast('Denúncia enviada. Buscando outra pessoa.')}};
socket.on('searching',()=>{searching=true});
socket.on('matched',async data=>{searching=false;partner=true;initiator=data.initiator;$('remoteLabel').textContent=data.name;status('Conectando...','Estabelecendo vídeo seguro.');controls();messagesClear();if(initiator){try{await createPeer();await pc.setLocalDescription(await pc.createOffer());socket.emit('signal',{type:'offer',description:pc.localDescription})}catch(e){toast('Falha ao iniciar chamada.')}}});
socket.on('signal',handleSignal);
socket.on('chat',data=>addMessage(data.name,data.message,false));
socket.on('partner-left',()=>{resetPeer();status('A pessoa saiu da conversa','Clique em Próxima pessoa para encontrar alguém.');toast('O outro participante desconectou.');});
socket.on('notice',toast);
socket.on('disconnect',()=>{resetPeer();status('Sem conexão com o servidor','Aguarde a reconexão...')});
socket.on('connect',()=>{if(stream && searching)socket.emit('join',{name:$('name').value})});
window.addEventListener('beforeunload',()=>{stream?.getTracks().forEach(t=>t.stop());socket.disconnect()});
