import { ApplicationSection } from "./ApplicationSection";
import { Band } from "./Band";
import { CharacteristicsSection } from "./CharacteristicsSection";
import { ClosingSection } from "./ClosingSection";
import { DetailSection } from "./DetailSection";
import { DocHead } from "./DocHead";
import { NoticeFooter } from "./NoticeFooter";
import { OrderingSection } from "./OrderingSection";
import { Page1 } from "./Page1";
import { PageFoot } from "./PageFoot";
import { PinSection } from "./PinSection";
import { RunTimeline } from "./RunTimeline";
import { TimingSummary } from "./TimingSummary";
import { VignetteGrid } from "./VignetteGrid";
import { archivo, jetbrainsMono } from "./fonts";
import "../shared/datasheet-base.css";
import "./datasheet.css";

/** The landing page, dressed as a hardware datasheet. Everything is scoped under .ds; fonts apply only inside it. */
export function DatasheetPage() {
  return (
    <div className={`ds ${archivo.variable} ${jetbrainsMono.variable}`}>
      <VignetteGrid />
      <div className="ds-content">
        <a className="skip" href="#main">
          Skip to content
        </a>
        <Band />
        <main id="main">
          <DocHead />
          <Page1 />
          <PageFoot n={1} />
          <PinSection />
          <PageFoot n={2} />
          <RunTimeline />
          <TimingSummary />
          <PageFoot n={3} />
          <CharacteristicsSection />
          <DetailSection />
          <PageFoot n={4} />
          <ApplicationSection />
          <PageFoot n={5} />
          <OrderingSection />
          <PageFoot n={6} />
          <ClosingSection />
        </main>
        <NoticeFooter />
      </div>
    </div>
  );
}
