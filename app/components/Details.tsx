// app/components/Details.tsx
import { useState } from "react";
import { cn } from "~/lib/utils";
import { usePuterStore } from "~/lib/puter";
import {
    Accordion,
    AccordionContent,
    AccordionHeader,
    AccordionItem,
} from "./Accordion";

const ScoreBadge = ({ score }: { score: number }) => {
    return (
        <div
            className={cn(
                "flex flex-row gap-1 items-center px-2 py-0.5 rounded-[96px]",
                score > 69 ? "bg-badge-green" : score > 39 ? "bg-badge-yellow" : "bg-badge-red"
            )}
        >
            <img src={score > 69 ? "/icons/check.svg" : "/icons/warning.svg"} alt="score" className="size-4" />
            <p
                className={cn(
                    "text-sm font-medium",
                    score > 69 ? "text-badge-green-text" : score > 39 ? "text-badge-yellow-text" : "text-badge-red-text"
                )}
            >
                {score}/100
            </p>
        </div>
    );
};

const CategoryHeader = ({ title, categoryScore }: { title: string; categoryScore: number }) => {
    return (
        <div className="flex flex-row gap-4 items-center py-2">
            <p className="text-2xl font-semibold">{title}</p>
            <ScoreBadge score={categoryScore} />
        </div>
    );
};

/*
  Expected AI response shape. The prompt will instruct the model to return only JSON matching this.
*/
interface AISuggestion {
    title?: string;
    suggestedEdits: string[]; // concise edits user can make
    beforeAfter?: { before: string; after: string }[]; // examples
    sampleLines: string[]; // 1-3 pasteable lines
    quickSwaps?: { from: string; to: string[] }[]; // short phrase swaps
    notes?: string; // optional short note
}

