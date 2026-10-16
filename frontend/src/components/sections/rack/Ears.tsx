function Screw() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true">
      <circle cx="6" cy="6" r="4.9" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M3.2 8.8 8.8 3.2" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

/** The two rack ears (mounting flanges with screws) on the sides of a module. Decorative. */
export function Ears() {
  return (
    <>
      <i className="ear l" aria-hidden="true">
        <Screw />
        <Screw />
      </i>
      <i className="ear r" aria-hidden="true">
        <Screw />
        <Screw />
      </i>
    </>
  );
}
