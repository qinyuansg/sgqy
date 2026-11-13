"""Flatten the lighting on a phone photo of a drawing so the paper becomes clean, even, warm white.

Usage: python3 normalize.py <photo.jpg> <out.png>
"""
import sys
import numpy as np
import cv2

PAPER = np.array([243, 250, 253], np.float32)  # BGR target: warm storybook white


def normalize(img_bgr):
    img = img_bgr.astype(np.float32)
    gray = img.mean(axis=2)
    # 1) rough local paper brightness: max-filter removes ink, blur smooths
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (45, 45))
    rough = cv2.GaussianBlur(cv2.dilate(gray, k), (0, 0), 20)
    # 2) paper pixels = bright relative to local paper level and low chroma
    chroma = img.max(axis=2) - img.min(axis=2)
    paper = ((gray > 0.86 * rough) & (chroma < 0.22 * rough)).astype(np.float32)
    # 3) per-channel background estimated only from paper pixels (no ink colour bleed)
    out = np.empty_like(img)
    wsum = cv2.GaussianBlur(paper, (0, 0), 28) + 1e-4
    for c in range(3):
        bg = cv2.GaussianBlur(img[:, :, c] * paper, (0, 0), 28) / wsum
        out[:, :, c] = img[:, :, c] / np.maximum(bg, 1) * PAPER[c]
    out = np.clip(out, 0, 255)
    # 4) a little contrast on the ink so markers pop like a scan
    lum = out.mean(axis=2, keepdims=True)
    boost = np.clip((235 - lum) / 235, 0, 1) * 0.18
    out = np.clip(out * (1 - boost), 0, 255)
    return out.astype(np.uint8)


if __name__ == "__main__":
    cv2.imwrite(sys.argv[2], normalize(cv2.imread(sys.argv[1])), [cv2.IMWRITE_PNG_COMPRESSION, 3])
