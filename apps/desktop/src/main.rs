#![cfg_attr(
    all(not(debug_assertions), feature = "desktop"),
    windows_subsystem = "windows"
)]

use std::{
    path::PathBuf,
    sync::{Arc, Mutex},
};
mod db;
mod economy;
mod migration;
mod server;

fn tailscale_base(port: u16) -> Option<String> {
    let command = if cfg!(windows) {
        r"C:\Program Files\Tailscale\tailscale.exe"
    } else {
        "tailscale"
    };
    let status = std::process::Command::new(command)
        .args(["status", "--json"])
        .output()
        .ok()?;
    let status: serde_json::Value = serde_json::from_slice(&status.stdout).ok()?;
    if status["BackendState"].as_str() != Some("Running") {
        return None;
    }
    let out = std::process::Command::new(command)
        .args(["serve", "status", "--json"])
        .output()
        .ok()?;
    if !out.status.success() {
        return None;
    }
    let config: serde_json::Value = serde_json::from_slice(&out.stdout).ok()?;
    config["Web"].as_object()?.iter().find_map(|(host, web)| {
        if !host.ends_with(":443") || config["AllowFunnel"][host].as_bool() == Some(true) {
            return None;
        }
        let target = format!("http://127.0.0.1:{port}");
        if web["Handlers"]["/"]["Proxy"]
            .as_str()
            .map(|s| s.trim_end_matches('/'))
            != Some(target.as_str())
        {
            return None;
        }
        Some(format!("https://{}", host.strip_suffix(":443")?))
    })
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = std::env::args().collect();
    let value = |key: &str| args.windows(2).find(|v| v[0] == key).map(|v| v[1].clone());
    let data = value("--data-dir").map(PathBuf::from).unwrap_or_else(|| {
        directories::ProjectDirs::from("it", "DaProd", "DaProdGiochi")
            .expect("Cartella dati non disponibile")
            .data_local_dir()
            .to_path_buf()
    });
    std::fs::create_dir_all(&data)?;
    let mut conn = db::open(&data.join("sala.sqlite3"))?;
    if let Some(source) = value("--import-suite") {
        let result = migration::import(&mut conn, &PathBuf::from(source))?;
        println!("Importati {result} conti. Gli originali non sono stati modificati.");
        return Ok(());
    }
    let owner_file = data.join("proprietario.key");
    let owner = if owner_file.exists() {
        std::fs::read_to_string(&owner_file)?
    } else {
        let token = db::secret();
        use std::io::Write;
        let mut f = std::fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&owner_file)?;
        f.write_all(token.as_bytes())?;
        token
    };
    db::owner(&mut conn, owner.trim())?;
    // Un solo processo può servire la sala: la porta viene riservata prima di avviare la UI.
    let port: u16 = value("--port").unwrap_or_else(|| "8790".into()).parse()?;
    let bind = value("--bind").unwrap_or_else(|| "127.0.0.1".into());
    let listener = std::net::TcpListener::bind(format!("{bind}:{port}"))?;
    listener.set_nonblocking(true)?;
    let ts = tailscale_base(port);
    let base = value("--public-url").unwrap_or_else(|| {
        ts.clone()
            .unwrap_or_else(|| format!("http://127.0.0.1:{port}"))
    });
    server::validate_base(&base)?;
    let state = server::AppState {
        db: Arc::new(Mutex::new(conn)),
        base,
        tailscale: ts.is_some(),
        data,
    };
    #[cfg(feature = "desktop")]
    let webview_data = state.data.join("webview");
    let router = server::router(state);
    let runtime = tokio::runtime::Runtime::new()?;
    let _service = runtime.spawn(async move {
        if let Err(e) =
            axum::serve(tokio::net::TcpListener::from_std(listener).unwrap(), router).await
        {
            eprintln!("Sala arrestata: {e}");
        }
    });
    let url = format!("http://127.0.0.1:{port}/#token={}", owner.trim());
    #[cfg(feature = "desktop")]
    if !args.iter().any(|a| a == "--headless") {
        tauri::Builder::default()
            .setup(move |app| {
                let window = tauri::WebviewWindowBuilder::new(
                    app,
                    "sala",
                    tauri::WebviewUrl::External(url.parse()?),
                )
                .title("DaProdGiochi")
                .data_directory(webview_data)
                .inner_size(1280.0, 850.0)
                .min_inner_size(850.0, 600.0)
                .build()?;
                window.set_focus()?;
                Ok(())
            })
            .run(tauri::generate_context!())
            .expect("Avvio finestra DaProdGiochi");
        return Ok(());
    }
    println!(
        "DaProdGiochi: {url}\nDati: {}\nChiudi con Ctrl+C.",
        state_path(&owner_file)
    );
    runtime.block_on(async { tokio::signal::ctrl_c().await })?;
    Ok(())
}

fn state_path(p: &std::path::Path) -> String {
    p.parent().unwrap().display().to_string()
}
