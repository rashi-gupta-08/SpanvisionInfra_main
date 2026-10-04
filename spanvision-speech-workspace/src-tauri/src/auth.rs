// Disabled account compatibility commands. Account previews never call these.
use serde::{Deserialize, Serialize};
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserProfile { pub sub: String, pub email: Option<String>, pub name: Option<String>, pub picture: Option<String> }
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserInfo { pub sub: String, pub email: Option<String>, pub email_verified: Option<bool>, pub name: Option<String>, pub picture: Option<String>, pub subscription: Option<serde_json::Value>, pub credits: Option<serde_json::Value> }
#[tauri::command]
pub fn auth_is_configured() -> bool { false }
#[tauri::command]
pub async fn auth_login(app: tauri::AppHandle, page_text: Option<serde_json::Value>) -> Result<UserProfile, String> { let _=(app,page_text); Err("Accounts are unavailable in this local edition. Use the account preview.".into()) }
#[tauri::command]
pub fn auth_logout() {}
#[tauri::command]
pub async fn auth_current_user() -> Option<UserProfile> { None }
#[tauri::command]
pub async fn auth_userinfo() -> Result<UserInfo, String> { Err("Accounts are unavailable in this local edition.".into()) }

#[cfg(test)]
mod tests {
    use super::*;
    #[tokio::test]
    async fn compatibility_accounts_are_disabled() {
        assert!(!auth_is_configured());
        assert!(auth_current_user().await.is_none());
        assert!(auth_userinfo().await.is_err());
        auth_logout();
    }
}
