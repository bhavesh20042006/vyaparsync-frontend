from PIL import Image
import sys

try:
    img = Image.open('icon.png')
    # get bounding box of non-transparent pixels
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    bbox = img.getbbox()
    if bbox:
        height = bbox[3] - bbox[1]
        right_edge = bbox[2]
        left_edge = right_edge - height
        
        # Add a tiny bit of margin padding
        padding = int(height * 0.05)
        crop_box = (left_edge - padding, bbox[1] - padding, right_edge + padding, bbox[3] + padding)
        
        cropped = img.crop(crop_box)
        
        # Resize to standard sizes
        cropped.resize((192, 192), Image.Resampling.LANCZOS).save('icon-192.png')
        cropped.resize((64, 64), Image.Resampling.LANCZOS).save('favicon.png')
        print('Successfully cropped and saved.')
    else:
        print('No bounding box found.')
except Exception as e:
    print('Error:', e)
    sys.exit(1)
