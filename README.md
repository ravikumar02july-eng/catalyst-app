# Catalyst

Expo + React Native stock-market scanner MVP.

## Scanner
The scanner UI is provider-independent and uses rule-based analysis of recent daily closing prices. It displays upward/downward/neutral bias, a relative signal-strength score, observed sample support/resistance, refresh, and direction filters. Scores are not probabilities, forecasts, or financial advice.

The scanner uses local sample data until the optional Breeze read-only backend is configured. See [server/README.md](server/README.md) to run that service. Keep Breeze API key, secret, and session token on the server; only configure the server URL in the Expo app.

## Run the Expo app

```bash
npm install
npx expo start
```

Then press `a` for Android or scan the QR code in Expo Go.

## App environment
Create a root `.env` file after starting the Breeze backend:

```env
EXPO_PUBLIC_BREEZE_API_URL=http://10.0.2.2:8000
```

Use `http://10.0.2.2:8000` for Android emulator. A physical phone needs the development computer's LAN IP (for example `http://192.168.1.10:8000`). Restart Expo after changing `.env`.

## Notes
- The Breeze integration is read-only and currently supports the starter NSE cash symbols: RELIANCE, TCS, INFY, HDFCBANK.
- If Breeze is not configured or is unavailable, the scanner falls back to local sample values.
- Never put Breeze secrets/session tokens, Supabase service-role keys, or other private credentials in `EXPO_PUBLIC_` variables.
