// Convenience bundle: registers every element. Prefer importing only the
// subpath(s) you need — e.g. "@apiuikit/web-component/asyncapi-renderer" or
// "@apiuikit/web-component/openapi-endpoints" — to skip registering the rest.
import "./elements/asyncapi";
import "./elements/asyncapi-renderer";
import "./elements/asyncapi-servers";
import "./elements/asyncapi-operations";
import "./elements/asyncapi-operation";
import "./elements/asyncapi-messages";
import "./elements/asyncapi-message";
import "./elements/asyncapi-info";
import "./elements/openapi";
import "./elements/openapi-renderer";
import "./elements/openapi-servers";
import "./elements/openapi-endpoints";
import "./elements/openapi-endpoint";
import "./elements/openapi-webhooks";
import "./elements/openapi-webhook";
import "./elements/openapi-info";
import "./elements/schemas";
import "./elements/schema";
// The Arazzo elements aren't registered here: this bundle inlines every lazy
// import (the iife format can't split), so they'd add the Arazzo parser,
// about 540 KB gzipped, for every page. Load them from their own entries,
// where the parser stays a lazy chunk: "@apiuikit/web-component/arazzo",
// "/arazzo-renderer", "/arazzo-info", "/arazzo-workflows" and
// "/arazzo-workflow" (dist/elements/*.js).
