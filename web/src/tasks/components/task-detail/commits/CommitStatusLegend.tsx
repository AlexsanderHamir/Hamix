export function CommitStatusLegend() {
  return (
    <p className="task-commits-legend muted">
      <strong className="task-commits-legend-em">Eligible</strong> commits count
      toward verify.{" "}
      <strong className="task-commits-legend-em">Observed</strong> commits are
      recorded for audit and resume but excluded when gates fail.
    </p>
  );
}