const CategoryContent = ({
                             tips,
                             resumePath,
                         }: {
    tips: { type: "good" | "improve"; tip: string; explanation: string }[];
    resumePath?: string;
}) => {
    const puter = usePuterStore();
    const [suggestions, setSuggestions] = useState<Record<number, string | AISuggestion>>({});
    const [loadingIndex, setLoadingIndex] = useState<number | null>(null);

    const handleSuggest = async (
        tip: { type: "good" | "improve"; tip: string; explanation: string },
        index: number
    ) => {
        if (!puter?.ai?.chat) {
            setSuggestions((s) => ({ ...s, [index]: "AI not available" }));
            return;
        }

        setLoadingIndex(index);
        setSuggestions((s) => ({ ...s, [index]: "Generating..." }));

        const responseTypeHint = `Return ONLY valid JSON that matches this TypeScript interface exactly.
        Do not include explanations, markdown, or extra text.
        
        interface AISuggestion {
          title?: string;
          suggestedEdits: string[];        // max 3 short bullets
          beforeAfter?: { before: string; after: string }[]; // exact resume line changes
          sampleLines: string[];           // 1–2 paste-ready lines
          quickSwaps?: { from: string; to: string[] }[];
          notes?: string;
        }`;

        try {
            // build chat message contents: include file reference if resumePath available
            const contents: any[] = [];
            if (resumePath) {
                contents.push({ type: "file", puter_path: resumePath });
            }
            contents.push({
                type: "text",
                text:
                    `${responseTypeHint}
                    
                    You are improving a resume.
                    
                    Rules:
                    - Refer to the attached resume when possible.
                    - Suggest ONLY concrete, actionable edits.
                    - Keep suggestions short and specific.
                    - Do NOT repeat the tip or explanation.
                    - Prefer showing exact line replacements.
                    
                    Context:
                    Tip: "${tip.tip}"
                    Issue: "${tip.explanation}"
                    
                    Return the AISuggestion JSON only.`,
            });

            const prompt: ChatMessage[] = [
                {
                    role: "user",
                    content: contents,
                },
            ];

            const res = (await puter.ai.chat(prompt, { model: "claude-sonnet-4" })) as AIResponse | undefined;

            const rawContent = res?.message?.content;
            let text = "";

            if (typeof rawContent === "string") {
                text = rawContent;
            } else if (Array.isArray(rawContent)) {
                const parts = rawContent
                    .map((c: any) => {
                        if (typeof c === "string") return c;
                        if (c && c.type === "text" && typeof c.text === "string") return c.text;
                        return "";
                    })
                    .filter(Boolean);
                text = parts.join("\n").trim();
            } else if (rawContent !== undefined && rawContent !== null) {
                text = JSON.stringify(rawContent);
            }

            // Try to parse strict JSON; fallback to raw text or extract JSON block
            try {
                const parsed = JSON.parse(text) as AISuggestion;
                if (parsed && Array.isArray(parsed.suggestedEdits) && Array.isArray(parsed.sampleLines)) {
                    setSuggestions((s) => ({ ...s, [index]: parsed }));
                } else {
                    setSuggestions((s) => ({ ...s, [index]: text || "No suggestion returned" }));
                }
            } catch {
                const jsonMatch = text.match(/\{[\s\S]*\}$/);
                if (jsonMatch) {
                    try {
                        const parsed = JSON.parse(jsonMatch[0]) as AISuggestion;
                        if (parsed && Array.isArray(parsed.suggestedEdits) && Array.isArray(parsed.sampleLines)) {
                            setSuggestions((s) => ({ ...s, [index]: parsed }));
                        } else {
                            setSuggestions((s) => ({ ...s, [index]: text || "No suggestion returned" }));
                        }
                    } catch {
                        setSuggestions((s) => ({ ...s, [index]: text || "No suggestion returned" }));
                    }
                } else {
                    setSuggestions((s) => ({ ...s, [index]: text || "No suggestion returned" }));
                }
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to generate suggestion";
            setSuggestions((s) => ({ ...s, [index]: `Error: ${msg}` }));
        } finally {
            setLoadingIndex(null);
        }
    };

    return (
        <div className="flex flex-col gap-4 items-center w-full">
            <div className="bg-gray-50 w-full rounded-lg px-5 py-4 grid grid-col-1 md:grid-cols-2 gap-4">
                {tips.map((tip, index) => (
                    <div className="flex flex-row gap-2 items-center" key={index}>
                        <img src={tip.type === "good" ? "/icons/check.svg" : "/icons/warning.svg"} alt="score" className="size-5" />
                        <p className="text-xl text-gray-500 ">{tip.tip}</p>
                    </div>
                ))}
            </div>

            <div className="flex flex-col gap-4 w-full">
                {tips.map((tip, index) => (
                    <div
                        key={index + tip.tip}
                        className={cn(
                            "flex flex-col gap-2 rounded-2xl p-4",
                            tip.type === "good" ? "bg-green-50 border border-green-200 text-green-700" : "bg-yellow-50 border border-yellow-200 text-yellow-700"
                        )}
                    >
                        <div className="flex flex-row gap-2 items-center">
                            <img src={tip.type === "good" ? "/icons/check.svg" : "/icons/warning.svg"} alt="score" className="size-5" />
                            <p className="text-xl font-semibold">{tip.tip}</p>
                        </div>
                        <p>{tip.explanation}</p>

                        <div className="flex justify-end mt-2">
                            {tip.type === "improve" && (
                                loadingIndex === index ? (
                                    <span className="text-xs text-gray-500">Generating...</span>
                                ) : (
                                    <button
                                        disabled={loadingIndex !== null}
                                        className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-2 cursor-pointer"
                                        onClick={() => handleSuggest(tip, index)}
                                    >
                                        ✨ Improve
                                    </button>
                                )
                            )}
                        </div>

                        {suggestions[index] ? (
                            typeof suggestions[index] === "string" ? (
                                <div className="mt-3 p-3 rounded-lg bg-white border border-gray-200 text-gray-800">
                                    <p className="text-sm font-semibold">AI suggestion</p>
                                    <pre className="whitespace-pre-wrap text-sm">{suggestions[index]}</pre>
                                </div>
                            ) : (
                                (() => {
                                    const s = suggestions[index] as AISuggestion;
                                    return (
                                        <div className="mt-3 p-3 rounded-lg bg-white border border-gray-200 text-gray-800">
                                            {s.title ? <p className="font-semibold">{s.title}</p> : null}

                                            <div className="mt-2">
                                                <p className="text-sm font-semibold">Suggested edits</p>
                                                <ul className="list-disc ml-5 text-sm">
                                                    {s.suggestedEdits.map((e, i) => (
                                                        <li key={i}>{e}</li>
                                                    ))}
                                                </ul>
                                            </div>

                                            {s.beforeAfter && s.beforeAfter.length ? (
                                                <div className="mt-2">
                                                    <p className="text-sm font-semibold">Before / After</p>
                                                    {s.beforeAfter.map((ba, i) => (
                                                        <div key={i} className="text-sm my-1">
                                                            <div className="font-medium">Before:</div>
                                                            <div className="whitespace-pre-wrap">{ba.before}</div>
                                                            <div className="font-medium mt-1">After:</div>
                                                            <div className="whitespace-pre-wrap">{ba.after}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : null}

                                            <div className="mt-2">
                                                <p className="text-sm font-semibold">Sample lines</p>
                                                <ul className="list-disc ml-5 text-sm">
                                                    {s.sampleLines.map((line, i) => (
                                                        <li key={i} className="whitespace-pre-wrap">{line}</li>
                                                    ))}
                                                </ul>
                                            </div>

                                            {s.quickSwaps && s.quickSwaps.length ? (
                                                <div className="mt-2">
                                                    <p className="text-sm font-semibold">Quick swaps</p>
                                                    <ul className="list-disc ml-5 text-sm">
                                                        {s.quickSwaps.map((q, i) => (
                                                            <li key={i}>
                                                                <strong>{q.from}</strong> → {q.to.join(" / ")}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ) : null}

                                            {s.notes ? (
                                                <div className="mt-2 text-sm text-gray-600">
                                                    <p className="font-semibold">Note</p>
                                                    <p>{s.notes}</p>
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                })()
                            )
                        ) : null}
                    </div>
                ))}
            </div>
        </div>
    );
};

const Details = ({ feedback, resumePath }: { feedback: Feedback; resumePath?: string }) => {
    return (
        <div className="flex flex-col gap-4 w-full">
            <Accordion>
                <AccordionItem id="tone-style">
                    <AccordionHeader itemId="tone-style">
                        <CategoryHeader title="Tone & Style" categoryScore={feedback.toneAndStyle.score} />
                    </AccordionHeader>
                    <AccordionContent itemId="tone-style">
                        <CategoryContent tips={feedback.toneAndStyle.tips} resumePath={resumePath} />
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem id="content">
                    <AccordionHeader itemId="content">
                        <CategoryHeader title="Content" categoryScore={feedback.content.score} />
                    </AccordionHeader>
                    <AccordionContent itemId="content">
                        <CategoryContent tips={feedback.content.tips} resumePath={resumePath} />
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem id="structure">
                    <AccordionHeader itemId="structure">
                        <CategoryHeader title="Structure" categoryScore={feedback.structure.score} />
                    </AccordionHeader>
                    <AccordionContent itemId="structure">
                        <CategoryContent tips={feedback.structure.tips} resumePath={resumePath} />
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem id="skills">
                    <AccordionHeader itemId="skills">
                        <CategoryHeader title="Skills" categoryScore={feedback.skills.score} />
                    </AccordionHeader>
                    <AccordionContent itemId="skills">
                        <CategoryContent tips={feedback.skills.tips} resumePath={resumePath} />
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    );
};

export default Details;
