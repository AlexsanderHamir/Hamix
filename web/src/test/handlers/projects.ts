import { http, HttpResponse } from "msw";
import { DEFAULT_PROJECT_ID } from "@/types";

export function projectsListEmpty(limit = 100) {
  return http.get("/projects", () =>
    HttpResponse.json({ projects: [], limit }),
  );
}

export function projectContextEmpty(projectId = DEFAULT_PROJECT_ID, limit = 100) {
  return http.get(`/projects/${projectId}/context`, () =>
    HttpResponse.json({ items: [], edges: [], limit }),
  );
}
