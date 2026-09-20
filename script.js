// --- KONFIGURASI PUBNUB (GANTI DENGAN KEY ANDA SENDIRI) ---
const pubnub = new PubNub({
    publishKey: 'YOUR_PUBLISH_KEY_HERE', // Ganti dengan Publish Key dari Dashboard PubNub
    subscribeKey: 'YOUR_SUBSCRIBE_KEY_HERE' // Ganti dengan Subscribe Key dari Dashboard PubNub
});

const channel = 'chat-teman-sederhana'; // Nama room chat (bisa diganti sesuka hati)

let currentUser = {
    name: '',
    avatar: ''
};

// Saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('chatUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showChatScreen();
        subscribeToChat(); // Mulai dengarkan pesan
    }
    
    // Inisialisasi avatar default jika belum ada
    if (!currentUser.avatar && document.querySelector('.avatar-option')) {
        currentUser.avatar = document.querySelector('.avatar-option').src;
    }
});

function selectAvatar(imgElement) {
    document.querySelectorAll('.avatar-option').forEach(img => img.classList.remove('selected'));
    imgElement.classList.add('selected');
    currentUser.avatar = imgElement.src;
}

function joinChat() {
    const nameInput = document.getElementById('username-input').value.trim();
    if (!nameInput) {
        alert("Silakan masukkan nama dulu!");
        return;
    }
    if (!currentUser.avatar) {
        currentUser.avatar = document.querySelector('.avatar-option').src;
    }

    currentUser.name = nameInput;
    localStorage.setItem('chatUser', JSON.stringify(currentUser));
    
    showChatScreen();
    subscribeToChat(); // Mulai mendengarkan pesan setelah login
}

function showChatScreen() {
    document.getElementById('login-screen').classList.remove('active');
    document.getElementById('chat-screen').classList.add('active');
    document.getElementById('display-name').textContent = currentUser.name;
    document.getElementById('current-user-avatar').src = currentUser.avatar;
}

function logout() {
    localStorage.removeItem('chatUser');
    location.reload();
}

// --- FUNGSI KIRIM PESAN KE PUBNUB ---
function sendMessage() {
    const input = document.getElementById('message-input');
    const messageText = input.value.trim();
    
    if (messageText === "") return;
    
    const messageData = {
        sender: currentUser.name,
        avatar: currentUser.avatar,
        text: messageText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isMe: true // Penanda untuk diri sendiri
    };
    
    // Kirim ke Cloud PubNub
    pubnub.publish(
        {
            channel: channel,
            message: messageData
        },
        function(status, response) {
            if (status.error) {
                console.log("Gagal kirim:", status);
            } else {
                console.log("Pesan terkirim!", response.timetoken);
            }
        }
    );
    
    input.value = "";
    input.focus();
}

// --- FUNGSI MENDENGARKAN PESAN DARI TEMAN ---
function subscribeToChat() {
    pubnub.subscribe({
        channels: [channel]
    });

    pubnub.addListener({
        message: function(event) {
            const msg = event.message;
            
            // Cek apakah pesan ini dari kita sendiri (untuk menghindari duplikat tampilan)
            // Atau tampilkan semua pesan tapi bedakan warnanya
            const isMyMessage = msg.sender === currentUser.name;
            
            renderMessage({
                ...msg,
                isMe: isMyMessage
            });
            scrollToBottom();
        }
    });
}

function renderMessage(msg) {
    const container = document.getElementById('messages-container');
    
    // Cek agar tidak menampilkan pesan ganda jika kita sedang online
    const existingMessages = Array.from(container.children);
    const isDuplicate = existingMessages.some(div => div.innerHTML.includes(msg.time) && div.innerHTML.includes(msg.text));
    if (isDuplicate) return;

    const div = document.createElement('div');
    const alignClass = msg.isMe ? 'message-right' : 'message-left';
    
    div.className = `message-bubble ${alignClass}`;
    
    let nameHtml = '';
    if (!msg.isMe) {
        nameHtml = `<span class="sender-name">${msg.sender}</span>`;
    }
    
    div.innerHTML = `
        ${nameHtml}
        ${msg.text}
        <div class="msg-time">${msg.time}</div>
    `;
    
    container.appendChild(div);
}

function scrollToBottom() {
    const container = document.getElementById('messages-container');
    container.scrollTop = container.scrollHeight;
}

// Emoji Logic
function toggleEmojiPicker() {
    document.getElementById('emoji-picker').classList.toggle('hidden');
}

function addEmoji(emoji) {
    const input = document.getElementById('message-input');
    input.value += emoji;
    input.focus();
}

document.getElementById('message-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});
