import os
from fastapi import Header, HTTPException, Depends
from google.oauth2 import id_token
from google.auth.transport import requests
from dotenv import load_dotenv

load_dotenv()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
ALLOWED_EMAILS = os.getenv("ALLOWED_EMAILS", "").split(",")

async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    
    token = authorization.split(" ")[1]
    
    try:
        # Xác thực id_token với Google
        idinfo = id_token.verify_oauth2_token(token, requests.Request(), GOOGLE_CLIENT_ID)
        
        email = idinfo.get('email')
        
        # Kiểm tra Whitelist
        if email not in ALLOWED_EMAILS:
            raise HTTPException(status_code=403, detail=f"Email {email} is not authorized")
        
        return idinfo
        
    except ValueError as e:
        # Token không hợp lệ hoặc hết hạn
        print(f"Token validation failed. Error: {e}, ClientID configured: {GOOGLE_CLIENT_ID}")
        raise HTTPException(status_code=401, detail=f"Token verification failed: {e}")
