from PIL import Image, ImageDraw
import sys

def convert_logo(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    
    # 1. Floodfill from corners to make white background transparent
    width, height = img.size
    # We create a new image because floodfill doesn't work well directly with RGBA sometimes
    # Actually, we can just process pixels.
    # A simpler floodfill for transparent background:
    target_color = img.getpixel((0, 0))
    
    # Let's do pixel-by-pixel instead for safety
    data = img.getdata()
    new_data = []
    
    for item in data:
        r, g, b, a = item
        # If it's black/dark gray text, turn to white
        # The text might be very dark brown/black.
        luminance = 0.299*r + 0.587*g + 0.114*b
        
        if r < 40 and g < 40 and b < 40:
            # Change dark text to white
            new_data.append((255, 255, 255, a))
        # If pure white background, make transparent (assuming the wood slice doesn't have perfectly 255,255,255 inside)
        elif r > 245 and g > 245 and b > 245:
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
            
    img.putdata(new_data)
    img.save(output_path, "PNG")

if __name__ == "__main__":
    convert_logo(sys.argv[1], sys.argv[2])
