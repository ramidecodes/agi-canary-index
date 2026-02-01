"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

export function InterpretationGuide({
  className = "",
}: {
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Card className={className}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors rounded-lg outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background">
          <div>
            <h3 className="text-base font-medium">Interpretation guide</h3>
            <p className="text-sm text-muted-foreground mt-1">
              What each autonomy level means and how to read this page
            </p>
          </div>
          <ChevronDown
            className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4 text-sm text-muted-foreground">
            <section>
              <h4 className="font-medium text-foreground mb-2">
                Autonomy levels (0–4)
              </h4>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <strong>Tool-only (0):</strong> Uses tools when prompted, no
                  multi-step planning.
                </li>
                <li>
                  <strong>Scripted agent (1):</strong> Follows predefined
                  workflows, limited adaptation.
                </li>
                <li>
                  <strong>Adaptive agent (2):</strong> Can adapt plans in
                  response to feedback.
                </li>
                <li>
                  <strong>Long-horizon agent (3):</strong> Plans and acts over
                  extended timeframes.
                </li>
                <li>
                  <strong>Self-directed (4):</strong> Sets own goals and pursues
                  them autonomously.
                </li>
              </ul>
            </section>

            <section>
              <h4 className="font-medium text-foreground mb-2">
                What the canaries track
              </h4>
              <p>
                Risk canaries monitor early-warning indicators: long-horizon
                planning, recursive self-improvement signals, economic
                displacement, alignment evaluation coverage, deception
                detection, and tool-creation capability. Status colors indicate
                current assessment (low concern, moderate, concerning, or
                unknown).
              </p>
            </section>

            <section>
              <h4 className="font-medium text-foreground mb-2">
                Interpreting uncertainty
              </h4>
              <p>
                The blurred zone on the gauge and shaded band on the chart show
                uncertainty. Wider bands mean more conflicting or sparse data.
                Never interpret a single reading in isolation.
              </p>
            </section>

            <section>
              <h4 className="font-medium text-foreground mb-2">
                What this does NOT tell you
              </h4>
              <p>
                This page tracks capability indicators, not AGI timelines. It
                does not predict when or if AGI will be achieved. Absence of red
                canaries does not imply safety; coverage gaps matter. Use this
                as one input among many for research and policy.
              </p>
            </section>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
