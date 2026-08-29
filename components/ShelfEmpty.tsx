// What a shelf says when it has nothing to show.
//
// There are two reasons a grid is empty and they are not interchangeable. "No agents in this
// category" is a statement about the BSC registry. "We could not reach the registry" is a statement
// about this site. Printing the first when the second is true would make the marketplace quietly
// misreport its own data source — on a submission judged partly on data quality, that is the one
// bug worth writing a component to avoid.
export function ShelfEmpty({ degraded, children }: { degraded?: boolean; children: React.ReactNode }) {
  if (degraded) {
    return (
      <div className="empty is-degraded">
        Could not reach the 8004scan registry just now — our data source is rate-limited or down.
        This is not an empty shelf. Reload in a moment.
      </div>
    );
  }
  return <div className="empty">{children}</div>;
}
