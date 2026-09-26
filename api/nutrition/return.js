import { handleNutritionRequest } from './index.js';

// A callback without a pre-existing query string works with checkout providers
// that append their own transaction parameters to the return URL.
export function handleNutritionReturnRequest(request, options) {
  const url = new URL(request.url);
  url.searchParams.set('action', 'return');
  return handleNutritionRequest(new Request(url, request), options);
}
export function GET(request) { return handleNutritionReturnRequest(request); }
