import os
import cloudinary
import cloudinary.uploader
from fastapi import UploadFile

# Configure Cloudinary
# Ensure these environment variables are set in production
cloudinary.config(
  cloud_name = os.getenv('CLOUDINARY_CLOUD_NAME', 'demo'),
  api_key = os.getenv('CLOUDINARY_API_KEY', '12345'),
  api_secret = os.getenv('CLOUDINARY_API_SECRET', '12345')
)

async def upload_image(file: UploadFile) -> str:
    """
    Uploads an image to Cloudinary and returns the secure URL.
    """
    # Cloudinary's upload is synchronous; in a high-traffic app we might use a threadpool.
    # For the MVP, we will read the file and upload directly.
    contents = await file.read()
    response = cloudinary.uploader.upload(contents, folder="trust_estate")
    return response.get("secure_url")
