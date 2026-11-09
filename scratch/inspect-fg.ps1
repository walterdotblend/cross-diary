Add-Type -TypeDefinition @"
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;

public class WinInspector {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder strText, int maxCount);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern int GetClassName(IntPtr hWnd, StringBuilder strText, int maxCount);

    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

    [DllImport("user32.dll", EntryPoint = "GetWindowLongPtr")]
    public static extern IntPtr GetWindowLongPtr64(IntPtr hWnd, int nIndex);

    [DllImport("user32.dll")]
    public static extern int GetSystemMetrics(int nIndex);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left, Top, Right, Bottom;
    }

    public static string Inspect() {
        IntPtr fg = GetForegroundWindow();
        if (fg == IntPtr.Zero) return "No foreground window";
        uint pid;
        GetWindowThreadProcessId(fg, out pid);
        var proc = Process.GetProcessById((int)pid);
        var title = new StringBuilder(256);
        GetWindowText(fg, title, 256);
        var cls = new StringBuilder(256);
        GetClassName(fg, cls, 256);
        RECT rc;
        GetWindowRect(fg, out rc);
        long style = GetWindowLongPtr64(fg, -16).ToInt64();
        long exStyle = GetWindowLongPtr64(fg, -20).ToInt64();
        int screenW = GetSystemMetrics(0);
        int screenH = GetSystemMetrics(1);
        return string.Format("Proc: {0} (PID {1})\nTitle: {2}\nClass: {3}\nRect: [{4},{5} to {6},{7}] (Size: {8}x{9})\nScreen: {10}x{11}\nStyle: 0x{12:X8}\nExStyle: 0x{13:X8}",
            proc.ProcessName, pid, title.ToString(), cls.ToString(), rc.Left, rc.Top, rc.Right, rc.Bottom, rc.Right - rc.Left, rc.Bottom - rc.Top, screenW, screenH, style, exStyle);
    }
}
"@
Write-Output ([WinInspector]::Inspect())
