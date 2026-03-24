
const colors = [
  { label: "Primary", var: "--primary", fg: "--primary-foreground" },
  { label: "Background", var: "--background", fg: "--foreground" },
  { label: "Foreground", var: "--foreground", fg: "--background" },
  { label: "Card", var: "--card", fg: "--card-foreground" },
  { label: "Muted", var: "--muted", fg: "--muted-foreground" },
  { label: "Accent", var: "--accent", fg: "--accent-foreground" },
  { label: "Secondary", var: "--secondary", fg: "--secondary-foreground" },
  { label: "Destructive", var: "--destructive", fg: "--destructive-foreground" },
  { label: "Success", var: "--success", fg: "--success-foreground" },
  { label: "Warning", var: "--warning", fg: "--warning-foreground" },
  { label: "Info", var: "--info", fg: "--info-foreground" },
  { label: "Border", var: "--border", fg: "--foreground" },
  { label: "Ring", var: "--ring", fg: "--primary-foreground" },
];

const bloomColors = [
  { label: "Remember", var: "--bloom-remember" },
  { label: "Understand", var: "--bloom-understand" },
  { label: "Apply", var: "--bloom-apply" },
  { label: "Analyze", var: "--bloom-analyze" },
  { label: "Evaluate", var: "--bloom-evaluate" },
  { label: "Create", var: "--bloom-create" },
];

const difficultyColors = [
  { label: "Easy", var: "--difficulty-easy" },
  { label: "Medium", var: "--difficulty-medium" },
  { label: "Hard", var: "--difficulty-hard" },
];

function Swatch({ label, cssVar, fgVar }: { label: string; cssVar: string; fgVar?: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="w-20 h-20 rounded-lg shadow-md border border-border flex items-center justify-center text-xs font-medium"
        style={{
          backgroundColor: `hsl(var(${cssVar}))`,
          color: fgVar ? `hsl(var(${fgVar}))` : "#fff",
        }}
      >
        {label}
      </div>
      <span className="text-xs text-muted-foreground font-mono">{cssVar}</span>
    </div>
  );
}

export default function Palette() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8 max-w-4xl mx-auto space-y-10">
      <div>
        <h1 className="text-2xl font-bold mb-1">Color Palette</h1>
        <p className="text-sm text-muted-foreground mb-1">Font: <span className="font-semibold">Inter</span> (body) · <span className="font-mono font-semibold">JetBrains Mono</span> (mono)</p>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-4">Core Colors</h2>
        <div className="flex flex-wrap gap-4">
          {colors.map((c) => (
            <Swatch key={c.var} label={c.label} cssVar={c.var} fgVar={c.fg} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">Bloom Taxonomy Levels</h2>
        <div className="flex flex-wrap gap-4">
          {bloomColors.map((c) => (
            <Swatch key={c.var} label={c.label} cssVar={c.var} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">Difficulty Levels</h2>
        <div className="flex flex-wrap gap-4">
          {difficultyColors.map((c) => (
            <Swatch key={c.var} label={c.label} cssVar={c.var} />
          ))}
        </div>
      </section>
    </div>
  );
}
