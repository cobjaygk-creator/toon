@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ===== 썰툰 검증 도구 설치 =====
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 가 설치되어 있지 않습니다.
  echo 열리는 페이지에서 LTS 버전을 설치한 뒤 이 파일을 다시 실행하세요.
  start https://nodejs.org
  pause
  exit /b
)
echo [1/3] 필요한 패키지 설치 중... 1~2분 걸립니다.
call npm install
if errorlevel 1 (
  echo 설치에 실패했습니다. 이 창의 내용을 캡처해서 보내 주세요.
  pause
  exit /b
)
if not exist .env copy .env.example .env >nul
echo [2/3] 메모장이 열리면 GEMINI_API_KEY= 뒤에 키를 붙여넣고 저장한 뒤 메모장을 닫으세요.
notepad .env
echo [3/3] API 없이 시험 실행 중...
call npm run demo
if errorlevel 1 (
  echo 시험 실행에 실패했습니다. 이 창의 내용을 캡처해서 보내 주세요.
  pause
  exit /b
)
start "" "output\mock\hero\05-preview\_all.gif"
echo.
echo 설치 완료. 이제 run.bat 을 실행하세요.
pause
