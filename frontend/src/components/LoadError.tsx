// What a screen shows when its data did not arrive -- usually no connection.
// Staying on "Loading…" would suggest something is still coming.
export function LoadError() {
  return <p className="text-sm text-muted-foreground">Not available right now. Check your connection and try again.</p>
}
