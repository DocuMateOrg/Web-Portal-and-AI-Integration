import os
import shutil

# Local Storage Configuration
UPLOAD_DIR = "uploads"
BASE_URL = "http://localhost:8000/static"

# Ensure directories exist
os.makedirs(os.path.join(UPLOAD_DIR, "audio"), exist_ok=True)
os.makedirs(os.path.join(UPLOAD_DIR, "docs"), exist_ok=True)

def upload_to_firebase(file_path, destination_blob_name, content_type="application/pdf"):
    """Saves a file locally and returns the local URL."""
    try:
        # Construct local path
        local_path = os.path.join(UPLOAD_DIR, destination_blob_name)
        
        # Ensure subdirectories exist
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        
        # Copy file to uploads directory
        shutil.copy2(file_path, local_path)
        
        # Return local URL (using forward slashes)
        url_path = destination_blob_name.replace("\\", "/")
        return f"{BASE_URL}/{url_path}"
    except Exception as e:
        print(f"Local Storage Error: {e}")
        return None

def upload_bytes_to_firebase(file_bytes, destination_blob_name, content_type="audio/mpeg"):
    """Saves bytes locally and returns the local URL."""
    try:
        # Construct local path
        local_path = os.path.join(UPLOAD_DIR, destination_blob_name)
        
        # Ensure subdirectories exist
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        
        # Write bytes to file
        with open(local_path, "wb") as f:
            f.write(file_bytes)
            
        # Return local URL (using forward slashes)
        url_path = destination_blob_name.replace("\\", "/")
        return f"{BASE_URL}/{url_path}"
    except Exception as e:
        print(f"Local Storage Error: {e}")
        return None
