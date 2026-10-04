# Plugins

CAD by Spanvision Infra keeps the `ocs_plugin_api` ABI and can load compatible native plugins from the profile's `plugins` directory. The bundled `opencad.python` ID stays stable so existing plugin settings continue to resolve.

The curated registry is empty until `plugin_registry_url` in [brand.json](../brand.json) points to a Spanvision maintained registry. Users can still add a compatible repository manually in the desktop Plugin Manager. The original project registry is not queried by default.
