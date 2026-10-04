#!/usr/bin/env bash
set -eu
export PATH=/home/rashi_gupta/.cargo/bin:$PATH
cd '/mnt/c/Users/dell/Documents/ChatGPT/own CAD/spanvision-pdf-workspace'
for file in open-pdf-studio/src-tauri/build.rs open-pdf-studio/src-tauri/src/brand.rs open-pdf-studio/src-tauri/src/storage_migration.rs open-pdf-studio/src-tauri/src/datamap.rs open-pdf-studio/src-tauri/src/accounts.rs open-pdf-studio/src-tauri/src/print_formulieren.rs open-pdf-studio/src-tauri/src/main.rs open-pdf-studio/src-tauri/src/lib.rs; do
  rustfmt --edition 2021 --emit stdout --config skip_children=true "$file" > /dev/null
done
rustc --edition 2021 --test open-pdf-studio/src-tauri/src/storage_migration.rs -o /tmp/spanvision-storage-test
/tmp/spanvision-storage-test
