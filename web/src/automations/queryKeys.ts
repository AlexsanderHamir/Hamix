export const automationQueryKeys = {
  all: ["automations"] as const,
  list: (includeArchived: boolean, limit: number) =>
    [...automationQueryKeys.all, "list", includeArchived, limit] as const,
  detail: (id: string) => [...automationQueryKeys.all, "detail", id] as const,
};
