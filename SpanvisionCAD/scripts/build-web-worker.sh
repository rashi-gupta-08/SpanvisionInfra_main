#!/bin/sh
set -eu

cargo build --locked --release --target wasm32-unknown-unknown --package ocs_web_worker
worker_out="${TRUNK_STAGING_DIR:?}/worker_pkg"
mkdir -p "$worker_out"
if command -v wasm-bindgen >/dev/null 2>&1; then
  wasm_bindgen_bin="$(command -v wasm-bindgen)"
else
  trunk_cache="${XDG_CACHE_HOME:-$HOME/.cache}/trunk"
  wasm_bindgen_bin="$(find "$trunk_cache" -type f -name wasm-bindgen 2>/dev/null | sort -V | tail -n 1)"
fi
if [ -z "${wasm_bindgen_bin:-}" ]; then
  echo "wasm-bindgen CLI was not found; install the version matching Cargo.lock or let Trunk download it" >&2
  exit 1
fi
"$wasm_bindgen_bin" \
  --target web \
  --out-dir "$worker_out" \
  --out-name ocs_web_worker \
  "${CARGO_TARGET_DIR:-target}/wasm32-unknown-unknown/release/ocs_web_worker.wasm"
