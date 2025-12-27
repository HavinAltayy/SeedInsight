// ===================================
// SeedInsight - Ortak JavaScript Dosyası
// ===================================

// ===================================
// 1. MODEL (INDEX) PAGE FUNCTIONS
// ===================================

// Global değişkenler (sadece index.html için)
let selectedFile = null;

// Sayfa yüklendiğinde çalışacak fonksiyonlar
document.addEventListener('DOMContentLoaded', function() {
    // Model sayfası elementlerini kontrol et
    if (document.getElementById('uploadArea')) {
        initModelPage();
    }
});

// Model sayfası başlatma fonksiyonu
function initModelPage() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const preview = document.getElementById('preview');
    const uploadPlaceholder = document.getElementById('uploadPlaceholder');
    const predictBtn = document.getElementById('predictBtn');
    const result = document.getElementById('result');
    const chatBox = document.getElementById('chatBox');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const statusText = document.getElementById('statusText');
    const metaStrip = document.getElementById('metaStrip');
    const fileNameSpan = document.getElementById('fileName');
    const fileResSpan = document.getElementById('fileRes');

    // Chat geçmişini yükle
    loadChatHistory();

    // Upload area click olayı
    if (uploadArea) {
        uploadArea.addEventListener('click', () => fileInput.click());
    }

    // Dosya seçildiğinde
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) handleFile(file);
        });
    }

    // Drag & Drop olayları
    if (uploadArea) {
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = "#4a6741";
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.style.borderColor = "#cbd5e1";
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                handleFile(file);
            }
        });
    }

    // Dosya işleme fonksiyonu
    function handleFile(file) {
        selectedFile = file;
        if (statusText) {
            statusText.textContent = "Görsel Hazır";
        }

        // UI Update
        uploadArea.classList.add('has-image');
        if (uploadPlaceholder) {
            uploadPlaceholder.style.opacity = '0';
        }

        // Metadata
        if (fileNameSpan) {
            fileNameSpan.textContent = file.name.length > 20
                ? file.name.substring(0, 15) + '...'
                : file.name;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            if (preview) {
                preview.src = e.target.result;
                preview.style.display = 'block';
            }
            if (predictBtn) {
                predictBtn.disabled = false;
            }

            // Çözünürlük bilgisi
            const img = new Image();
            img.onload = function() {
                if (fileResSpan) {
                    fileResSpan.textContent = `${this.width}x${this.height}px`;
                }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // Tahmin butonu click olayı
    if (predictBtn) {
        predictBtn.addEventListener('click', async () => {
            if (!selectedFile) return;

            // Status güncelleme
            predictBtn.disabled = true;
            if (statusText) {
                statusText.textContent = "Analiz ediliyor...";
            }
            predictBtn.innerHTML = `<span>İşleniyor...</span>`;

            const formData = new FormData();
            formData.append('file', selectedFile);

            try {
                const response = await fetch('/predict', {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();

                // Sonuç güncelleme
                const classNameEl = document.getElementById('className');
                const confidenceEl = document.getElementById('confidence');

                if (classNameEl) classNameEl.textContent = data.class;
                if (confidenceEl) confidenceEl.textContent = data.confidence;

                // Top 5 dağılım grafikleri
                const top5List = document.getElementById('top5List');
                if (top5List) {
                    top5List.innerHTML = '';

                    const colors = ['#4a6741', '#f59e0b', '#ea580c', '#b91c1c', '#713f12'];
                    const confidenceLevels = ['Yüksek', 'Orta', 'Düşük', 'Düşük', 'Minimal'];

                    data.top5.slice(1).forEach((item, index) => {
                        const color = colors[index] || '#94a3b8';
                        const level = confidenceLevels[index] || 'Belirsiz';

                        const div = document.createElement('div');
                        div.className = 'stat-row';
                        div.innerHTML = `
                            <div class="stat-header">
                                <span>${item.class}</span>
                                <span>
                                    ${item.confidence}%
                                    <span class="confidence-tag">${level}</span>
                                </span>
                            </div>
                            <div class="bar-bg">
                                <div class="bar-fill" style="width: ${item.confidence}%; background: ${color}"></div>
                            </div>
                        `;
                        top5List.appendChild(div);
                    });
                }

                if (result) {
                    result.style.display = 'block';
                }
                if (statusText) {
                    statusText.textContent = "Tamamlandı";
                }

                addBotMessage(`Analiz tamamlandı. Tespit edilen tür: <strong>${data.class}</strong>. Sonuçla ilgili detaylı rapor ister misiniz?`);

            } catch (error) {
                alert('Hata oluştu!');
                if (statusText) {
                    statusText.textContent = "Hata";
                }
            } finally {
                predictBtn.innerHTML = `<span>Analizi Başlat</span><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>`;
                predictBtn.disabled = false;
            }
        });
    }

    // Chat fonksiyonları
    function addBotMessage(text) {
        if (!chatBox) return;

        const msg = document.createElement('div');
        msg.className = 'message bot-msg';

        // marked.parse() fonksiyonu yıldızları html'e çevirir
        msg.innerHTML = marked.parse(text);

        chatBox.appendChild(msg);
        chatBox.scrollTop = chatBox.scrollHeight;

        // Chat geçmişini kaydet
        saveChatHistory();
    }

    function addUserMessage(text) {
        if (!chatBox) return;

        const msg = document.createElement('div');
        msg.className = 'message user-msg';
        msg.textContent = text;
        chatBox.appendChild(msg);
        chatBox.scrollTop = chatBox.scrollHeight;

        // Chat geçmişini kaydet
        saveChatHistory();
    }

    async function sendMessage() {
        if (!chatInput) return;

        const message = chatInput.value.trim();
        if (!message) return;

        addUserMessage(message);
        chatInput.value = '';

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            });
            const data = await response.json();
            addBotMessage(data.response);
        } catch (error) {
            addBotMessage('Bağlantı hatası.');
        }
    }

    // Send button ve Enter tuşu
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }

    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }
}

