// The native implementation installs Supabase's SQLite-backed localStorage
// adapter. The web build already has browser localStorage, and importing the
// SQLite web worker there makes Metro try to bundle a wasm worker that is not
// needed by the app.
export {};
