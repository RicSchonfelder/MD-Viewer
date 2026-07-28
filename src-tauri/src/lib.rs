use tauri::{Emitter, Manager};

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_cli_args() -> Vec<String> {
    std::env::args().skip(1).collect()
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![read_file, get_cli_args, download_and_install])
        .setup(|app| {
            let args: Vec<String> = std::env::args().collect();

            if args.len() > 1 {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.emit("file-opened", &args[1]);
                }
            }

            #[cfg(target_os = "macos")]
            {
                use tauri::ActivationPolicy;
                app.set_activation_policy(ActivationPolicy::Regular);
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
