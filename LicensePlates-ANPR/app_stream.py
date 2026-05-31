import os
import ssl

# Bypass macOS Python certificate verification bug
ssl._create_default_https_context = ssl._create_unverified_context

# Disable OpenCV AVFoundation authorization thread crash on macOS
os.environ['OPENCV_AVFOUNDATION_SKIP_AUTH'] = '1'

import cv2
import numpy as np
import streamlit as st
from PIL import Image
from dotenv import load_dotenv
from src.cli import DetectorType, get_processor
from pathlib import Path
import time
import threading
import queue
import requests
from concurrent.futures import ThreadPoolExecutor

# Load environment variables
load_dotenv()

# Fixed configuration - only YOLO detector with specific model
MODEL_NAME = "license-plate-recognition-rxg4e-wyhgr"
VERSION = "3"
DETECTOR_TYPE = DetectorType.YOLO

st.set_page_config(
    page_title="Real-time License Plate Detection", page_icon="🚗", layout="wide"
)

st.title("🚗 Real-time License Plate Detection Stream")
st.write("Live webcam feed with automatic license plate recognition using YOLOv8")

# Configure model path
weights_path = f"models/{MODEL_NAME}/{VERSION}/weights.onnx"
if not Path(weights_path).exists():
    st.error(f"Weights file not found at {weights_path}")
    st.info(f"Expected path: {weights_path}")
    st.stop()

model_id = f"{MODEL_NAME}/{VERSION}"


# Initialize processor with YOLO detector
@st.cache_resource
def load_processor():
    """Cache the processor to avoid reloading on each interaction"""
    try:
        processor = get_processor(
            detector_type=DETECTOR_TYPE,
            model_id=model_id,
            api_key=None,  # Not needed for YOLO
            plate_model="global-plates-mobile-vit-v2-model",
            weights_path=weights_path,
        )
        return processor
    except Exception as e:
        st.error(f"Error initializing processor: {str(e)}")
        return None


# Load processor
with st.spinner("Loading YOLO detector and models... This might take a few seconds."):
    processor = load_processor()

if not processor:
    st.stop()

# Sidebar controls
with st.sidebar:
    st.title("📹 Stream Controls")
    st.info(
        f"""
    **Model Configuration:**
    - Model: `{MODEL_NAME}`
    - Version: `{VERSION}`
    - Detector: `YOLO`
    """
    )

    # Basic controls (always visible)
    st.subheader("🎛️ Basic Controls")

    # Detection confidence threshold
    confidence_threshold = st.slider(
        "Detection Confidence", min_value=0.1, max_value=1.0, value=0.5, step=0.05
    )

    # Camera device selection
    camera_device = st.number_input(
        "Camera Device ID",
        min_value=0,
        max_value=5,
        value=0,
        help="Try different values if camera doesn't work (usually 0)",
    )

    camera_resolution = st.selectbox(
        "Camera Resolution", ["640x480", "800x600", "1280x720"], index=0
    )

    # Advanced controls (collapsible)
    with st.expander("⚙️ Advanced Settings", expanded=False):
        st.write("**Performance Settings**")

        ai_read_interval = st.slider(
            "AI Reading Interval (seconds)",
            min_value=0.5,
            max_value=10.0,
            value=3.0,
            step=0.5,
            help="How often the AI should process a frame for license plate detection",
        )

        show_fps = st.checkbox("Show FPS", value=True)

        # Performance options
        use_threading = st.checkbox("Use Threading (Recommended)", value=True)

        buffer_size = st.slider(
            "Camera Buffer Size",
            min_value=1,
            max_value=3,
            value=1,
            help="Lower = less latency but may drop frames",
        )

        # Annotation persistence control
        annotation_persistence = st.slider(
            "Annotation Persistence (seconds)",
            min_value=0.5,
            max_value=10.0,
            value=2.0,
            step=0.5,
            help="How long to keep annotations visible after detection",
        )

    # Backend Integration (New)
    st.subheader("🔗 Backend Integration")
    backend_url = st.text_input("Backend URL", value=os.getenv("BACKEND_URL", "http://localhost:8000"), key="backend_url")
    parking_id = st.number_input("Parking ID", value=int(os.getenv("PARKING_ID", 5)), min_value=1, key="parking_id")
    access_token = st.text_input("Access Token (JWT)", value=os.getenv("ACCESS_TOKEN", ""), type="password", key="access_token")
    
    cooldown_seconds = st.slider("Plate Cooldown (seconds)", 5, 300, 60, key="cooldown_seconds")
    enable_backend = st.checkbox("Enable Backend Sync", value=True, key="enable_backend")