// ===================================
// CHAT GEÇMİŞİ YÖNETİMİ
// ===================================

// Chat geçmişini localStorage'a kaydet
function saveChatHistory() {
    const chatBox = document.getElementById('chatBox');
    if (!chatBox) return;

    const messages = [];
    chatBox.querySelectorAll('.message').forEach(msg => {
        messages.push({
            type: msg.classList.contains('bot-msg') ? 'bot' : 'user',
            content: msg.innerHTML
        });
    });

    localStorage.setItem('seedInsightChatHistory', JSON.stringify(messages));
}

// Chat geçmişini localStorage'dan yükle
function loadChatHistory() {
    const chatBox = document.getElementById('chatBox');
    if (!chatBox) return;

    const savedHistory = localStorage.getItem('seedInsightChatHistory');
    if (!savedHistory) return;

    try {
        const messages = JSON.parse(savedHistory);

        // Eski mesajları temizle (sadece hoş geldin mesajı varsa)
        chatBox.innerHTML = '';

        // Kaydedilen mesajları yükle
        messages.forEach(msg => {
            const div = document.createElement('div');
            div.className = msg.type === 'bot' ? 'message bot-msg' : 'message user-msg';
            div.innerHTML = msg.content;
            chatBox.appendChild(div);
        });

        // Scroll'u en alta getir
        chatBox.scrollTop = chatBox.scrollHeight;
    } catch (error) {
        console.error('Chat geçmişi yüklenirken hata:', error);
    }
}

// script.js dosyasında window.clearChat fonksiyonunu güncelle:

window.clearChat = function() {
    const chatBox = document.getElementById('chatBox');

    // UI Elementlerini Seçelim (Sonuçları gizlemek için)
    const resultDiv = document.getElementById('result');
    const uploadArea = document.getElementById('uploadArea');
    const preview = document.getElementById('preview');
    const uploadPlaceholder = document.getElementById('uploadPlaceholder');
    const predictBtn = document.getElementById('predictBtn');
    const statusText = document.getElementById('statusText');
    const fileInput = document.getElementById('fileInput');

    if (!chatBox) return;

    // Kullanıcıya onay sor
    if (confirm('Tüm sohbet geçmişi ve analiz sonuçları silinecek. Emin misiniz?')) {

        // 1. Chat kutusunu temizle
        chatBox.innerHTML = '';

        // 2. Hoş geldin mesajını tekrar ekle
        const welcomeMsg = document.createElement('div');
        welcomeMsg.className = 'message bot-msg';
        welcomeMsg.innerHTML = 'Merhaba! Analiz sonuçlarınızı yorumlamak veya tohum türleri hakkında teknik bilgi almak için buradayım. Yukarıdaki hızlı soruları kullanabilirsiniz.';
        chatBox.appendChild(welcomeMsg);

        // 3. LocalStorage'dan sil
        localStorage.removeItem('seedInsightChatHistory');

        // 4. EKRANDAKİ ANALİZ SONUÇLARINI SIFIRLA (Önemli Kısım)
        if (resultDiv) resultDiv.style.display = 'none'; // Sonuç kartını gizle

        // Upload alanını ilk haline getir
        if (uploadArea) {
            uploadArea.classList.remove('has-image');
            uploadArea.style.borderColor = '#cbd5e1';
            uploadArea.style.backgroundColor = '#f8fafc';
        }

        // Önizleme resmini kaldır
        if (preview) {
            preview.src = '';
            preview.style.display = 'none';
        }

        // "Resim Yükle" yazısını geri getir
        if (uploadPlaceholder) uploadPlaceholder.style.opacity = '1';

        // Butonu pasif yap
        if (predictBtn) {
            predictBtn.disabled = true;
            predictBtn.innerHTML = `<span>Analizi Başlat</span><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>`;
        }

        // Durum yazısını sıfırla
        if (statusText) statusText.textContent = "Bekleniyor";

        // Input dosyasını temizle (aynı dosyayı tekrar seçebilmek için)
        if (fileInput) fileInput.value = '';

        // Global değişkeni sıfırla (eğer kullanıyorsan)
        if (typeof selectedFile !== 'undefined') {
            selectedFile = null;
        }

        // 5. Backend'e haber ver ve hafızayı sildir
        fetch('/clear-chat', { method: 'POST' })
            .then(response => response.json())
            .then(data => {
                console.log('Backend hafızası temizlendi:', data.message);
            })
            .catch(err => console.error('Backend temizleme hatası:', err));
    }
};

// ===================================
// 2. QUICK CHAT FONKSIYONU
// ===================================

// Quick action helper (global olmalı çünkü HTML'den çağrılıyor)
window.fillChat = function(text) {
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.value = text;
        chatInput.focus();
    }
};

// ===================================
// 3. GENEL YARDIMCI FONKSIYONLAR
// ===================================

// Smooth scroll için
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

// Navbar scroll efekti (opsiyonel)
let lastScroll = 0;
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    const currentScroll = window.pageYOffset;

    if (navbar && navbar.classList.contains('fixed')) {
        if (currentScroll > lastScroll && currentScroll > 80) {
            navbar.style.transform = 'translateY(-100%)';
        } else {
            navbar.style.transform = 'translateY(0)';
        }
    }

    lastScroll = currentScroll;
});