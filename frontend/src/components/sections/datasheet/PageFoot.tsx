/** The "page n of N" strip between datasheet sections. Decorative, so hidden from assistive tech. */
export const PAGE_COUNT = 6;

export function PageFoot({ n }: { n: number }) {
  return (
    <div className="pagefoot" aria-hidden="true">
      <div className="wrap">
        <span>
          <b>VRT-MAC4</b> &middot; VRT-DS-0001, Rev E, 2026-10-13
        </span>
        <span>Sample data</span>
        <span className="pg">
          page {n} of {PAGE_COUNT}
        </span>
      </div>
    </div>
  );
}
