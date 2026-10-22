# recipes/bgf-launch.ps1: start a program outside the caller's job object and with the user's default
# environment (Windows PowerShell 5.1). Written 2026-10-23, stage BG-FLAGS (decisions.md 2026-10-23
# #64): used to relaunch the user's Chrome. The driver's shell runs inside a job object (limit flags
# 0x800, JOB_OBJECT_LIMIT_BREAKAWAY_OK, measured) and its environment carries the session's variables
# (CLAUDE_CODE_*, VSCODE_*, CHROME_CRASHPAD_PIPE_NAME from the editor), which a relaunched Chrome should
# not inherit. So it calls CreateProcess with CREATE_BREAKAWAY_FROM_JOB and an environment block from
# CreateEnvironmentBlock(the user's token, no inheritance) - what a fresh logon gives, as a shortcut
# started from the desktop would - with no inherited handles (no console, no pipes).
# If the job refuses breakaway, it starts nothing and exits 2 (it never falls back silently).
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\bgf-launch.ps1 -Exe <path> -ArgLine '<args>'
#
# Prints the new pid and whether it is in a job; never prints the environment.
# Exit 0 started; 2 refused (nothing started); 1 script error.
param([Parameter(Mandatory = $true)][string]$Exe, [string]$ArgLine = '')
$ErrorActionPreference = 'Stop'
if (-not ('BgfLaunch' -as [type])) {
  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class BgfLaunch {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct STARTUPINFO { public int cb; public string r; public string d; public string t; public int x, y, w, h, cx, cy, fa, fl; public short sw, r2; public IntPtr r3, i, o, e; }
  [StructLayout(LayoutKind.Sequential)] public struct PI { public IntPtr hp, ht; public int pid, tid; }
  [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
  public static extern bool CreateProcess(string app, string cmd, IntPtr pa, IntPtr ta, bool inherit, uint flags, IntPtr env, string dir, ref STARTUPINFO si, out PI pi);
  [DllImport("kernel32.dll")] public static extern bool CloseHandle(IntPtr h);
  [DllImport("kernel32.dll")] public static extern IntPtr GetCurrentProcess();
  [DllImport("kernel32.dll")] public static extern bool IsProcessInJob(IntPtr p, IntPtr job, out bool r);
  [DllImport("advapi32.dll", SetLastError = true)] public static extern bool OpenProcessToken(IntPtr p, uint access, out IntPtr tok);
  [DllImport("userenv.dll", SetLastError = true)] public static extern bool CreateEnvironmentBlock(out IntPtr env, IntPtr tok, bool inherit);
  [DllImport("userenv.dll")] public static extern bool DestroyEnvironmentBlock(IntPtr env);
  public static string Start(string exe, string args, string dir, out int pid) {
    pid = 0;
    IntPtr tok;
    if (!OpenProcessToken(GetCurrentProcess(), 0x0008 | 0x0002, out tok)) return "OpenProcessToken failed, error " + Marshal.GetLastWin32Error();
    IntPtr env;
    bool okEnv = CreateEnvironmentBlock(out env, tok, false);
    int envErr = Marshal.GetLastWin32Error();
    CloseHandle(tok);
    if (!okEnv) return "CreateEnvironmentBlock failed, error " + envErr;
    var si = new STARTUPINFO(); si.cb = Marshal.SizeOf(typeof(STARTUPINFO));
    PI pi;
    // CREATE_BREAKAWAY_FROM_JOB | CREATE_UNICODE_ENVIRONMENT | CREATE_NEW_PROCESS_GROUP; no inherited handles.
    bool ok = CreateProcess(exe, "\"" + exe + "\" " + args, IntPtr.Zero, IntPtr.Zero, false, 0x01000000 | 0x00000400 | 0x00000200, env, dir, ref si, out pi);
    int err = Marshal.GetLastWin32Error();
    DestroyEnvironmentBlock(env);
    if (!ok) return "CreateProcess failed, error " + err;
    bool inJob; IsProcessInJob(pi.hp, IntPtr.Zero, out inJob);
    pid = pi.pid; CloseHandle(pi.ht); CloseHandle(pi.hp);
    return inJob ? "in job: True" : "in job: False";
  }
}
'@
}
$procId = 0
$r = [BgfLaunch]::Start($Exe, $ArgLine, (Split-Path -Parent $Exe), [ref]$procId)
if (-not $procId) { Write-Output "bgf-launch: $r - nothing started"; exit 2 }
Write-Output ("bgf-launch: started pid $procId (parent $PID, this script, which now exits); $r; user default environment; args: $ArgLine")
exit 0
