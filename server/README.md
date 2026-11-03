# Breeze market data backend

This small read-only service keeps Breeze API credentials off the React Native app. It serves the Catalyst scanner's configured NSE cash symbols and daily closing prices.

## Configure and run locally (Windows PowerShell)

```powershell
cd server
py -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `.env` with your Breeze API key, API secret, and the session token obtained through Breeze's login flow. Do not commit `.env` or put the secret/session token in Expo variables. The session token may need to be refreshed according to Breeze's authentication flow.

Load `.env` into the shell before starting. One simple option is to use `python-dotenv` locally (`pip install python-dotenv`) and add `from dotenv import load_dotenv; load_dotenv()` at the top of `app.py`, or set the variables in PowerShell:

```powershell
$env:BREEZE_API_KEY="your-key"
$env:BREEZE_API_SECRET="your-secret"
$env:BREEZE_SESSION_TOKEN="your-session-token"
$env:CORS_ORIGINS="*"
uvicorn app:app --host 0.0.0.0 --port 8000
```

Check `http://127.0.0.1:8000/health`. For an Android emulator, the app typically reaches the host machine at `http://10.0.2.2:8000`; for a physical phone, use the computer's LAN IP and ensure both devices are on the same network.

In the app root `.env`, set:

```env
EXPO_PUBLIC_BREEZE_API_URL=http://10.0.2.2:8000
```

Restart Expo after editing environment variables. This backend currently exposes read-only scanner data only; it does not place orders. Restrict CORS and add authentication/rate limiting before deploying publicly. Do not expose Breeze secrets or a reusable session token to the mobile app.