# Main content area with two columns
col1, col2 = st.columns([3, 1])

with col1:
    st.subheader("🎥 Live Camera Feed")

    # Streaming controls
    start_stream = st.button("🚀 Start Live Detection", type="primary")
    stop_stream = st.button("⏹️ Stop Stream", type="secondary")

    # Video placeholder
    video_placeholder = st.empty()

with col2:
    st.subheader("📋 Live Results")
    results_placeholder = st.empty()
    fps_placeholder = st.empty()

# Initialize session state for stream control
if "streaming" not in st.session_state:
    st.session_state.streaming = False

if "last_results" not in st.session_state:
    st.session_state.last_results = {}

if "last_detection_time" not in st.session_state:
    st.session_state.last_detection_time = 0

if "processing_queue" not in st.session_state:
    st.session_state.processing_queue = queue.Queue(maxsize=2)

if "sent_plates" not in st.session_state:
    st.session_state.sent_plates = {} # {plate: last_sent_time}

if "last_ai_read_time" not in st.session_state:
    st.session_state.last_ai_read_time = 0.0

if start_stream:
    st.session_state.streaming = True

if stop_stream:
    st.session_state.streaming = False


# Optimized processing function
def process_frame_async(frame, frame_id):
    """Process frame asynchronously directly from memory without saving to disk"""
    try:
        # Process directly using the YOLO detector
        detections = processor.detector.detect_plates(frame)

        # Filter by confidence threshold
        if hasattr(detections, "confidence") and len(detections.confidence) > 0:
            mask = detections.confidence >= confidence_threshold
            detections = detections[mask]

        if len(detections) == 0:
            return {}

        # Read plates directly from memory using the plate reader
        labels = {}
        for i in range(len(detections)):
            try:
                x1, y1, x2, y2 = map(int, detections.xyxy[i])

                # Validate bounding box
                if x2 <= x1 or y2 <= y1 or x1 < 0 or y1 < 0:
                    continue

                plate_image = frame[y1:y2, x1:x2]

                # Skip if plate image is too small
                if plate_image.shape[0] < 10 or plate_image.shape[1] < 10:
                    continue

                # Convert to grayscale for OCR
                plate_image_gray = cv2.cvtColor(plate_image, cv2.COLOR_BGR2GRAY)

                # Use the plate reader directly
                plate_text = processor.plate_reader.run(plate_image_gray)

                # Clean and validate plate text
                if plate_text and len(plate_text) > 0:
                    cleaned_text = plate_text[0].replace("_", "").strip()
                    if len(cleaned_text) > 0:
                        labels[cleaned_text] = (x1, y1, x2, y2)
            except Exception as e:
                continue  # Skip failed plates

        return labels
    except Exception as e:
        return {}

