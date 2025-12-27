import os
import json
import torch
import torch.nn.functional as F
from torchvision import transforms, datasets
from torchvision.models import vit_b_16
from PIL import Image
import numpy as np
import config

# Transform Tanımı
eval_tf = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])


def load_model():
    try:
        model = vit_b_16(weights=None)
        model.heads.head = torch.nn.Linear(model.heads.head.in_features, config.NUM_CLASSES)

        if not os.path.exists(config.MODEL_PATH):
            raise FileNotFoundError(f"{config.MODEL_PATH} bulunamadı!")

        model.load_state_dict(torch.load(config.MODEL_PATH, map_location=config.DEVICE, weights_only=True))
        model.to(config.DEVICE)
        model.eval()
        print("✓ Model başarıyla yüklendi")
        return model
    except Exception as e:
        print(f"✗ Model yükleme hatası: {e}")
        return None


def load_class_names():
    try:
        # Sadece classes.json dosyasına bak
        if os.path.exists("classes.json"):
            with open("classes.json", "r", encoding="utf-8") as f:
                names = json.load(f)
            print(f"✓ {len(names)} sınıf ismi classes.json'dan başarıyla yüklendi")
            return names
        else:
            # classes.json bulunamazsa sistemin çökmemesi için varsayılan isimler üret
            print(f"⚠ UYARI: classes.json bulunamadı! Varsayılan isimler oluşturuluyor.")
            return [f"Tohum_Sınıfı_{i + 1}" for i in range(config.NUM_CLASSES)]

    except Exception as e:
        print(f"✗ Sınıf isimleri yükleme hatası: {e}")
        return [f"Tohum_Sınıfı_{i + 1}" for i in range(config.NUM_CLASSES)]

# Initialize
torch_model = load_model()
class_names = load_class_names()