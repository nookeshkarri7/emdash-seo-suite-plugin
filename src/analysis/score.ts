import { analyzeReadability, type AnalysisCheck } from "./readability.js";
import { analyzeSeo, type AnalyzeInput, type AnalysisResult } from "./seo.js";

export interface FullAnalysis extends AnalysisResult {
	readabilityChecks: AnalysisCheck[];
	readabilityOverall: "good" | "ok" | "bad";
}

function worst(statuses: Array<AnalysisCheck["status"]>): FullAnalysis["readabilityOverall"] {
	if (statuses.includes("bad")) return "bad";
	if (statuses.includes("ok")) return "ok";
	return "good";
}

export function runFullAnalysis(input: AnalyzeInput): FullAnalysis {
	const seo = analyzeSeo(input);
	const readabilityChecks = analyzeReadability(input.content);
	return {
		...seo,
		readabilityChecks,
		readabilityOverall: worst(readabilityChecks.map((c) => c.status)),
	};
}

export function statusEmoji(status: AnalysisCheck["status"]): string {
	if (status === "good") return "● Good";
	if (status === "ok") return "● OK";
	return "● Needs work";
}
