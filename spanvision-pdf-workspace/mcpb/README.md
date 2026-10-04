# geptechniek workspace · PDF — local assistant extension

This extension connects a configured Claude Desktop assistant to the running Windows app from Spanvision infra. Install the app from your organization, enable the AI link in Preferences, and use the local port 9223 (or your configured port).

Build the extension from the repository root:

    node mcpb/scripts/pack.mjs

The output is mcpb/dist/spanvision-pdf-workspace.mcpb. Import it into your assistant's local extension settings. The Node stdio bridge and existing app_* commands are unchanged for compatibility.

## Examples

### Review a drawing

Open a PDF and ask your configured assistant to summarize the current page and identify review points.

### Measure to scale

Ask the assistant to calibrate the drawing, place a distance measurement and show its unit and scale.

### Update a title block

Ask the assistant to fill the Spanvision title-block fields and save a copy of the drawing. Existing editing permissions still apply.

## Privacy Policy

The bridge connects to 127.0.0.1. Your chosen assistant/provider may receive requested page screenshots, extracted text or tool results according to that provider's behavior. No Spanvision hosted assistant, support portal or account service is configured by this edition. Account previews do not send or store credentials.

Source attribution and licensing are in ../docs/legal/ATTRIBUTION.md and ../LICENSE.md.
