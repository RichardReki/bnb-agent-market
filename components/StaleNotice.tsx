/// Says that what you are looking at is real but not current.
///
/// The alternative when the registry is down is a blank shelf, and blank is not more honest — it
/// just moves the inaccuracy somewhere the visitor cannot see it. Showing real data with its age
/// attached is the only version where nobody is misled: the numbers are true, and the label says
/// exactly how true.
///
/// Two sources get two wordings, because they are different promises. The last good response we read
/// this session is usually minutes old. The committed snapshot can be days old, and saying "a few
/// minutes" about it would be the lie this component exists to prevent.
function age(ms: number): string {
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `about ${Math.max(1, mins)} minute${mins === 1 ? '' : 's'} old`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `about ${hours} hour${hours === 1 ? '' : 's'} old`;
  return `about ${Math.round(hours / 24)} days old`;
}

export function StaleNotice({ at, fromSnapshot }: { at?: number; fromSnapshot?: boolean }) {
  if (!at) return null;
  const how = age(Date.now() - at);
  return (
    <p className="stale-notice">
      The 8004scan registry is not responding right now.{' '}
      {fromSnapshot ? (
        <>
          This is the snapshot committed with the source — {how}. Every agent below is a real BSC
          registration; the scores and counts are simply from when it was taken.
        </>
      ) : (
        <>This is the last data we successfully read — {how}. It is real, just not current.</>
      )}
    </p>
  );
}
