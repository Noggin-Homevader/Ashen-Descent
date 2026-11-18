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

; $R8 holds the folder name (relative to the install folder)
Function ashenHoldDir
  ${If} ${FileExists} "$INSTDIR\$R8\*.*"
    CreateDirectory "$INSTDIR.ashen-keep"
    ; a launcher that has just quit for this update can take a few seconds to let go of its files
    StrCpy $R9 0
    ${Do}
      ClearErrors
      Rename "$INSTDIR\$R8" "$INSTDIR.ashen-keep\$R8"
      ${IfNot} ${Errors}
        ${Break}
      ${EndIf}
      IntOp $R9 $R9 + 1
      ${If} $R9 >= 20
        ; still in use (the game or the launcher is running): stop before anything is removed
        Call ashenRestoreHeld
        MessageBox MB_OK|MB_ICONEXCLAMATION "Ashen Descent is still running. Close the game and the launcher (right-click the tray icon, Quit), then run the setup again.$\r$\n$\r$\nNothing was changed and your saves are safe." /SD IDOK
        ; never leave the player without a launcher: open the one that is installed
        ${If} ${Silent}
        ${AndIf} ${FileExists} "$INSTDIR\Ashen Descent.exe"
          Exec '"$INSTDIR\Ashen Descent.exe"'
        ${EndIf}
        Quit
      ${EndIf}
      Sleep 1000
    ${Loop}
  ${EndIf}
FunctionEnd
!macro ashenHoldOne NAME
  StrCpy $R8 "${NAME}"
  Call ashenHoldDir
!macroend




; Launchers up to 1.5.3 start the update setup from inside the install folder (launcher\update\). The setup has to
; move that folder aside while it installs, which Windows does not allow while the setup runs from it, so the setup
; copies itself to the temp folder and continues from there.
Function ashenRelocate
  StrLen $R1 "$INSTDIR\"
  StrCpy $R2 "$EXEPATH" $R1
  ${If} $R2 == "$INSTDIR\"
    CopyFiles /SILENT "$EXEPATH" "$TEMP\ashen-descent-setup.exe"
    ${GetParameters} $R3
    Exec '"$TEMP\ashen-descent-setup.exe" $R3'
    Quit
  ${EndIf}
FunctionEnd

; After a silent update started by the launcher (--updated), open the new launcher. A second copy started by the
; launcher's own update script just hands over to this one.
Function ashenRelaunch
  ${If} ${Silent}
    ${GetParameters} $R3
    ClearErrors
    ${GetOptions} $R3 "--updated" $R4
    ${IfNot} ${Errors}
    ${AndIf} ${FileExists} "$INSTDIR\Ashen Descent.exe"
      Exec '"$INSTDIR\Ashen Descent.exe"'
    ${EndIf}
  ${EndIf}
FunctionEnd

!macro customInit
  Call ashenRelocate
  ; data held aside by a setup that was interrupted is put back first
  Call ashenRestoreHeld
  !insertmacro ashenDataDirs ashenHoldOne
!macroend

!macro customInstall
  Call ashenRestoreHeld
  Call ashenRelaunch
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
