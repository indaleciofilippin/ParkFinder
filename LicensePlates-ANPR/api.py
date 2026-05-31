import os
import shutil
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, HTTPException
from src.cli import DetectorType, get_processor

app = FastAPI(title="ANPR API Microservice")

MODEL_NAME = "license-plate-recognition-rxg4e-wyhgr"
VERSION = "3"
DETECTOR_TYPE = DetectorType.YOLO

current_dir = Path(__file__).resolve().parent
weights_path = str(current_dir / "models" / MODEL_NAME / VERSION / "weights.onnx")
model_id = f"{MODEL_NAME}/{VERSION}"
plate_model = "global-plates-mobile-vit-v2-model"

# Load the processor on startup
print(f"🤖 [ANPR API] Initializing YOLOv8 model from {weights_path}...")
try:
    processor = get_processor(
        detector_type=DETECTOR_TYPE,
        model_id=model_id,
        api_key=None,
        plate_model=plate_model,
        weights_path=weights_path,
    )
    print("🤖 [ANPR API] YOLOv8 model loaded successfully.")
except Exception as e:
    print(f"❌ [ANPR API] Error loading model: {str(e)}")
    processor = None

@app.post("/scan")
async def scan_image(file: UploadFile = File(...)):
    if not processor:
        raise HTTPException(status_code=500, detail="ANPR processor not initialized")
    
    # Save the file temporarily
    temp_dir = current_dir / "temp_api"
    temp_dir.mkdir(exist_ok=True)
    temp_file_path = temp_dir / file.filename
    
    try:
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        print(f"📡 [ANPR API] Processing image scan request for: {file.filename}")
        results = processor.process_image(
            str(temp_file_path), show_result=False, save_result=False
        )
        
        plates = list(results.keys())
        output = {
            "success": True,
            "plates": plates,
            "detected": len(plates) > 0,
            "best_match": plates[0] if plates else None
        }
        print(f"✅ [ANPR API] Scan completed. Result: {output['best_match']}")
        return output
        
    except Exception as e:
        print(f"🚨 [ANPR API] Exception occurred: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")
        
    finally:
        if temp_file_path.exists():
            try:
                temp_file_path.unlink()
            except Exception as clean_err:
                print(f"⚠️ [ANPR API] Clean error: {clean_err}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
