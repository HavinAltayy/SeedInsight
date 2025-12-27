import os
import torch
from dotenv import load_dotenv

load_dotenv()

# Genel Ayarlar
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
MAX_CONTENT_LENGTH = 16 * 1024 * 1024

# API Ayarları
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
SITE_URL = os.getenv("SITE_URL", "http://localhost:5000")

# Model Ayarları
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
NUM_CLASSES = 88
MODEL_PATH = "seed.pth"

# Küresel Hafıza (Basit implementasyon için app.py yerine burada tutulabilir veya app.py'de kalabilir)
memory = {"predicted_class": None, "confidence": None, "top5": None, "image_path": None}