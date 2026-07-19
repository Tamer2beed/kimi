// public/js/audio.js
// [SKILL-AUDIO][public/js/audio.js:1] — Mediasoup Client — بث الصوت فقط
// المشكلة التي يحلها: تفعيل الصوت الحقيقي عبر WebRTC SFU
// تاريخ: 2026-06-25
// يعتمد على: mediasoup-client (مُحمَّل من CDN في chat.html)

const AudioSystem = (() => {

  /* ══ الحالة الداخلية ══ */
  let device          = null;   /* mediasoup.Device */
  let sendTransport   = null;   /* WebRtcTransport للإرسال */
  let recvTransport   = null;   /* WebRtcTransport للاستقبال */
  let audioProducer   = null;   /* Producer (مايك المستخدم) */
  let audioConsumers  = {};     /* { producerId: { consumer, audioEl } } */
  let localStream     = null;   /* MediaStream من المايك */
  let isInitialized   = false;
  let currentRoomId   = null;

  /* ══ 1. تهيئة Device (مرة واحدة لكل غرفة) ══ */
  async function initDevice(roomId) {
    if (isInitialized && currentRoomId === String(roomId)) return;
    currentRoomId = String(roomId);

    try {
      /* اطلب RTP Capabilities من السيرفر */
      const caps = await new Promise((resolve, reject) => {
        socket.emit('audio:getCapabilities', { room_id: currentRoomId });
        socket.once('audio:capabilities', resolve);
        setTimeout(() => reject(new Error('timeout getCapabilities')), 10000);
      });

      device = new mediasoupClient.Device();
      await device.load({ routerRtpCapabilities: caps });
      isInitialized = true;
      console.log('🎙️ AudioSystem: Device جاهز');
    } catch (err) {
      console.error('❌ AudioSystem initDevice:', err.message);
    }
  }

  /* ══ 2. بدء البث — المتحدث ══ */
  async function startSpeaking() {
    if (!isInitialized) {
      console.warn('AudioSystem: initDevice لم يكتمل بعد');
      return;
    }
    if (audioProducer) return; /* أصلاً يبث */

    try {
      /* اطلب إذن المايك من المستخدم */
      localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation : true,
          noiseSuppression : true,
          autoGainControl  : true,
        },
        video: false,
      });

      /* إنشاء Send Transport */
      const tParams = await new Promise((resolve, reject) => {
        socket.emit('audio:createSendTransport', { room_id: currentRoomId });
        socket.once('audio:sendTransportCreated', resolve);
        setTimeout(() => reject(new Error('timeout createSendTransport')), 10000);
      });

      sendTransport = device.createSendTransport(tParams);

      /* ربط حدث connect */
      sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
          socket.emit('audio:connectTransport', {
            transportId   : sendTransport.id,
            dtlsParameters,
          });
          socket.once('audio:transportConnected', callback);
        } catch (err) { errback(err); }
      });

      /* ربط حدث produce */
      sendTransport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
        try {
          socket.emit('audio:produce', {
            transportId : sendTransport.id,
            kind,
            rtpParameters,
            room_id     : currentRoomId,
          });
          socket.once('audio:produced', ({ producerId }) => callback({ id: producerId }));
        } catch (err) { errback(err); }
      });

      /* بدء البث */
      const audioTrack = localStream.getAudioTracks()[0];
      audioProducer = await sendTransport.produce({ track: audioTrack });

      audioProducer.on('trackended', () => stopSpeaking());
      audioProducer.on('transportclose', () => { audioProducer = null; });

      console.log('✅ AudioSystem: بدأ البث الصوتي');

    } catch (err) {
      console.error('❌ AudioSystem startSpeaking:', err.message);
      if (err.name === 'NotAllowedError') {
        if (typeof showToast === 'function') showToast('⛔ لم تمنح إذن المايك');
      }
      stopSpeaking();
    }
  }

  /* ══ 3. إيقاف البث ══ */
  function stopSpeaking() {
    if (audioProducer) {
      audioProducer.close();
      audioProducer = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      localStream = null;
    }
    if (sendTransport) {
      sendTransport.close();
      sendTransport = null;
    }
    console.log('🔇 AudioSystem: انتهى البث الصوتي');
  }

  /* ══ 4. استقبال بث شخص آخر ══ */
  async function consumeAudio(producerId, producerUsername) {
    if (!isInitialized) return;
    if (audioConsumers[producerId]) return; /* أصلاً مستقبِل */

    try {
      /* إنشاء Recv Transport (مرة واحدة فقط) */
      if (!recvTransport) {
        const tParams = await new Promise((resolve, reject) => {
          socket.emit('audio:createRecvTransport', { room_id: currentRoomId });
          socket.once('audio:recvTransportCreated', resolve);
          setTimeout(() => reject(new Error('timeout createRecvTransport')), 10000);
        });

        recvTransport = device.createRecvTransport(tParams);

        recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
          try {
            socket.emit('audio:connectTransport', {
              transportId   : recvTransport.id,
              dtlsParameters,
            });
            socket.once('audio:transportConnected', callback);
          } catch (err) { errback(err); }
        });
      }

      /* اطلب Consume */
      const consumerParams = await new Promise((resolve, reject) => {
        socket.emit('audio:consume', {
          room_id        : currentRoomId,
          producerId,
          rtpCapabilities: device.rtpCapabilities,
        });
        socket.once('audio:consumed', resolve);
        setTimeout(() => reject(new Error('timeout consume')), 10000);
      });

      if (!consumerParams || consumerParams.error) {
        console.warn('AudioSystem: لا يمكن استقبال هذا البث');
        return;
      }

      const consumer = await recvTransport.consume(consumerParams);

      /* تشغيل الصوت */
      const stream   = new MediaStream([consumer.track]);
      const audioEl  = new Audio();
      audioEl.srcObject = stream;
      audioEl.play().catch(e => console.warn('AudioSystem autoplay:', e.message));

      audioConsumers[producerId] = { consumer, audioEl };
      console.log(`🔊 AudioSystem: يستمع لـ ${producerUsername || producerId}`);

    } catch (err) {
      console.error('❌ AudioSystem consumeAudio:', err.message);
    }
  }

  /* ══ 5. إيقاف استقبال producer معين ══ */
  function stopConsuming(producerId) {
    const c = audioConsumers[producerId];
    if (!c) return;
    c.consumer.close();
    c.audioEl.pause();
    c.audioEl.srcObject = null;
    delete audioConsumers[producerId];
    console.log(`🔕 AudioSystem: توقف استقبال ${producerId}`);
  }

  /* ══ 6. ربط Socket Events ══ */
  function bindSocketEvents() {
    if (typeof socket === 'undefined') return;

    /* متحدث جديد بدأ البث — استقبله */
    socket.on('audio:newProducer', ({ producerId, username: producerUser }) => {
      /* لا تستقبل صوتك أنت */
      if (producerUser === username) return;
      consumeAudio(producerId, producerUser);
    });

    /* متحدث انتهى — أوقف استقباله */
    socket.on('audio:producerClosed', ({ producerId }) => {
      stopConsuming(producerId);
    });
  }

  /* ══ Init ══ */
  document.addEventListener('socketReady', bindSocketEvents);

  /* ══ تصدير ══ */
  return {
    initDevice,
    startSpeaking,
    stopSpeaking,
    consumeAudio,
    stopConsuming,
    isReady: () => isInitialized,
  };

})();

window.AudioSystem = AudioSystem;
