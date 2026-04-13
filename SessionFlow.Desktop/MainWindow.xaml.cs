using System.IO;
using System.Text.Json;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Windows;
using Microsoft.Web.WebView2.Core;
using SessionFlow.Desktop.Services;

namespace SessionFlow.Desktop;

public partial class MainWindow : Window
{
    private readonly HostBridge _hostBridge;

    public MainWindow()
    {
        InitializeComponent();
        _hostBridge = new HostBridge(this);

        // Set tray icon from executable's embedded Win32 Icon (bypasses WPF image conversion limits)
        TrayIcon.Icon = System.Drawing.Icon.ExtractAssociatedIcon(Assembly.GetExecutingAssembly().Location);

        // Set up notification callback for the NotificationService
        NotificationService.ShowToastAction = (title, message) =>
        {
            Dispatcher.Invoke(() =>
            {
                TrayIcon.ShowBalloonTip(title, message, Hardcodet.Wpf.TaskbarNotification.BalloonIcon.Info); 
            });
        };

        Loaded += MainWindow_Loaded;
        StateChanged += MainWindow_StateChanged;
        Closing += MainWindow_Closing;
    }

    private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
    {
        try
        {
            // Initialize WebView2 with autoplay enabled so the cinematic audio plays without clicking
            var envOptions = new CoreWebView2EnvironmentOptions { AdditionalBrowserArguments = "--autoplay-policy=no-user-gesture-required" };
            var env = await CoreWebView2Environment.CreateAsync(null, null, envOptions);
            await WebView.EnsureCoreWebView2Async(env);

            // Expose host object to JavaScript
            WebView.CoreWebView2.AddHostObjectToScript("sessionFlowHost", _hostBridge);

            // Suppress the default new window behavior
            WebView.CoreWebView2.NewWindowRequested += (s, args) => args.Handled = true;

            // Handle messages from JS for diagnostic logging
            WebView.CoreWebView2.WebMessageReceived += (s, args) => {
                // Diagnostic logging handled by Serilog on the backend
            };

            // Log navigation completions
            WebView.CoreWebView2.NavigationCompleted += (s, args) => {
                // If failed due to connection, we can alert or handled here, 
                // but the retry loop below handles initial startup.
            };

            // Catch process crashes
            WebView.CoreWebView2.ProcessFailed += (s, args) => {
                // Process crash handling
            };

            // Wait for backend to be ready before navigating (Retry loop)
            bool isReady = false;
            int retries = 0;
            using var client = new System.Net.Http.HttpClient();
            
            while (!isReady && retries < 10)
            {
                try
                {
                    var response = await client.GetAsync("http://127.0.0.1:5180/api/auth/status");
                    if (response.IsSuccessStatusCode) isReady = true;
                }
                catch
                {
                    retries++;
                    await Task.Delay(500); // Wait 500ms before next check
                }
            }

            // Navigate to the in-process Kestrel server
            WebView.CoreWebView2.Navigate("http://127.0.0.1:5180");
        }
        catch (Exception ex)
        {
            MessageBox.Show(
                $"Failed to initialize WebView2:\n\n{ex.Message}",
                "SessionFlow - WebView2 Error",
                MessageBoxButton.OK,
                MessageBoxImage.Error);
        }
    }

    private void CoreWebView2_WebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        try
        {
            var message = e.TryGetWebMessageAsString();
            if (string.IsNullOrEmpty(message)) return;

            using var doc = JsonDocument.Parse(message);
            var root = doc.RootElement;
            if (root.TryGetProperty("type", out var type) && type.GetString() == "error")
            {
                var error = root.GetProperty("message").GetString();
                MessageBox.Show(
                    $"JavaScript Error in WebView2:\n\n{error}",
                    "SessionFlow - Web Error",
                    MessageBoxButton.OK,
                    MessageBoxImage.Warning);
            }
        }
        catch { /* Ignore invalid JSON messages */ }
    }

    private void MainWindow_StateChanged(object? sender, EventArgs e)
    {
        // When minimized, hide to tray
        if (WindowState == WindowState.Minimized)
        {
            Hide();
        }
    }

    private void MainWindow_Closing(object? sender, System.ComponentModel.CancelEventArgs e)
    {
        // Don't close, minimize to tray instead
        e.Cancel = true;
        WindowState = WindowState.Minimized;
        Hide();
        TrayIcon.ShowBalloonTip("SessionFlow", "SessionFlow is still running in the system tray.",
            Hardcodet.Wpf.TaskbarNotification.BalloonIcon.Info);
    }

    private void ShowFromTray()
    {
        Show();
        WindowState = WindowState.Normal;
        Activate();
        Focus();
    }

    // --- Tray menu handlers ---

    private void TrayOpen_Click(object sender, RoutedEventArgs e)
    {
        ShowFromTray();
    }

    private void TrayTodaySessions_Click(object sender, RoutedEventArgs e)
    {
        ShowFromTray();
        // Navigate to dashboard which shows today's sessions
        WebView.CoreWebView2?.Navigate("http://127.0.0.1:5180/dashboard");
    }

    private void TrayQuit_Click(object sender, RoutedEventArgs e)
    {
        // Actually quit the application
        TrayIcon.Dispose();

        // Cancel the closing prevention
        Closing -= MainWindow_Closing;
        Close();

        (Application.Current as App)?.StopAndExit();
    }
}

/// <summary>
/// COM-visible bridge object exposed to JavaScript as window.chrome.webview.hostObjects.sessionFlowHost.    
/// All methods return values asynchronously to JS (as Promises).
/// </summary>
[ComVisible(true)]
[ClassInterface(ClassInterfaceType.AutoDual)]
public class HostBridge
{
    private readonly MainWindow _window;

    public HostBridge(MainWindow window)
    {
        _window = window;
    }

    public void minimizeWindow()
    {
        _window.Dispatcher.Invoke(() =>
        {
            _window.WindowState = WindowState.Minimized;
        });
    }

    public void maximizeWindow()
    {
        _window.Dispatcher.Invoke(() =>
        {
            _window.WindowState = _window.WindowState == WindowState.Maximized
                ? WindowState.Normal
                : WindowState.Maximized;
        });
    }

    public void closeWindow()
    {
        _window.Dispatcher.Invoke(() =>
        {
            _window.WindowState = WindowState.Minimized;
            _window.Hide();
        });
    }

    public string openFileSaveDialog(string defaultName)
    {
        string result = "";
        _window.Dispatcher.Invoke(() =>
        {
            var dialog = new Microsoft.Win32.SaveFileDialog
            {
                FileName = defaultName,
                DefaultExt = ".csv",
                Filter = "CSV Files (*.csv)|*.csv|All Files (*.*)|*.*",
                Title = "Export SessionFlow Data"
            };

            if (dialog.ShowDialog(_window) == true)
            {
                result = dialog.FileName;
            }
        });
        return result;
    }

    public string getAppVersion()
    {
        return Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "1.0.0";
    }

    public void showToast(string title, string message)
    {
        _window.Dispatcher.Invoke(() =>
        {
            _window.TrayIcon.ShowBalloonTip(title, message, Hardcodet.Wpf.TaskbarNotification.BalloonIcon.Info);
        });
    }

    public void exitApp()
    {
        _window.Dispatcher.Invoke(() =>
        {
            _window.TrayIcon.Dispose();
            _window.Close();
            (Application.Current as App)?.StopAndExit();
            Environment.Exit(0);
        });
    }
}
