import cv2
import numpy as np

def preprocess_image(image_path):
    # Read image in grayscale
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)

    # Denoise
    img = cv2.fastNlMeansDenoising(img)

    # Binarization
    _, img = cv2.threshold(img, 0, 255,
                            cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    return img
