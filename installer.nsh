!include nsDialogs.nsh
!include LogicLib.nsh

!macro customUnWelcomePage
  !insertmacro MUI_UNPAGE_WELCOME
  UninstPage custom un.CrossDiaryOptionsPage un.CrossDiaryOptionsPageLeave
!macroend

!macro customUnInit
  StrCpy $R8 "0"
  StrCpy $R9 "0"
!macroend

!ifdef BUILD_UNINSTALLER
Function un.CrossDiaryOptionsPage
  nsDialogs::Create 1018
  Pop $R0
  ${If} $R0 == error
    Abort
  ${EndIf}

  ${If} $LANGUAGE == 1034
  ${OrIf} $LANGUAGE == 3082
  ${OrIf} $LANGUAGE == 2058
  ${OrIf} $LANGUAGE == 10250
    ${NSD_CreateLabel} 0 0 100% 24u "Cross-Diary conserva tus notas y sincronizacion para que no pierdas nada si reinstalas.$\r$\nPor defecto NO se borra nada. Marca una casilla solo si deseas borrar tus datos:"
    Pop $0

    ${NSD_CreateCheckbox} 10u 30u 280u 14u "Borrar datos locales en este equipo (notas, cache y configuracion)"
    Pop $R1
    ${NSD_SetState} $R1 ${BST_UNCHECKED}

    ${NSD_CreateCheckbox} 10u 48u 280u 14u "Solicitar borrado de mi diario en la nube (30 dias de gracia)"
    Pop $R2
    ${NSD_SetState} $R2 ${BST_UNCHECKED}

    ${NSD_CreateLabel} 10u 68u 280u 52u "Aviso sobre la nube: Si marcas el borrado en la nube, tus notas se guardaran durante 30 dias y luego se eliminaran definitivamente. Puedes recuperarlo en cualquier momento introduciendo tu codigo de 8 digitos o entrando desde un dispositivo vinculado. Visitas a notas compartidas no cancelan el borrado."
    Pop $0
  ${Else}
    ${NSD_CreateLabel} 0 0 100% 24u "Cross-Diary keeps your notes and sync data safe so you don't lose anything if you reinstall.$\r$\nBy default NOTHING is deleted. Check a box only if you want to delete your data:"
    Pop $0

    ${NSD_CreateCheckbox} 10u 30u 280u 14u "Delete local data on this computer (notes, cache and settings)"
    Pop $R1
    ${NSD_SetState} $R1 ${BST_UNCHECKED}

    ${NSD_CreateCheckbox} 10u 48u 280u 14u "Request cloud diary deletion (30-day grace period)"
    Pop $R2
    ${NSD_SetState} $R2 ${BST_UNCHECKED}

    ${NSD_CreateLabel} 10u 68u 280u 52u "Cloud notice: If you request cloud deletion, your notes will be kept for 30 days and then permanently deleted. You can restore it anytime with your 8-digit code or by logging in from a linked device. Visits to shared notes do not cancel deletion."
    Pop $0
  ${EndIf}

  nsDialogs::Show
FunctionEnd

Function un.CrossDiaryOptionsPageLeave
  ${NSD_GetState} $R1 $R3
  ${If} $R3 == ${BST_CHECKED}
    StrCpy $R8 "1"
  ${Else}
    StrCpy $R8 "0"
  ${EndIf}

  ${NSD_GetState} $R2 $R3
  ${If} $R3 == ${BST_CHECKED}
    StrCpy $R9 "1"
  ${Else}
    StrCpy $R9 "0"
  ${EndIf}
FunctionEnd
!endif

!macro customUnInstall
  ${If} $R9 == "1"
    DetailPrint "Solicitando borrado del diario en la nube (periodo de gracia de 30 dias)..."
    ExecWait '"$INSTDIR\Cross-Diary.exe" --schedule-uninstall-deletion'
  ${EndIf}

  ${If} $R8 == "1"
    DetailPrint "Eliminando datos locales de Cross-Diary..."
    RMDir /r "$APPDATA\Cross-Diary"
    RMDir /r "$LOCALAPPDATA\cross-diary-updater"
  ${EndIf}
!macroend
