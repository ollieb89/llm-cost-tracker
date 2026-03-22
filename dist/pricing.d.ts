export interface ModelPricing {
    provider: string;
    model: string;
    inputPer1M: number;
    outputPer1M: number;
    aliases?: string[];
}
export declare const PRICING_TABLE: ModelPricing[];
export declare function lookupPricing(provider: string, model: string): ModelPricing | null;
export declare function calculateCost(pricing: ModelPricing, inputTokens: number, outputTokens: number): {
    inputCost: number;
    outputCost: number;
    totalCost: number;
};
export declare function formatUSD(amount: number): string;
export declare function listProviders(): string[];
