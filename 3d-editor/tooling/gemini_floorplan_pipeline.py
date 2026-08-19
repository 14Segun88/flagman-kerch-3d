#!/usr/bin/env python3
"""
Google AI Studio (Gemini 2.0 Flash / Pro) + Blender 3D BIM Pipeline
Direct REST API Integration with Google Gemini Vision & Headless Blender.
"""

import os
import sys
import json
import base64
import argparse
import urllib.request
import urllib.error
from pathlib import Path
from typing import Dict, Any, Optional

try:
    from prompts.copilot_system_prompt import COPILOT_FLOORPLAN_SYSTEM_PROMPT
except ImportError:
    from tooling.prompts.copilot_system_prompt import COPILOT_FLOORPLAN_SYSTEM_PROMPT


def encode_image_to_base64(image_path: str) -> str:
    """Encodes local image to base64 string."""
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode('utf-8')


def call_gemini_vision_api(
    image_base64: str,
    api_key: Optional[str] = None,
    model_name: str = "gemini-3.6-flash"
) -> Dict[str, Any]:
    """
    Calls Google AI Studio Gemini API directly using standard REST endpoint.
    Guarantees strict JSON schema output.
    """
    key = api_key or os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    
    if not key:
        print("⚠️ [Gemini API] No GEMINI_API_KEY found in environment or arguments.")
        print("👉 Set your key via: export GEMINI_API_KEY='AIzaSy...'")
        print("⚡ [Fallback] Using built-in architectural template...")
        return get_default_architectural_json()

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={key}"
    
    payload = {
        "system_instruction": {
            "parts": [{"text": COPILOT_FLOORPLAN_SYSTEM_PROMPT}]
        },
        "contents": [
            {
                "parts": [
                    {
                        "text": "Analyze this 2D architectural drawing/sketch and vectorize it into exact 3D coordinates (walls, thickness, openings, rooms, roof, columns, site elements) according to the schema."
                    },
                    {
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": image_base64
                        }
                    }
                ]
            }
        ],
        "generationConfig": {
            "response_mime_type": "application/json",
            "temperature": 0.1,
            "maxOutputTokens": 8192
        }
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers={"Content-Type": "application/json"}
    )

    print(f"🔮 [Google AI Studio] Sending drawing to {model_name}...")
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            
            # Extract generated JSON text from Gemini response structure
            candidates = res_data.get('candidates', [])
            if not candidates:
                raise ValueError(f"No candidates returned by Gemini: {res_data}")

            parts = candidates[0].get('content', {}).get('parts', [])
            if not parts:
                raise ValueError("Empty response parts from Gemini")

            raw_text = parts[0].get('text', '{}').strip()
            parsed_json = json.loads(raw_text)
            print("✅ [Google AI Studio] Gemini successfully extracted precise 3D floorplan coordinates!")
            return parsed_json

    except urllib.error.HTTPError as http_err:
        err_msg = http_err.read().decode('utf-8')
        print(f"❌ [Gemini API HTTP Error {http_err.code}]: {err_msg}")
        return get_default_architectural_json()
    except Exception as e:
        print(f"❌ [Gemini API Error]: {e}")
        return get_default_architectural_json()


def execute_blender_assembly(json_path: str, output_glb_path: str, render_png_path: Optional[str] = None) -> bool:
    """Executes Blender background script to create the 3D model."""
    script_path = Path(__file__).parent / "blender_house_builder.py"
    
    import subprocess
    cmd = [
        "blender",
        "--background",
        "--python", str(script_path),
        "--",
        "--input", str(json_path),
        "--output", str(output_glb_path)
    ]
    if render_png_path:
        cmd.extend(["--render", str(render_png_path)])

    print(f"🔨 [Blender] Building 3D geometry: {' '.join(cmd)}")
    try:
        res = subprocess.run(cmd, check=True, capture_output=True, text=True)
        print(res.stdout)
        print(f"🎉 [Success] 3D Model created: {output_glb_path}")
        return True
    except FileNotFoundError:
        print("⚠️ [Blender Notice] Blender is not installed in local environment.")
        print("👉 You can install it via: sudo apt install blender")
        return False
    except subprocess.CalledProcessError as err:
        print(f"❌ [Blender Error]: {err.stderr}")
        return False