def send_plate_to_backend(plate_text):
    """Send detected plate to the backend API"""
    # Dynamic values from session state to bypass Streamlit's blocking thread cache
    active_backend = st.session_state.get("enable_backend", False)
    active_url = st.session_state.get("backend_url", "http://localhost:8000")
    active_parking_id = st.session_state.get("parking_id", 1)
    active_cooldown = st.session_state.get("cooldown_seconds", 60)

    # 1. Print entry status to console instantly
    print(f"\n🔍 [IA DEBUG] send_plate_to_backend llamada para patente: '{plate_text}'")
    print(f"   ℹ️ Estado actual: enable_backend={active_backend} | parking_id={active_parking_id} | backend_url='{active_url}'")
    
    if not active_backend:
        print("   ⚠️ ENVÍO CANCELADO: 'Enable Backend Sync' no está tildado en la barra lateral de Streamlit.")
        return None
    
    # Cooldown check
    now = time.time()
    if plate_text in st.session_state.sent_plates:
        elapsed = now - st.session_state.sent_plates[plate_text]
        if elapsed < active_cooldown:
            print(f"   ⚠️ ENVÍO OMITIDO: Patente '{plate_text}' en COOLDOWN. Transcurrido: {elapsed:.1f}s / Requerido: {active_cooldown}s")
            return None
            
    try:
        # Sanitize inputs
        clean_url = active_url.strip().rstrip("/")
        
        # Hit the correct public barrier/check endpoint on the Backend
        url = f"{clean_url}/api/v1/bookings/barrier/check"
        payload = {
            "id_parking": int(active_parking_id),
            "license_plate": plate_text
        }
        
        print(f"\n=======================================================")
        print(f"📡 [IA STREAM] ENVIANDO PATENTE AL BACKEND")
        print(f"   🚗 Patente Detectada: '{plate_text}'")
        print(f"   🏢 Cochera ID: {active_parking_id}")
        print(f"   🔗 URL: {url}")
        print(f"   📦 Payload: {payload}")
        print(f"=======================================================\n")
        
        response = requests.post(url, json=payload, timeout=5)
        
        print(f"\n=======================================================")
        print(f"📥 [IA STREAM] RESPUESTA RECIBIDA DEL BACKEND")
        print(f"   🚦 Status Code: {response.status_code}")
        try:
            print(f"   📦 Cuerpo: {response.json()}")
        except:
            print(f"   📦 Cuerpo (Raw): {response.text}")
        print(f"=======================================================\n")
        
        if response.status_code == 200:
            result = response.json()
            if result.get("status") == "allowed":
                st.session_state.sent_plates[plate_text] = now # Long cooldown only on success
                action = result.get('action', '')
                if action == 'check-in':
                    st.toast(f"✅ Bienvenido! Patente: {plate_text} ({result.get('vehicle_model', 'Unknown')})", icon="👋")
                elif action == 'check-out':
                    st.toast(f"✅ Salida completada. Hasta luego! Patente: {plate_text}", icon="👋")
                else:
                    st.toast(f"✅ Acceso AUTORIZADO: {plate_text}", icon="🚗")
            else:
                # Shorter cooldown (5s) for failed attempts to allow retries
                st.session_state.sent_plates[plate_text] = now - active_cooldown + 5
                msg = result.get('message', 'No tiene reserva activa')
                st.toast(f"❌ {msg}", icon="🚫")
            return result
        else:
            st.toast(f"⚠️ Backend Error: {response.status_code}", icon="❗")
            return None
    except Exception as e:
        print(f"\n=======================================================")
        print(f"🚨 [IA STREAM] ERROR DE CONEXIÓN CON BACKEND")
        print(f"   💥 Detalle: {str(e)}")
        print(f"=======================================================\n")
        st.toast(f"🚨 Connection Error: {str(e)}", icon="☠️")
        return None


