import cv2
from preprocess import preprocess_image
from ocr import extract_text

with open("sample.png", "rb") as f:
    img_bytes = f.read()

processed = preprocess_image(img_bytes)

cv2.imwrite("debug.png", processed)

result = extract_text(processed)
print(result)
