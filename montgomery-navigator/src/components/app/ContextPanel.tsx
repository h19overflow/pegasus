import ActiveArtifact from "./ActiveArtifact";
import ProfileSummary from "./ProfileSummary";
import ActionItems from "./ActionItems";

export default function ContextPanel() {
  return (
    <aside className="w-[380px] flex-shrink-0 border-l border-border bg-background flex flex-col overflow-y-auto">
      <ActiveArtifact />
      <hr className="border-border/30 mx-4" />
      <ProfileSummary />
      <hr className="border-border/30 mx-4" />
      <ActionItems />
    </aside>
  );
}
