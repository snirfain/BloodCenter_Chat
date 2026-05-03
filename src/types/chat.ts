export type MessageSender = 'bot' | 'user';

export interface ChatMessage {
  id: string;
  sender: MessageSender;
  text: string;
  timestamp: Date;
  isTyping?: boolean;
}

export type FinalStatus =
  | 'זכאות מלאה'
  | 'זכאות עם אישור'
  | 'פסילה קבועה'
  | 'פסילה זמנית'
  | 'בירור רפואי';

export type IssueType = 'פסילה קבועה' | 'פסילה זמנית' | 'בירור רפואי' | 'זכאות עם אישור';

export interface Issue {
  type: IssueType;
  reason: string;
  waitTime?: string;
  /** אם מוגדר, מוצג בסיכום במקום שילוב reason + (המתנה: waitTime) */
  summaryLine?: string;
}

export interface SessionAnswers {
  phoneNumber?: string;
  lastDonationDate?: string;        // ISO date or special token
  lastDonation?: string;            // token from quick reply
  age?: string;                     // age bracket token
  weight?: string;                  // 'above50' | 'below50'
  pregnancy?: string;               // 'yes' | 'no'
  procedureType?: string;           // 'none' | 'tattoo' | 'colonoscopy_gastroscopy'
  biopsyTaken?: string;             // 'yes' | 'no'
  biopsyResult?: string;            // 'normal' | 'abnormal'
  colonoscopyResult?: string;       // 'normal' | 'abnormal'
  tookMedications?: string;         // 'yes' | 'no'
  medicationName?: string;
  medicationIndication?: string;
  medicationAction?: string;
  hasDisease?: string;              // 'yes' | 'no'
  diseaseDetails?: string;
  recentIllness?: string;           // 'none' | 'infection' | 'dental'
  infectionDetails?: string;
  dentalType?: string;              // 'hygienist' | 'extraction' | 'implant'
  travelledAbroad?: string;         // 'yes' | 'no'
  travelTimeframe?: string;
  travelCountry?: string;
  countryRisk?: string;
  additionalInfo?: string;
  sessionFeedbackText?: string;
}

// ─── Flow step IDs ────────────────────────────────────────────────────────────

export type FlowStep =
  | 'phone'
  | 'last_donation'
  | 'last_donation_date'
  | 'age'
  | 'weight'
  | 'pregnancy'
  | 'procedure'
  | 'colonoscopy_biopsy'
  | 'colonoscopy_biopsy_result'
  | 'colonoscopy_result'
  | 'medications'
  | 'medication_name'
  | 'medication_indication'
  | 'disease'
  | 'disease_details'
  | 'illness'
  | 'infection_details'
  | 'dental_type'
  | 'travel'
  | 'travel_timeframe'
  | 'travel_country'
  | 'additional_info'
  | 'medication_unknown_retry'
  | 'country_unknown_retry'
  | 'country_geocode_confirm'
  | 'medication_llm_confirm'
  | 'disease_llm_confirm'
  | 'final'
  | 'rating';
