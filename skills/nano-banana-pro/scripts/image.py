#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "google-genai",
#     "pillow",
# ]
# ///
"""
Generate images using Google's Gemini/Imagen (Nano Banana Pro).
"""

import argparse
import os
import sys
from google import genai
from PIL import Image

def get_aspect_instruction(aspect: str) -> str:
    aspects = {
        "square": "Generate a square image (1:1 aspect ratio).",
        "landscape": "Generate a landscape/wide image (16:9 aspect ratio).",
        "portrait": "Generate a portrait/tall image (9:16 aspect ratio).",
    }
    return aspects.get(aspect, aspects["square"])

def generate_image(prompt: str, output_path: str, aspect: str = "square", reference: str | None = None, model: str | None = None) -> None:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY environment variable not set", file=sys.stderr)
        sys.exit(1)

    model_name = model or os.environ.get("GEMINI_IMAGE_MODEL") or "imagen-3.0-generate-001"
    client = genai.Client(api_key=api_key)

    if "imagen" in model_name.lower():
        print(f"Using Imagen model: {model_name}")
        ratio_map = {"square": "1:1", "landscape": "16:9", "portrait": "9:16"}
        target_ratio = ratio_map.get(aspect, "1:1")
        
        # Correct method and config names for Google GenAI SDK
        response = client.models.generate_images(
            model=model_name,
            prompt=prompt,
            config=genai.types.GenerateImagesConfig(
                aspect_ratio=target_ratio,
                output_mime_type="image/png",
            ),
        )
        if response.generated_images:
            response.generated_images[0].image.save(output_path)
            print(f"Image saved to: {output_path}")
            return
    else:
        print(f"Using multimodal model: {model_name}")
        contents = []
        if reference:
            if not os.path.exists(reference):
                print(f"Error: Reference image not found: {reference}", file=sys.stderr)
                sys.exit(1)
            contents.append(Image.open(reference))
            prompt = f"{get_aspect_instruction(aspect)} {prompt} Use the provided image as a reference."
        else:
            prompt = f"{get_aspect_instruction(aspect)} {prompt}"
        
        contents.append(prompt)
        response = client.models.generate_content(model=model_name, contents=contents)
        
        for part in response.parts:
            if hasattr(part, 'inline_data') and part.inline_data:
                with open(output_path, "wb") as f:
                    f.write(part.inline_data.data)
                print(f"Image saved to: {output_path}")
                return

    print("Error: No image data in response", file=sys.stderr)
    sys.exit(1)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--aspect", default="square")
    parser.add_argument("--reference")
    parser.add_argument("--model")
    args = parser.parse_args()
    generate_image(args.prompt, args.output, args.aspect, args.reference, args.model)

if __name__ == "__main__":
    main()