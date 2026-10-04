// Local service configuration; no discovery, credentials, or service cache.
use serde::{Deserialize, Serialize};
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiServer { pub url: String }
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig { pub client_id: Option<String>, pub ai_servers: Vec<AiServer>, pub operations: serde_json::Value }
#[tauri::command]
pub async fn get_app_config() -> Result<AppConfig, String> { Ok(AppConfig { client_id: None, ai_servers: vec![], operations: serde_json::Value::Null }) }
#[tauri::command]
pub async fn invalidate_app_config() -> Result<(), String> { Ok(()) }

#[cfg(test)]
mod tests {
    use super::*;
    #[tokio::test]
    async fn compatibility_configuration_has_no_remote_services() {
        let config=get_app_config().await.unwrap();
        assert!(config.client_id.is_none());
        assert!(config.ai_servers.is_empty());
        assert!(config.operations.is_null());
        assert!(invalidate_app_config().await.is_ok());
    }
}