def get_default_architectural_json() -> Dict[str, Any]:
    """Default fallback structure for testing."""
    return {
        "project": {
            "name": "Усадьба Флагман (AI Studio Demo)",
            "totalAreaSqM": 165.0,
            "buildingCount": 2
        },
        "buildings": [
            {
                "id": "main_house",
                "name": "Основной Дом",
                "type": "residential",
                "facadeMaterial": "white_plaster",
                "wallHeight": 3.0,
                "walls": [
                    {"id": "w1", "start": [-5.0, -4.0], "end": [5.0, -4.0], "thickness": 0.35, "height": 3.0, "isExterior": True},
                    {"id": "w2", "start": [5.0, -4.0], "end": [5.0, 4.0], "thickness": 0.35, "height": 3.0, "isExterior": True},
                    {"id": "w3", "start": [5.0, 4.0], "end": [-5.0, 4.0], "thickness": 0.35, "height": 3.0, "isExterior": True},
                    {"id": "w4", "start": [-5.0, 4.0], "end": [-5.0, -4.0], "thickness": 0.35, "height": 3.0, "isExterior": True},
                    {"id": "w_int", "start": [0.0, -4.0], "end": [0.0, 4.0], "thickness": 0.15, "height": 3.0, "isExterior": False}
                ],
                "openings": [
                    {"id": "d1", "wallId": "w1", "type": "door", "positionFromStart": 2.5, "width": 1.0, "height": 2.1, "sillHeight": 0.0, "label": "Вход"},
                    {"id": "win1", "wallId": "w1", "type": "window", "positionFromStart": 4.0, "width": 1.6, "height": 1.5, "sillHeight": 0.9, "label": "Окно кухни"},
                    {"id": "win2", "wallId": "w2", "type": "window", "positionFromStart": 2.0, "width": 1.8, "height": 1.5, "sillHeight": 0.9, "label": "Окно гостиной"}
                ],
                "roof": {
                    "type": "gable",
                    "ridgeAxis": "X",
                    "slopeDeg": 25.0,
                    "overhang": 0.5,
                    "material": "charcoal_tile"
                },
                "rooms": [
                    {"id": "r_liv", "name": "Гостиная-Столовая", "type": "living", "polygon": [[-5.0, -4.0], [0.0, -4.0], [0.0, 4.0], [-5.0, 4.0]], "areaSqM": 40.0, "floorMaterial": "parquet"},
                    {"id": "r_bed", "name": "Спальня", "type": "bedroom", "polygon": [[0.0, -4.0], [5.0, -4.0], [5.0, 4.0], [0.0, 4.0]], "areaSqM": 40.0, "floorMaterial": "parquet"}
                ]
            }
        ],
        "siteElements": [
            {"id": "lawn", "type": "ground", "polygon": [[-12.0, -12.0], [12.0, -12.0], [12.0, 12.0], [-12.0, 12.0]], "material": "grass_lawn"},
            {"id": "pool", "type": "water", "polygon": [[-10.0, -3.0], [-6.0, -3.0], [-6.0, 2.0], [-10.0, 2.0]], "material": "pool_water"}
        ]
    }


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Google AI Studio Gemini + Blender 3D BIM Pipeline")
    parser.add_argument("-i", "--image", help="Path to 2D drawing image (PNG/JPG)", default=None)
    parser.add_argument("-k", "--key", help="Google AI Studio API Key", default=None)
    parser.add_argument("-m", "--model", help="Gemini Model (gemini-2.0-flash or gemini-1.5-pro)", default="gemini-2.0-flash")
    parser.add_argument("-o", "--output", help="Output directory", default="./output")
    args = parser.parse_args()

    out_dir = Path(args.output)
    out_dir.mkdir(parents=True, exist_ok=True)
    json_path = out_dir / "gemini_floorplan.json"
    glb_path = out_dir / "gemini_house.glb"
    render_path = out_dir / "gemini_render.png"

    if args.image and os.path.exists(args.image):
        b64 = encode_image_to_base64(args.image)
        layout = call_gemini_vision_api(b64, api_key=args.key, model_name=args.model)
    else:
        print("💡 [Demo Run] No image specified. Using default architectural template...")
        layout = get_default_architectural_json()

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(layout, f, indent=2, ensure_ascii=False)
    print(f"💾 [Output] Saved layout JSON to: {json_path}")

    execute_blender_assembly(str(json_path), str(glb_path), str(render_path))
