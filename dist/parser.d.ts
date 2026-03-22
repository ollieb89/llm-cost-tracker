export interface ParsedUsage {
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    source: string;
    rawMatch?: string;
}
export declare function parseLogContent(content: string): ParsedUsage[];
export declare function validateTokens(inputTokens: number, outputTokens: number): string | null;
