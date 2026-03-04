import { FileText } from "lucide-react";
import { useApp } from "@/lib/appContext";
import UploadZone from "./UploadZone";
import CvAnalysisResults from "./CvAnalysisResults";

const EmptyAnalysisState = () => (
  <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
    <FileText className="w-12 h-12 opacity-30" />
    <p className="text-sm">Upload a CV to see the analysis</p>
  </div>
);

const CvUploadView = () => {
  const { state } = useApp();

  return (
    <div className="flex h-full">
      <div className="w-[340px] flex-shrink-0 overflow-y-auto border-r border-border/50">
        <UploadZone />
      </div>
      <div className="flex-1 overflow-y-auto">
        {state.cvData ? (
          <CvAnalysisResults data={state.cvData} />
        ) : (
          <EmptyAnalysisState />
        )}
      </div>
    </div>
  );
};

export default CvUploadView;
