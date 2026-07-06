import sys
import json
import urllib.request
import urllib.error
import base64

# Ensure UTF-8 output for stdout, especially on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

try:
    import fitz  # PyMuPDF
except ImportError:
    print(json.dumps({"error": "PyMuPDF (fitz) is not installed. Please install it using 'pip install pymupdf'."}))
    sys.exit(1)

def call_ollama(model, prompt, images=None):
    url = "http://localhost:11434/api/generate"
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False
    }
    if images:
        payload["images"] = images

    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            return result.get("response", "").strip()
    except Exception:
        return ""

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Missing PDF file path argument."}))
        sys.exit(1)

    pdf_path = sys.argv[1]
    
    try:
        doc = fitz.open(pdf_path)
    except Exception as e:
        print(json.dumps({"error": f"Failed to open PDF: {str(e)}"}))
        sys.exit(1)

    raw_text = ""
    base64_images = []

    for page_index in range(len(doc)):
        page = doc[page_index]
        raw_text += page.get_text() + "\n"
        
        # Extract images
        image_list = page.get_images(full=True)
        for img_info in image_list:
            xref = img_info[0]
            try:
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]
                base64_string = base64.b64encode(image_bytes).decode('utf-8')
                base64_images.append(base64_string)
            except Exception:
                continue

    components = []

    # 1. Clean raw text using qwen:7b
    if raw_text.strip():
        text_prompt = (
            "Format and clean the following raw text into a single cohesive, "
            "searchable string (without formatting). Do not include any explanations "
            "or conversational filler, just provide the cleaned text.\n\n"
            f"{raw_text}"
        )
        cleaned_text = call_ollama("qwen:7b", text_prompt)
        if cleaned_text:
            components.append(cleaned_text)
        else:
            # Fallback to basic cleaned text if Ollama call fails (e.g., context too long or server down)
            components.append(" ".join(raw_text.split()))

    # 2. Describe images using llava:latest
    for idx, b64_img in enumerate(base64_images):
        image_prompt = "Describe this image for search indexing. Be concise."
        description = call_ollama("llava:latest", image_prompt, images=[b64_img])
        if description:
            components.append(f"Image {idx + 1}: {description}")

    # Combine everything
    final_output = " + ".join(components)
    
    # Output the result as JSON
    print(json.dumps({"text": final_output}))

if __name__ == "__main__":
    main()
