document.addEventListener('DOMContentLoaded', () => {
    const localVideo = document.getElementById('localVideo');
    const remoteVideo = document.getElementById('remoteVideo');
    let peerConnection;
    let localStream;

    // WebSocket setup
    const socket = new WebSocket('wss://your-replit-app-name.your-username.repl.co');

    socket.addEventListener('open', () => {
        console.log('WebSocket connection opened.');
        initMedia();
    });

    socket.addEventListener('message', (event) => {
        const message = JSON.parse(event.data);
        handleSignalingData(message);
    });

    function initMedia() {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(stream => {
                localVideo.srcObject = stream;
                localStream = stream;
                initPeerConnection();
            })
            .catch(error => console.error('getUserMedia error:', error));
    }

    function initPeerConnection() {
        peerConnection = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                sendData({ 'ice': event.candidate });
            }
        };

        peerConnection.ontrack = event => {
            remoteVideo.srcObject = event.streams[0];
        };

        createOffer();
    }

    function createOffer() {
        peerConnection.createOffer()
            .then(offer => peerConnection.setLocalDescription(offer))
            .then(() => {
                sendData({ 'offer': peerConnection.localDescription });
            })
            .catch(error => console.error('Error creating offer:', error));
    }

    function handleSignalingData(data) {
        switch (data.type) {
            case 'offer':
                peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer))
                    .then(() => createAnswer())
                    .catch(error => console.error('Error setting remote description:', error));
                break;
            case 'answer':
                peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer))
                    .catch(error => console.error('Error setting remote description:', error));
                break;
            case 'ice':
                peerConnection.addIceCandidate(new RTCIceCandidate(data.ice))
                    .catch(error => console.error('Error adding ICE candidate:', error));
                break;
        }
    }

    function createAnswer() {
        peerConnection.createAnswer()
            .then(answer => peerConnection.setLocalDescription(answer))
            .then(() => {
                sendData({ 'answer': peerConnection.localDescription });
            })
            .catch(error => console.error('Error creating answer:', error));
    }

    function sendData(data) {
        socket.send(JSON.stringify(data));
    }
});
