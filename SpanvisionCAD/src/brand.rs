//! Distribution identity. The source-level OCS protocol and plugin names remain
//! stable for compatibility; outward-facing product names come from brand.json.

pub const ORGANIZATION: &str = env!("SPANVISION_ORGANIZATION");
pub const PRODUCT: &str = env!("SPANVISION_PRODUCT");
pub const DISPLAY_NAME: &str = env!("SPANVISION_DISPLAY_NAME");
pub const EXECUTABLE: &str = env!("SPANVISION_EXECUTABLE");
pub const APP_ID: &str = env!("SPANVISION_APP_ID");
pub const WEBSITE_URL: &str = env!("SPANVISION_WEBSITE_URL");
pub const REPOSITORY_URL: &str = env!("SPANVISION_REPOSITORY_URL");
pub const FEEDBACK_URL: &str = env!("SPANVISION_FEEDBACK_URL");
pub const DONATION_URL: &str = env!("SPANVISION_DONATION_URL");
pub const RELEASE_URL: &str = env!("SPANVISION_RELEASE_URL");
pub const RELEASE_API_URL: &str = env!("SPANVISION_RELEASE_API_URL");
pub const COMMUNITY_URL: &str = env!("SPANVISION_COMMUNITY_URL");
pub const COMMUNITY_FEED_URL: &str = env!("SPANVISION_COMMUNITY_FEED_URL");
pub const TUTORIAL_PLAYLIST_URL: &str = env!("SPANVISION_TUTORIAL_PLAYLIST_URL");
pub const PLUGIN_REGISTRY_URL: &str = env!("SPANVISION_PLUGIN_REGISTRY_URL");
pub const FONT_REPOSITORY_URL: &str = env!("SPANVISION_FONT_REPOSITORY_URL");

pub fn configured(url: &'static str) -> Option<&'static str> {
    (!url.is_empty()).then_some(url)
}
