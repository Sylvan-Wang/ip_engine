@echo off
echo Deploying admin-signup Edge Function...
set PATH=C:\Program Files\nodejs;%PATH%
set SUPABASE_ACCESS_TOKEN=sbp_cafc2fff3362a44b99b635ece6decb7b5a9c26e9
cd /d D:\ip_engine
node -e "console.log('Node OK: ' + process.version)"
npx --yes supabase@latest functions deploy admin-signup --project-ref gsfzugfoiyodxszuunpw --no-verify-jwt
pause
