import os
import sys
import json
import argparse
from pathlib import Path

# Add project directory to sys.path to allow imports
current_dir = Path(__file__).resolve().parent
if str(current_dir) not in sys.path:
    sys.path.append(str(current_dir))

from src.cli import DetectorType, get_processor

def main():
    parser = argparse.ArgumentParser(description="Scan a single license plate image")
    parser.add_argument("image_path", help="Path to the image file to scan")
    args = parser.parse_args()

    # Fixed configuration to match Streamlit's YOLO configuration
    MODEL_NAME = "license-plate-recognition-rxg4e-wyhgr"
    VERSION = "3"
    DETECTOR_TYPE = DetectorType.YOLO
    weights_path = str(current_dir / "models" / MODEL_NAME / VERSION / "weights.onnx")
    model_id = f"{MODEL_NAME}/{VERSION}"
    plate_model = "global-plates-mobile-vit-v2-model"

    if not Path(args.image_path).exists():
        print(json.dumps({"error": f"Image path does not exist: {args.image_path}"}))
        sys.exit(1)

    if not Path(weights_path).exists():
        print(json.dumps({"error": f"Weights file not found at: {weights_path}"}))
        sys.exit(1)

    try:
        # Initialize processor
        processor = get_processor(
            detector_type=DETECTOR_TYPE,
            model_id=model_id,
            api_key=None,
            plate_model=plate_model,
            weights_path=weights_path,
        )

        if not processor:
            print(json.dumps({"error": "Failed to initialize processor"}))
            sys.exit(1)

        # Process image
        results = processor.process_image(
            args.image_path, show_result=False, save_result=False
        )

        # Output results
        plates = list(results.keys())
        output = {
            "success": True,
            "plates": plates,
            "detected": len(plates) > 0,
            "best_match": plates[0] if plates else None
        }
        print(json.dumps(output))

    except Exception as e:
        print(json.dumps({"error": f"Exception occurred during processing: {str(e)}"}))
        sys.exit(1)

if __name__ == "__main__":
    main()
