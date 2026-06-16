export type AutomationState = "yes" | "no";

export type Automation = {
  id: string;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
  archived_at?: string;
};

export type AutomationSelection = {
  automation_id: string;
  state: AutomationState;
};

export type AutomationListResponse = {
  automations: Automation[];
  limit: number;
};
