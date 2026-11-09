Add-Type -TypeDefinition @"
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Collections.Generic;

public class WinList {
    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder strText, int maxCount);

    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

    [DllImport("user32.dll")]
    public static extern int GetSystemMetrics(int nIndex);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left, Top, Right, Bottom;
    }

    public static List<string> GetFullscreenWindows() {
        var list = new List<string>();
        int screenW = GetSystemMetrics(0);
        int screenH = GetSystemMetrics(1);
        EnumWindows((hWnd, lParam) => {
            if (!IsWindowVisible(hWnd)) return true;
            RECT rc;
            if (!GetWindowRect(hWnd, out rc)) return true;
            int w = rc.Right - rc.Left;
            int h = rc.Bottom - rc.Top;
            if (w >= screenW && h >= screenH && rc.Left <= 0 && rc.Top <= 0) {
                uint pid;
                GetWindowThreadProcessId(hWnd, out pid);
                if (pid > 0) {
                    try {
                        var p = Process.GetProcessById((int)pid);
                        var sb = new StringBuilder(256);
                        GetWindowText(hWnd, sb, 256);
                        list.Add(string.Format("{0} (PID {1}, Rect: {2}x{3} at {4},{5}) - Title: '{6}'", p.ProcessName, pid, w, h, rc.Left, rc.Top, sb.ToString()));
                    } catch {}
                }
            }
            return true;
        }, IntPtr.Zero);
        return list;
    }
}
"@
[WinList]::GetFullscreenWindows() | ForEach-Object { Write-Output $_ }
