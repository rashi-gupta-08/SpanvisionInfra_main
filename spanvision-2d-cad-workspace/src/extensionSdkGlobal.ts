/**
 * Extension SDK Global — expose SDK, React, and lucide-react on `window`
 * so runtime-loaded extensions can `require()` them.
 */

import * as sdk from './extensionSdk';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import * as LucideReact from 'lucide-react';

const host = window as any;
host.__spanvisionCadSdk = sdk;
host.__spanvisionCadReact = React;
host.__spanvisionCadReactJsxRuntime = jsxRuntime;
host.__spanvisionCadLucideReact = LucideReact;

// Compatibility aliases for existing extension bundles.
host.__open2dStudioSdk = host.__spanvisionCadSdk;
host.__open2dStudioReact = host.__spanvisionCadReact;
host.__open2dStudioReactJsxRuntime = host.__spanvisionCadReactJsxRuntime;
host.__open2dStudioLucideReact = host.__spanvisionCadLucideReact;
