import { useRef, useState } from "react";
import { Upload, CheckCircle } from "lucide-react";
import { useApp } from "@/lib/appContext";
import { MOCK_CV_DATA } from "@/lib/mockCvData";

type UploadState = "idle" | "dragging" | "uploading" | "analyzing" | "complete";

const ANALYSIS_STEPS = [
  { label: "Extracting personal info", completeAfterMs: 500 },
  { label: "Analyzing work experience", completeAfterMs: 1000 },
  { label: "Mapping skills", completeAfterMs: 1500 },
];

const StepRow = ({ label, completed }: { label: string; completed: boolean }) => (
  <div className="flex items-center gap-2">
    {completed ? (
      <span className="text-green-500 text-xs font-bold">✓</span>
    ) : (
      <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    )}
    <span className={`text-sm ${completed ? "text-muted-foreground" : "text-foreground"}`}>
      {label}
    </span>
  </div>
);

const AnalyzingSteps = ({ completedCount }: { completedCount: number }) => (
  <div className="space-y-2 mt-4">
    {ANALYSIS_STEPS.map((step, index) => (
      <StepRow key={step.label} label={step.label} completed={index < completedCount} />
    ))}
  </div>
);

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function UploadZone() {
  const { state, dispatch } = useApp();
  const [uploadState, setUploadState] = useState<UploadState>(
    state.cvData ? "complete" : "idle"
  );
  const [completedStepCount, setCompletedStepCount] = useState(0);
  const [fileSize, setFileSize] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startAnalysis = (file: File) => {
    setFileSize(formatFileSize(file.size));
    dispatch({ type: "SET_CV_FILE", fileName: file.name });
    setUploadState("uploading");

    setTimeout(() => {
      setUploadState("analyzing");
      dispatch({ type: "SET_CV_ANALYZING", analyzing: true });

      ANALYSIS_STEPS.forEach((step, index) => {
        setTimeout(() => setCompletedStepCount(index + 1), step.completeAfterMs);
      });

      setTimeout(() => {
        dispatch({ type: "SET_CV_DATA", data: MOCK_CV_DATA });
        setUploadState("complete");
      }, 2000);
    }, 600);
  };

  const handleFileSelected = (file: File | undefined) => {
    if (!file) return;
    startAnalysis(file);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setUploadState("idle");
    handleFileSelected(event.dataTransfer.files[0]);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setUploadState("dragging");
  };

  const handleDragLeave = () => setUploadState("idle");

  const handleZoneClick = () => fileInputRef.current?.click();

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelected(event.target.files?.[0]);
  };

  const handleClearForReupload = () => {
    dispatch({ type: "CLEAR_CV" });
    setUploadState("idle");
    setCompletedStepCount(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const fileName = state.cvFileName ?? "";

  return (
    <div className="flex flex-col h-full min-h-[300px] items-center justify-center p-4">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.doc,.txt"
        className="hidden"
        onChange={handleInputChange}
      />

      {uploadState === "idle" && (
        <div
          onClick={handleZoneClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className="w-full h-full min-h-[300px] flex flex-col items-center justify-center border-2 border-dashed border-border/50 rounded-xl cursor-pointer transition-colors hover:border-primary/40 hover:bg-primary/5"
        >
          <Upload className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <p className="text-base font-medium text-foreground mb-1">Drop your CV here</p>
          <p className="text-sm text-muted-foreground mb-3">or click to browse</p>
          <p className="text-xs text-muted-foreground/70">PDF, DOCX, TXT · Max 10MB</p>
        </div>
      )}

      {uploadState === "dragging" && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className="w-full h-full min-h-[300px] flex flex-col items-center justify-center border-2 border-dashed border-primary rounded-xl bg-primary/5 transition-colors"
        >
          <Upload className="w-12 h-12 text-primary mb-4" />
          <p className="text-base font-medium text-primary">Release to upload</p>
        </div>
      )}

      {uploadState === "uploading" && (
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-foreground">{fileName}</p>
          <p className="text-sm text-muted-foreground">Uploading...</p>
        </div>
      )}

      {uploadState === "analyzing" && (
        <div className="flex flex-col items-center">
          <p className="text-sm font-medium text-foreground mb-1">Analyzing your CV...</p>
          <AnalyzingSteps completedCount={completedStepCount} />
        </div>
      )}

      {uploadState === "complete" && (
        <div className="flex flex-col items-center gap-3">
          <CheckCircle className="w-10 h-10 text-success" />
          <p className="text-sm font-medium text-foreground">{fileName}</p>
          {fileSize && <p className="text-xs text-muted-foreground">{fileSize}</p>}
          <button
            onClick={handleClearForReupload}
            className="text-sm text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
          >
            Upload a different CV
          </button>
        </div>
      )}
    </div>
  );
}
