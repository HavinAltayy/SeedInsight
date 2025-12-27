import requests
import config


def get_chatbot_response(user_message, memory):
    if not config.OPENROUTER_API_KEY:
        return "ChatBot şu anda kullanılamıyor. API anahtarı yapılandırılmamış."

    # Top 5 listesini metin haline getirelim
    top5_list = "\n".join([f"{i}. {item['class']} - %{item['confidence']}" for i, item in enumerate(memory['top5'], 1)])

    # Burada modele kim olduğunu, sınırlarını ve nasıl davranması gerektiğini kesin dille belirtiyoruz.
    context = f"""
    SİSTEM TALİMATLARI:
    Sen uzman bir Ziraat Mühendisi ve Tohum Sınıflandırma Asistanısın.

    KURALLAR:
    1. KAPSAM: SADECE aşağıdaki analiz sonuçları, tohumlar, bitki yetiştiriciliği ve tarım ile ilgili soruları yanıtla.
    2. KAPSAM DIŞI DURUMLAR: Eğer kullanıcı siyaset, futbol, magazin, yemek tarifi veya genel sohbet gibi tohumla alakasız bir soru sorarsa; kesinlikle yorum yapma ve sadece şu kalıplardan birini kullan: "Alanım dahilinde değil.", "Bu konuda bilgim yok.", "Sadece tohum analizi hakkında yardımcı olabilirim."
    3. DETAY SEVİYESİ: Varsayılan olarak cevapların KISA, ÖZ ve NET olsun. Sadece kullanıcı açıkça "detaylı anlat", "uzun bilgi ver", "bütün özelliklerini say" gibi ifadeler kullanırsa detaya gir.
    4. DİL: Türkçe yanıt ver.

    MEVCUT ANALİZ SONUÇLARI (Kullanıcının Yüklediği Görsel):
    Tahmin Edilen Sınıf: {memory['predicted_class']}
    Doğruluk Oranı: %{memory['confidence']:.2f}

    En Olası 5 Sınıf:
    {top5_list}

    KULLANICI SORUSU: 
    {user_message}
    """

    payload = {
        "model": "google/gemma-3-27b-it:free",
        "messages": [{"role": "user", "content": context}],
        "temperature": 0.5,  # Yaratıcılığı biraz kıstık ki halüsinasyon görmesin ve kurallara uysun (0.7 -> 0.5)
        "max_tokens": 500
    }

    try:
        response = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {config.OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": config.SITE_URL,
                "X-Title": "Seed Classification"
            },
            json=payload,
            timeout=30
        )

        response_data = response.json()

        if "choices" in response_data and len(response_data["choices"]) > 0:
            return response_data["choices"][0]["message"]["content"]
        return "Üzgünüm, bir hata oluştu veya beklenmeyen bir yanıt alındı."

    except Exception as e:
        print(f"Chatbot Hatası: {e}")
        return "Bağlantı sırasında bir hata oluştu."

