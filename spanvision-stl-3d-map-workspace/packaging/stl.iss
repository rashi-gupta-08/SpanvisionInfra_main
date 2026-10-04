#define AppName "STL-3D map workspace"
#define AppVersion "1.1.1"
#ifndef SourceDir
 #define SourceDir "..\dist\STL-3D map workspace"
#endif
[Setup]
AppId=com.spanvisioninfra.stl3dmapworkspace
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher=Spanvision infra
AppVerName={#AppName} {#AppVersion}
DefaultDirName={localappdata}\Programs\Spanvision infra\{#AppName}
DefaultGroupName=Spanvision infra
UninstallDisplayIcon={app}\{#AppName}.exe
UninstallDisplayName={#AppName}
OutputDir=Output
OutputBaseFilename=Spanvision-STL-3D-map-workspace-{#AppVersion}-Setup
SetupIconFile=app.ico
LicenseFile=..\LICENSE
Compression=lzma2/fast
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=lowest
DisableProgramGroupPage=yes
[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"
[Files]
Source: "..\README.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\{#AppName}.exe"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppName}.exe"; Tasks: desktopicon
[Run]
Filename: "{app}\{#AppName}.exe"; Description: "{cm:LaunchProgram,{#AppName}}"; Flags: nowait postinstall skipifsilent
[UninstallDelete]
Type: filesandordirs; Name: "{localappdata}\Spanvision infra\{#AppName}\cache"
Type: files; Name: "{localappdata}\Spanvision infra\{#AppName}\log.txt"
