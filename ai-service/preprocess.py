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
    Preprocess image received as bytes.
    Steps:
    - Decode image
    - Convert to grayscale
    - Denoise
    - Binarize (Otsu)
    """

    # Convert bytes to numpy array
    npimg = np.frombuffer(file_bytes, np.uint8)

    # Decode image
    img = cv2.imdecode(npimg, cv2.IMREAD_GRAYSCALE)

    if img is None:
        raise ValueError("Invalid image data")

    # Denoise
    img = cv2.fastNlMeansDenoising(img)

    # Binarization
    _, img = cv2.threshold(
        img, 0, 255,
        cv2.THRESH_BINARY + cv2.THRESH_OTSU
    )

    return img
