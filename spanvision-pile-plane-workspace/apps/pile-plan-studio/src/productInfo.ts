import brand from "./brand.json";

export const PRODUCT_INFO = Object.freeze({
  name: brand.product,
  version: __APP_VERSION__,
  status: "Alpha",
  organization: brand.organization,
  license: "LGPL-3.0-or-later",
});
