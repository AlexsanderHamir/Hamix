// Command resumequality scores live resume scenarios against a running taskapi.
package main

import (
	"flag"
	"fmt"
	"os"

	"github.com/AlexsanderHamir/T2A/pkgs/agents/resumequality"
)

func main() {
	baseURL := flag.String("base-url", "http://127.0.0.1:8080", "taskapi base URL")
	scenario := flag.String("scenario", "all", "scenario id or all")
	out := flag.String("out", "logs/resume-quality.json", "output JSON path")
	minScore := flag.Float64("min-score", 70, "minimum overall score percent")
	flag.Parse()

	result, err := resumequality.Run(*baseURL, *scenario, *out)
	if err != nil {
		fmt.Fprintf(os.Stderr, "resumequality: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("resume quality: %.1f%% (pass=%v)\n", result.OverallPercent, result.Passed)
	if !result.Passed || result.OverallPercent < *minScore {
		os.Exit(2)
	}
}
