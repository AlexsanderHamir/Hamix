package handler

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/AlexsanderHamir/T2A/pkgs/tasks/domain"
)

func TestHTTP_projectsCRUDAndContext(t *testing.T) {
	srv := newTaskTestServer(t)
	defer srv.Close()

	res, err := http.Post(srv.URL+"/projects", "application/json", strings.NewReader(`{"name":"Moat","description":"Long work","context_summary":"Shared memory"}`))
	if err != nil {
		t.Fatal(err)
	}
	projectBytes, err := io.ReadAll(res.Body)
	if cerr := res.Body.Close(); cerr != nil {
		t.Fatal(cerr)
	}
	if err != nil {
		t.Fatal(err)
	}
	if res.StatusCode != http.StatusCreated {
		t.Fatalf("create project status %d body %s", res.StatusCode, projectBytes)
	}
	var project domain.Project
	if err := json.Unmarshal(projectBytes, &project); err != nil {
		t.Fatal(err)
	}
	if project.ID == "" || project.Status != domain.ProjectStatusActive {
		t.Fatalf("project = %#v", project)
	}

	itemRes, err := http.Post(srv.URL+"/projects/"+project.ID+"/context", "application/json", strings.NewReader(`{"kind":"requirement","title":"Use relational context","body":"No vector store in v1","pinned":true}`))
	if err != nil {
		t.Fatal(err)
	}
	itemBytes, err := io.ReadAll(itemRes.Body)
	if cerr := itemRes.Body.Close(); cerr != nil {
		t.Fatal(cerr)
	}
	if err != nil {
		t.Fatal(err)
	}
	if itemRes.StatusCode != http.StatusCreated {
		t.Fatalf("create context status %d body %s", itemRes.StatusCode, itemBytes)
	}
	var item domain.ProjectContextItem
	if err := json.Unmarshal(itemBytes, &item); err != nil {
		t.Fatal(err)
	}
	if item.ProjectID != project.ID || item.Kind != domain.ProjectContextKind("requirement") || !item.Pinned {
		t.Fatalf("context item = %#v", item)
	}
	secondItemRes, err := http.Post(srv.URL+"/projects/"+project.ID+"/context", "application/json", strings.NewReader(`{"kind":"constraint","title":"Explicit selection","body":"Tasks choose context nodes."}`))
	if err != nil {
		t.Fatal(err)
	}
	secondItemBytes, err := io.ReadAll(secondItemRes.Body)
	if cerr := secondItemRes.Body.Close(); cerr != nil {
		t.Fatal(cerr)
	}
	if err != nil {
		t.Fatal(err)
	}
	if secondItemRes.StatusCode != http.StatusCreated {
		t.Fatalf("create second context status %d body %s", secondItemRes.StatusCode, secondItemBytes)
	}
	var secondItem domain.ProjectContextItem
	if err := json.Unmarshal(secondItemBytes, &secondItem); err != nil {
		t.Fatal(err)
	}

	edgeRes, err := http.Post(srv.URL+"/projects/"+project.ID+"/context/edges", "application/json", strings.NewReader(`{"source_context_id":"`+item.ID+`","target_context_id":"`+secondItem.ID+`","relation":"supports","strength":4,"note":"Decision supports constraint"}`))
	if err != nil {
		t.Fatal(err)
	}
	edgeBytes, err := io.ReadAll(edgeRes.Body)
	if cerr := edgeRes.Body.Close(); cerr != nil {
		t.Fatal(cerr)
	}
	if err != nil {
		t.Fatal(err)
	}
	if edgeRes.StatusCode != http.StatusCreated {
		t.Fatalf("create edge status %d body %s", edgeRes.StatusCode, edgeBytes)
	}
	var edge domain.ProjectContextEdge
	if err := json.Unmarshal(edgeBytes, &edge); err != nil {
		t.Fatal(err)
	}
	if edge.ProjectID != project.ID || edge.Relation != domain.ProjectContextRelationSupports || edge.Strength != 4 {
		t.Fatalf("edge = %#v", edge)
	}

	listRes, err := http.Get(srv.URL + "/projects/" + project.ID + "/context")
	if err != nil {
		t.Fatal(err)
	}
	defer listRes.Body.Close()
	if listRes.StatusCode != http.StatusOK {
		t.Fatalf("context list status %d", listRes.StatusCode)
	}
	var list struct {
		Items []domain.ProjectContextItem `json:"items"`
		Edges []domain.ProjectContextEdge `json:"edges"`
	}
	if err := json.NewDecoder(listRes.Body).Decode(&list); err != nil {
		t.Fatal(err)
	}
	if len(list.Items) != 2 || list.Items[0].ID != item.ID {
		t.Fatalf("items = %#v", list.Items)
	}
	if len(list.Edges) != 1 || list.Edges[0].ID != edge.ID {
		t.Fatalf("edges = %#v", list.Edges)
	}

	req, err := http.NewRequest(http.MethodPatch, srv.URL+"/projects/"+project.ID, strings.NewReader(`{"status":"archived"}`))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")
	patchRes, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer patchRes.Body.Close()
	if patchRes.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(patchRes.Body)
		t.Fatalf("patch project status %d body %s", patchRes.StatusCode, b)
	}
	var updated domain.Project
	if err := json.NewDecoder(patchRes.Body).Decode(&updated); err != nil {
		t.Fatal(err)
	}
	if updated.Status != domain.ProjectStatusArchived {
		t.Fatalf("updated status = %q", updated.Status)
	}
}

