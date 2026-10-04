# CAD by Spanvision Infra: Security

CAD parses complex drawing files and can load native plugins. Treat drawings and
plugins from unknown sources with care.

## Reporting

Spanvision Infra has not configured a private security reporting endpoint for
this distribution. Until one is published, retain sensitive reports privately
and do not send them to the original project's issue tracker as if it were a
Spanvision Infra support channel. The release site, issue tracker, and security
contact will be linked here when configured.

For non-sensitive defects, use the local reproduction details below when a
Spanvision Infra feedback destination becomes available.

## What to include

- CAD version and operating system or browser
- Affected area, such as DWG/DXF import, export, native plugins, or local API
- Minimal reproduction steps and expected versus actual behavior
- Redacted logs or a shareable sample file, when available

Remove private drawings, credentials, and unrelated customer information before
sharing diagnostics.

## Updates and compatibility

Security updates and downloads will be announced through configured
Spanvision Infra release channels. No release endpoint is configured in this
source distribution. Native plugins run with local user privileges; use trusted
plugins built for the included `ocs_plugin_api` ABI.
