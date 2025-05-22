'use server';
/**
 * @fileOverview Predicts the probability of a product reaching a target price and suggests a check-back date.
 *
 * - predictTargetPriceProbability - A function that predicts the probability of a product reaching a target price.
 * - PredictTargetPriceProbabilityInput - The input type for the predictTargetPriceProbability function.
 * - PredictTargetPriceProbabilityOutput - The return type for the predictTargetPriceProbability function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PredictTargetPriceProbabilityInputSchema = z.object({
  priceHistory: z
    .array(z.object({date: z.string(), price: z.number()}))
    .describe('The historical price data for the product.'),
  targetPrice: z.number().describe('The target price to predict the probability for.'),
});
export type PredictTargetPriceProbabilityInput = z.infer<typeof PredictTargetPriceProbabilityInputSchema>;

const PredictTargetPriceProbabilityOutputSchema = z.object({
  probability: z
    .number()
    .describe('The probability (0 to 1) of the product reaching the target price.'),
  suggestedCheckbackDate: z.string().describe('A suggested date to check back on the price.'),
  reasoning: z.string().describe('Explanation of the probability and checkback date.'),
});
export type PredictTargetPriceProbabilityOutput = z.infer<typeof PredictTargetPriceProbabilityOutputSchema>;

export async function predictTargetPriceProbability(
  input: PredictTargetPriceProbabilityInput
): Promise<PredictTargetPriceProbabilityOutput> {
  return predictTargetPriceProbabilityFlow(input);
}

const prompt = ai.definePrompt({
  name: 'predictTargetPriceProbabilityPrompt',
  input: {schema: PredictTargetPriceProbabilityInputSchema},
  output: {schema: PredictTargetPriceProbabilityOutputSchema},
  prompt: `You are an expert price predictor.  Given the following price history and target price, determine the probability (as a number between 0 and 1) that the product will reach the target price. Also, suggest a date to check back on the price.

Price History:
{{#each priceHistory}}
- Date: {{date}}, Price: {{price}}
{{/each}}

Target Price: {{targetPrice}}

Respond with the probability, suggested checkback date, and your reasoning.

Probability: {{probability}}
Suggested Checkback Date: {{suggestedCheckbackDate}}
Reasoning: {{reasoning}}`,
});

const predictTargetPriceProbabilityFlow = ai.defineFlow(
  {
    name: 'predictTargetPriceProbabilityFlow',
    inputSchema: PredictTargetPriceProbabilityInputSchema,
    outputSchema: PredictTargetPriceProbabilityOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
