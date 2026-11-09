using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

public class GameDetector {
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
    [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X, Y; }
    [StructLayout(LayoutKind.Sequential)] public struct MONITORINFO { public int cbSize; public RECT rcMonitor; public RECT rcWork; public uint dwFlags; }
    [StructLayout(LayoutKind.Sequential)] public struct WINDOWPLACEMENT {
        public int length; public int flags; public int showCmd;
        public POINT ptMinPosition; public POINT ptMaxPosition; public RECT rcNormalPosition;
    }

    [DllImport("user32.dll")] static extern IntPtr OpenWindowStation(string name, bool inherit, uint access);
    [DllImport("user32.dll")] static extern bool SetProcessWindowStation(IntPtr hWinSta);
    [DllImport("user32.dll")] static extern IntPtr OpenDesktop(string name, uint flags, bool inherit, uint access);
    [DllImport("user32.dll")] static extern bool SetThreadDesktop(IntPtr hDesktop);
    [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] static extern IntPtr GetAncestor(IntPtr hwnd, uint gaFlags);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] static extern bool IsIconic(IntPtr hWnd);
    [DllImport("user32.dll")] static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
    [DllImport("user32.dll")] static extern IntPtr MonitorFromWindow(IntPtr hwnd, uint dwFlags);
    [DllImport("user32.dll")] static extern bool GetMonitorInfo(IntPtr hMonitor, ref MONITORINFO lpmi);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    [DllImport("user32.dll", EntryPoint = "GetWindowLong")] static extern int GetWindowLong32(IntPtr hWnd, int nIndex);
    [DllImport("user32.dll", EntryPoint = "GetWindowLongPtr")] static extern IntPtr GetWindowLongPtr64(IntPtr hWnd, int nIndex);
    [DllImport("user32.dll")] static extern bool GetWindowPlacement(IntPtr hWnd, ref WINDOWPLACEMENT lpwndpl);
    [DllImport("user32.dll", CharSet = CharSet.Auto)] static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    [DllImport("user32.dll", CharSet = CharSet.Auto)] static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);
    [DllImport("shell32.dll")] static extern int SHQueryUserNotificationState(out int pquns);
    [DllImport("user32.dll")] static extern IntPtr GetDesktopWindow();
    [DllImport("user32.dll")] static extern IntPtr GetShellWindow();
    [DllImport("dwmapi.dll")] static extern int DwmGetWindowAttribute(IntPtr hwnd, int dwAttribute, out int pvAttribute, int cbAttribute);
    [DllImport("user32.dll")] static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
    [DllImport("user32.dll")] static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

    public static void SendMediaAction(string action) {
        try {
            string a = (action ?? "").ToLowerInvariant().Replace("-", "").Replace("_", "");
            if (a == "playpause" || a == "play" || a == "pause") {
                keybd_event(0xB3, 0, 0, UIntPtr.Zero);
                keybd_event(0xB3, 0, 2, UIntPtr.Zero);
            } else if (a == "next") {
                keybd_event(0xB0, 0, 0, UIntPtr.Zero);
                keybd_event(0xB0, 0, 2, UIntPtr.Zero);
            } else if (a == "prev" || a == "previous") {
                keybd_event(0xB1, 0, 0, UIntPtr.Zero);
                keybd_event(0xB1, 0, 2, UIntPtr.Zero);
            } else if (a == "seekforward" || a == "seekbackward") {
                IntPtr fg = GetForegroundWindow();
                if (fg != IntPtr.Zero) {
                    int vkArrow = (a == "seekforward") ? 0x27 : 0x25;
                    PostMessage(fg, 0x0100, (IntPtr)vkArrow, IntPtr.Zero);
                    PostMessage(fg, 0x0101, (IntPtr)vkArrow, IntPtr.Zero);
                }
            }
        } catch {}
    }

    static long GetStyle(IntPtr hWnd) {
        if (IntPtr.Size == 8) return GetWindowLongPtr64(hWnd, -16).ToInt64();
        return (long)GetWindowLong32(hWnd, -16);
    }
    static long GetExStyle(IntPtr hWnd) {
        if (IntPtr.Size == 8) return GetWindowLongPtr64(hWnd, -20).ToInt64();
        return (long)GetWindowLong32(hWnd, -20);
    }

    static void AttachToInteractiveDesktop() {
        try {
            IntPtr wsta = OpenWindowStation("WinSta0", false, 0x000F037F);
            if (wsta != IntPtr.Zero) SetProcessWindowStation(wsta);
            IntPtr dsk = OpenDesktop("Default", 0, false, 0x01FF);
            if (dsk != IntPtr.Zero) SetThreadDesktop(dsk);
        } catch {}
    }

    static bool IsIgnoredOrOverlayWindow(IntPtr hWnd, out string cls, out string title, out string pName, out bool accessDenied) {
        cls = "";
        title = "";
        pName = "";
        accessDenied = false;

        if (hWnd == IntPtr.Zero) return true;
        if (!IsWindowVisible(hWnd) || IsIconic(hWnd)) return true;

        int cloaked = 0;
        if (DwmGetWindowAttribute(hWnd, 14 /* DWMWA_CLOAKED */, out cloaked, sizeof(int)) == 0 && cloaked != 0) {
            return true;
        }

        StringBuilder sbCls = new StringBuilder(256);
        GetClassName(hWnd, sbCls, 256);
        cls = sbCls.ToString();

        if (cls == "Shell_TrayWnd" || cls == "Shell_SecondaryTrayWnd" ||
            cls == "Windows.UI.Core.CoreWindow" || cls == "TopLevelWindowForOverflowXamlIsland" ||
            cls == "CEF-OSC-WIDGET" || cls == "XamlExplorerHostIslandWindow" ||
            cls == "ForegroundStaging" || cls == "MultitaskingViewFrame") {
            return true;
        }

        StringBuilder sbTitle = new StringBuilder(256);
        GetWindowText(hWnd, sbTitle, 256);
        title = sbTitle.ToString();
        if (title == "Cross-Diary" || title == "NVIDIA GeForce Overlay") {
            return true;
        }

        long exStyle = GetExStyle(hWnd);
        if ((exStyle & 0x00000020L /* WS_EX_TRANSPARENT */) != 0 && (exStyle & 0x08000000L /* WS_EX_NOACTIVATE */) != 0) {
            return true;
        }

        uint pid = 0;
        GetWindowThreadProcessId(hWnd, out pid);
        if (pid == 0 || pid == (uint)Process.GetCurrentProcess().Id) return true;

        try {
            using (Process p = Process.GetProcessById((int)pid)) {
                pName = p.ProcessName.ToLowerInvariant();
            }
        } catch {
            accessDenied = true;
            pName = "protected_or_elevated";
        }

        if (!accessDenied) {
            if (pName.Contains("cross-diary") || pName == "textinputhost" ||
                pName == "searchhost" || pName == "startmenuexperiencehost" ||
                pName == "shellexperiencehost" || pName.Contains("nvidia overlay")) {
                return true;
            }
        }

        return false;
    }

    public static bool EvaluateTargetWindow(IntPtr hWnd, bool allowQunsExclusive, out string debugReason) {
        debugReason = "";
        if (hWnd == IntPtr.Zero) { debugReason = "hwnd=0"; return false; }

        IntPtr root = GetAncestor(hWnd, 2 /* GA_ROOT */);
        if (root != IntPtr.Zero) hWnd = root;

        IntPtr shell = GetShellWindow();
        IntPtr desktop = GetDesktopWindow();
        if (hWnd == shell || hWnd == desktop) { debugReason = "shell/desktop"; return false; }

        string cls, title, pName;
        bool accessDenied;
        if (IsIgnoredOrOverlayWindow(hWnd, out cls, out title, out pName, out accessDenied)) {
            debugReason = "ignored/overlay (" + cls + "/" + pName + ")";
            return false;
        }

        if (cls == "WorkerW" || cls == "Progman" || title == "Program Manager") {
            debugReason = "desktop progman/workerw";
            return false;
        }

        if (!accessDenied) {
            if (pName == "explorer" || pName == "antigravity" || pName == "devenv" || pName == "code") {
                debugReason = "dev/explorer (" + pName + ")";
                return false;
            }
        }

        int quns = 0;
        if (allowQunsExclusive && SHQueryUserNotificationState(out quns) == 0) {
            if (quns == 3 || quns == 4) {
                debugReason = "QUNS=" + quns;
                return true;
            }
        }

        IntPtr hMon = MonitorFromWindow(hWnd, 2 /* MONITOR_DEFAULTTONEAREST */);
        if (hMon == IntPtr.Zero) { debugReason = "hMon=0"; return false; }

        MONITORINFO mi = new MONITORINFO();
        mi.cbSize = Marshal.SizeOf(typeof(MONITORINFO));
        if (!GetMonitorInfo(hMon, ref mi)) { debugReason = "GetMonitorInfo failed"; return false; }

        RECT r;
        if (!GetWindowRect(hWnd, out r)) { debugReason = "GetWindowRect failed"; return false; }

        bool coversMonitor = (r.Left <= mi.rcMonitor.Left + 4 &&
                              r.Top <= mi.rcMonitor.Top + 4 &&
                              r.Right >= mi.rcMonitor.Right - 4 &&
                              r.Bottom >= mi.rcMonitor.Bottom - 4);

        if (!coversMonitor) {
            debugReason = string.Format("not covering monitor: ({0},{1})-({2},{3}) vs ({4},{5})-({6},{7})",
                r.Left, r.Top, r.Right, r.Bottom, mi.rcMonitor.Left, mi.rcMonitor.Top, mi.rcMonitor.Right, mi.rcMonitor.Bottom);
            return false;
        }

        if (accessDenied) {
            debugReason = "accessDenied + coversMonitor";
            return true;
        }

        // Exact borderless bounds check:
        // Standard maximized windows in Win10/11 have (-8, -8) to (1928, 1088) DWM border overhang.
        // Borderless windows ("ventana sin bordes") and F11/YouTube fullscreen have (0, 0) to (1920, 1080) (within +/- 2px).
        bool isExactBorderlessRect = (r.Left >= mi.rcMonitor.Left - 2 &&
                                      r.Top >= mi.rcMonitor.Top - 2 &&
                                      r.Right <= mi.rcMonitor.Right + 2 &&
                                      r.Bottom <= mi.rcMonitor.Bottom + 2);
        if (isExactBorderlessRect) {
            debugReason = "exactBorderlessRect (" + pName + ")";
            return true;
        }

        long style = GetStyle(hWnd);
        long exStyle = GetExStyle(hWnd);
        bool isPopup = (style & 0x80000000L) != 0;
        bool hasCaption = (style & 0x00C00000L) == 0x00C00000L;
        bool hasThickFrame = (style & 0x00040000L) != 0;

        if (isPopup || !hasCaption || !hasThickFrame) {
            debugReason = string.Format("borderless style (popup={0}, caption={1}, thick={2})", isPopup, hasCaption, hasThickFrame);
            return true;
        }

        WINDOWPLACEMENT wp = new WINDOWPLACEMENT();
        wp.length = Marshal.SizeOf(typeof(WINDOWPLACEMENT));
        GetWindowPlacement(hWnd, ref wp);

        if (wp.showCmd != 3 /* SW_SHOWMAXIMIZED */) {
            debugReason = "showCmd=" + wp.showCmd + " covering monitor";
            return true;
        }

        bool hasDedicatedTaskbarSpace = (mi.rcWork.Bottom < mi.rcMonitor.Bottom - 2 ||
                                         mi.rcWork.Top > mi.rcMonitor.Top + 2 ||
                                         mi.rcWork.Left > mi.rcMonitor.Left + 2 ||
                                         mi.rcWork.Right < mi.rcMonitor.Right - 2);
        if (hasDedicatedTaskbarSpace) {
            debugReason = "covers dedicated taskbar space";
            return true;
        }

        bool isStandardDesktopMaximizedApp = (
            cls == "Chrome_WidgetWin_1" ||
            cls == "MozillaWindowClass" ||
            cls == "CabinetWClass" ||
            cls == "ApplicationFrameWindow" ||
            cls == "WinUIDesktopWin32WindowClass" ||
            pName == "brave" || pName == "chrome" || pName == "msedge" || pName == "firefox" ||
            pName == "opera" || pName == "vivaldi" || pName == "discord" || pName == "spotify" ||
            pName == "whatsapp" || pName == "telegram" || pName == "obsidian" || pName == "notion"
        );

        if (!isStandardDesktopMaximizedApp) {
            debugReason = "maximized non-desktop app (" + pName + "/" + cls + ")";
            return true;
        }

        debugReason = "normal maximized desktop app (" + pName + ")";
        return false;
    }

    public static bool IsForegroundGame(out string reason) {
        reason = "";
        try {
            IntPtr fg = GetForegroundWindow();
            if (fg == IntPtr.Zero) {
                AttachToInteractiveDesktop();
                fg = GetForegroundWindow();
            }

            if (fg != IntPtr.Zero) {
                IntPtr root = GetAncestor(fg, 2 /* GA_ROOT */);
                if (root != IntPtr.Zero) fg = root;

                string cls, title, pName;
                bool accessDenied;
                if (!IsIgnoredOrOverlayWindow(fg, out cls, out title, out pName, out accessDenied)) {
                    return EvaluateTargetWindow(fg, true, out reason);
                }
            }

            // Fallback: if foreground window is 0, Cross-Diary itself, or an overlay/tray,
            // inspect the topmost visible real window in Z-order!
            IntPtr topCandidate = IntPtr.Zero;
            EnumWindows((h, l) => {
                string cls, title, pName;
                bool accessDenied;
                if (IsIgnoredOrOverlayWindow(h, out cls, out title, out pName, out accessDenied)) {
                    return true; // continue enumeration
                }
                RECT r;
                if (GetWindowRect(h, out r)) {
                    if ((r.Right - r.Left) >= 200 && (r.Bottom - r.Top) >= 200) {
                        topCandidate = h;
                        return false; // stop at the highest visible real window in Z-order
                    }
                }
                return true;
            }, IntPtr.Zero);

            if (topCandidate != IntPtr.Zero) {
                bool res = EvaluateTargetWindow(topCandidate, false, out reason);
                reason = "[Z-Order Fallback] " + reason;
                return res;
            }

            reason = "no candidate found";
            return false;
        } catch (Exception ex) {
            reason = "exception: " + ex.Message;
            return false;
        }
    }

    static void Main(string[] args) {
        AttachToInteractiveDesktop();

        if (args.Length > 0 && args[0].StartsWith("--media-")) {
            string act = args[0].Substring(8);
            SendMediaAction(act);
            Console.WriteLine("{\"status\":\"ok\"}");
            return;
        }

        if (args.Length > 0 && args[0].ToLowerInvariant() == "check") {
            string reason;
            bool isGame = IsForegroundGame(out reason);
            Console.WriteLine(isGame ? "true" : "false");
            if (args.Length > 1 && args[1].ToLowerInvariant() == "debug") {
                Console.WriteLine("REASON: " + reason);
            }
            return;
        }

        // Auto-terminate when parent process disconnects or closes standard input,
        // and handle instant incoming ACTION: commands (<1ms)
        Thread inputWatcher = new Thread(() => {
            try {
                string line;
                while ((line = Console.ReadLine()) != null) {
                    string trimmed = line.Trim();
                    if (trimmed.StartsWith("ACTION:")) {
                        string act = trimmed.Substring(7);
                        SendMediaAction(act);
                        Console.WriteLine("ACTION_EXECUTED:" + act);
                        Console.Out.Flush();
                    }
                }
            } catch {}
            Environment.Exit(0);
        });
        inputWatcher.IsBackground = true;
        inputWatcher.Start();

        bool? lastState = null;
        int heartbeatCounter = 0;

        while (true) {
            string reason;
            bool currentState = IsForegroundGame(out reason);
            heartbeatCounter++;

            if (!lastState.HasValue || lastState.Value != currentState || heartbeatCounter >= 10) {
                lastState = currentState;
                heartbeatCounter = 0;
                Console.WriteLine("GAME_ACTIVE:" + (currentState ? "true" : "false"));
                Console.Out.Flush();
            }

            Thread.Sleep(100);
        }
    }
}
