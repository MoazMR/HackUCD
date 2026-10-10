import { formatDateTime } from "./api";
import { PromotedBadge } from "./PromotedBadge";

type PreviewEvent = {
  title: string;
  description: string;
  locationName: string;
  category: string;
  startsAt?: string;
  attendeeCount?: number;
};

/** Live mock of how the event appears in For You and on the Map once promoted. */
export function PromotionPreview({ event, sponsorName, promoted }: { event: PreviewEvent; sponsorName: string; promoted: boolean }) {
  const title = event.title.trim() || "Your event title";
  const where = event.locationName.trim() || "Your venue";
  const validDate = event.startsAt && !Number.isNaN(new Date(event.startsAt).getTime());

  return (
    <div className="biz-preview" aria-label="Preview of how your event will appear">
      <p className="biz-preview__caption">In For You</p>
      <article className={`event-card biz-preview__card${promoted ? " biz-preview__card--promoted" : ""}`}>
        <div className="biz-preview__top">
          <p className="event-category">{event.category || "category"}</p>
          {promoted && <PromotedBadge sponsorName={sponsorName} />}
        </div>
        <h3>{title}</h3>
        <p>{event.description.trim() || "A short description helps people decide to join."}</p>
        <dl>
          <div><dt>Where</dt><dd>{where}</dd></div>
          <div><dt>When</dt><dd>{validDate ? formatDateTime(new Date(event.startsAt!).toISOString()) : "Date to set"}</dd></div>
        </dl>
        {promoted && <p className="biz-preview__sponsor">Paid placement by {sponsorName.trim() || "you"}</p>}
      </article>

      <p className="biz-preview__caption">On the Map</p>
      <div className="biz-preview__map" role="img" aria-label={promoted ? `Highlighted map hotspot labelled Promoted for ${title}` : `Map hotspot for ${title}`}>
        <span className="biz-preview__street biz-preview__street--a" />
        <span className="biz-preview__street biz-preview__street--b" />
        <span className="biz-preview__dot" style={{ left: "18%", top: "62%" }} />
        <span className="biz-preview__dot" style={{ left: "74%", top: "28%" }} />
        <div className={`biz-preview__pin${promoted ? " biz-preview__pin--promoted" : ""}`}>
          {promoted && <PromotedBadge variant="pin" sponsorName={sponsorName} />}
          <span className="biz-preview__pin-title">{title}</span>
        </div>
      </div>
    </div>
  );
}
