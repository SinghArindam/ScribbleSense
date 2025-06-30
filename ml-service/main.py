import os, cv2, numpy as np, onnxruntime as ort
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import easyocr
from pathlib import Path
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="Whiteboard-AI backend")

# ──────────────────────────────
#           CORS
# ──────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)

# ──────────────────────────────
#     Digit classifier (ONNX)
# ──────────────────────────────
MODEL_PATH = Path(__file__).with_name("digit_cnn.onnx")
digit_sess = ort.InferenceSession(str(MODEL_PATH), providers=["CPUExecutionProvider"])

def preprocess_digit(bgr: np.ndarray) -> np.ndarray:
    g = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    g = cv2.bitwise_not(g)
    g = cv2.resize(g, (28, 28), interpolation=cv2.INTER_AREA)
    g = g.astype("float32") / 255.0
    return g.reshape(1, 1, 28, 28)  # N,C,H,W

@app.post("/digit")
async def recognise_digit(file: UploadFile = File(...)):
    img = np.frombuffer(await file.read(), np.uint8)
    bgr = cv2.imdecode(img, cv2.IMREAD_COLOR)
    tensor = preprocess_digit(bgr)
    (probs,) = digit_sess.run(None, {"input": tensor})
    return {"pred": int(np.argmax(probs))}

# ──────────────────────────────
#            OCR
# ──────────────────────────────
reader = easyocr.Reader(["en"], gpu=False)   # downloads weights on first run

@app.post("/ocr")
async def recognise_text(file: UploadFile = File(...)):
    img = np.frombuffer(await file.read(), np.uint8)
    bgr = cv2.imdecode(img, cv2.IMREAD_COLOR)
    text = " ".join(reader.readtext(bgr, detail=0, paragraph=True))
    return {"pred": text}

# ──────────────────────────────
#        Serve index.html
# ──────────────────────────────
static_dir = Path(__file__).parent / "static"
# Register API routes FIRST, then mount StaticFiles so /digit & /ocr keep priority
app.mount("/", StaticFiles(directory=static_dir, html=True), name="site")
