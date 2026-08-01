use std::sync::{Mutex, OnceLock};
use tauri::{Emitter, Manager};

static PENDING_FILE: OnceLock<Mutex<Option<String>>> = OnceLock::new();

fn pending_file() -> &'static Mutex<Option<String>> {
    PENDING_FILE.get_or_init(|| Mutex::new(None))
}

fn store_pending_file(path: String) {
    *pending_file().lock().unwrap() = Some(path);
}

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_cli_args() -> Vec<String> {
    std::env::args().skip(1).collect()
}

#[tauri::command]
fn get_pending_file() -> Option<String> {
    pending_file().lock().unwrap().take()
}

#[tauri::command]
async fn download_and_install(url: String) -> Result<(), String> {
    let installer_path = std::env::temp_dir().join("md-viewer-setup.exe");
    let dest = installer_path.to_string_lossy().replace('\'', "''");

    let ps = format!(
        "[Net.ServicePointManager]::SecurityProtocol='Tls12,Tls11,Tls'; \
         (New-Object Net.WebClient).DownloadFile('{}','{}')",
        url, dest
    );

    let out = std::process::Command::new("powershell")
        .args(["-NoProfile", "-Command", &ps])
        .output()
        .map_err(|e| format!("Failed to run download: {}", e))?;

    if !out.status.success() {
        let err = String::from_utf8_lossy(&out.stderr);
        return Err(format!("Download failed: {}", err));
    }

    std::process::Command::new(&installer_path)
        .arg("/S")
        .spawn()
        .map_err(|e| format!("Failed to start installer: {}", e))?;

    Ok(())
}

fn emit_file_opened(app: &tauri::AppHandle, path: &str) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.emit("file-opened", path);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut args: Vec<String> = std::env::args().collect();
    args.remove(0);
    args.retain(|a| !a.starts_with('-'));
    if let Some(first) = args.first() {
        store_pending_file(first.clone());
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            read_file,
            get_cli_args,
            get_pending_file,
            download_and_install
        ])
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
                use tauri::ActivationPolicy;
                app.set_activation_policy(ActivationPolicy::Regular);
            }

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::Opened { urls, .. } = event {
                for url in urls {
                    let path = url.to_file_path().unwrap_or_default();
                    let path_str = path.to_string_lossy().to_string();
                    store_pending_file(path_str.clone());
                    emit_file_opened(app_handle, &path_str);
                }
            }
        });
}
