class WebRTCCall {
  constructor() {
    this.socket = null;
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.roomId = null;
    this.isHost = false;
    
    this.localVideo = document.getElementById('local-video');
    this.remoteVideo = document.getElementById('remote-video');
    this.connectionStatus = document.getElementById('connection-status');
    
    this.videoEnabled = true;
    this.audioEnabled = true;
    
    this.initEventListeners();
  }
  
  initEventListeners() {
    document.getElementById('create-room-btn').addEventListener('click', () => this.createRoom());
    document.getElementById('join-room-btn').addEventListener('click', () => this.joinRoom());
    document.getElementById('copy-room-btn').addEventListener('click', () => this.copyRoomId());
    document.getElementById('copy-call-room-btn').addEventListener('click', () => this.copyRoomId());
    document.getElementById('toggle-video').addEventListener('click', () => this.toggleVideo());
    document.getElementById('toggle-audio').addEventListener('click', () => this.toggleAudio());
    document.getElementById('end-call').addEventListener('click', () => this.endCall());
    document.getElementById('room-id-input').addEventListener('keyup', (e) => {
      if (e.key === 'Enter') this.joinRoom();
    });
  }
  
  connectSocket() {
    return new Promise((resolve, reject) => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      this.socket = new WebSocket(`${protocol}//${host}/`);
      
      this.socket.onopen = () => {
        console.log('WebSocket connected');
        resolve();
      };
      
      this.socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      };
      
      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.showError('WebSocket连接失败');
        reject(error);
      };
      