# Main streaming function
if st.session_state.streaming:

    # Parse resolution
    width, height = map(int, camera_resolution.split("x"))

    try:
        cap = cv2.VideoCapture(int(camera_device))

        if not cap.isOpened():
            st.error(
                "❌ Cannot access webcam. Please check your camera permissions and device ID."
            )
            st.session_state.streaming = False
        else:
            # Let macOS drivers determine the default safe properties
            # No cap.set() calls at all to avoid driver stream drops

            st.success("✅ Camera connected successfully!")

            frame_count = 0
            start_time = time.time()
            fps = 0

            # Threading setup
            executor = ThreadPoolExecutor(max_workers=2) if use_threading else None
            processing_future = None

            # Allow camera sensor to warm up
            time.sleep(1.0)
            
            # Stream loop
            failed_frames = 0
            while st.session_state.streaming:
                ret, frame = cap.read()

                if not ret or frame is None:
                    failed_frames += 1
                    if failed_frames > 15:
                        st.error("❌ Failed to read from webcam after multiple attempts. Camera stream dropped.")
                        break
                    time.sleep(0.1) # Wait a bit and try again
                    continue
                else:
                    failed_frames = 0 # Reset counter on successful read

                # Calculate FPS more efficiently (every 30 frames)
                if frame_count % 30 == 0 and frame_count > 0:
                    current_time = time.time()
                    fps = 30 / (current_time - start_time)
                    start_time = current_time

                # Process only based on configured time interval
                current_time = time.time()
                detect_this_frame = (current_time - st.session_state.last_ai_read_time) >= ai_read_interval

                if detect_this_frame:
                    if use_threading and executor:
                        # Check if previous processing is done
                        if processing_future is None or processing_future.done():
                            if processing_future and processing_future.done():
                                try:
                                    results = processing_future.result()
                                    if results:
                                        st.session_state.last_results = results
                                        st.session_state.last_detection_time = (
                                            time.time()
                                        )
                                        # Sync with backend
                                        for plate in results.keys():
                                            send_plate_to_backend(plate)
                                except Exception as e:
                                    pass  # Ignore processing errors

                            # Start new processing and update last read time
                            st.session_state.last_ai_read_time = current_time
                            processing_future = executor.submit(
                                process_frame_async, frame.copy(), frame_count
                            )
                    else:
                        # Synchronous processing (fallback) and update last read time
                        st.session_state.last_ai_read_time = current_time
                        results = process_frame_async(frame.copy(), frame_count)
                        if results:
                            st.session_state.last_results = results
                            st.session_state.last_detection_time = time.time()
                            # Sync with backend
                            for plate in results.keys():
                                send_plate_to_backend(plate)

                # Clear annotations if no detections for the specified time
                current_time = time.time()
                if (
                    current_time - st.session_state.last_detection_time
                ) > annotation_persistence:
                    st.session_state.last_results = {}

                # Annotate frame (show annotations only if recent detections exist)
                if st.session_state.last_results:
                    try:
                        annotated_frame = processor._annotate(
                            frame.copy(), st.session_state.last_results
                        )
                    except:
                        annotated_frame = frame.copy()
                else:
                    annotated_frame = frame.copy()

                # Add FPS counter to frame if enabled
                if show_fps:
                    cv2.putText(
                        annotated_frame,
                        f"FPS: {fps:.1f}",
                        (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.7,
                        (0, 255, 0),
                        2,
                    )

                # Convert BGR to RGB for streamlit (only once)
                annotated_frame_rgb = cv2.cvtColor(annotated_frame, cv2.COLOR_BGR2RGB)

                # Display frame
                video_placeholder.image(
                    annotated_frame_rgb,
                    channels="RGB",
                    use_container_width=True,
                    caption=(
                        f"Frame {frame_count} | FPS: {fps:.1f}"
                        if show_fps
                        else f"Frame {frame_count}"
                    ),
                )

                # Update results display less frequently (every 15 frames for better performance)
                if frame_count % 15 == 0:
                    current_time = time.time()
                    time_since_detection = (
                        current_time - st.session_state.last_detection_time
                    )

                    if st.session_state.last_results:
                        with results_placeholder.container():
                            st.write("🎯 **Detected Plates:**")
                            for i, (plate_text, coords) in enumerate(
                                st.session_state.last_results.items(), 1
                            ):
                                st.success(f"**{i}.** `{plate_text}`")

                            st.write(f"📊 **Stats:**")
                            st.write(
                                f"- Total plates: {len(st.session_state.last_results)}"
                            )
                            st.write(f"- Frame: {frame_count}")
                            if show_fps:
                                st.write(f"- FPS: {fps:.1f}")

                            # Show time since last detection
                            if time_since_detection < annotation_persistence:
                                remaining_time = (
                                    annotation_persistence - time_since_detection
                                )
                                st.write(
                                    f"- ⏱️ Annotation expires in: {remaining_time:.1f}s"
                                )
                            else:
                                st.write("- ⏱️ Annotations expired")
                    else:
                        with results_placeholder.container():
                            st.info("🔍 Scanning for license plates...")
                            st.write(f"📊 **Stats:**")
                            st.write(f"- Frame: {frame_count}")
                            if show_fps:
                                st.write(f"- FPS: {fps:.1f}")
                            if st.session_state.last_detection_time > 0:
                                st.write(
                                    f"- ⏱️ Last detection: {time_since_detection:.1f}s ago"
                                )

                frame_count += 1

                # Minimal delay only if frame processing was very fast
                # This prevents overwhelming the system while maximizing FPS
                if frame_count % 3 == 0:  # Check every 3 frames to reduce overhead
                    time.sleep(0.001)  # Minimal delay for system stability

                # Safety check to prevent infinite loop
                if frame_count > 50000:
                    st.warning("Stream stopped after 50000 frames for safety")
                    break

            # Cleanup
            if executor:
                executor.shutdown(wait=False)
            cap.release()
            st.info("📹 Camera released")

    except Exception as e:
        st.error(f"❌ Camera error: {str(e)}")
        st.session_state.streaming = False

elif not st.session_state.streaming:
    with video_placeholder.container():
        st.info("📷 Click 'Start Live Detection' to begin streaming")
        st.image(
            "https://via.placeholder.com/640x480/f0f0f0/666666?text=Camera+Feed+Will+Appear+Here",
            caption="Waiting for stream to start...",
        )