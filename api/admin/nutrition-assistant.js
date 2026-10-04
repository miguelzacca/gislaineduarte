import { handleNutritionAssistantRequest } from '../nutrition/assistant.js';

export function handleAdminNutritionAssistantRequest(request, options = {}) {
  return handleNutritionAssistantRequest(request, { ...options, scope: 'professional' });
}
export function POST(request) { return handleAdminNutritionAssistantRequest(request); }
