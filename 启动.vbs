Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
nodeExe = scriptDir & "\runtime\node.exe"
serverDir = scriptDir & "\server"
tsxPath = serverDir & "\node_modules\tsx\dist\cli.mjs"
serverFile = serverDir & "\src\index.ts"

' Start server using bundled Node.js
WshShell.Run """" & nodeExe & """ """ & tsxPath & """ """ & serverFile & """", 0, False

' Wait for server to start
WScript.Sleep 5000

' Open in Chrome app mode
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
