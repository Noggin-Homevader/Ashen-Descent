; Ashen Descent installer: the launcher's own files and the player's data can live in the same folder
; (for example E:\Ashen Descent with game\, userdata\ and launcher\ next to Ashen Descent.exe).
; The default electron-builder uninstaller removes the whole install folder, which would delete the game and the
; player's saves when an update replaces the old launcher. These macros make sure that never happens.

!include LogicLib.nsh
!include FileFunc.nsh
!macro ashenDataDirs DO
  !insertmacro ${DO} "game"
  !insertmacro ${DO} "userdata"
  !insertmacro ${DO} "launcher"
  !insertmacro ${DO} "Launcher"
!macroend

; ---- installer: before the old version is uninstalled, move the data folders out of its way ----
!macro ashenHoldOne NAME
  ${If} ${FileExists} "$INSTDIR\${NAME}\*.*"
    CreateDirectory "$INSTDIR.ashen-keep"
    ClearErrors
    Rename "$INSTDIR\${NAME}" "$INSTDIR.ashen-keep\${NAME}"
    ${If} ${Errors}
      ; something has the folder open (the game or the launcher is still running): stop before anything is removed
      Call ashenRestoreHeld
      MessageBox MB_OK|MB_ICONEXCLAMATION "Ashen Descent is still running. Close the game and the launcher (right-click the tray icon, Quit), then run the setup again.$\r$\n$\r$\nNothing was changed and your saves are safe." /SD IDOK
      Quit
    ${EndIf}
  ${EndIf}
!macroend
!macro ashenRestoreOne NAME
  ${If} ${FileExists} "$INSTDIR.ashen-keep\${NAME}\*.*"
    ${IfNot} ${FileExists} "$INSTDIR\${NAME}\*.*"
      CreateDirectory "$INSTDIR"
      Rename "$INSTDIR.ashen-keep\${NAME}" "$INSTDIR\${NAME}"
    ${EndIf}
  ${EndIf}
!macroend

Function ashenRestoreHeld
  !insertmacro ashenDataDirs ashenRestoreOne
  RMDir "$INSTDIR.ashen-keep"
FunctionEnd

!macro customInit
  ; data held aside by a setup that was interrupted is put back first
  Call ashenRestoreHeld
  ; give a launcher that has just asked for this update a moment to close its files
  Sleep 1500
  !insertmacro ashenDataDirs ashenHoldOne
!macroend

!macro customInstall
  Call ashenRestoreHeld
!macroend

; ---- uninstaller: remove only the launcher's own files, never the game or the player's data ----
!macro customRemoveFiles
  Delete "$INSTDIR\Ashen Descent.exe"
  Delete "$INSTDIR\*.pak"
  Delete "$INSTDIR\*.dll"
  Delete "$INSTDIR\*.bin"
  Delete "$INSTDIR\*.dat"
  Delete "$INSTDIR\vk_swiftshader_icd.json"
  Delete "$INSTDIR\LICENSE.electron.txt"
  Delete "$INSTDIR\LICENSES.chromium.html"
  RMDir /r "$INSTDIR\locales"
  RMDir /r "$INSTDIR\resources"
  RMDir /r "$INSTDIR\swiftshader"
  Delete "$INSTDIR\Uninstall Ashen Descent.exe"
  ; the folder itself only goes if nothing else is left in it
  RMDir "$INSTDIR"
!macroend
