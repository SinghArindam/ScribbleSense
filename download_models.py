"""
Download a 40-kB MNIST CNN (ONNX) if not already present.
"""
from pathlib import Path
import urllib.request as ur, hashlib, sys

URL = "https://huggingface.co/terfm/mini-mnist-onnx/resolve/main/digit_cnn.onnx"
SHA = "b0fc8d366812148826ebb5365de74c5999ab869ca83d4c4d6c1c2e0755a9967b"
DEST = Path(__file__).with_name("digit_cnn.onnx")

def ok() -> bool:
    return DEST.exists() and hashlib.sha256(DEST.read_bytes()).hexdigest() == SHA

if ok():
    print("✓ digit_cnn.onnx already present")
    sys.exit(0)

print("Downloading digit_cnn.onnx …")
data = ur.urlopen(URL, timeout=30).read()
if hashlib.sha256(data).hexdigest() != SHA:
    raise RuntimeError("checksum mismatch while downloading model")
DEST.write_bytes(data)
print("✓ Model saved to", DEST)
