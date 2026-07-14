import { FUNCTIONS_BASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../config/supabase.js';
import { reportFormFailure } from './observabilityService.js';

const REQUEST_TIMEOUT_MS = 20000;

class IntakeApiError extends Error {
  constructor(response) {
    super(response?.message || 'Não foi possível enviar os dados agora.');
    this.name = 'IntakeApiError';
    this.code = response?.code || 'INTERNAL_ERROR';
    this.fieldErrors = response?.fieldErrors || {};
    this.response = response;
  }
}

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return {
      success: false,
      code: 'INTERNAL_ERROR',
      message: 'Não foi possível processar a resposta do servidor.',
      fieldErrors: {},
    };
  }

  return response.json();
}

async function postIntake(endpoint, payload) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${FUNCTIONS_BASE_URL}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = await parseResponse(response);
    if (!response.ok || data?.success !== true) {
      const apiError = new IntakeApiError(data);
      apiError.status = response.status;
      throw apiError;
    }

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new IntakeApiError({
        success: false,
        code: 'INTERNAL_ERROR',
        message: 'O envio demorou mais do que o esperado. Tente novamente.',
      });
      reportFormFailure(endpoint, timeoutError);
      throw timeoutError;
    }

    if (error instanceof IntakeApiError) {
      reportFormFailure(endpoint, error);
      throw error;
    }

    const connectionError = new IntakeApiError({
      success: false,
      code: 'INTERNAL_ERROR',
      message: 'Falha de conexão. Verifique sua internet e tente novamente.',
    });
    reportFormFailure(endpoint, connectionError);
    throw connectionError;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function submitDonorLead(payload) {
  return postIntake('submit-donor-lead', payload);
}

export function submitPatientCase(payload) {
  return postIntake('submit-patient-case', payload);
}

export function submitDonationIntent(payload) {
  return postIntake('submit-donation-intent', payload);
}
