// devconfig prints dev-script constants derived from Go packages (single source of truth).
package main

import (
	"flag"
	"fmt"
	"log/slog"
	"os"
	"strconv"

	"github.com/AlexsanderHamir/Hamix/pkgs/tasks/postgres"
)

const cmdName = "devconfig"

func main() {
	slog.Debug("trace", "cmd", cmdName, "operation", "devconfig.main")
	readiness := flag.Bool("readiness-timeout-sec", false, "print dev taskapi port-wait timeout in seconds")
	flag.Parse()

	if *readiness {
		sec := int(postgres.DefaultDevReadinessTimeout().Seconds())
		if sec <= 0 {
			sec = 150
		}
		if override := os.Getenv("DEV_TASKAPI_STARTUP_TIMEOUT_SEC"); override != "" {
			if n, err := strconv.Atoi(override); err == nil && n > 0 {
				sec = n
			}
		}
		fmt.Println(sec)
		return
	}
	flag.Usage()
	os.Exit(2)
}
