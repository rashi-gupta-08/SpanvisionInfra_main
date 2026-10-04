use tauri::Manager;
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};
mod brand;
mod migration;

fn start_main(handle: tauri::AppHandle) {
  std::thread::spawn(move || {
    let result = (|| -> Result<std::path::PathBuf, Box<dyn std::error::Error + Send + Sync>> {
      let local = handle.path().app_local_data_dir()?;
      let root = std::env::var_os("SPANVISION_FIELD_DATA_ROOT").map(std::path::PathBuf::from)
        .unwrap_or_else(|| local.parent().expect("App data parent").to_path_buf());
      let destination = root.join(migration::IDENTIFIER);
      #[cfg(windows)] migration::migrate(&root.join(migration::LEGACY_IDENTIFIER), &destination)?;
      Ok(destination)
    })();
    match result {
      Ok(profile) => {
        let main_handle=handle.clone();
        let _=handle.run_on_main_thread(move || {
          let built=(|| -> tauri::Result<()> {
            let window=tauri::WebviewWindowBuilder::from_config(&main_handle,&main_handle.config().app.windows[0])?
              .data_directory(profile).title(format!("{} — {}",brand::PRODUCT,brand::ORGANIZATION)).build()?;
            window.set_icon(tauri::image::Image::from_bytes(include_bytes!("../icons/icon.png"))?)?;
            Ok(())
          })();
          if let Err(error)=built {
            let close_handle=main_handle.clone();
            main_handle.dialog().message(format!("Field Workspace could not open: {error}")).title(brand::PRODUCT)
              .kind(MessageDialogKind::Error).show(move |_| close_handle.exit(1));
          }
        });
      },
      Err(error) => {
        let retry_handle=handle.clone();
        handle.dialog().message(format!("Your existing data has been left intact. Close the previous Field application, then retry importing its local projects and preferences.\n\n{error}"))
          .title(brand::PRODUCT).kind(MessageDialogKind::Warning)
          .buttons(MessageDialogButtons::OkCancelCustom("Retry".into(),"Exit".into()))
          .show(move |retry| { if retry { start_main(retry_handle); } else { retry_handle.exit(0); } });
      }
    }
  });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    // HTTP via the Rust backend — connector APIs (ERPNext/AFAS/Exact/...) rarely send
    // CORS headers, so webview fetch() is blocked; this plugin is not.
    .plugin(tauri_plugin_http::init())
    .setup(|app| {
      start_main(app.handle().clone());
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running Field Workspace");
}
