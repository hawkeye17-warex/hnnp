export type QuizSession = {
  id: string;
  org_id: string;
  course_id?: string | null;
  receiver_id?: string | null;
  title: string;
  start_time: string;
  end_time: string;
  status: string;
  created_by: string;
  settings_json?: any;
  created_at?: string;
};

export type QuizQuestion = {
  id: string;
  quiz_id: string;
  type: string;
  text: string;
  options_json?: any;
  correct_option?: string | null;
  time_limit_sec?: number | null;
  created_at?: string;
};

export type QuizSubmission = {
  id: string;
  quiz_id: string;
  profile_id: string;
  submitted_at: string;
  answers_json?: any;
  score?: number | null;
  status: string;
  created_at?: string;
};
