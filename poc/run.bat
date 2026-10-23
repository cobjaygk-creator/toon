@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist node_modules (
  echo 먼저 setup.bat 을 실행하세요.
  pause
  exit /b
)
set P=gemini
set D=output\%P%\hero

:menu
set D=output\%P%\hero
cls
echo ==========================================
echo   썰툰 0단계 검증          API: %P%
echo ==========================================
echo   1. 캐릭터 시트 후보 4장 만들기
echo   2. 마음에 드는 시트 고르기
echo   3. 눈/입 박스 좌표 확인
echo   4. 테스트 2 - 일관성 20컷
echo   5. 테스트 3 - 표정 5종
echo   6. 테스트 4 - 눈/입 파츠 + 이음매 점수
echo   7. 깜빡임/말하기 GIF 만들기
echo   8. API 바꾸기 (gemini / openai)
echo   9. 결과 폴더 열기
echo   0. 끝내기
echo ==========================================
set C=
set /p C=번호를 입력하고 Enter: 
if "%C%"=="1" goto sheet
if "%C%"=="2" goto pick
if "%C%"=="3" goto grid
if "%C%"=="4" goto consistency
if "%C%"=="5" goto expressions
if "%C%"=="6" goto parts
if "%C%"=="7" goto preview
if "%C%"=="8" goto switch
if "%C%"=="9" goto open
if "%C%"=="0" exit /b
goto menu

:sheet
call npm run -s sheet -- --provider %P%
if not errorlevel 1 start "" "%D%\01-sheet-candidates\_overview.png"
pause
goto menu

:pick
set N=
set /p N=고를 시트 번호 (1~4): 
call npm run -s sheet -- --provider %P% --pick %N%
pause
goto menu

:grid
call npm run -s grid -- --provider %P%
if not errorlevel 1 (
  start "" "%D%\00-grid.png"
  echo 파란 박스가 눈/입을 감싸지 않으면, 열리는 메모장에서 숫자를 고치고 저장한 뒤 3번을 다시 실행하세요.
  notepad characters\hero\character.json
)
pause
goto menu

:consistency
call npm run -s consistency -- --provider %P%
if not errorlevel 1 start "" "%D%\02-consistency\_grid.png"
pause
goto menu

:expressions
call npm run -s expressions -- --provider %P%
if not errorlevel 1 start "" "%D%\03-expressions.png"
pause
goto menu

:parts
call npm run -s parts -- --provider %P%
pause
goto menu

:preview
call npm run -s preview -- --provider %P%
if not errorlevel 1 start "" "%D%\05-preview\_all.gif"
pause
goto menu

:switch
if "%P%"=="gemini" (set P=openai) else (set P=gemini)
goto menu

:open
if exist "%D%" (start "" "%D%") else (start "" output)
goto menu
