#!/usr/bin/env python3
"""
Professional Photo Strip Generator
Creates sharp, square photo strips from multiple input images.
Uses LANCZOS resampling for maximum quality and PNG output for no compression artifacts.
"""

from PIL import Image
import os
import sys

def crop_to_square(img):
    """Auto-crops an image to the largest centered square."""
    print("  📐 Cropping to centered square...")
    width, height = img.size
    min_dim = min(width, height)
    left = (width - min_dim) // 2
    top = (height - min_dim) // 2
    right = left + min_dim
    bottom = top + min_dim
    return img.crop((left, top, right, bottom))

def make_photo_strip(image_files, output_file="photo_strip.png", square_size=600, 
                    padding=20, bg_color=(255, 255, 255), horizontal=False):
    """
    Creates a professional photo strip with sharp, square images.
    
    Args:
        image_files (list): List of image file paths
        output_file (str): Output strip filename
        square_size (int): Size of each square image in pixels
        padding (int): Space between images in pixels
        bg_color (tuple): Background color in RGB (255, 255, 255) = white
        horizontal (bool): If True, creates horizontal strip; False for vertical
    """
    print(f"🎬 Creating photo strip with {len(image_files)} images...")
    print(f"📏 Square size: {square_size}px, Padding: {padding}px")
    print(f"🎨 Background: RGB{bg_color}, Orientation: {'Horizontal' if horizontal else 'Vertical'}")
    
    processed_images = []

    for i, img_file in enumerate(image_files, 1):
        print(f"\n📸 Processing image {i}/{len(image_files)}: {os.path.basename(img_file)}")
        
        try:
            img = Image.open(img_file).convert("RGB")
            print(f"  📋 Original size: {img.size[0]}x{img.size[1]}px")
            
            # Auto-crop to square
            square_img = crop_to_square(img)
            print(f"  ✂️  Cropped to: {square_img.size[0]}x{square_img.size[1]}px")
            
            # Resize with LANCZOS for maximum sharpness
            print(f"  🔄 Resizing to {square_size}x{square_size}px with LANCZOS...")
            resized = square_img.resize((square_size, square_size), Image.LANCZOS)
            
            processed_images.append(resized)
            print(f"  ✅ Image {i} processed successfully!")
            
        except Exception as e:
            print(f"  ❌ Error processing {img_file}: {e}")
            continue

    if not processed_images:
        print("❌ No images were successfully processed!")
        return False

    print(f"\n🏗️  Building {len(processed_images)}-image strip...")

    # Calculate final strip dimensions
    if horizontal:
        total_width = sum(img.width for img in processed_images) + padding * (len(processed_images) - 1)
        strip_size = (total_width, square_size)
        print(f"📐 Strip dimensions: {total_width}x{square_size}px")
    else:
        total_height = sum(img.height for img in processed_images) + padding * (len(processed_images) - 1)
        strip_size = (square_size, total_height)
        print(f"📐 Strip dimensions: {square_size}x{total_height}px")

    # Create background canvas
    print("🎨 Creating background canvas...")
    strip = Image.new("RGB", strip_size, bg_color)

    # Paste images with proper spacing
    print("🖼️  Assembling images...")
    if horizontal:
        x_offset = 0
        for i, img in enumerate(processed_images):
            strip.paste(img, (x_offset, 0))
            x_offset += img.width + padding
            print(f"  ✓ Placed image {i+1} at position ({x_offset - img.width - padding}, 0)")
    else:
        y_offset = 0
        for i, img in enumerate(processed_images):
            strip.paste(img, (0, y_offset))
            y_offset += img.height + padding
            print(f"  ✓ Placed image {i+1} at position (0, {y_offset - img.height - padding})")

    # Save as PNG for maximum quality (no compression artifacts)
    print(f"\n💾 Saving as PNG: {output_file}")
    strip.save(output_file, "PNG", optimize=True)
    
    print(f"✅ SUCCESS! Professional photo strip saved as '{output_file}'")
    print(f"📊 Final size: {strip.size[0]}x{strip.size[1]}px | File format: PNG (lossless)")
    return True

def main():
    """Example usage and command-line interface"""
    # Example configuration - modify these as needed
    image_files = [
        "photo1.jpg", "photo2.jpg", "photo3.jpg", "photo4.jpg"
    ]
    
    # Check if files exist
    existing_files = [f for f in image_files if os.path.exists(f)]
    
    if not existing_files:
        print("❌ No example images found. Please update the image_files list with your actual image paths.")
        print("\n💡 Example usage:")
        print("   image_files = ['path/to/photo1.jpg', 'path/to/photo2.jpg', ...]")
        return
    
    print("🚀 Starting Professional Photo Strip Generator\n")
    
    # Create vertical strip (default)
    make_photo_strip(
        image_files=existing_files,
        output_file="professional_vertical_strip.png",
        square_size=800,           # High resolution squares
        padding=30,                # Nice spacing
        bg_color=(240, 240, 240),  # Light gray background
        horizontal=False           # Vertical orientation
    )
    
    print("\n" + "="*60)
    
    # Create horizontal strip example
    make_photo_strip(
        image_files=existing_files,
        output_file="professional_horizontal_strip.png", 
        square_size=600,
        padding=20,
        bg_color=(255, 255, 255),  # White background
        horizontal=True            # Horizontal orientation
    )

if __name__ == "__main__":
    main()