      this.socket.onclose = () => {
        console.log('WebSocket disconnected');
      };
    });
  }
  
  sendMessage(type, data = {}) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('Socket not connected');
      return;
    }
    this.socket.send(JSON.stringify({ type, ...data }));
  }
  
  async createRoom() {
    try {
      await this.connectSocket();
      this.sendMessage('create-room');
    } catch (error) {
      console.error('Failed to create room:', error);
    }
  }
  
  async joinRoom() {
    const roomId = document.getElementById('room-id-input').value.trim().toUpperCase();
    if (!roomId) {
      this.showError('请输入房间ID');
      return;
    }
    this.roomId = roomId;
    try {
      await this.connectSocket();
      this.sendMessage('join-room', { roomId });
    } catch (error) {
      console.error('Failed to join room:', error);
    }
  }
  
  async handleMessage(data) {
    switch (data.type) {
      case 'room-created':
        this.roomId = data.roomId;
        this.isHost = true;
        await this.startCall();
        break;
        
      case 'room-joined':
        this.isHost = data.isHost;
        await this.startCall();
        break;
        
      case 'peer-joined':
        this.updateStatus('对方已加入，正在建立连接...');
        if (this.isHost) {
          await this.createOffer();
        }
        break;
        
      case 'peer-left':
        this.updateStatus('对方已离开');
        this.clearRemoteVideo();
        break;
        
      case 'signal':
        await this.handleSignal(data.data);
        break;
        
      case 'error':
        this.showError(data.message);
        break;
    }
  }
  
  async startCall() {
    try {
      this.setupPanel.classList.add('hidden');
      this.callPanel.classList.remove('hidden');
      
      if (this.isHost) {
        this.showRoomInfoInCall();
      }
      
      await this.getLocalStream();
      this.setupPeerConnection();
      
      if (this.isHost) {
        this.updateStatus('等待对方加入...');
      } else {
        this.updateStatus('等待对方发起连接...');
      }
    } catch (error) {
      console.error('Failed to start call:', error);
      this.showError('无法启动通话: ' + error.message);
    }
  }
  
  async getLocalStream() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      this.localVideo.srcObject = this.localStream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw new Error('无法访问摄像头或麦克风，请检查权限设置');
    }
  }
  
  setupPeerConnection() {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    };
    
    this.peerConnection = new RTCPeerConnection(configuration);
    
    this.localStream.getTracks().forEach(track => {
      this.peerConnection.addTrack(track, this.localStream);
    });
    
    this.peerConnection.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      this.remoteVideo.srcObject = this.remoteStream;
      this.updateStatus('通话已连接');
    };
    
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendMessage('signal', {
          data: {
            type: 'ice-candidate',
            candidate: event.candidate
          }
        });
      }
    };
    
    this.peerConnection.onconnectionstatechange = (event) => {
      const state = this.peerConnection.connectionState;
      console.log('Connection state:', state);
      
      switch (state) {
        case 'connected':
          this.updateStatus('通话已连接');
          break;
        case 'disconnected':
          this.updateStatus('连接已断开');
          break;
        case 'failed':
          this.updateStatus('连接失败');
          break;
      }
    };
  }
  
  async createOffer() {
    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      
      this.sendMessage('signal', {
        data: {
          type: 'offer',
          sdp: offer
        }
      });
      
      this.updateStatus('正在发起连接...');
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  }
  
  async handleSignal(signal) {
    try {
      if (signal.type === 'offer') {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        
        this.sendMessage('signal', {
          data: {
            type: 'answer',
            sdp: answer
          }
        });
        
        this.updateStatus('正在响应连接...');
      } else if (signal.type === 'answer') {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        this.updateStatus('连接建立中...');
      } else if (signal.type === 'ice-candidate') {
        if (signal.candidate) {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      }
    } catch (error) {
      console.error('Error handling signal:', error);
    }
  }
  
  toggleVideo() {
    if (!this.localStream) return;
    
    this.videoEnabled = !this.videoEnabled;
    this.localStream.getVideoTracks().forEach(track => {
      track.enabled = this.videoEnabled;
    });
    
    const button = document.getElementById('toggle-video');
    if (this.videoEnabled) {
      button.innerHTML = '<span class="icon">📹</span> 关闭摄像头';
      button.classList.remove('btn-success');
      button.classList.add('btn-danger');
    } else {
      button.innerHTML = '<span class="icon">📹</span> 开启摄像头';
      button.classList.remove('btn-danger');
      button.classList.add('btn-success');
    }
  }
  
  toggleAudio() {
    if (!this.localStream) return;
    
    this.audioEnabled = !this.audioEnabled;
    this.localStream.getAudioTracks().forEach(track => {
      track.enabled = this.audioEnabled;
    });
    
    const button = document.getElementById('toggle-audio');
    if (this.audioEnabled) {
      button.innerHTML = '<span class="icon">🎙️</span> 静音';
      button.classList.remove('btn-success');
      button.classList.add('btn-danger');
    } else {
      button.innerHTML = '<span class="icon">🎙️</span> 取消静音';
      button.classList.remove('btn-danger');
      button.classList.add('btn-success');
    }
  }
  
  endCall() {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => track.stop());
      this.remoteStream = null;
    }
    
    if (this.socket) {
      this.sendMessage('leave-room');
      this.socket.close();
      this.socket = null;
    }
    
    this.clearRemoteVideo();
    this.callPanel.classList.add('hidden');
    this.setupPanel.classList.remove('hidden');
    this.callRoomInfo.classList.add('hidden');
    document.getElementById('room-id-input').value = '';
    
    this.updateStatus('通话已结束');
  }
  
  showRoomInfoInCall() {
    document.getElementById('call-room-id').textContent = this.roomId;
    this.callRoomInfo.classList.remove('hidden');
  }
  
  copyRoomId() {
    navigator.clipboard.writeText(this.roomId).then(() => {
      alert('房间ID已复制到剪贴板');
    }).catch(() => {
      this.showError('复制失败，请手动复制');
    });
  }
  
  clearRemoteVideo() {
    this.remoteVideo.srcObject = null;
  }
  
  updateStatus(message) {
    this.connectionStatus.textContent = message;
  }
  
  showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    
    setTimeout(() => {
      errorDiv.classList.add('hidden');
    }, 5000);
  }
  
  get setupPanel() {
    return document.getElementById('setup-panel');
  }
  
  get callPanel() {
    return document.getElementById('call-panel');
  }
  
  get callRoomInfo() {
    return document.getElementById('call-room-info');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new WebRTCCall();
});