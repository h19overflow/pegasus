import { MapContainer, TileLayer } from "react-leaflet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HotspotOverlay } from "./HotspotOverlay";

interface PredictiveHeatmapProps {
  onAskAI?: (question: string) => void;
}

const MONTGOMERY_CENTER: [number, number] = [32.3668, -86.3];
const DEFAULT_ZOOM = 12;

export function PredictiveHeatmap({ onAskAI }: PredictiveHeatmapProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Predictive Heatmap</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] rounded-lg overflow-hidden">
          <MapContainer
            center={MONTGOMERY_CENTER}
            zoom={DEFAULT_ZOOM}
            className="h-full w-full"
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <HotspotOverlay onAskAI={onAskAI} />
          </MapContainer>
        </div>
      </CardContent>
    </Card>
  );
}
