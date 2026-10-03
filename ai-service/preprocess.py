import cv2
import numpy as np

"""def preprocess_image(image_path):
    # Read image in grayscale
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)

    # Denoise
    img = cv2.fastNlMeansDenoising(img)

    # Binarization
    _, img = cv2.threshold(img, 0, 255,
                            cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    return img"""

def preprocess_image(file_bytes: bytes):
    """
    Decode an image without removing color or fine character details.

    Small images are enlarged modestly to make text easier for the vision model
    to read. Avoid thresholding here because it can erase distinguishing marks
    in Sinhala and other complex scripts.
    """
    npimg = np.frombuffer(file_bytes, np.uint8)
    img = cv2.imdecode(npimg, cv2.IMREAD_COLOR)

    if img is None:
        raise ValueError("Invalid image data")

    height, width = img.shape[:2]
    longest_side = max(height, width)
    if longest_side < 1800:
        scale = min(2.0, 1800 / longest_side)
        img = cv2.resize(
            img,
            (round(width * scale), round(height * scale)),
            interpolation=cv2.INTER_CUBIC,
        )

    return img