func TestHTTP_taskProjectIDCreatePatchAndClear(t *testing.T) {
	srv := newTaskTestServer(t)
	defer srv.Close()

	project := postProjectJSON(t, srv, `{"name":"Project owner"}`, http.StatusCreated)
	task := postTaskJSON(t, srv, `{"title":"linked","priority":"medium","project_id":"`+project.ID+`"}`, http.StatusCreated)
	if task.ProjectID == nil || *task.ProjectID != project.ID {
		t.Fatalf("created task project_id = %#v, want %s", task.ProjectID, project.ID)
	}

	req, err := http.NewRequest(http.MethodPatch, srv.URL+"/tasks/"+task.ID, strings.NewReader(`{"project_id":null}`))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(res.Body)
		t.Fatalf("patch task project status %d body %s", res.StatusCode, b)
	}
	var cleared domain.Task
	if err := json.NewDecoder(res.Body).Decode(&cleared); err != nil {
		t.Fatal(err)
	}
	if cleared.ProjectID != nil {
		t.Fatalf("cleared task project_id = %#v, want nil", cleared.ProjectID)
	}
}

func postProjectJSON(t *testing.T, srv *httptest.Server, body string, want int) domain.Project {
	t.Helper()
	res, err := http.Post(srv.URL+"/projects", "application/json", strings.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	b, err := io.ReadAll(res.Body)
	if err != nil {
		t.Fatal(err)
	}
	if res.StatusCode != want {
		t.Fatalf("POST /projects status %d body %s", res.StatusCode, b)
	}
	var project domain.Project
	if err := json.Unmarshal(b, &project); err != nil {
		t.Fatal(err)
	}
	return project
}

func TestHTTP_projectStepsListCreatePatchDelete(t *testing.T) {
	srv := newTaskTestServer(t)
	defer srv.Close()

	project := postProjectJSON(t, srv, `{"name":"StepsProj"}`, http.StatusCreated)

	goalRes, err := http.Post(srv.URL+"/projects/"+project.ID+"/goals", "application/json", strings.NewReader(`{"title":"Goal A"}`))
	if err != nil {
		t.Fatal(err)
	}
	goalBytes, err := io.ReadAll(goalRes.Body)
	if cerr := goalRes.Body.Close(); cerr != nil {
		t.Fatal(cerr)
	}
	if err != nil {
		t.Fatal(err)
	}
	if goalRes.StatusCode != http.StatusCreated {
		t.Fatalf("create goal status %d body %s", goalRes.StatusCode, goalBytes)
	}
	var goal domain.ProjectGoal
	if err := json.Unmarshal(goalBytes, &goal); err != nil {
		t.Fatal(err)
	}
	if goal.ID == "" {
		t.Fatal("expected goal id")
	}

	stepRes, err := http.Post(srv.URL+"/projects/"+project.ID+"/steps", "application/json", strings.NewReader(`{"title":"Alpha","goal_id":"`+goal.ID+`"}`))
	if err != nil {
		t.Fatal(err)
	}
	stepBytes, err := io.ReadAll(stepRes.Body)
	if cerr := stepRes.Body.Close(); cerr != nil {
		t.Fatal(cerr)
	}
	if err != nil {
		t.Fatal(err)
	}
	if stepRes.StatusCode != http.StatusCreated {
		t.Fatalf("create step status %d body %s", stepRes.StatusCode, stepBytes)
	}
	var step domain.ProjectStep
	if err := json.Unmarshal(stepBytes, &step); err != nil {
		t.Fatal(err)
	}
	if step.ProjectID != project.ID || strings.TrimSpace(step.Title) != "Alpha" {
		t.Fatalf("step = %#v", step)
	}

	listRes, err := http.Get(srv.URL + "/projects/" + project.ID + "/steps")
	if err != nil {
		t.Fatal(err)
	}
	listBytes, err := io.ReadAll(listRes.Body)
	if cerr := listRes.Body.Close(); cerr != nil {
		t.Fatal(cerr)
	}
	if err != nil {
		t.Fatal(err)
	}
	if listRes.StatusCode != http.StatusOK {
		t.Fatalf("list steps status %d body %s", listRes.StatusCode, listBytes)
	}
	var listEnvelope struct {
		Steps []domain.ProjectStep `json:"steps"`
	}
	if err := json.Unmarshal(listBytes, &listEnvelope); err != nil {
		t.Fatal(err)
	}
	if len(listEnvelope.Steps) != 1 {
		t.Fatalf("steps len = %d", len(listEnvelope.Steps))
	}

	getRes, err := http.Get(srv.URL + "/projects/" + project.ID + "/steps/" + step.ID)
	if err != nil {
		t.Fatal(err)
	}
	getBytes, err := io.ReadAll(getRes.Body)
	if cerr := getRes.Body.Close(); cerr != nil {
		t.Fatal(cerr)
	}
	if err != nil {
		t.Fatal(err)
	}
	if getRes.StatusCode != http.StatusOK {
		t.Fatalf("get step status %d body %s", getRes.StatusCode, getBytes)
	}

	patchReq, err := http.NewRequest(http.MethodPatch, srv.URL+"/projects/"+project.ID+"/steps/"+step.ID, strings.NewReader(`{"title":"Alpha renamed"}`))
	if err != nil {
		t.Fatal(err)
	}
	patchReq.Header.Set("Content-Type", "application/json")
	patchRes, err := http.DefaultClient.Do(patchReq)
	if err != nil {
		t.Fatal(err)
	}
	patchBytes, err := io.ReadAll(patchRes.Body)
	if cerr := patchRes.Body.Close(); cerr != nil {
		t.Fatal(err)
	}
	if err != nil {
		t.Fatal(err)
	}
	if patchRes.StatusCode != http.StatusOK {
		t.Fatalf("patch step status %d body %s", patchRes.StatusCode, patchBytes)
	}

	delReq, err := http.NewRequest(http.MethodDelete, srv.URL+"/projects/"+project.ID+"/steps/"+step.ID, nil)
	if err != nil {
		t.Fatal(err)
	}
	delRes, err := http.DefaultClient.Do(delReq)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := io.Copy(io.Discard, delRes.Body); err != nil {
		t.Fatal(err)
	}
	if cerr := delRes.Body.Close(); cerr != nil {
		t.Fatal(err)
	}
	if delRes.StatusCode != http.StatusNoContent {
		t.Fatalf("delete step status %d", delRes.StatusCode)
	}
}

func TestHTTP_projectGoalsListCreateDependent(t *testing.T) {
	srv := newTaskTestServer(t)
	defer srv.Close()

	project := postProjectJSON(t, srv, `{"name":"GoalsProj"}`, http.StatusCreated)

	aRes, err := http.Post(srv.URL+"/projects/"+project.ID+"/goals", "application/json", strings.NewReader(`{"title":"A","description":"first"}`))
	if err != nil {
		t.Fatal(err)
	}
	aBody, err := io.ReadAll(aRes.Body)
	if cerr := aRes.Body.Close(); cerr != nil {
		t.Fatal(cerr)
	}
	if aRes.StatusCode != http.StatusCreated {
		t.Fatalf("create goal A status %d body %s", aRes.StatusCode, aBody)
	}
	var goalA domain.ProjectGoal
	if err := json.Unmarshal(aBody, &goalA); err != nil {
		t.Fatal(err)
	}
	if goalA.GateStatus != domain.ProjectStepGateActive {
		t.Fatalf("independent goal gate = %q want active", goalA.GateStatus)
	}

	bRes, err := http.Post(srv.URL+"/projects/"+project.ID+"/goals", "application/json", strings.NewReader(
		`{"title":"B","depends_on_goal_ids":["`+goalA.ID+`"]}`,
	))
	if err != nil {
		t.Fatal(err)
	}
	bBody, err := io.ReadAll(bRes.Body)
	if cerr := bRes.Body.Close(); cerr != nil {
		t.Fatal(cerr)
	}
	if bRes.StatusCode != http.StatusCreated {
		t.Fatalf("create goal B status %d body %s", bRes.StatusCode, bBody)
	}
	var goalB domain.ProjectGoal
	if err := json.Unmarshal(bBody, &goalB); err != nil {
		t.Fatal(err)
	}
	if goalB.GateStatus != domain.ProjectStepGateLocked {
		t.Fatalf("dependent goal gate = %q want locked", goalB.GateStatus)
	}

	listRes, err := http.Get(srv.URL + "/projects/" + project.ID + "/goals")
	if err != nil {
		t.Fatal(err)
	}
	listBody, err := io.ReadAll(listRes.Body)
	if cerr := listRes.Body.Close(); cerr != nil {
		t.Fatal(cerr)
	}
	if listRes.StatusCode != http.StatusOK {
		t.Fatalf("list goals status %d body %s", listRes.StatusCode, listBody)
	}
	var list struct {
		Goals []domain.ProjectGoal `json:"goals"`
	}
	if err := json.Unmarshal(listBody, &list); err != nil {
		t.Fatal(err)
	}
	if len(list.Goals) != 2 {
		t.Fatalf("goals len = %d", len(list.Goals))
	}
}

func TestHTTP_projectStepCriteria_blocks_gate_until_all_done(t *testing.T) {
	srv := newTaskTestServer(t)
	defer srv.Close()

	project := postProjectJSON(t, srv, `{"name":"CritProj"}`, http.StatusCreated)

	goalRes, err := http.Post(srv.URL+"/projects/"+project.ID+"/goals", "application/json", strings.NewReader(`{"title":"G"}`))
	if err != nil {
		t.Fatal(err)
	}
	goalBytes, err := io.ReadAll(goalRes.Body)
	if cerr := goalRes.Body.Close(); cerr != nil {
		t.Fatal(cerr)
	}
	if err != nil {
		t.Fatal(err)
	}
	if goalRes.StatusCode != http.StatusCreated {
		t.Fatalf("create goal status %d body %s", goalRes.StatusCode, goalBytes)
	}
	var goal domain.ProjectGoal
	if err := json.Unmarshal(goalBytes, &goal); err != nil {
		t.Fatal(err)
	}

	stepRes, err := http.Post(
		srv.URL+"/projects/"+project.ID+"/steps",
		"application/json",
		strings.NewReader(`{"title":"Gate step","goal_id":"`+goal.ID+`","criteria":[{"text":"Ship checklist","done":false}]}`),
	)
	if err != nil {
		t.Fatal(err)
	}
	stepBytes, err := io.ReadAll(stepRes.Body)
	if cerr := stepRes.Body.Close(); cerr != nil {
		t.Fatal(cerr)
	}
	if err != nil {
		t.Fatal(err)
	}
	if stepRes.StatusCode != http.StatusCreated {
		t.Fatalf("create step status %d body %s", stepRes.StatusCode, stepBytes)
	}
	var step domain.ProjectStep
	if err := json.Unmarshal(stepBytes, &step); err != nil {
		t.Fatal(err)
	}
	if len(step.Criteria) != 1 || step.Criteria[0].Text != "Ship checklist" {
		t.Fatalf("step criteria = %#v", step.Criteria)
	}
	critID := step.Criteria[0].ID
	if critID == "" {
		t.Fatal("expected server-assigned criterion id")
	}

	task := postTaskJSON(t, srv, `{"title":"work","priority":"medium","project_id":"`+project.ID+`","project_step_id":"`+step.ID+`"}`, http.StatusCreated)

	patchDone, err := http.NewRequest(
		http.MethodPatch,
		srv.URL+"/tasks/"+task.ID,
		strings.NewReader(`{"status":"done"}`),
	)
	if err != nil {
		t.Fatal(err)
	}
	patchDone.Header.Set("Content-Type", "application/json")
	doneRes, err := http.DefaultClient.Do(patchDone)
	if err != nil {
		t.Fatal(err)
	}
	doneBody, err := io.ReadAll(doneRes.Body)
	if cerr := doneRes.Body.Close(); cerr != nil {
		t.Fatal(cerr)
	}
	if err != nil {
		t.Fatal(err)
	}
	if doneRes.StatusCode != http.StatusOK {
		t.Fatalf("patch task done status %d body %s", doneRes.StatusCode, doneBody)
	}

	getRes, err := http.Get(srv.URL + "/projects/" + project.ID + "/steps/" + step.ID)
	if err != nil {
		t.Fatal(err)
	}
	getBytes, err := io.ReadAll(getRes.Body)
	if cerr := getRes.Body.Close(); cerr != nil {
		t.Fatal(err)
	}
	if err != nil {
		t.Fatal(err)
	}
	if getRes.StatusCode != http.StatusOK {
		t.Fatalf("get step status %d body %s", getRes.StatusCode, getBytes)
	}
	var afterTask domain.ProjectStep
	if err := json.Unmarshal(getBytes, &afterTask); err != nil {
		t.Fatal(err)
	}
	if afterTask.GateStatus != domain.ProjectStepGateActive {
		t.Fatalf("gate_status = %q want active while criterion open", afterTask.GateStatus)
	}

	patchCritBody := `{"criteria":[{"id":"` + critID + `","text":"Ship checklist","done":true,"sort_order":1}]}`
	patchCrit, err := http.NewRequest(
		http.MethodPatch,
		srv.URL+"/projects/"+project.ID+"/steps/"+step.ID,
		strings.NewReader(patchCritBody),
	)
	if err != nil {
		t.Fatal(err)
	}
	patchCrit.Header.Set("Content-Type", "application/json")
	critRes, err := http.DefaultClient.Do(patchCrit)
	if err != nil {
		t.Fatal(err)
	}
	critBytes, err := io.ReadAll(critRes.Body)
	if cerr := critRes.Body.Close(); cerr != nil {
		t.Fatal(err)
	}
	if err != nil {
		t.Fatal(err)
	}
	if critRes.StatusCode != http.StatusOK {
		t.Fatalf("patch criteria status %d body %s", critRes.StatusCode, critBytes)
	}
	var afterCrit domain.ProjectStep
	if err := json.Unmarshal(critBytes, &afterCrit); err != nil {
		t.Fatal(err)
	}
	if afterCrit.GateStatus != domain.ProjectStepGatePendingRelease {
		t.Fatalf("gate_status = %q want pending_release after criteria complete", afterCrit.GateStatus)
	}
}
