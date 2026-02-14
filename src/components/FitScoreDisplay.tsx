import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

type Props = {
  score: {
    overall: number;
    chest: number;
    waist: number;
    length: number;
    returnRisk: "Low" | "Medium" | "High";
  };
  recommendation: { size: string; confidence: number } | null;
  sizes: string[];
};

const riskColors = {
  Low: "bg-green-500/20 text-green-400 border-green-500/30",
  Medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  High: "bg-red-500/20 text-red-400 border-red-500/30",
};

const FitBar = ({ label, value }: { label: string; value: number }) => (
  <div className="space-y-1.5">
    <div className="flex justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}%</span>
    </div>
    <div className="h-2 rounded-full bg-secondary overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{
          background: value >= 80
            ? "hsl(142, 76%, 46%)"
            : value >= 60
            ? "hsl(45, 93%, 55%)"
            : "hsl(0, 84%, 60%)",
        }}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </div>
  </div>
);

const FitScoreDisplay = ({ score, recommendation, sizes }: Props) => {
  return (
    <div className="glass rounded-2xl p-6 space-y-6">
      {/* Overall Score */}
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Fit Score</p>
        <div className="relative w-28 h-28 mx-auto">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--secondary))" strokeWidth="8" />
            <motion.circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke={
                score.overall >= 80
                  ? "hsl(142, 76%, 46%)"
                  : score.overall >= 60
                  ? "hsl(45, 93%, 55%)"
                  : "hsl(0, 84%, 60%)"
              }
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 42}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - score.overall / 100) }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-2xl font-bold">{score.overall}%</span>
          </div>
        </div>
      </div>

      {/* Recommended Size */}
      {recommendation && (
        <div className="text-center glass rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Recommended Size</p>
          <span className="font-display text-2xl font-bold text-primary">{recommendation.size}</span>
          <p className="text-xs text-muted-foreground mt-1">{recommendation.confidence}% confidence</p>
        </div>
      )}

      {/* Individual Fits */}
      <div className="space-y-3">
        <FitBar label="Chest Fit" value={score.chest} />
        <FitBar label="Waist Fit" value={score.waist} />
        <FitBar label="Length Fit" value={score.length} />
      </div>

      {/* Return Risk */}
      <div className="text-center">
        <Badge className={`${riskColors[score.returnRisk]} border`}>
          Return Risk: {score.returnRisk}
        </Badge>
      </div>
    </div>
  );
};

export default FitScoreDisplay;
