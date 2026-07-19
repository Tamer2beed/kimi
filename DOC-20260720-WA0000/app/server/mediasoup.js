// server/mediasoup.js
// مُعطَّل مؤقتاً — يتطلب تثبيت mediasoup على Windows
// السيرفر يعمل بشكل طبيعي بدونه (الصوت فقط هو المعطَّل)

let worker = null;
const sfuRooms = new Map();

async function initWorker() {
  try {
    const mediasoup = require('mediasoup');
    worker = await mediasoup.createWorker({ rtcMinPort: 40000, rtcMaxPort: 49999, logLevel: 'warn' });
    worker.on('died', () => setTimeout(() => initWorker(), 2000));
    console.log('🎙️ Mediasoup Worker جاهز (PID:', worker.pid, ')');
  } catch (err) {
    console.warn('⚠️ Mediasoup غير مثبت — الصوت معطَّل (npm install mediasoup لتفعيله)');
  }
}

async function getOrCreateRoom(roomId) {
  if (!worker) throw new Error('Mediasoup غير مثبت');
  if (sfuRooms.has(roomId)) return sfuRooms.get(roomId);
  const mediasoup = require('mediasoup');
  const router = await worker.createRouter({ mediaCodecs: [{ kind: 'audio', mimeType: 'audio/opus', clockRate: 48000, channels: 2 }] });
  const room = { router, producers: new Map(), sendTransports: new Map(), recvTransports: new Map() };
  sfuRooms.set(roomId, room);
  return room;
}

async function createTransport(router) {
  const transport = await router.createWebRtcTransport({
    listenIps: [{ ip: '0.0.0.0', announcedIp: null }],
    enableUdp: true, enableTcp: true, preferUdp: true,
  });
  transport.on('dtlsstatechange', s => { if (s === 'closed') transport.close(); });
  return transport;
}

function cleanupRoom(roomId) {
  const room = sfuRooms.get(roomId);
  if (!room) return;
  // [FIX] لا تُغلق الغرفة إلا إذا لم يتبق فيها أي transport على الإطلاق (لا متحدثين ولا مستمعين)
  if (room.producers.size === 0 && room.sendTransports.size === 0 && room.recvTransports.size === 0) {
    room.router.close();
    sfuRooms.delete(roomId);
  }
}

module.exports = { initWorker, getOrCreateRoom, createTransport, sfuRooms, cleanupRoom };
