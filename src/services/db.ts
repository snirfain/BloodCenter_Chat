import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';

// ─── Users ──────────────────────────────────────────────────────────────────

export async function createUser(phoneNumber: string): Promise<string> {
  const userId = uuidv4();

  const { error } = await supabase.from('users').insert({
    id: userId,
    phone_number: phoneNumber,
  });

  if (error) {
    // In dev/demo mode without real Supabase, return a local UUID
    console.warn('Supabase insert error (users):', error.message);
  }

  return userId;
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export async function createSession(userId: string): Promise<string> {
  const sessionId = uuidv4();

  const { error } = await supabase.from('medical_sessions').insert({
    session_id: sessionId,
    user_id: userId,
    answers_log: {},
    final_status: null,
    rating: null,
  });

  if (error) {
    console.warn('Supabase insert error (medical_sessions):', error.message);
  }

  return sessionId;
}

export async function updateSession(
  sessionId: string,
  data: {
    answers_log?: Record<string, unknown>;
    final_status?: string;
    rating?: number | null;
    feedback_text?: string | null;
  },
): Promise<void> {
  const { error } = await supabase
    .from('medical_sessions')
    .update(data)
    .eq('session_id', sessionId);

  if (error) {
    console.warn('Supabase update error (medical_sessions):', error.message);
  }
}

export async function saveSessionFeedback(
  sessionId: string,
  data: { rating?: number; feedbackText?: string },
): Promise<void> {
  const update: { rating?: number; feedback_text?: string } = {};
  if (data.rating !== undefined) update.rating = data.rating;
  if (data.feedbackText !== undefined) update.feedback_text = data.feedbackText;

  if (Object.keys(update).length === 0) return;

  const { error } = await supabase
    .from('medical_sessions')
    .update(update)
    .eq('session_id', sessionId);

  if (error) {
    console.warn('Supabase update error (session feedback):', error.message);
  }
}
