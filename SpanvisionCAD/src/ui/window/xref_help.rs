//! Reference Manager help window: how the manager works on the web build
//! (read-only list, disabled mutations, no previews) and where to report
//! issues. Rendered as a modal like About/DSettings so the text gets a
//! proper window width — an anchored toolbar dropdown squeezed it into an
//! unreadable sliver.

use crate::app::Message;
use crate::ui::style::common::muted_style;
use crate::ui::style::form::{dialog_button, dialog_button_styled_opt};
use iced::widget::{column, container, row, text, Space};
use iced::{Background, Element, Fill, Length, Theme};

/// GitHub issues page linked from the help window, so web users can report
/// missing or broken behavior where it will be seen.
pub const XREF_ISSUES_URL: &str = crate::brand::FEEDBACK_URL;

pub fn view_window(sizing: crate::ui::modal::ModalSizing) -> Element<'static, Message> {
    // Fixed window width: paragraphs wrap against this instead of the
    // toolbar, which is what made the dropdown unreadable.
    let body_w = Length::Fixed(460.0);
    let para = |label: String| -> Element<'static, Message> {
        text(label).size(12).width(Fill).into()
    };

    let intro = para(crate::t!("How the Reference Manager works on web").into_owned());
    let list = para(
        crate::t!(
            "This panel lists the drawing's references read-only: status, type, size, date and saved path, plus the Details pane. Select rows to inspect them; List and Tree switch the presentation."
        )
        .into_owned(),
    );
    let limits = para(
        crate::t!(
            "Attach, Refresh and Change Path stay disabled here: the web build has no filesystem access and no native file pickers, so references can be neither added, reloaded nor repathed — and previews stay unavailable. Nested references are read-only on every platform, and relative paths need the drawing saved first."
        )
        .into_owned(),
    );
    let report_hint = para(if XREF_ISSUES_URL.is_empty() {
        "Issue reporting will be available when a Spanvision Infra support URL is configured.".to_string()
    } else {
        crate::t!("Hit something broken or missing? Report it on the GitHub issues page so it can be fixed.").into_owned()
    });

    let report_button = dialog_button_styled_opt(
        crate::t!("Report an issue"),
        crate::brand::configured(XREF_ISSUES_URL).map(|url| Message::OpenUrl(url.to_string())),
        iced::widget::button::primary,
    );
    let close_button = dialog_button(crate::t!("Close"), Message::CloseModal, false);
    let action_row: Element<'static, Message> = row![
        Space::new().width(Fill),
        report_button,
        close_button,
    ]
    .spacing(8)
    .align_y(iced::Center)
    .into();

    let content = column![
        text(crate::t!("Reference Manager — Web").into_owned())
            .size(14),
        text(crate::t!("EXTERNALREFERENCES on the web build").into_owned())
            .size(11)
            .style(muted_style),
        intro,
        list,
        limits,
        report_hint,
        Space::new().height(4),
        action_row,
    ]
    .spacing(10)
    .padding(16)
    .width(body_w);

    container(content)
        .width(sizing.width)
        .height(sizing.height)
        .style(|theme: &Theme| container::Style {
            background: Some(Background::Color(
                theme.palette().background.base.color,
            )),
            ..Default::default()
        })
        .into()
}

#[cfg(test)]
mod tests {
    #[test]
    fn issue_destination_defaults_to_disabled() {
        assert!(super::XREF_ISSUES_URL.is_empty());
    }
}
