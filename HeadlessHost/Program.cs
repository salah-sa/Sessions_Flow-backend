using SessionFlow.Desktop.Api;
using System;

Console.WriteLine(">>> [INIT] SessionFlow HeadlessHost Starting...");

try 
{
    var app = ApiHost.BuildAndConfigure(args);
    Console.WriteLine(">>> [INIT] BuildAndConfigure Successful. Starting App...");
    app.Run();
}
catch (Exception ex)
{
    Console.WriteLine(">>> [FATAL ERROR] Application failed to start:");
    Console.WriteLine(ex.ToString());
    Environment.Exit(1);
}
