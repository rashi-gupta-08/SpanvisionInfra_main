//! Spanvision Infra's monochrome application chrome. Drawing colors remain
//! document data and are deliberately outside these UI tokens.

use iced::theme::palette::{Pair, Palette, Seed};
use iced::{Color, Theme};

pub const NAME: &str = "Spanvision Mono";
#[path = "brand_palette.rs"]
mod brand_palette;
pub use brand_palette::*;

#[must_use]
pub fn theme() -> Theme {
    let seed = Seed {
        background: PAGE,
        text: TEXT_SOFT,
        primary: TEXT,
        success: TEXT_SOFT,
        warning: Color::from_rgb8(0xCC, 0xCC, 0xCC),
        danger: TEXT,
    };
    Theme::custom_with_fn(NAME, seed, |seed| {
        let mut palette = Palette::generate(seed);
        let pair = |color| Pair::new(color, TEXT_SOFT);
        palette.background.base = pair(PAGE);
        palette.background.weakest = pair(SURFACE);
        palette.background.weaker = pair(SURFACE_RAISED);
        palette.background.weak = pair(SURFACE_HOVER);
        // Existing controls use `neutral` for their shared outline. Its alpha
        // composes against whichever dark surface the control sits on.
        palette.background.neutral = Pair { color: BORDER, text: TEXT_SOFT };
        palette.background.strong = pair(SURFACE_RAISED);
        palette.background.stronger = pair(SURFACE);
        palette.background.strongest = pair(PAGE);
        palette.primary.weak = pair(SURFACE_HOVER);
        palette.primary.strong = Pair::new(FOCUS, TEXT);
        palette.success.weak = pair(SURFACE_RAISED);
        palette.warning.weak = pair(SURFACE_RAISED);
        palette.danger.weak = pair(SURFACE_RAISED);
        palette
    })
}

pub fn is_active(theme: &Theme) -> bool {
    theme.to_string() == NAME
}

/// The same neutral accent and surface hierarchy in light mode.
pub fn light_theme() -> Theme {
    let ink = Color::from_rgb8(0x17, 0x20, 0x2B);
    Theme::custom_with_fn("Light", Seed {
        background: Color::from_rgb8(0xF5, 0xF6, 0xF8),
        text: ink,
        primary: ink,
        success: ink,
        warning: Color::from_rgb8(0x58, 0x65, 0x79),
        danger: ink,
    }, |seed| {
        let mut palette = Palette::generate(seed);
        let pair = |color| Pair::new(color, ink);
        palette.background.weakest = pair(Color::WHITE);
        palette.background.weaker = pair(Color::from_rgb8(0xEE, 0xF1, 0xF5));
        palette.background.weak = pair(Color::from_rgb8(0xE7, 0xEB, 0xF0));
        palette.background.neutral = Pair { color: ink.scale_alpha(0.18), text: ink };
        palette.primary.weak = pair(Color::from_rgb8(0xE7, 0xEB, 0xF0));
        palette.primary.strong = Pair::new(ink, Color::WHITE);
        palette
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ui::style::common::wcag_contrast;

    #[test]
    fn text_contrast_on_all_brand_surfaces() {
        for surface in [PAGE, SURFACE, SURFACE_RAISED, SURFACE_HOVER, CANVAS] {
            assert!(wcag_contrast(TEXT_SOFT, surface) >= 4.5);
            assert!(wcag_contrast(TEXT_MUTED, surface) >= 4.5);
        }
    }

    #[test]
    fn palette_uses_exact_brand_surface_roles() {
        let palette = theme().palette().clone();
        assert_eq!(palette.background.base.color, PAGE);
        assert_eq!(palette.background.weakest.color, SURFACE);
        assert_eq!(palette.background.weaker.color, SURFACE_RAISED);
        assert_eq!(palette.background.weak.color, SURFACE_HOVER);
        assert_eq!(palette.primary.base.color, TEXT);
    }
}
