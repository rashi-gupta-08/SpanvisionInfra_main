# Open Baken Studio — releases-mirror

Dit publieke repo bevat **alleen versietags** van [Open Baken Studio](https://github.com/OpenAEC-Foundation/open-baken-studio)
(privé). De app checkt hier of er een nieuwere versie is; de daadwerkelijke
downloads (Windows-installer, Android-APK, web-bundel) staan als assets bij de
releases in het privé-repo en zijn beschikbaar voor geautoriseerde gebruikers.

## Release-routine (voor beheerders)

Na het taggen van `vX.Y.Z` in het privé-repo, spiegel de release hier:

```bash
gh release create vX.Y.Z --repo OpenAEC-Foundation/open-baken-studio-releases \
  --title "vX.Y.Z" \
  --notes "Zie de privé-releases voor de assets: https://github.com/OpenAEC-Foundation/open-baken-studio/releases/tag/vX.Y.Z"
```
