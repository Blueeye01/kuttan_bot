@echo off
git add .
git commit -m "Auto update from PC"
git push origin main --force
npm install
pause