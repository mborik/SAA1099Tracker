@ECHO OFF
CD /d %~dp0\resources\
IF EXIST "update.asar" (
  MOVE /Y update.asar app.asar >NUL
  CD ..
  IF EXIST %1 (
    START /B %*
  )
)
EXIT 0
