param([string]$Action = "status")
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Add-Type -AssemblyName System.Runtime.WindowsRuntime -ErrorAction SilentlyContinue
Add-Type -AssemblyName System.Drawing -ErrorAction SilentlyContinue

Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Collections.Generic;

[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice {
    int Activate(ref Guid iid, int dwClsCtx, IntPtr pActivationParams, [Out, MarshalAs(UnmanagedType.IUnknown)] out object ppInterface);
}

[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator {
    int EnumAudioEndpoints(int dataFlow, int dwStateMask, out IntPtr ppDevices);
    int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice ppEndpoint);
}

[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
class MMDeviceEnumeratorComObject { }

[Guid("C02216F6-8C67-4B5B-9D00-D008E73E0064"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioMeterInformation {
    int GetPeakValue(out float pfPeak);
}

[Guid("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioSessionManager2 {
    int GetAudioSessionControl(IntPtr AudioSessionGuid, uint StreamFlags, out IntPtr SessionControl);
    int GetSimpleAudioVolume(IntPtr AudioSessionGuid, uint StreamFlags, out IntPtr AudioVolume);
    int GetSessionEnumerator(out IAudioSessionEnumerator SessionEnum);
}

[Guid("E2F5BB11-0570-40CA-ACDD-3AA01277DEE8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioSessionEnumerator {
    int GetCount(out int SessionCount);
    int GetSession(int SessionCount, out IAudioSessionControl Session);
}

[Guid("F4B1A599-7266-4319-A8CA-E70ACB11E8CD"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioSessionControl {
    int GetState(out int pRetVal);
    int GetDisplayName([MarshalAs(UnmanagedType.LPWStr)] out string pRetVal);
    int SetDisplayName([MarshalAs(UnmanagedType.LPWStr)] string Value, ref Guid EventContext);
    int GetIconPath([MarshalAs(UnmanagedType.LPWStr)] out string pRetVal);
    int SetIconPath([MarshalAs(UnmanagedType.LPWStr)] string Value, ref Guid EventContext);
    int GetGroupingParam(out Guid pRetVal);
    int SetGroupingParam(ref Guid Override, ref Guid EventContext);
    int RegisterAudioSessionNotification(IntPtr NewNotifications);
    int UnregisterAudioSessionNotification(IntPtr NewNotifications);
}

[Guid("bfb7ff88-7239-4fc9-8fa2-07c950be9c6d"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioSessionControl2 {
    int GetState(out int pRetVal);
    int GetDisplayName([MarshalAs(UnmanagedType.LPWStr)] out string pRetVal);
    int SetDisplayName([MarshalAs(UnmanagedType.LPWStr)] string Value, ref Guid EventContext);
    int GetIconPath([MarshalAs(UnmanagedType.LPWStr)] out string pRetVal);
    int SetIconPath([MarshalAs(UnmanagedType.LPWStr)] string Value, ref Guid EventContext);
    int GetGroupingParam(out Guid pRetVal);
    int SetGroupingParam(ref Guid Override, ref Guid EventContext);
    int RegisterAudioSessionNotification(IntPtr NewNotifications);
    int UnregisterAudioSessionNotification(IntPtr NewNotifications);
    int GetSessionIdentifier([MarshalAs(UnmanagedType.LPWStr)] out string pRetVal);
    int GetSessionInstanceIdentifier([MarshalAs(UnmanagedType.LPWStr)] out string pRetVal);
    int GetProcessId(out uint pRetVal);
    [PreserveSig] int IsSystemSoundsSession();
    [PreserveSig] int SetDuckingPreference(bool optOut);
}

public class NativeMediaBridge {
    [DllImport("user32.dll")]
    private static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
    [DllImport("user32.dll")]
    private static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);
    [DllImport("user32.dll")]
    private static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern int GetWindowText(IntPtr hWnd, StringBuilder strText, int maxCount);
    [DllImport("user32.dll")]
    private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    [DllImport("user32.dll")]
    private static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")]
    private static extern bool PrintWindow(IntPtr hWnd, IntPtr hdcBlt, uint nFlags);
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left, Top, Right, Bottom;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct MONITORINFO {
        public int cbSize;
        public RECT rcMonitor;
        public RECT rcWork;
        public uint dwFlags;
    }

    [DllImport("user32.dll")]
    private static extern IntPtr MonitorFromWindow(IntPtr hwnd, uint dwFlags);

    [DllImport("user32.dll")]
    private static extern bool GetMonitorInfo(IntPtr hMonitor, ref MONITORINFO lpmi);

    [DllImport("user32.dll")]
    private static extern IntPtr GetShellWindow();

    [DllImport("user32.dll")]
    private static extern IntPtr GetDesktopWindow();

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    private static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

    [DllImport("user32.dll")]
    private static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    private static extern int GetSystemMetrics(int nIndex);

    [StructLayout(LayoutKind.Sequential)]
    public struct POINT { public int X, Y; }

    [StructLayout(LayoutKind.Sequential)]
    public struct WINDOWPLACEMENT {
        public int length;
        public int flags;
        public int showCmd;
        public POINT ptMinPosition;
        public POINT ptMaxPosition;
        public RECT rcNormalPosition;
    }

    [DllImport("user32.dll")]
    private static extern bool GetWindowPlacement(IntPtr hWnd, ref WINDOWPLACEMENT lpwndpl);

    [DllImport("user32.dll")]
    private static extern IntPtr OpenWindowStation(string name, bool inherit, uint access);

    [DllImport("user32.dll")]
    private static extern bool SetProcessWindowStation(IntPtr hWinSta);

    [DllImport("user32.dll")]
    private static extern IntPtr OpenDesktop(string name, uint flags, bool inherit, uint access);

    [DllImport("user32.dll")]
    private static extern bool SetThreadDesktop(IntPtr hDesktop);

    [DllImport("user32.dll")]
    private static extern IntPtr GetAncestor(IntPtr hwnd, uint gaFlags);

    [DllImport("user32.dll")]
    private static extern bool IsIconic(IntPtr hWnd);

    [DllImport("dwmapi.dll")]
    private static extern int DwmGetWindowAttribute(IntPtr hwnd, int dwAttribute, out int pvAttribute, int cbAttribute);

    [DllImport("shell32.dll")]
    public static extern int SHQueryUserNotificationState(out int pquns);

    [DllImport("user32.dll", EntryPoint = "GetWindowLong")]
    private static extern int GetWindowLong32(IntPtr hWnd, int nIndex);
    [DllImport("user32.dll", EntryPoint = "GetWindowLongPtr")]
    private static extern IntPtr GetWindowLongPtr64(IntPtr hWnd, int nIndex);
    [DllImport("user32.dll", EntryPoint = "SetWindowLong")]
    private static extern int SetWindowLong32(IntPtr hWnd, int nIndex, int dwNewLong);
    [DllImport("user32.dll", EntryPoint = "SetWindowLongPtr")]
    private static extern IntPtr SetWindowLongPtr64(IntPtr hWnd, int nIndex, IntPtr dwNewLong);

    public static long GetWindowLong(IntPtr hWnd, int nIndex) {
        if (IntPtr.Size == 8) return GetWindowLongPtr64(hWnd, nIndex).ToInt64();
        return (long)GetWindowLong32(hWnd, nIndex);
    }

    public static IntPtr GetForegroundWindowInteractive() {
        IntPtr fg = GetForegroundWindow();
        if (fg != IntPtr.Zero) return fg;
        try {
            IntPtr wsta = OpenWindowStation("WinSta0", false, 0x000F037F);
            if (wsta != IntPtr.Zero) SetProcessWindowStation(wsta);
            IntPtr dsk = OpenDesktop("Default", 0, false, 0x01FF);
            System.Threading.Thread t = new System.Threading.Thread(() => {
                if (dsk != IntPtr.Zero) SetThreadDesktop(dsk);
                fg = GetForegroundWindow();
            });
            t.Start();
            t.Join(150);
        } catch {}
        return fg;
    }

    public static void RemoveFromAltTab(IntPtr hWnd) {
        if (hWnd == IntPtr.Zero) return;
        try {
            long exStyle = (IntPtr.Size == 8) ? GetWindowLongPtr64(hWnd, -20).ToInt64() : (long)GetWindowLong32(hWnd, -20);
            exStyle |= 0x00000080L; // WS_EX_TOOLWINDOW
            exStyle &= ~0x00040000L; // strip WS_EX_APPWINDOW
            if (IntPtr.Size == 8) {
                SetWindowLongPtr64(hWnd, -20, new IntPtr(exStyle));
            } else {
                SetWindowLong32(hWnd, -20, (int)exStyle);
            }
        } catch {}
    }

    private static bool IsIgnoredOrOverlayWindow(IntPtr hWnd, out string cls, out string title, out string pName, out bool accessDenied) {
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

        long exStyle = (IntPtr.Size == 8) ? GetWindowLongPtr64(hWnd, -20).ToInt64() : (long)GetWindowLong32(hWnd, -20);
        if ((exStyle & 0x00000020L) != 0 && (exStyle & 0x08000000L) != 0) {
            return true;
        }

        uint pid = 0;
        GetWindowThreadProcessId(hWnd, out pid);
        if (pid == 0 || pid == (uint)Process.GetCurrentProcess().Id) return true;

        try {
            using (var proc = Process.GetProcessById((int)pid)) {
                pName = proc.ProcessName.ToLowerInvariant();
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

    private static bool EvaluateTargetWindow(IntPtr hWnd, bool allowQunsExclusive) {
        if (hWnd == IntPtr.Zero) return false;

        IntPtr root = GetAncestor(hWnd, 2 /* GA_ROOT */);
        if (root != IntPtr.Zero) hWnd = root;

        IntPtr shell = GetShellWindow();
        IntPtr desktop = GetDesktopWindow();
        if (hWnd == shell || hWnd == desktop) return false;

        string clsName, title, name;
        bool accessDenied;
        if (IsIgnoredOrOverlayWindow(hWnd, out clsName, out title, out name, out accessDenied)) {
            return false;
        }

        if (clsName == "WorkerW" || clsName == "Progman" || title == "Program Manager") {
            return false;
        }

        if (!accessDenied) {
            if (name == "explorer" || name == "antigravity" || name == "code" || name == "devenv") {
                return false;
            }
        }

        int quns = 0;
        if (allowQunsExclusive && SHQueryUserNotificationState(out quns) == 0) {
            if (quns == 3 || quns == 4) {
                return true;
            }
        }

        IntPtr hMon = MonitorFromWindow(hWnd, 2 /* MONITOR_DEFAULTTONEAREST */);
        if (hMon == IntPtr.Zero) return false;

        MONITORINFO mi = new MONITORINFO();
        mi.cbSize = Marshal.SizeOf(typeof(MONITORINFO));
        if (!GetMonitorInfo(hMon, ref mi)) return false;

        RECT r;
        if (!GetWindowRect(hWnd, out r)) return false;

        bool coversMonitor = (r.Left <= mi.rcMonitor.Left + 4 &&
                              r.Top <= mi.rcMonitor.Top + 4 &&
                              r.Right >= mi.rcMonitor.Right - 4 &&
                              r.Bottom >= mi.rcMonitor.Bottom - 4);

        if (!coversMonitor) return false;
        if (accessDenied) return true;

        bool isExactBorderlessRect = (r.Left >= mi.rcMonitor.Left - 2 &&
                                      r.Top >= mi.rcMonitor.Top - 2 &&
                                      r.Right <= mi.rcMonitor.Right + 2 &&
                                      r.Bottom <= mi.rcMonitor.Bottom + 2);
        if (isExactBorderlessRect) return true;

        long style = GetWindowLong(hWnd, -16 /* GWL_STYLE */);
        bool isPopup = (style & 0x80000000L) != 0;
        bool hasCaption = (style & 0x00C00000L) == 0x00C00000L;
        bool hasThickFrame = (style & 0x00040000L) != 0;

        if (isPopup || !hasCaption || !hasThickFrame) {
            return true;
        }

        WINDOWPLACEMENT wp = new WINDOWPLACEMENT();
        wp.length = Marshal.SizeOf(typeof(WINDOWPLACEMENT));
        GetWindowPlacement(hWnd, ref wp);

        if (wp.showCmd != 3 /* SW_SHOWMAXIMIZED */) {
            return true;
        }

        bool hasDedicatedTaskbarSpace = (mi.rcWork.Bottom < mi.rcMonitor.Bottom - 2 ||
                                         mi.rcWork.Top > mi.rcMonitor.Top + 2 ||
                                         mi.rcWork.Left > mi.rcMonitor.Left + 2 ||
                                         mi.rcWork.Right < mi.rcMonitor.Right - 2);
        if (hasDedicatedTaskbarSpace) {
            return true;
        }

        bool isStandardDesktopMaximizedApp = (
            clsName == "Chrome_WidgetWin_1" ||
            clsName == "MozillaWindowClass" ||
            clsName == "CabinetWClass" ||
            clsName == "ApplicationFrameWindow" ||
            clsName == "WinUIDesktopWin32WindowClass" ||
            name == "brave" || name == "chrome" || name == "msedge" || name == "firefox" ||
            name == "opera" || name == "vivaldi" || name == "discord" || name == "spotify" ||
            name == "whatsapp" || name == "telegram" || name == "obsidian" || name == "notion"
        );

        if (!isStandardDesktopMaximizedApp) {
            return true;
        }

        return false;
    }

    public static bool IsForegroundFullscreenGame() {
        try {
            IntPtr fg = GetForegroundWindowInteractive();
            if (fg != IntPtr.Zero) {
                IntPtr root = GetAncestor(fg, 2 /* GA_ROOT */);
                if (root != IntPtr.Zero) fg = root;

                string cls, title, pName;
                bool accessDenied;
                if (!IsIgnoredOrOverlayWindow(fg, out cls, out title, out pName, out accessDenied)) {
                    return EvaluateTargetWindow(fg, true);
                }
            }

            IntPtr topCandidate = IntPtr.Zero;
            EnumWindows((h, l) => {
                string cls, title, pName;
                bool accessDenied;
                if (IsIgnoredOrOverlayWindow(h, out cls, out title, out pName, out accessDenied)) {
                    return true;
                }
                RECT r;
                if (GetWindowRect(h, out r)) {
                    if ((r.Right - r.Left) >= 200 && (r.Bottom - r.Top) >= 200) {
                        topCandidate = h;
                        return false;
                    }
                }
                return true;
            }, IntPtr.Zero);

            if (topCandidate != IntPtr.Zero) {
                return EvaluateTargetWindow(topCandidate, false);
            }

            return false;
        } catch {
            return false;
        }
    }

    private delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    public static void SendMediaKey(string action, IntPtr targetHwnd) {
        if (action == "seekForward" || action == "seekBackward") {
            if (targetHwnd != IntPtr.Zero) {
                int vkArrow = (action == "seekForward") ? 0x27 : 0x25; // VK_RIGHT / VK_LEFT
                PostMessage(targetHwnd, 0x0100, (IntPtr)vkArrow, IntPtr.Zero);
                PostMessage(targetHwnd, 0x0101, (IntPtr)vkArrow, IntPtr.Zero);
            }
            return;
        }
        byte vk = 0xB3; // VK_MEDIA_PLAY_PAUSE
        if (action == "next") vk = 0xB0; // VK_MEDIA_NEXT_TRACK
        else if (action == "prev") vk = 0xB1; // VK_MEDIA_PREV_TRACK
        keybd_event(vk, 0, 0, UIntPtr.Zero);
        keybd_event(vk, 0, 2, UIntPtr.Zero);
    }

    public static string CaptureWindowThumbnail(IntPtr hWnd) {
        try {
            if (hWnd == IntPtr.Zero) return "";
            RECT rc;
            if (!GetWindowRect(hWnd, out rc)) return "";
            int w = rc.Right - rc.Left;
            int h = rc.Bottom - rc.Top;
            if (w <= 80 || h <= 80) return "";
            using (var bmp = new Bitmap(w, h, PixelFormat.Format32bppArgb)) {
                using (var g = Graphics.FromImage(bmp)) {
                    IntPtr hdc = g.GetHdc();
                    bool ok = PrintWindow(hWnd, hdc, 2);
                    if (!ok) {
                        PrintWindow(hWnd, hdc, 0);
                    }
                    g.ReleaseHdc(hdc);
                }
                using (var thumb = new Bitmap(96, 96)) {
                    using (var tg = Graphics.FromImage(thumb)) {
                        tg.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
                        int side = Math.Min(w, h);
                        int sx = (w - side) / 2;
                        int sy = (h - side) / 2;
                        tg.DrawImage(bmp, new Rectangle(0, 0, 96, 96), new Rectangle(sx, sy, side, side), GraphicsUnit.Pixel);
                    }
                    using (var ms = new MemoryStream()) {
                        thumb.Save(ms, ImageFormat.Jpeg);
                        return "data:image/jpeg;base64," + Convert.ToBase64String(ms.ToArray());
                    }
                }
            }
        } catch {
            return "";
        }
    }

    public static string ResizeImageBytes(byte[] rawBytes, int maxW, int maxH) {
        try {
            if (rawBytes == null || rawBytes.Length == 0) return "";
            using (var inMs = new MemoryStream(rawBytes)) {
                using (var img = Image.FromStream(inMs)) {
                    int w = img.Width;
                    int h = img.Height;
                    int targetW = maxW;
                    int targetH = maxH;
                    if (w > 0 && h > 0) {
                        float ratio = Math.Min((float)maxW / w, (float)maxH / h);
                        targetW = Math.Max(1, (int)(w * ratio));
                        targetH = Math.Max(1, (int)(h * ratio));
                    }
                    using (var thumb = new Bitmap(targetW, targetH)) {
                        using (var g = Graphics.FromImage(thumb)) {
                            g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
                            g.DrawImage(img, 0, 0, targetW, targetH);
                        }
                        using (var outMs = new MemoryStream()) {
                            thumb.Save(outMs, ImageFormat.Jpeg);
                            return "data:image/jpeg;base64," + Convert.ToBase64String(outMs.ToArray());
                        }
                    }
                }
            }
        } catch {
            return "";
        }
    }

    public static string GetProcessIconBase64(string procName) {
        try {
            if (string.IsNullOrEmpty(procName)) return "";
            var procs = Process.GetProcessesByName(procName);
            if (procs == null || procs.Length == 0) return "";
            string exePath = "";
            try {
                exePath = procs[0].MainModule.FileName;
            } catch {
                return "";
            }
            if (string.IsNullOrEmpty(exePath) || !File.Exists(exePath)) return "";
            using (var ico = Icon.ExtractAssociatedIcon(exePath)) {
                if (ico == null) return "";
                using (var bmp = ico.ToBitmap()) {
                    using (var ms = new MemoryStream()) {
                        bmp.Save(ms, ImageFormat.Png);
                        return "data:image/png;base64," + Convert.ToBase64String(ms.ToArray());
                    }
                }
            }
        } catch {
            return "";
        }
    }

    public static string FindBestWindowForProcess(string procName, out IntPtr foundHwnd) {
        foundHwnd = IntPtr.Zero;
        if (string.IsNullOrEmpty(procName)) return "";
        try {
            var pids = new HashSet<uint>();
            foreach (var p in Process.GetProcessesByName(procName)) {
                pids.Add((uint)p.Id);
                if (!string.IsNullOrWhiteSpace(p.MainWindowTitle) && p.MainWindowHandle != IntPtr.Zero) {
                    foundHwnd = p.MainWindowHandle;
                    return CleanWindowTitle(p.MainWindowTitle);
                }
            }
            string bestTitle = "";
            IntPtr tempHwnd = IntPtr.Zero;
            EnumWindows((hWnd, lParam) => {
                if (!IsWindowVisible(hWnd)) return true;
                uint pid;
                GetWindowThreadProcessId(hWnd, out pid);
                if (pids.Contains(pid)) {
                    var sb = new StringBuilder(512);
                    if (GetWindowText(hWnd, sb, 512) > 0) {
                        string t = sb.ToString();
                        if (t != "MSCTFIME UI" && t != "Default IME" && !t.Contains("Cross-Diary")) {
                            bestTitle = CleanWindowTitle(t);
                            tempHwnd = hWnd;
                            return false;
                        }
                    }
                }
                return true;
            }, IntPtr.Zero);
            foundHwnd = tempHwnd;
            return bestTitle;
        } catch {
            return "";
        }
    }

    private static string CleanWindowTitle(string raw) {
        if (string.IsNullOrWhiteSpace(raw)) return "";
        string[] suffixes = new string[] {
            " - YouTube - Brave", " - YouTube - Google Chrome", " - YouTube - Microsoft Edge", " - YouTube — Mozilla Firefox",
            " - Brave", " - Google Chrome", " - Microsoft Edge", " — Mozilla Firefox", " - Opera", " - VLC media player"
        };
        string res = raw.Trim();
        foreach (var s in suffixes) {
            if (res.EndsWith(s, StringComparison.OrdinalIgnoreCase)) {
                res = res.Substring(0, res.Length - s.Length).Trim();
                break;
            }
        }
        return res;
    }

    public static string GetCoreAudioActiveSession(out float maxPeak, out string activeProcName, out string activeTitle, out bool isPlaying, out IntPtr activeHwnd) {
        maxPeak = 0f;
        activeProcName = "";
        activeTitle = "";
        isPlaying = false;
        activeHwnd = IntPtr.Zero;
        try {
            var enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumeratorComObject());
            IMMDevice device;
            enumerator.GetDefaultAudioEndpoint(0, 1, out device);

            Guid iidMeter = new Guid("C02216F6-8C67-4B5B-9D00-D008E73E0064");
            object objSysMeter;
            device.Activate(ref iidMeter, 23, IntPtr.Zero, out objSysMeter);
            var sysMeter = (IAudioMeterInformation)objSysMeter;
            sysMeter.GetPeakValue(out maxPeak);

            Guid iidMgr = new Guid("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F");
            object objMgr;
            device.Activate(ref iidMgr, 23, IntPtr.Zero, out objMgr);
            var mgr = (IAudioSessionManager2)objMgr;
            IAudioSessionEnumerator sessionEnum;
            mgr.GetSessionEnumerator(out sessionEnum);
            int count = 0;
            sessionEnum.GetCount(out count);

            float bestSessionPeak = -1f;
            string fallbackProc = "";
            string fallbackTitle = "";
            IntPtr fallbackHwnd = IntPtr.Zero;

            for (int i = 0; i < count; i++) {
                IAudioSessionControl ctrl;
                sessionEnum.GetSession(i, out ctrl);
                var ctrl2 = (IAudioSessionControl2)ctrl;
                var meter = (IAudioMeterInformation)ctrl;
                if (ctrl2.IsSystemSoundsSession() == 0) continue;

                int state;
                ctrl2.GetState(out state);
                uint pid;
                ctrl2.GetProcessId(out pid);
                float peak;
                meter.GetPeakValue(out peak);

                if (pid == 0) continue;
                string procName = "";
                try {
                    var p = Process.GetProcessById((int)pid);
                    procName = p.ProcessName;
                } catch { continue; }

                if (string.IsNullOrEmpty(procName) || procName.Equals("electron", StringComparison.OrdinalIgnoreCase) || procName.Equals("powershell", StringComparison.OrdinalIgnoreCase)) {
                    continue;
                }

                if (peak > 0.0008f && peak > bestSessionPeak) {
                    bestSessionPeak = peak;
                    activeProcName = procName;
                    activeTitle = FindBestWindowForProcess(procName, out activeHwnd);
                    isPlaying = true;
                } else if (state == 1 && string.IsNullOrEmpty(fallbackProc)) {
                    fallbackProc = procName;
                    fallbackTitle = FindBestWindowForProcess(procName, out fallbackHwnd);
                }
            }

            if (string.IsNullOrEmpty(activeProcName) && !string.IsNullOrEmpty(fallbackProc)) {
                activeProcName = fallbackProc;
                activeTitle = fallbackTitle;
                activeHwnd = fallbackHwnd;
                isPlaying = maxPeak > 0.001f;
            }
        } catch {}
        return activeProcName;
    }
}
"@ -ErrorAction SilentlyContinue

$asTaskGeneric = $null
try {
  $asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
  })[0]
  [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime] | Out-Null
  [Windows.Storage.Streams.IRandomAccessStreamWithContentType,Windows.Storage.Streams,ContentType=WindowsRuntime] | Out-Null
} catch {}

Function Await($WinRtTask, $ResultType) {
  if (-not $asTaskGeneric -or -not $WinRtTask) { return $null }
  $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
  $netTask = $asTask.Invoke($null, @($WinRtTask))
  $netTask.Wait(1500) | Out-Null
  return $netTask.Result
}

$script:lastThumbTitle = ""
$script:cachedThumbB64 = ""

Function Get-MediaSnapshot([string]$CmdAction) {
  $peak = [float]0
  $coreProc = ""
  $coreTitle = ""
  $corePlaying = $false
  $coreHwnd = [IntPtr]::Zero
  [NativeMediaBridge]::GetCoreAudioActiveSession([ref]$peak, [ref]$coreProc, [ref]$coreTitle, [ref]$corePlaying, [ref]$coreHwnd) | Out-Null

  if ($CmdAction -eq "playPause" -or $CmdAction -eq "next" -or $CmdAction -eq "prev" -or $CmdAction -eq "seekForward" -or $CmdAction -eq "seekBackward") {
    $handledByGsmtc = $false
    try {
      if ($asTaskGeneric) {
        $mgr = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
        $session = $null
        if ($mgr) {
          $allSessions = $mgr.GetSessions()
          if ($allSessions) {
            foreach ($s in $allSessions) {
              try {
                $pb = $s.GetPlaybackInfo()
                if ($pb -and "$($pb.PlaybackStatus)" -eq "Playing") {
                  $session = $s
                  break
                }
              } catch {}
            }
          }
          if (-not $session) {
            $session = $mgr.GetCurrentSession()
          }
          if (-not $session -and $allSessions -and $allSessions.Count -gt 0) {
            $session = $allSessions[0]
          }
        }
        if ($session) {
          $handledByGsmtc = $true
          if ($CmdAction -eq "playPause") {
            $curStatus = ""
            try { $curStatus = "$($session.GetPlaybackInfo().PlaybackStatus)" } catch {}
            if ($curStatus -eq "Playing") {
              try { Await ($session.TryPauseAsync()) ([bool]) | Out-Null } catch {}
            } else {
              try { Await ($session.TryPlayAsync()) ([bool]) | Out-Null } catch {}
            }
          }
          elseif ($CmdAction -eq "next") {
            try { Await ($session.TrySkipNextAsync()) ([bool]) | Out-Null } catch {}
          }
          elseif ($CmdAction -eq "prev") {
            try { Await ($session.TrySkipPreviousAsync()) ([bool]) | Out-Null } catch {}
          }
          elseif ($CmdAction -eq "seekForward" -or $CmdAction -eq "seekBackward") {
            try {
              $tl = $session.GetTimelineProperties()
              if ($tl -and $tl.Position.Ticks -gt 0) {
                $deltaTicks = if ($CmdAction -eq "seekForward") { 100000000L } else { -100000000L }
                $targetTicks = [Math]::Max(0L, $tl.Position.Ticks + $deltaTicks)
                Await ($session.TryChangePlaybackPositionAsync($targetTicks)) ([bool]) | Out-Null
              }
            } catch {}
          }
        }
      }
    } catch {}
    if (-not $handledByGsmtc) {
      [NativeMediaBridge]::SendMediaKey($CmdAction, $coreHwnd)
    }
    Start-Sleep -Milliseconds 120
  }

  # 1. Try WinRT GSMTC first for rich Title/Artist + Thumbnail metadata
  try {
    if ($asTaskGeneric) {
      $mgr = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
      $session = $null
      if ($mgr) {
        $allSessions = $mgr.GetSessions()
        if ($allSessions) {
          foreach ($s in $allSessions) {
            try {
              $pb = $s.GetPlaybackInfo()
              if ($pb -and "$($pb.PlaybackStatus)" -eq "Playing") {
                $session = $s
                break
              }
            } catch {}
          }
        }
        if (-not $session) {
          $session = $mgr.GetCurrentSession()
        }
        if (-not $session -and $allSessions -and $allSessions.Count -gt 0) {
          $session = $allSessions[0]
        }
      }

      if ($session) {
        $info = Await ($session.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
        $status = "$($session.GetPlaybackInfo().PlaybackStatus)"
        $source = "$($session.SourceAppUserModelId)"
        if ($info -and ($info.Title -or $info.Artist)) {
          $curTitle = if ($info.Title) { $info.Title } else { "Multimedia activa" }
          if ($curTitle -ne $script:lastThumbTitle -or $script:cachedThumbB64 -eq "") {
            $script:lastThumbTitle = $curTitle
            if ($info.Thumbnail) {
              try {
                $stream = Await ($info.Thumbnail.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])
                if ($stream) {
                  $asStreamMethod = ([System.IO.WindowsRuntimeStreamExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsStreamForRead' -and $_.GetParameters().Count -eq 1 })[0]
                  if ($asStreamMethod) {
                    $netStream = $asStreamMethod.Invoke($null, @($stream))
                    if ($netStream) {
                      $ms = New-Object System.IO.MemoryStream
                      $netStream.CopyTo($ms)
                      $bytes = $ms.ToArray()
                      if ($bytes.Length -gt 0) {
                        $resized = [NativeMediaBridge]::ResizeImageBytes($bytes, 96, 96)
                        if ($resized -ne "") {
                          $script:cachedThumbB64 = $resized
                        } else {
                          $script:cachedThumbB64 = "data:image/jpeg;base64," + [Convert]::ToBase64String($bytes)
                        }
                      }
                      $ms.Dispose()
                      $netStream.Dispose()
                    }
                  }
                }
              } catch {}
            }
            if ($script:cachedThumbB64 -eq "") {
              if ($coreHwnd -ne [IntPtr]::Zero) {
                $script:cachedThumbB64 = [NativeMediaBridge]::CaptureWindowThumbnail($coreHwnd)
              }
              if ($script:cachedThumbB64 -eq "") {
                $cleanSrc = ($source -replace '\.exe$', '').Trim()
                if ($cleanSrc -ne "") {
                  $script:cachedThumbB64 = [NativeMediaBridge]::GetProcessIconBase64($cleanSrc)
                }
              }
            }
          }

          $effectivePlaying = ($status -eq "Playing")
          if (-not $effectivePlaying -and $status -ne "Paused" -and $status -ne "Stopped") {
            $effectivePlaying = $corePlaying -and ($peak -gt 0.003)
          }
          $res = @{
            found = $true
            title = $curTitle
            artist = if ($info.Artist) { $info.Artist } else { $source.ToUpper() }
            status = if ($effectivePlaying) { "Playing" } else { "Paused" }
            source = $source
            peak = [Math]::Round($peak, 3)
            thumbnail = $script:cachedThumbB64
            isGameActive = [NativeMediaBridge]::IsForegroundFullscreenGame()
          }
          return ($res | ConvertTo-Json -Compress)
        }
      }
    }
  } catch {}

  # 2. Fallback to CoreAudio Active Session + Window Title + Window Thumbnail
  if ($coreProc -ne "" -or $peak -gt 0.002) {
    $friendlyApp = if ($coreProc -ne "") { $coreProc.ToUpper() } else { "AUDIO" }
    if ($friendlyApp -eq "BRAVE") { $friendlyApp = "BRAVE BROWSER" }
    elseif ($friendlyApp -eq "CHROME") { $friendlyApp = "GOOGLE CHROME" }
    elseif ($friendlyApp -eq "MSEDGE") { $friendlyApp = "MICROSOFT EDGE" }
    elseif ($friendlyApp -eq "FIREFOX") { $friendlyApp = "FIREFOX" }
    elseif ($friendlyApp -eq "SPOTIFY") { $friendlyApp = "SPOTIFY" }
    elseif ($friendlyApp -eq "VLC") { $friendlyApp = "VLC PLAYER" }

    $displayTitle = if ($coreTitle -ne "") { $coreTitle } else { "Audio en vivo ($friendlyApp)" }
    if ($displayTitle -ne $script:lastThumbTitle -or $script:cachedThumbB64 -eq "") {
      $script:lastThumbTitle = $displayTitle
      if ($coreHwnd -ne [IntPtr]::Zero) {
        $script:cachedThumbB64 = [NativeMediaBridge]::CaptureWindowThumbnail($coreHwnd)
      }
      if ($script:cachedThumbB64 -eq "" -and $coreProc -ne "") {
        $script:cachedThumbB64 = [NativeMediaBridge]::GetProcessIconBase64($coreProc)
      }
    }

    $effectivePlaying = $corePlaying -and ($peak -gt 0.003)
    $res = @{
      found = $true
      title = $displayTitle
      artist = $friendlyApp
      status = if ($effectivePlaying) { "Playing" } else { "Paused" }
      source = if ($coreProc -ne "") { $coreProc } else { "System Audio" }
      peak = [Math]::Round($peak, 3)
      thumbnail = $script:cachedThumbB64
      isGameActive = [NativeMediaBridge]::IsForegroundFullscreenGame()
    }
    return ($res | ConvertTo-Json -Compress)
  }

  $isGame = [NativeMediaBridge]::IsForegroundFullscreenGame()
  return ('{"found":false,"peak":0,"isGameActive":' + ($isGame.ToString().ToLower()) + '}')
}

if ($Action -eq "removeFromAltTab") {
  try {
    $hwndVal = [IntPtr][long]$args[0]
    [NativeMediaBridge]::RemoveFromAltTab($hwndVal)
    Write-Output '{"status":"ok"}'
  } catch {
    Write-Output '{"status":"error"}'
  }
  exit 0
}

if ($Action -eq "daemon") {
  while ($true) {
    try {
      $raw = Get-MediaSnapshot "status"
      $cleanJson = $raw -replace "[\r\n]+", " "
      Write-Output "MEDIA_SNAPSHOT:$cleanJson"
    } catch {
      Write-Output 'MEDIA_SNAPSHOT:{"found":false,"peak":0,"isGameActive":false}'
    }
    Start-Sleep -Milliseconds 600
  }
} else {
  $json = Get-MediaSnapshot $Action
  Write-Output $json
}
