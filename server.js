import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import crypto from 'node:crypto';

const app = express();
app.disable('x-powered-by');
app.use(express.static('public'));
app.get('/health', (_req, res) => res.json({ok:true}));
const server = createServer(app);
const io = new Server(server, {maxHttpBufferSize: 16000, cors:{origin:false}});
const waiting = [];
const clients = new Map();
const LIMIT = 500;
const clean = (value, max) => typeof value === 'string' ? value.trim().slice(0,max) : '';
function removeWaiting(id){let index; while((index=waiting.indexOf(id))!==-1) waiting.splice(index,1);}
function breakPair(id, notify=true){
 const state=clients.get(id); if(!state) return;
 removeWaiting(id);
 const otherId=state.partner;
 state.partner=null;
 if(otherId){const other=clients.get(otherId); if(other && other.partner===id){other.partner=null; if(notify) io.to(otherId).emit('partner-left');}}
}
function match(){
 while(waiting.length>=2){
  const a=waiting.shift(), b=waiting.shift();
  const sa=clients.get(a),sb=clients.get(b);
  if(!sa || !sb || sa.partner || sb.partner || !sa.queued || !sb.queued){
    if(sa?.queued && !sa.partner) waiting.unshift(a);
    if(sb?.queued && !sb.partner) waiting.unshift(b);
    if(waiting.length<2) break;
    continue;
  }
  sa.queued=sb.queued=false; sa.partner=b;sb.partner=a;
  const room=crypto.randomUUID();sa.room=sb.room=room;
  io.to(a).emit('matched',{name:sb.name,initiator:true});
  io.to(b).emit('matched',{name:sa.name,initiator:false});
 }
}
const lastMessage = new Map();
io.on('connection',socket=>{
 clients.set(socket.id,{name:'Visitante',partner:null,queued:false,room:null});
 socket.on('join',data=>{
  const state=clients.get(socket.id); if(!state)return;
  breakPair(socket.id);state.queued=false;
  state.name=clean(data?.name,25)||'Visitante';
  if(waiting.length>=LIMIT){socket.emit('notice','Fila cheia. Tente novamente.');return;}
  state.queued=true;removeWaiting(socket.id);waiting.push(socket.id);
  socket.emit('searching');match();
 });
 socket.on('next',()=>{const state=clients.get(socket.id);if(!state)return;breakPair(socket.id);state.queued=false;socket.emit('idle');});
 socket.on('signal',payload=>{
  const state=clients.get(socket.id);if(!state?.partner)return;
  if(!payload || !['offer','answer','candidate'].includes(payload.type))return;
  if(JSON.stringify(payload).length>12000)return;
  io.to(state.partner).emit('signal',payload);
 });
 socket.on('chat',raw=>{
  const state=clients.get(socket.id);if(!state?.partner)return;
  const now=Date.now();if(now-(lastMessage.get(socket.id)||0)<400)return;
  lastMessage.set(socket.id,now);
  const message=clean(raw,500);if(message)io.to(state.partner).emit('chat',{name:state.name,message});
 });
 socket.on('report',raw=>{
  const state=clients.get(socket.id);if(!state?.partner)return;
  console.warn('Report',JSON.stringify({reporter:socket.id,reported:state.partner,reason:clean(raw,100),at:new Date().toISOString()}));
  socket.emit('notice','Denúncia registrada no log do servidor.');
 });
 socket.on('disconnect',()=>{breakPair(socket.id);clients.delete(socket.id);lastMessage.delete(socket.id);});
});
const port=Number(process.env.PORT)||3000;
server.listen(port,'0.0.0.0',()=>console.log(`Conecta Vídeo na porta ${port}`));
