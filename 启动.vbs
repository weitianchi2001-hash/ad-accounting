Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
serverDir = scriptDir & "\server"

' Start the server hidden
WshShell.Run "cmd /c ""cd /d """ & serverDir & """ && npx tsx src/index.ts""", 0, False

' Wait for server
WScript.Sleep 4000

' Try Chrome app mode first, then Edge, then default browser
chrome = """C:\Program Files\Google\Chrome\Application\chrome.exe"" --app=http://localhost:3001"
edge = "msedge --app=http://localhost:3001"

If fso.FileExists("C:\Program Files\Google\Chrome\Application\chrome.exe") Then
  WshShell.Run chrome, 1, False
Else
  On Error Resume Next
  WshShell.Run edge, 1, False
  If Err.Number <> 0 Then
    WshShell.Run "start http://localhost:3001"
  End If
End If
