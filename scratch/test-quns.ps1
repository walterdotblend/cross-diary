Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class ShellHelper {
    [DllImport("shell32.dll")]
    public static extern int SHQueryUserNotificationState(out int pquns);
}
"@
$state = 0
[ShellHelper]::SHQueryUserNotificationState([ref]$state) | Out-Null
Write-Host "QUNS_STATE: $state"
