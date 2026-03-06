import { useState } from "react";
import { Marker, Tooltip } from "react-leaflet";
import { createNewsMarker, computeMisinfoScore, getArticleLatLng } from "@/lib/newsMapUtils";
import type { NewsArticle } from "@/lib/types";
import "./news-map.css";

interface NewsMapMarkerProps {
  article: NewsArticle;
  flaggedIds: string[];
  onSelect: (article: NewsArticle) => void;
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

function TooltipContent({ article }: { article: NewsArticle }) {
  const [imgFailed, setImgFailed] = useState(false);
  const blurb = article.summary || article.excerpt || "";
  const showImage = !!article.imageUrl && !imgFailed;

  return (
    <div style={{ width: 240, background: "white", borderRadius: 10, overflow: "hidden", fontFamily: "inherit" }}>
      {showImage && (
        <img
          src={article.imageUrl!}
          alt=""
          onError={() => setImgFailed(true)}
          style={{ width: "100%", height: 110, objectFit: "cover", display: "block" }}
        />
      )}
      <div style={{ padding: "10px 12px 10px" }}>
        <p style={{
          fontWeight: 700, fontSize: 12, lineHeight: 1.4,
          whiteSpace: "normal", wordBreak: "break-word", marginBottom: 4,
        }}>
          {article.title}
        </p>
        {blurb && (
          <p style={{
            fontSize: 11, color: "#555", lineHeight: 1.4, marginBottom: 6,
            whiteSpace: "normal", wordBreak: "break-word",
          }}>
            {truncate(blurb, 100)}
          </p>
        )}
        <p style={{ fontSize: 10, color: "#999", whiteSpace: "normal" }}>
          {article.source} · {article.publishedAt}
        </p>
      </div>
    </div>
  );
}

export function NewsMapMarker({ article, flaggedIds, onSelect }: NewsMapMarkerProps) {
  const position     = getArticleLatLng(article);
  const misinfoScore = computeMisinfoScore(article, flaggedIds);
  const icon         = createNewsMarker(article.category, article.sentiment ?? "neutral", misinfoScore);

  return (
    <Marker
      position={position}
      icon={icon}
      eventHandlers={{ click: () => onSelect(article) }}
    >
      <Tooltip
        direction="top"
        offset={[0, -14]}
        opacity={1}
        className="news-map-tooltip"
      >
        <TooltipContent article={article} />
      </Tooltip>
    </Marker>
  );
}
