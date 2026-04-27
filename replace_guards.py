import os, re
files = ['SessionFlow.Desktop/Api/Endpoints/AttendanceEndpoints.cs', 'SessionFlow.Desktop/Api/Endpoints/ReportingEndpoints.cs', 'SessionFlow.Desktop/Api/Endpoints/SessionEndpoints.cs', 'SessionFlow.Desktop/Api/Endpoints/StudentEndpoints.cs', 'SessionFlow.Desktop/Api/Endpoints/TimetableEndpoints.cs']
for f in files:
    text = open(f, 'r', encoding='utf-8').read()
    text = re.sub(r'\s*var\s+guard\s*=\s*await\s+AuthorizationGuard\.EnsureOwns[a-zA-Z]+\([^)]+\);\s*if\s*\(guard\s*!=\s*null\)\s*return\s*guard;', '', text)
    text = re.sub(r'\s*var\s+scheduleGuard\s*=\s*await\s+Helpers\.AuthorizationGuard\.EnsureOwns[a-zA-Z]+\([^)]+\);\s*if\s*\(scheduleGuard\s*!=\s*null\)\s*return\s*scheduleGuard;', '', text)
    open(f, 'w', encoding='utf-8').write(text)
