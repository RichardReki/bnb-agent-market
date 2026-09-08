/// Says that what you are looking at is real but not current.
///
/// The alternative when the registry is down is a blank shelf, and blank is not more honest — it
/// just moves the inaccuracy somewhere the visitor cannot see it. Showing the last good answer with
/// its age attached is the only version where nobody is misled: the numbers are true, and the label
/// says exactly how true.
export function StaleNotice({ at }: { at?: number }) {
  if (!at) return null;
  const mins = Math.max(1, Math.round((Date.now() - at) / 60000));
  return (
    <p className="stale-notice">
      The 8004scan registry is not responding right now, so this is the last data we successfully
      read — about {mins} minute{mins === 1 ? '' : 's'} old. It is real, just not current.
    </p>
  );
}
