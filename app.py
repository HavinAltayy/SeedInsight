from flask import Flask, render_template, request, jsonify
import os
import torch
import torch.nn.functional as F
from PIL import Image
import numpy as np
import config
import model_utils
import chatbot

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = config.MAX_CONTENT_LENGTH


def allowed_file(filename):
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def cleanup_old_uploads(current_filename=None):
    for filename in os.listdir(config.UPLOAD_FOLDER):
        if filename != current_filename:
            try:
                os.remove(os.path.join(config.UPLOAD_FOLDER, filename))
            except:
                pass


@app.route('/')
def home():
    return render_template('home.html')


@app.route('/model')
def model_page():
    return render_template('index.html')


@app.route('/contact')
def contact():
    return render_template('contact.html')


@app.route('/predict', methods=['POST'])
def predict():
    if model_utils.torch_model is None:
        return jsonify({'error': 'Model yüklenemedi.'}), 500

    if 'file' not in request.files:
        return jsonify({'error': 'Dosya bulunamadı'}), 400

    file = request.files['file']
    if file.filename == '' or not allowed_file(file.filename):
        return jsonify({'error': 'Geçersiz dosya.'}), 400

    filename = f"temp_{os.urandom(8).hex()}.{file.filename.rsplit('.', 1)[1].lower()}"
    filepath = os.path.join(config.UPLOAD_FOLDER, filename)
    file.save(filepath)

    try:
        img = Image.open(filepath).convert("RGB")
        input_tensor = model_utils.eval_tf(img).unsqueeze(0).to(config.DEVICE)

        with torch.no_grad():
            output = model_utils.torch_model(input_tensor)
            probs = F.softmax(output, dim=1).cpu().numpy()[0]

        top5_indices = np.argsort(probs)[-5:][::-1]
        top5_results = [
            {
                'class': model_utils.class_names[idx],
                'confidence': round(float(probs[idx] * 100), 2)
            }
            for idx in top5_indices
        ]

        config.memory.update({
            'predicted_class': model_utils.class_names[top5_indices[0]],
            'confidence': float(probs[top5_indices[0]] * 100),
            'top5': top5_results,
            'image_path': filepath
        })

        cleanup_old_uploads(filename)

        return jsonify({
            'class': config.memory['predicted_class'],
            'confidence': round(config.memory['confidence'], 2),
            'top5': top5_results
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/chat', methods=['POST'])
def chat_route():
    data = request.json
    user_message = data.get('message', '')

    if not config.memory.get('predicted_class'):
        return jsonify({'response': 'Lütfen önce bir tohum görseli yükleyin.'})

    response = chatbot.get_chatbot_response(user_message, config.memory)
    return jsonify({'response': response})



@app.route('/clear-chat', methods=['POST'])
def clear_chat():
    """Chat hafızasını ve analiz verilerini tamamen temizle"""
    try:
        config.memory.clear()

        return jsonify({'status': 'success', 'message': 'Tüm hafıza ve analiz verileri temizlendi'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


if __name__ == '__main__':
    cleanup_old_uploads()
    app.run(debug=True, host='0.0.0.0', port=5000)