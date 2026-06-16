package handler

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"testing"

	"github.com/AlexsanderHamir/T2A/pkgs/tasks/domain"
)

func TestHTTP_automationsCRUD(t *testing.T) {
	srv := newTaskTestServer(t)
	defer srv.Close()

	res, err := http.Post(srv.URL+"/automations", "application/json",
		strings.NewReader(`{"title":"Run tests","description":"Run the full test suite before claiming done"}`))
	if err != nil {
		t.Fatal(err)
	}
	body, err := io.ReadAll(res.Body)
	if cerr := res.Body.Close(); cerr != nil {
		t.Fatal(cerr)
	}
	if err != nil {
		t.Fatal(err)
	}
	if res.StatusCode != http.StatusCreated {
		t.Fatalf("create status %d body %s", res.StatusCode, body)
	}
	var row domain.Automation
	if err := json.Unmarshal(body, &row); err != nil {
		t.Fatal(err)
	}
	if row.ID == "" || row.Title != "Run tests" {
		t.Fatalf("automation = %#v", row)
	}

	listRes, err := http.Get(srv.URL + "/automations")
	if err != nil {
		t.Fatal(err)
	}
	listBytes, err := io.ReadAll(listRes.Body)
	if cerr := listRes.Body.Close(); cerr != nil {
		t.Fatal(cerr)
	}
	if listRes.StatusCode != http.StatusOK {
		t.Fatalf("list status %d body %s", listRes.StatusCode, listBytes)
	}
	var list automationsListResponse
	if err := json.Unmarshal(listBytes, &list); err != nil {
		t.Fatal(err)
	}
	if len(list.Automations) != 1 {
		t.Fatalf("list = %#v", list)
	}

	patchReq, err := http.NewRequest(http.MethodPatch, srv.URL+"/automations/"+row.ID,
		strings.NewReader(`{"description":"Run go test ./... before claiming done"}`))
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
		t.Fatal(cerr)
	}
	if patchRes.StatusCode != http.StatusOK {
		t.Fatalf("patch status %d body %s", patchRes.StatusCode, patchBytes)
	}

	delReq, err := http.NewRequest(http.MethodDelete, srv.URL+"/automations/"+row.ID, nil)
	if err != nil {
		t.Fatal(err)
	}
	delRes, err := http.DefaultClient.Do(delReq)
	if err != nil {
		t.Fatal(err)
	}
	if cerr := delRes.Body.Close(); cerr != nil {
		t.Fatal(cerr)
	}
	if delRes.StatusCode != http.StatusNoContent {
		t.Fatalf("delete status %d", delRes.StatusCode)
	}
}

func TestHTTP_createTask_withAutomationSelections(t *testing.T) {
	srv := newTaskTestServer(t)
	defer srv.Close()

	autoRes, err := http.Post(srv.URL+"/automations", "application/json",
		strings.NewReader(`{"title":"Small commits","description":"keep each commit focused on one concern"}`))
	if err != nil {
		t.Fatal(err)
	}
	autoBytes, err := io.ReadAll(autoRes.Body)
	if cerr := autoRes.Body.Close(); cerr != nil {
		t.Fatal(cerr)
	}
	if autoRes.StatusCode != http.StatusCreated {
		t.Fatalf("automation create %d %s", autoRes.StatusCode, autoBytes)
	}
	var auto domain.Automation
	if err := json.Unmarshal(autoBytes, &auto); err != nil {
		t.Fatal(err)
	}

	createBody := `{
		"title":"Task with automations",
		"priority":"medium",
		"checklist_items":[{"text":"done"}],
		"automation_selections":[{"automation_id":"` + auto.ID + `","state":"yes"}]
	}`
	taskRes, err := http.Post(srv.URL+"/tasks", "application/json", strings.NewReader(createBody))
	if err != nil {
		t.Fatal(err)
	}
	taskBytes, err := io.ReadAll(taskRes.Body)
	if cerr := taskRes.Body.Close(); cerr != nil {
		t.Fatal(cerr)
	}
	if taskRes.StatusCode != http.StatusCreated {
		t.Fatalf("task create %d %s", taskRes.StatusCode, taskBytes)
	}
	var task domain.Task
	if err := json.Unmarshal(taskBytes, &task); err != nil {
		t.Fatal(err)
	}
	if len(task.AutomationSelections) != 1 || task.AutomationSelections[0].State != domain.AutomationStateYes {
		t.Fatalf("selections = %#v", task.AutomationSelections)
	}
}
